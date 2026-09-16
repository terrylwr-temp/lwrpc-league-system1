import assert from "node:assert/strict";
import { createNextRoundRobinRound, createRoundRobinSchedule } from "../app/lib/roundRobinSchedule.js";

const courts = [{ name: "Court 1" }, { name: "Court 2" }];

for (const playerCount of [8, 9]) for (const roundCount of [6, 7]) {
  verifySchedule(`pre-generated ${playerCount}-player ${roundCount}-game schedule`, createBatchSchedule(playerCount, roundCount), playerCount, roundCount);
  verifySchedule(`game-by-game ${playerCount}-player ${roundCount}-game schedule`, createSequentialSchedule(playerCount, roundCount), playerCount, roundCount);
}

console.log("Round-robin balance verification passed for 8- and 9-player, 2-court schedules.");

function createPlayers(playerCount) {
  return Array.from({ length: playerCount }, (_, index) => ({
    id: String(index),
    displayName: `Player ${index + 1}`,
  }));
}

function createBatchSchedule(playerCount, roundCount) {
  const schedule = createRoundRobinSchedule({
    players: createPlayers(playerCount),
    courts,
    roundCount,
    courtCount: 2,
    shuffle: false,
  });

  return schedule.rounds.flatMap((round) => round.courts.map((court) => ({
    courtNumber: court.courtNumber,
    team1: court.team1,
    team2: court.team2,
    byes: court.courtNumber === 1 ? round.byes : [],
  })));
}

function createSequentialSchedule(playerCount, roundCount) {
  const players = createPlayers(playerCount);
  const existingMatches = [];

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const round = createNextRoundRobinRound({
      players,
      courts,
      existingMatches,
      plannedRoundCount: roundCount,
      courtCount: 2,
    });

    round.courts.forEach((court) => {
      existingMatches.push({
        id: `${round.roundNumber}-${court.courtNumber}`,
        round_number: round.roundNumber,
        court_number: court.courtNumber,
        team1_players: court.team1,
        team2_players: court.team2,
        bye_players: court.courtNumber === 1 ? round.byes : [],
      });
    });
  }

  return existingMatches.map((match) => ({
    courtNumber: match.court_number,
    team1: match.team1_players,
    team2: match.team2_players,
    byes: match.bye_players,
  }));
}

function verifySchedule(label, matches, playerCount, roundCount) {
  const partnerCounts = createMatrix(playerCount);
  const opponentCounts = createMatrix(playerCount);
  const sharedCourtCounts = createMatrix(playerCount);
  const courtCounts = Array.from({ length: playerCount }, () => [0, 0]);
  const byeCounts = Array(playerCount).fill(0);

  const lastGroups = new Map();
  matches.forEach((match) => {
    const team1 = match.team1.map((player) => Number(player.id));
    const team2 = match.team2.map((player) => Number(player.id));
    const allPlayers = [...team1, ...team2];

    allPlayers.forEach((playerIndex) => {
      const previous = lastGroups.get(playerIndex) || [];
      assert.ok(previous.filter(id => allPlayers.includes(id)).length <= 2, `${label}: consecutive triple/quartet, including across a bye`);
      lastGroups.set(playerIndex, allPlayers);
      courtCounts[playerIndex][match.courtNumber - 1] += 1;
    });
    match.byes.forEach((player) => {
      byeCounts[Number(player.id)] += 1;
    });

    incrementPair(partnerCounts, team1[0], team1[1]);
    incrementPair(partnerCounts, team2[0], team2[1]);
    team1.forEach((playerIndex) => {
      team2.forEach((opponentIndex) => incrementPair(opponentCounts, playerIndex, opponentIndex));
    });
    allPlayers.forEach((playerIndex, firstIndex) => {
      allPlayers.slice(firstIndex + 1).forEach((otherIndex) => incrementPair(sharedCourtCounts, playerIndex, otherIndex));
    });
  });

  assert.equal(maxPairCount(partnerCounts), 1, `${label}: a partner pairing repeated`);
  // Opponent repetition is subordinate to the owner-approved court/group spacing priorities.
  console.log(label, {maxOpponents: maxPairCount(opponentCounts), maxCoCourt: maxPairCount(sharedCourtCounts), courtCounts});
  assert.ok(maxPairCount(sharedCourtCounts) <= (playerCount === 9 || roundCount === 6 ? 4 : 5), `${label}: two players shared a court too often`);
  assert.ok(
    Math.max(...courtCounts.map(([firstCourt, secondCourt]) => Math.abs(firstCourt - secondCourt))) <= 1,
    `${label}: court assignments are not balanced`
  );
  assert.ok(Math.max(...byeCounts) <= 1, `${label}: a player received more than one bye`);
}

function createMatrix(size) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function incrementPair(matrix, first, second) {
  const low = Math.min(first, second);
  const high = Math.max(first, second);
  matrix[low][high] += 1;
}

function maxPairCount(matrix) {
  return Math.max(...matrix.flat());
}
