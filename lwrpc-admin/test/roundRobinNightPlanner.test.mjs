import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoundRobinSchedule, createNextRoundRobinRound } from '../app/lib/roundRobinSchedule.js';
import { nightlyHistory, planBalancedNight } from '../app/lib/roundRobinNightPlanner.js';
const players = n => Array.from({ length: n }, (_, i) => ({ id: String(i), displayName: `Synthetic ${i}` }));
const courts = [{ name: 'Court 5' }, { name: 'Court 8' }];
const rows = round => round.courts.map((c, i) => ({ ...c, id: `${round.roundNumber}-${i}`, round_number: round.roundNumber, bye_players: i === 0 ? round.byes : [] }));
function audit(rounds, n) {
    const partners = new Set(), counts = Array.from({ length: n }, () => [0, 0]), byes = Array(n).fill(0), last = Array(n).fill(null), pairs = new Map();
    for (const r of rounds) {
        const participating = new Set();
        for (const c of r.courts) {
            assert.equal(c.courtName, courts[c.courtNumber - 1].name);
            const group = [...c.team1, ...c.team2].map(p => p.id);
            assert.equal(new Set(group).size, 4);
            for (const p of group) {
                assert.ok(!participating.has(p));
                participating.add(p);
                counts[+p][c.courtNumber - 1]++;
                if (last[+p])
                    assert.ok(last[+p].filter(id => group.includes(id)).length <= 2, 'no returning/consecutive trio or quartet');
            }
            for (const team of [c.team1, c.team2]) {
                const k = team.map(p => p.id).sort().join(':');
                assert.ok(!partners.has(k), 'partners never repeat');
                partners.add(k);
            }
            for (let i = 0; i < 4; i++)
                for (let j = i + 1; j < 4; j++) {
                    const k = [group[i], group[j]].sort().join(':');
                    pairs.set(k, (pairs.get(k) || 0) + 1);
                }
            for (const p of group)
                last[+p] = group;
        }
        for (const p of r.byes) {
            assert.ok(!participating.has(p.id));
            participating.add(p.id);
            byes[+p.id]++;
        }
        assert.equal(participating.size, n);
        assert.equal(r.byes.length, n - 8);
    }
    assert.ok(counts.every(([a, b]) => Math.abs(a - b) <= 1), 'closest court split for actual appearances');
    assert.ok(Math.max(...byes) - Math.min(...byes) <= 1, 'fair byes');
    return { counts, byes, maxCoCourt: Math.max(...pairs.values()) };
}
for (const n of [8, 9, 10])
    for (const roundCount of [6, 7])
        test(`${n} players / ${roundCount} games: whole-night and saved-prefix next-game balance`, () => {
            const roster = players(n), before = structuredClone(roster);
            const plan = createRoundRobinSchedule({ players: roster, courts, roundCount, shuffle: false });
            const metrics = audit(plan.rounds, n);
            assert.ok(metrics.maxCoCourt <= (n >= 9 || roundCount === 6 ? 4 : 5), 'bounded pair co-presence, not impossible half-night claim');
            assert.deepEqual(roster, before);
            // Replay from a mid-night saved prefix; do not rely on object identity or scores.
            const existingMatches = plan.rounds.slice(0, 3).flatMap(rows), original = structuredClone(existingMatches);
            const next = createNextRoundRobinRound({ players: roster, courts, existingMatches, plannedRoundCount: roundCount });
            assert.deepEqual(next.courts, plan.rounds[3].courts);
            assert.deepEqual(next.byes, plan.rounds[3].byes);
            assert.deepEqual(existingMatches, original);
        if (roundCount === 6) {
            const seventh = createNextRoundRobinRound({players: roster, courts, existingMatches: plan.rounds.flatMap(rows)});
            audit([...plan.rounds, seventh], n);
        }
        });
test('bye or omitted player cannot erase previous partners, court visits or last group', () => {
    const p = players(9);
    const matches = [{ id: 'a', round_number: 1, court_number: 1, team1: p.slice(0, 2), team2: p.slice(2, 4) },
        { id: 'b', round_number: 2, court_number: 2, team1: p.slice(4, 6), team2: p.slice(6, 8), byes: [p[0]] }];
    const { state } = nightlyHistory(p.slice(0, 8), matches);
    assert.equal(state.partners[1], 1);
    assert.equal(state.courts[0], 1);
    assert.equal(state.last[0], 15);
    assert.equal(state.byes[0], 1);
    // Player 3 is no longer selected; the other three still retain their history.
    const reduced = [...p.slice(0, 3), ...p.slice(4)];
    const history = nightlyHistory(reduced, matches).state;
    assert.equal(history.partners[1], 1);
    assert.equal(history.courts[0], 1);
    assert.equal(history.groups.get(3), 1);
});
test('duplicate saved records and duplicated bye metadata count once; not-played consumes no exposure', () => {
    const p = players(9), a = { id: 'a', round_number: 1, court_number: 1, team1: p.slice(0, 2), team2: p.slice(2, 4), byes: [p[8]] };
    const b = { ...a, id: 'b', court_number: 2, team1: p.slice(4, 6), team2: p.slice(6, 8) };
    const { state } = nightlyHistory(p, [a, { ...a }, b, { ...a, id: 'c', round_number: 2, status: 'not_played' }]);
    assert.equal(state.partners[1], 1);
    assert.equal(state.byes[8], 1);
    assert.equal(state.courts[0], 1);
});
test('edited history reserves partners and same-night input is never mutated', () => {
    const p = players(8), existing = [{ id: 'edited', round_number: 6, court_number: 2, team1: [p[0], p[7]], team2: [p[1], p[6]] }];
    const before = structuredClone(existing);
    const next = createNextRoundRobinRound({ players: p, courts, existingMatches: existing, plannedRoundCount: 7 });
    for (const c of next.courts)
        for (const team of [c.team1, c.team2])
            assert.ok(!['0:7', '1:6'].includes(team.map(p => p.id).sort().join(':')));
    assert.deepEqual(existing, before);
});
test('ten-player edited history keeps two byes and does not reuse saved partners', () => {
    const p = players(10), existing = [
        { id: 'manual-1', round_number: 1, court_number: 1, team1: [p[0], p[9]], team2: [p[1], p[8]], byes: [p[4], p[5]] },
        { id: 'manual-2', round_number: 1, court_number: 2, team1: [p[2], p[7]], team2: [p[3], p[6]] },
    ];
    const before = structuredClone(existing);
    const next = createNextRoundRobinRound({ players: p, courts, existingMatches: existing, plannedRoundCount: 6 });
    assert.equal(next.roundNumber, 2);
    assert.equal(next.byes.length, 2);
    assert.equal(new Set([...next.courts.flatMap(c => [...c.team1, ...c.team2]), ...next.byes].map(p => p.id)).size, 10);
    for (const court of next.courts)
        for (const team of [court.team1, court.team2])
            assert.ok(!['0:9', '1:8', '2:7', '3:6'].includes(team.map(p => p.id).sort().join(':')));
    assert.deepEqual(existing, before);
});
test('exhausted partners stop generation instead of silently repeating', () => {
    const p = players(8), matches = [];
    for (let d = 1; d <= 7; d++) {
        const teams = Array.from({ length: 8 }, (_, i) => [i, i ^ d]).filter(([a, b]) => a < b);
        for (let c = 0; c < 2; c++)
            matches.push({ id: `${d}-${c}`, round_number: d, court_number: c + 1,
                team1: teams[c * 2].map(i => p[i]), team2: teams[c * 2 + 1].map(i => p[i]) });
    }
    assert.throws(() => createNextRoundRobinRound({ players: p, courts, existingMatches: matches }), /unique partners.*planning limit/);
});
test('scope controls: one court and larger rosters retain existing scheduler', () => {
    for (const n of [4, 12]) {
        const plan = createRoundRobinSchedule({ players: players(n), courtCount: n / 4, roundCount: 2, shuffle: false });
        assert.equal(plan.rounds.length, 2);
        assert.equal(plan.quality, undefined);
    }
});
test('invalid inputs and duplicate identities fail closed', () => {
    assert.throws(() => planBalancedNight({ players: [...players(7), { id: '0' }] }), /distinct/);
    assert.throws(() => planBalancedNight({ players: players(8), roundCount: Infinity }), /one and nine/);
});

test('cancelled games do not consume partners when extending the night', () => {
  const p=players(8),matches=[];
  for(let d=1;d<=7;d++) {
    const teams=Array.from({length:8},(_,i)=>[i,i^d]).filter(([a,b])=>a<b);
    for(let c=0;c<2;c++)matches.push({id:`cancel-${d}-${c}`,round_number:d,court_number:c+1,
      status:d===7?'not_played':'complete',team1:teams[c*2].map(i=>p[i]),team2:teams[c*2+1].map(i=>p[i])});
  }
  const next=createNextRoundRobinRound({players:p,courts,existingMatches:matches});
  assert.equal(next.roundNumber,8);
  for(const c of next.courts)for(const t of [c.team1,c.team2])assert.equal(Number(t[0].id)^Number(t[1].id),7);
});
