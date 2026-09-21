import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createNextRoundRobinRound, createRoundRobinSchedule } from '../app/lib/roundRobinSchedule.js';
import { nightlyHistory, planBalancedNight } from '../app/lib/roundRobinNightPlanner.js';

const players = Array.from({ length: 10 }, (_, i) => ({ id: String(i), displayName: `Player ${i}` }));
const courts = [{ name: 'Court 1' }, { name: 'Court 2' }];
const ids = list => list.map(p => String(p.id)).sort();
const saved = round => round.courts.map((court, index) => ({
  id: `${round.roundNumber}-${court.courtNumber}`,
  session_id: 'manual-bye-fixture',
  round_number: round.roundNumber,
  court_number: court.courtNumber,
  team1_players: court.team1,
  team2_players: court.team2,
  bye_players: index === 0 ? round.byes : [],
  status: 'scheduled',
}));
const next = (matches, roundCount, forcedByePlayerIds = []) => createNextRoundRobinRound({
  players, courts, existingMatches: matches, courtCount: 2, plannedRoundCount: roundCount, forcedByePlayerIds,
});
const reference = new Map();
function referenceRounds(count) {
  if (!reference.has(count)) reference.set(count, createRoundRobinSchedule({ players, courts, courtCount: 2, roundCount: count, shuffle: false }).rounds);
  return reference.get(count);
}
function audit(rounds, { fairByes = true, balancedCourts = true, noConsecutiveGroups = true } = {}) {
  const byes = Array(10).fill(0), visits = Array.from({ length: 10 }, () => [0, 0]);
  const partners = new Set(), last = Array(10).fill(null);
  for (const round of rounds) {
    assert.equal(round.byes.length, 2);
    const seen = new Set(ids(round.byes));
    for (const court of round.courts) {
      const group = [...court.team1, ...court.team2].map(p => p.id);
      assert.equal(new Set(group).size, 4);
      for (const id of group) {
        assert.ok(!seen.has(id), `duplicate player ${id} in round ${round.roundNumber}`);
        seen.add(id);
        visits[+id][court.courtNumber - 1]++;
        if (noConsecutiveGroups && last[+id])
          assert.ok(last[+id].filter(other => group.includes(other)).length <= 2, 'consecutive trio/quartet');
        last[+id] = group;
      }
      for (const team of [court.team1, court.team2]) {
        const key = ids(team).join(':');
        assert.ok(!partners.has(key), `repeated partner ${key}`);
        partners.add(key);
      }
    }
    assert.equal(seen.size, 10);
    round.byes.forEach(p => byes[+p.id]++);
  }
  if (fairByes) assert.ok(byes.every(value => value === 1 || value === 2), `bye counts ${byes}`);
  if (balancedCourts) assert.ok(visits.every(([a, b]) => Math.abs(a - b) <= 1), `court visits ${JSON.stringify(visits)}`);
  return { byes, visits };
}
function replay(roundCount, manualRounds, source = referenceRounds(roundCount)) {
  const matches = [], rounds = [];
  for (let index = 0; index < roundCount; index++) {
    const forced = manualRounds.has(index + 1) ? ids(source[index].byes) : [];
    const before = structuredClone(matches);
    const round = next(matches, roundCount, forced);
    if (forced.length) assert.deepEqual(ids(round.byes), forced);
    assert.deepEqual(matches, before, 'saved matches are immutable');
    rounds.push(round);
    matches.push(...saved(round));
    const history = nightlyHistory(players, structuredClone(matches)).state;
    const expectedByes = rounds.flatMap(r => r.byes).filter(p => p.id === '0').length;
    assert.equal(history.byes[0], expectedByes, 'all saved rounds contribute bye history');
  }
  return { rounds, matches };
}

test('manual first-round byes retain all ten players and complete saved court/group/partner history', () => {
  const forced = ['0', '1'];
  const first = next([], 6, forced);
  assert.deepEqual(ids(first.byes), forced);
  const rows = saved(first);
  const { state } = nightlyHistory(players, structuredClone(rows));
  assert.deepEqual(state.byes.slice(0, 2), [1, 1]);
  assert.equal(state.byes.reduce((a, b) => a + b), 2);
  assert.equal(state.courts.reduce((a, b) => a + b), 8);
  assert.equal(state.groups.size > 0, true);
  assert.deepEqual([state.quad, state.triple, state.streak], [0, 0, 0]);
  for (const court of first.courts) {
    const group = [...court.team1, ...court.team2].map(p => +p.id);
    const mask = group.reduce((value, i) => value | (1 << i), 0);
    for (const id of group) {
      assert.equal(state.last[id], mask);
      assert.equal(state.courts[id * 2 + court.courtNumber - 1], 1);
    }
    for (const team of [court.team1, court.team2]) {
      const [a, b] = team.map(p => +p.id).sort((a, b) => a - b);
      assert.equal(state.partners[a * 10 + b], 1);
    }
  }
  const second = next(rows, 6);
  assert.equal(second.roundNumber, 2);
  audit([first, second], { fairByes: false, balancedCourts: false });
});

test('historical trio, quartet, streak and duplicate bye metadata are reconstructed', () => {
  const fixture = {
    courts: [
      { courtNumber: 1, team1: players.slice(0, 2), team2: players.slice(2, 4) },
      { courtNumber: 2, team1: players.slice(4, 6), team2: players.slice(6, 8) },
    ],
    byes: players.slice(8),
  };
  const matches = [1, 2, 3].flatMap(roundNumber => saved({ ...fixture, roundNumber }));
  matches[1].bye_players = players.slice(8); // Metadata may appear on both court rows.
  const { state } = nightlyHistory(players, matches);
  assert.deepEqual(state.byes.slice(8), [3, 3]);
  assert.equal(state.quad, 16);
  assert.equal(state.triple, 16);
  assert.equal(state.adjacent, 48);
  assert.equal(state.streak, 24);
});

test('manual rounds 1–2, 1–3, mixed, later-only, and first-only use every saved round', () => {
  for (const manual of [[1, 2], [1, 2, 3], [1, 3], [2], [1]]) {
    const { rounds, matches } = replay(4, new Set(manual), referenceRounds(6));
    assert.equal(matches.length, 8);
    audit(rounds, { fairByes: false, balancedCourts: false });
    const state = nightlyHistory(players, matches).state;
    assert.equal(state.partners.reduce((a, b) => a + b), 16);
    assert.equal(state.courts.reduce((a, b) => a + b), 32);
    assert.equal(state.byes.reduce((a, b) => a + b), 8);
  }
});

test('complete six- and seven-game nights with prescribed byes keep achievable balance', () => {
  for (const count of [6, 7]) {
    const rotated = createRoundRobinSchedule({
      players: [...players.slice(3), ...players.slice(0, 3)], courts, courtCount: 2, roundCount: count, shuffle: false,
    }).rounds;
    for (const [manual, source] of [
      [new Set([1, 2, 3]), referenceRounds(count)],
      [new Set([1, 3, 5]), referenceRounds(count)],
      [new Set([1, 2, 3]), rotated],
    ]) {
      const { rounds } = replay(count, manual, source);
      audit(rounds);
    }
  }
});

test('saved-session reload and batch continuation use the same edited history', () => {
  const { rounds, matches } = replay(3, new Set([1, 3]), referenceRounds(6));
  const reloaded = JSON.parse(JSON.stringify(matches));
  const continuous = next(matches, 6);
  const afterReload = next(reloaded, 6);
  assert.deepEqual(afterReload, continuous);
  const batch = planBalancedNight({ players, courts, matches: reloaded, roundCount: 6 });
  assert.deepEqual(ids(batch.rounds[0].byes), ids(continuous.byes));
  assert.deepEqual(batch.rounds[0].courts.map(c => [ids(c.team1), ids(c.team2)]),
    continuous.courts.map(c => [ids(c.team1), ids(c.team2)]));
  assert.deepEqual(nightlyHistory(players, reloaded).state.byes, nightlyHistory(players, matches).state.byes);
  assert.deepEqual(matches, rounds.flatMap(saved));
});

test('saved edited byes, court groups and partners override an earlier proposal', () => {
  const original = next([], 6);
  const edited = structuredClone(original);
  const replacement = edited.byes[0];
  edited.byes[0] = edited.courts[0].team1[0];
  edited.courts[0].team1[0] = replacement;
  [edited.courts[0].team2[0], edited.courts[1].team1[0]] = [edited.courts[1].team1[0], edited.courts[0].team2[0]];
  [edited.courts[1].team1[1], edited.courts[1].team2[1]] = [edited.courts[1].team2[1], edited.courts[1].team1[1]];
  const rows = saved(edited), state = nightlyHistory(players, rows).state;
  assert.deepEqual(ids(rows[0].bye_players), ids(edited.byes));
  assert.notDeepEqual(ids(edited.byes), ids(original.byes));
  assert.notDeepEqual(state.byes, nightlyHistory(players, saved(original)).state.byes);
  const before = structuredClone(rows);
  const continuation = next(rows, 6);
  assert.deepEqual(rows, before);
  audit([edited, continuation], { fairByes: false, balancedCourts: false, noConsecutiveGroups: false });
});

test('editing a later saved round changes the next plan without changing earlier matches', () => {
  const first = next([], 6);
  const firstRows = saved(first);
  const proposedSecond = next(firstRows, 6);
  const editedSecond = structuredClone(proposedSecond);
  const oldBye = editedSecond.byes[0];
  editedSecond.byes[0] = editedSecond.courts[0].team1[0];
  editedSecond.courts[0].team1[0] = oldBye;
  [editedSecond.courts[0].team2[0], editedSecond.courts[1].team1[0]] =
    [editedSecond.courts[1].team1[0], editedSecond.courts[0].team2[0]];
  const history = [...firstRows, ...saved(editedSecond)];
  const prior = structuredClone(history);
  const state = nightlyHistory(players, history).state;
  assert.notDeepEqual(state.byes, nightlyHistory(players, [...firstRows, ...saved(proposedSecond)]).state.byes);
  const third = next(history, 6);
  assert.equal(third.roundNumber, 3);
  assert.deepEqual(history, prior);
  for (const court of third.courts) for (const team of [court.team1, court.team2]) {
    const [a, b] = team.map(p => +p.id).sort((a, b) => a - b);
    assert.equal(state.partners[a * 10 + b], 0, 'new partner is absent from edited saved history');
  }
});

test('repeated manual byes preserve history and degrade soft balance without repeating partners', () => {
  const matches = [], rounds = [];
  for (let index = 0; index < 3; index++) {
    const round = next(matches, 3, ['0', '1']);
    assert.deepEqual(ids(round.byes), ['0', '1']);
    rounds.push(round);
    matches.push(...saved(round));
  }
  const state = nightlyHistory(players, matches).state;
  assert.deepEqual(state.byes.slice(0, 2), [3, 3]);
  assert.equal(state.byes.reduce((a, b) => a + b), 6);
  audit(rounds, { fairByes: false, balancedCourts: false, noConsecutiveGroups: false });
  const before = structuredClone(matches);
  const continuation = next(matches, 4);
  assert.deepEqual(matches, before);
  assert.ok(continuation.byes.every(p => !['0', '1'].includes(p.id)));
  audit([...rounds, continuation], { fairByes: false, balancedCourts: false, noConsecutiveGroups: false });
});

test('impossible saved court skew is preserved and reported in the best continuation', () => {
  const earlier = referenceRounds(6).slice(0, 5).map(round => {
    const edited = structuredClone(round);
    if (edited.courts[1].team1.concat(edited.courts[1].team2).some(p => p.id === '0')) {
      [edited.courts[0].team1, edited.courts[1].team1] = [edited.courts[1].team1, edited.courts[0].team1];
      [edited.courts[0].team2, edited.courts[1].team2] = [edited.courts[1].team2, edited.courts[0].team2];
    }
    return edited;
  });
  const matches = earlier.flatMap(saved), before = structuredClone(matches);
  assert.deepEqual(nightlyHistory(players, matches).state.courts.slice(0, 2), [4, 0]);
  const final = next(matches, 6);
  assert.deepEqual(matches, before);
  assert.ok(final.quality.courtCounts[0].counts[0] - final.quality.courtCounts[0].counts[1] >= 3);
  assert.match(final.quality.summary, /uneven court use/);
});

test('exhausted saved partner history fails clearly without rewriting manual byes', () => {
  const matches = players.slice(1).map((partner, index) => ({
    id: `manual-partner-${index}`,
    session_id: 'manual-bye-fixture',
    round_number: 1,
    court_number: 1,
    team1_players: [players[0], partner],
    team2_players: [players[(index + 1) % 9 + 1], players[(index + 2) % 9 + 1]],
    bye_players: [],
    status: 'scheduled',
  }));
  const before = structuredClone(matches);
  assert.throws(() => next(matches, 2, ['8', '9']), error => error.code === 'NIGHT_SEARCH_LIMIT');
  assert.deepEqual(matches, before);
});

test('manual bye validation fails clearly, and the normal eight/nine paths stay available', () => {
  assert.throws(() => next([], 6, ['0', '0']), /two for a ten-player bye/);
  assert.throws(() => next([], 6, ['0', 'missing']), /two for a ten-player bye/);
  for (const count of [8, 9]) {
    const round = createNextRoundRobinRound({ players: players.slice(0, count), courts, courtCount: 2 });
    assert.equal(round.byes.length, count - 8);
  }
  const route = fs.readFileSync(new URL('../app/api/round-robin/action/route.js', import.meta.url), 'utf8');
  assert.match(route, /players: planningPlayers,[\s\S]*forcedByePlayerIds: useManualNightByes/);
  assert.match(route, /useManualNightByes \? nextRound\.byes : \[\.\.\.nextRound\.byes, \.\.\.manualByePlayers\]/);
});
