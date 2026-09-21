import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createNextRoundRobinRound, createRoundRobinSchedule } from '../app/lib/roundRobinSchedule.js';
import { nightlyHistory, planBalancedNight } from '../app/lib/roundRobinNightPlanner.js';

const players = Array.from({ length: 9 }, (_, i) => ({ id: String(i), displayName: `Player ${i}` }));
const courts = [{ name: 'Court 1' }, { name: 'Court 2' }];
const ids = list => list.map(p => String(p.id)).sort();
const saved = round => round.courts.map((court, index) => ({
  id: `${round.roundNumber}-${court.courtNumber}`,
  session_id: 'nine-manual-bye-fixture',
  round_number: round.roundNumber,
  court_number: court.courtNumber,
  team1_players: court.team1,
  team2_players: court.team2,
  bye_players: index === 0 ? round.byes : [],
  status: 'scheduled',
}));
const next = (matches, roundCount, forcedByePlayerIds = []) => createNextRoundRobinRound({
  players, courts, courtCount: 2, existingMatches: matches, plannedRoundCount: roundCount, forcedByePlayerIds,
});
const references = new Map();
function reference(count) {
  if (!references.has(count)) references.set(count, createRoundRobinSchedule({
    players, courts, courtCount: 2, roundCount: count, shuffle: false,
  }).rounds);
  return references.get(count);
}
function audit(rounds, { fairByes = true, courtBalance = true, groupSpacing = true } = {}) {
  const byes = Array(9).fill(0), visits = Array.from({ length: 9 }, () => [0, 0]);
  const partners = new Set(), last = Array(9).fill(null);
  for (const round of rounds) {
    assert.equal(round.byes.length, 1);
    const seen = new Set(ids(round.byes));
    for (const court of round.courts) {
      const group = [...court.team1, ...court.team2].map(p => p.id);
      assert.equal(new Set(group).size, 4);
      for (const id of group) {
        assert.ok(!seen.has(id), `duplicate player ${id}`);
        seen.add(id);
        visits[+id][court.courtNumber - 1]++;
        if (groupSpacing && last[+id])
          assert.ok(last[+id].filter(other => group.includes(other)).length <= 2, 'consecutive trio/quartet');
        last[+id] = group;
      }
      for (const team of [court.team1, court.team2]) {
        const key = ids(team).join(':');
        assert.ok(!partners.has(key), `repeated partner ${key}`);
        partners.add(key);
      }
    }
    assert.equal(seen.size, 9);
    round.byes.forEach(p => byes[+p.id]++);
  }
  if (fairByes) assert.ok(Math.max(...byes) - Math.min(...byes) <= 1, `bye counts ${byes}`);
  if (courtBalance) assert.ok(visits.every(([a, b]) => Math.abs(a - b) <= 1), `court visits ${JSON.stringify(visits)}`);
  return { byes, visits };
}
function replay(roundCount, manualRounds, source = reference(roundCount)) {
  const matches = [], rounds = [];
  for (let index = 0; index < roundCount; index++) {
    const forced = manualRounds.has(index + 1) ? ids(source[index].byes) : [];
    const before = structuredClone(matches);
    const round = next(matches, roundCount, forced);
    if (forced.length) assert.deepEqual(ids(round.byes), forced);
    assert.deepEqual(matches, before, 'previously saved rounds must not be changed');
    rounds.push(round);
    matches.push(...saved(round));
    const history = nightlyHistory(players, structuredClone(matches)).state;
    for (let player = 0; player < 9; player++)
      assert.equal(history.byes[player], rounds.filter(r => r.byes[0].id === String(player)).length);
  }
  return { rounds, matches };
}

test('one manually selected first-round bye keeps all nine players in the planner and saved history', () => {
  const first = next([], 6, ['0']);
  assert.deepEqual(ids(first.byes), ['0']);
  const rows = saved(first);
  assert.deepEqual(rows.map(m => ids(m.bye_players)), [['0'], []]);
  const state = nightlyHistory(players, structuredClone(rows)).state;
  assert.equal(state.byes[0], 1);
  assert.equal(state.byes.reduce((a, b) => a + b), 1);
  assert.equal(state.courts.reduce((a, b) => a + b), 8);
  assert.equal(state.groups.size > 0, true);
  for (const court of first.courts) {
    const group = [...court.team1, ...court.team2].map(p => +p.id);
    const mask = group.reduce((value, i) => value | (1 << i), 0);
    for (const id of group) {
      assert.equal(state.last[id], mask);
      assert.equal(state.courts[id * 2 + court.courtNumber - 1], 1);
    }
    for (const team of [court.team1, court.team2]) {
      const [a, b] = team.map(p => +p.id).sort((a, b) => a - b);
      assert.equal(state.partners[a * 9 + b], 1);
    }
  }
  audit([first, next(rows, 6)], { fairByes: false, courtBalance: false });
});

test('manual rounds 1–2, 1–3, mixed, auto-then-manual and manual-then-auto retain every round', () => {
  for (const manual of [[1, 2], [1, 2, 3], [1, 3], [2], [1]]) {
    const { rounds, matches } = replay(4, new Set(manual), reference(6));
    audit(rounds, { fairByes: false, courtBalance: false });
    const state = nightlyHistory(players, matches).state;
    assert.equal(state.partners.reduce((a, b) => a + b), 16);
    assert.equal(state.courts.reduce((a, b) => a + b), 32);
    assert.equal(state.byes.reduce((a, b) => a + b), 4);
  }
});

test('six- and seven-game nights with several manual-bye sequences keep achievable balance', () => {
  for (const count of [6, 7]) {
    const rotated = createRoundRobinSchedule({
      players: [...players.slice(3), ...players.slice(0, 3)], courts, courtCount: 2, roundCount: count, shuffle: false,
    }).rounds;
    for (const [manual, source] of [
      [new Set([1, 2, 3]), reference(count)],
      [new Set([1, 3, 5]), reference(count)],
      [new Set([1, 2, 3]), rotated],
    ]) audit(replay(count, manual, source).rounds);
  }
});

test('saved-session reload and complete-night continuation agree with repeated Next Game', () => {
  const { rounds, matches } = replay(3, new Set([1, 3]), reference(6));
  const reloaded = JSON.parse(JSON.stringify(matches));
  const continued = next(matches, 6);
  assert.deepEqual(next(reloaded, 6), continued);
  const batch = planBalancedNight({ players, courts, matches: reloaded, roundCount: 6 });
  assert.deepEqual(ids(batch.rounds[0].byes), ids(continued.byes));
  assert.deepEqual(batch.rounds[0].courts.map(c => [ids(c.team1), ids(c.team2)]),
    continued.courts.map(c => [ids(c.team1), ids(c.team2)]));
  assert.deepEqual(matches, rounds.flatMap(saved));
});

test('edited later round changes bye, court group and partner history before continuation', () => {
  const first = next([], 6), firstRows = saved(first);
  const proposedSecond = next(firstRows, 6);
  const edited = structuredClone(proposedSecond);
  const priorBye = edited.byes[0];
  edited.byes[0] = edited.courts[0].team1[0];
  edited.courts[0].team1[0] = priorBye;
  [edited.courts[0].team2[0], edited.courts[1].team1[0]] =
    [edited.courts[1].team1[0], edited.courts[0].team2[0]];
  [edited.courts[1].team1[1], edited.courts[1].team2[1]] =
    [edited.courts[1].team2[1], edited.courts[1].team1[1]];
  const matches = [...firstRows, ...saved(edited)], before = structuredClone(matches);
  const actual = nightlyHistory(players, matches).state;
  const proposed = nightlyHistory(players, [...firstRows, ...saved(proposedSecond)]).state;
  assert.notDeepEqual(actual.byes, proposed.byes);
  assert.notDeepEqual(actual.partners, proposed.partners);
  assert.notDeepEqual(actual.courts, proposed.courts);
  const third = next(matches, 6);
  assert.equal(third.roundNumber, 3);
  assert.deepEqual(matches, before);
  for (const court of third.courts) for (const team of [court.team1, court.team2]) {
    const [a, b] = team.map(p => +p.id).sort((a, b) => a - b);
    assert.equal(actual.partners[a * 9 + b], 0, 'new partner is absent from actual saved history');
  }
});

test('saved trio/quartet/streak exposure and duplicate bye metadata are reconstructed', () => {
  const fixture = {
    courts: [
      { courtNumber: 1, team1: players.slice(0, 2), team2: players.slice(2, 4) },
      { courtNumber: 2, team1: players.slice(4, 6), team2: players.slice(6, 8) },
    ], byes: [players[8]],
  };
  const matches = [1, 2, 3].flatMap(roundNumber => saved({ ...fixture, roundNumber }));
  matches[1].bye_players = [players[8]];
  const state = nightlyHistory(players, matches).state;
  assert.equal(state.byes[8], 3);
  assert.equal(state.quad, 16);
  assert.equal(state.triple, 16);
  assert.equal(state.adjacent, 48);
  assert.equal(state.streak, 24);
});

test('repeated selected bye preserves impossible manual balance and future unique partners', () => {
  const matches = [], rounds = [];
  for (let index = 0; index < 3; index++) {
    const round = next(matches, 3, ['0']);
    assert.deepEqual(ids(round.byes), ['0']);
    rounds.push(round);
    matches.push(...saved(round));
  }
  const state = nightlyHistory(players, matches).state;
  assert.equal(state.byes[0], 3);
  assert.equal(state.byes.reduce((a, b) => a + b), 3);
  const before = structuredClone(matches);
  const continuation = next(matches, 4);
  assert.deepEqual(matches, before);
  assert.notEqual(continuation.byes[0].id, '0');
  audit([...rounds, continuation], { fairByes: false, courtBalance: false, groupSpacing: false });
});

test('manual nine-player selection validates identity and leaves automatic scheduling intact', () => {
  assert.throws(() => next([], 6, ['missing']), /one distinct joined player/);
  assert.throws(() => next([], 6, ['0', '1']), /one distinct joined player/);
  assert.equal(next([], 6).byes.length, 1);
  const route = fs.readFileSync(new URL('../app/api/round-robin/action/route.js', import.meta.url), 'utf8');
  assert.match(route, /\[9, 10\]\.includes\(joinedSessionPlayers\.length\)/);
  assert.match(route, /manualByePlayers\.length === joinedSessionPlayers\.length - 8/);
  assert.match(route, /players: planningPlayers,[\s\S]*forcedByePlayerIds: useManualNightByes/);
  assert.match(route, /useManualNightByes \? nextRound\.byes : \[\.\.\.nextRound\.byes, \.\.\.manualByePlayers\]/);
});
