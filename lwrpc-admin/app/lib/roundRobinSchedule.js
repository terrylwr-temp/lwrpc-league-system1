export function suggestedRoundRobinCourts(playerCount, configuredCourtCount = 8) {
  const count = Number(playerCount || 0);
  const maxConfigured = Math.max(1, Number(configuredCourtCount || 1));
  if (count < 4) return 0;
  return Math.min(maxConfigured, Math.max(1, Math.floor(count / 4)));
}

const PERFECT_EIGHT_PARTNER_ROUNDS = [
  [[0, 7], [1, 6], [2, 5], [3, 4]],
  [[0, 6], [7, 5], [1, 4], [2, 3]],
  [[0, 5], [6, 4], [7, 3], [1, 2]],
  [[0, 4], [5, 3], [6, 2], [7, 1]],
  [[0, 3], [4, 2], [5, 1], [6, 7]],
  [[0, 2], [3, 1], [4, 7], [5, 6]],
  [[0, 1], [2, 7], [3, 6], [4, 5]],
];

export function createRoundRobinSchedule({
  players = [],
  courts = [],
  roundCount = 6,
  courtCount,
  shuffle = true,
} = {}) {
  const activePlayers = players
    .filter((player) => player && player.id)
    .map((player) => ({
      id: String(player.id),
      displayName: player.displayName || player.display_name || player.name || "Player",
      firstLabel: player.firstLabel || roundRobinPlayerLabel(player.displayName || player.display_name || player.name),
      phone: player.phone || "",
      email: player.email || "",
    }));

  const totalPlayers = activePlayers.length;
  const configuredCourts = courts.length || Number(courtCount || 0) || 8;
  const resolvedCourtCount = Math.min(
    Math.max(1, Number(courtCount || suggestedRoundRobinCourts(totalPlayers, configuredCourts))),
    configuredCourts,
    Math.max(1, Math.floor(totalPlayers / 4))
  );
  const roundsToPlay = Math.max(1, Number(roundCount || 6));

  if (totalPlayers < 4) {
    throw new Error("Select at least 4 players to generate a round robin.");
  }

  if (resolvedCourtCount < 1) {
    throw new Error("At least 1 court is required.");
  }

  const playerIndexes = activePlayers.map((_, index) => index);
  const workingIndexes = shuffle ? shuffleArray([...playerIndexes]) : [...playerIndexes];
  const partnerHistory = createMatrix(totalPlayers);
  const opponentHistory = createMatrix(totalPlayers);
  const courtHistory = createCourtMatrix(totalPlayers, resolvedCourtCount);
  const byeCounts = Array(totalPlayers).fill(0);
  let previousByes = new Set();
  let previousCourts = [];
  const rounds = [];

  for (let roundIndex = 0; roundIndex < roundsToPlay; roundIndex += 1) {
    const byeCount = Math.max(0, totalPlayers - resolvedCourtCount * 4);
    const byes = chooseByes({
      playerIndexes: workingIndexes,
      byeCount,
      byeCounts,
      previousByes,
      roundIndex,
    });
    const byeSet = new Set(byes);
    const playingIndexes = workingIndexes.filter((index) => !byeSet.has(index));
    const matches = createMatchesForRound({
      playingIndexes,
      courtCount: resolvedCourtCount,
      roundIndex,
      totalPlayers,
      partnerHistory,
      opponentHistory,
      forbiddenPartnerPairs: previousPartnerPairsFromCourts(previousCourts),
    });
    const balancedMatches = balanceCourts(matches, courtHistory, resolvedCourtCount, previousCourts);
    const round = {
      roundNumber: roundIndex + 1,
      courts: balancedMatches.map((match, courtIndex) => ({
        courtNumber: courtIndex + 1,
        courtName: courts[courtIndex]?.name || `Court ${courtIndex + 1}`,
        courtDescription: courts[courtIndex]?.description || courts[courtIndex]?.desc || "",
        team1: match.length === 4 ? [activePlayers[match[0]], activePlayers[match[1]]] : [],
        team2: match.length === 4 ? [activePlayers[match[2]], activePlayers[match[3]]] : [],
      })),
      byes: byes.map((index) => activePlayers[index]),
    };

    rounds.push(round);
    updateHistory(round, activePlayers, partnerHistory, opponentHistory, courtHistory);
    byes.forEach((index) => {
      byeCounts[index] += 1;
    });
    previousByes = byeSet;
    previousCourts = balancedMatches.map((match) => (match.length === 4 ? [...match] : []));
  }

  return {
    players: activePlayers,
    courtCount: resolvedCourtCount,
    roundCount: roundsToPlay,
    rounds,
  };
}

export function createNextRoundRobinRound({
  players = [],
  courts = [],
  existingMatches = [],
  historyMatches = [],
  courtCount,
} = {}) {
  const activePlayers = players
    .filter((player) => player && player.id)
    .map((player) => ({
      id: String(player.id),
      displayName: player.displayName || player.display_name || player.name || "Player",
      firstLabel: player.firstLabel || roundRobinPlayerLabel(player.displayName || player.display_name || player.name),
      phone: player.phone || "",
      email: player.email || "",
    }));
  const totalPlayers = activePlayers.length;
  const configuredCourts = courts.length || Number(courtCount || 0) || 8;
  const resolvedCourtCount = Math.min(
    Math.max(1, Number(courtCount || suggestedRoundRobinCourts(totalPlayers, configuredCourts))),
    configuredCourts,
    Math.max(1, Math.floor(totalPlayers / 4))
  );

  if (totalPlayers < 4) {
    throw new Error("Confirm at least 4 players before generating a game.");
  }

  const playersById = new Map(activePlayers.map((player, index) => [String(player.id), index]));
  const partnerHistory = createMatrix(totalPlayers);
  const opponentHistory = createMatrix(totalPlayers);
  const courtHistory = createCourtMatrix(totalPlayers, resolvedCourtCount);
  const byeCounts = Array(totalPlayers).fill(0);
  const previousRoundNumber = Math.max(0, ...existingMatches.map((match) => Number(match.round_number || match.roundNumber || 0)));
  const previousRoundMatches = existingMatches.filter((match) => Number(match.round_number || match.roundNumber || 0) === previousRoundNumber);
  const previousByes = new Set();
  const previousCourts = Array.from({ length: resolvedCourtCount }, () => []);
  const previousPartnerPairs = new Set();
  const usedPartnerPairs = new Set();
  const currentMatchIds = new Set(existingMatches.map((match) => String(match.id || "")).filter(Boolean));
  const allHistoryMatches = [...(Array.isArray(historyMatches) ? historyMatches : []), ...existingMatches];

  allHistoryMatches.forEach((match) => {
    const isCurrentMatch = currentMatchIds.has(String(match.id || "")) || existingMatches.includes(match);
    const courtIndex = Math.max(0, Number(match.court_number || match.courtNumber || 1) - 1);
    const team1 = normalizePlayerList(match.team1_players || match.team1 || []).map((player) => playersById.get(String(player.id))).filter((index) => index !== undefined);
    const team2 = normalizePlayerList(match.team2_players || match.team2 || []).map((player) => playersById.get(String(player.id))).filter((index) => index !== undefined);
    const byes = normalizePlayerList(match.bye_players || match.byes || []).map((player) => playersById.get(String(player.id))).filter((index) => index !== undefined);

    byes.forEach((index) => {
      byeCounts[index] += 1;
      if (isCurrentMatch && Number(match.round_number || match.roundNumber || 0) === previousRoundNumber) previousByes.add(index);
    });

    if (team1.length !== 2 || team2.length !== 2 || courtIndex >= resolvedCourtCount) return;
    const allPlayers = [...team1, ...team2];
    allPlayers.forEach((index) => {
      courtHistory[index][courtIndex] += 1;
    });

    partnerHistory[team1[0]][team1[1]] += 1;
    partnerHistory[team1[1]][team1[0]] += 1;
    partnerHistory[team2[0]][team2[1]] += 1;
    partnerHistory[team2[1]][team2[0]] += 1;
    usedPartnerPairs.add(pairKey(team1[0], team1[1]));
    usedPartnerPairs.add(pairKey(team2[0], team2[1]));

    if (isCurrentMatch && Number(match.round_number || match.roundNumber || 0) === previousRoundNumber) {
      previousPartnerPairs.add(pairKey(team1[0], team1[1]));
      previousPartnerPairs.add(pairKey(team2[0], team2[1]));
    }

    team1.forEach((playerIndex) => {
      team2.forEach((opponentIndex) => {
        opponentHistory[playerIndex][opponentIndex] += 1;
        opponentHistory[opponentIndex][playerIndex] += 1;
      });
    });
  });

  previousRoundMatches.forEach((match) => {
    const courtIndex = Math.max(0, Number(match.court_number || match.courtNumber || 1) - 1);
    if (courtIndex >= resolvedCourtCount) return;
    previousCourts[courtIndex] = [
      ...normalizePlayerList(match.team1_players || match.team1 || []),
      ...normalizePlayerList(match.team2_players || match.team2 || []),
    ].map((player) => playersById.get(String(player.id))).filter((index) => index !== undefined);
  });

  const playerIndexes = activePlayers.map((_, index) => index);
  const byeCount = Math.max(0, totalPlayers - resolvedCourtCount * 4);
  const byes = chooseByes({
    playerIndexes,
    byeCount,
    byeCounts,
    previousByes,
    roundIndex: previousRoundNumber,
  });
  const byeSet = new Set(byes);
  const playingIndexes = playerIndexes.filter((index) => !byeSet.has(index));
  const matches = createMatchesForRound({
    playingIndexes,
    courtCount: resolvedCourtCount,
    roundIndex: previousRoundNumber,
    totalPlayers,
    partnerHistory,
    opponentHistory,
    forbiddenPartnerPairs: previousPartnerPairs,
    usedPartnerPairs,
  });
  const balancedMatches = balanceCourts(matches, courtHistory, resolvedCourtCount, previousCourts);

  return {
    roundNumber: previousRoundNumber + 1,
    courtCount: resolvedCourtCount,
    courts: balancedMatches.map((match, courtIndex) => ({
      courtNumber: courtIndex + 1,
      courtName: courts[courtIndex]?.name || `Court ${courtIndex + 1}`,
      courtDescription: courts[courtIndex]?.description || courts[courtIndex]?.desc || "",
      team1: match.length === 4 ? [activePlayers[match[0]], activePlayers[match[1]]] : [],
      team2: match.length === 4 ? [activePlayers[match[2]], activePlayers[match[3]]] : [],
    })),
    byes: byes.map((index) => activePlayers[index]),
  };
}

export function roundRobinStandings(matches = [], players = []) {
  const rows = new Map();

  players.forEach((player) => {
    if (!player?.id) return;
    rows.set(String(player.id), blankStanding(player));
  });

  matches.forEach((match) => {
    const team1Score = numericScore(match.team1_score);
    const team2Score = numericScore(match.team2_score);
    const hasScores = team1Score !== null && team2Score !== null;
    const team1 = normalizePlayerList(match.team1_players || match.team1 || []);
    const team2 = normalizePlayerList(match.team2_players || match.team2 || []);
    const byes = normalizePlayerList(match.bye_players || match.byes || []);

    [...team1, ...team2, ...byes].forEach((player) => ensureStanding(rows, player));

    byes.forEach((player) => {
      rows.get(String(player.id)).byes += 1;
    });

    if (!hasScores) return;

    const team1Won = team1Score > team2Score;
    const team2Won = team2Score > team1Score;

    team1.forEach((player) => applyGame(rows.get(String(player.id)), team1Score, team2Score, team1Won, team2Won));
    team2.forEach((player) => applyGame(rows.get(String(player.id)), team2Score, team1Score, team2Won, team1Won));
  });

  return [...rows.values()]
    .map((row) => ({
      ...row,
      winPct: row.games > 0 ? row.wins / row.games : 0,
      pointDiff: row.pointsFor - row.pointsAgainst,
    }))
    .sort((a, b) => {
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
      if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
      return a.displayName.localeCompare(b.displayName);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function summaryTextForStandings(groupName, sessionDate, standings = []) {
  const title = groupName || "Round Robin";
  const dateLabel = sessionDate ? new Date(sessionDate).toLocaleDateString("en-US") : new Date().toLocaleDateString("en-US");
  const nameWidth = Math.max(10, ...standings.map((row) => String(row.displayName || "").length + 1));
  const lines = [
    `${title} Results`,
    dateLabel,
    "".padEnd(42, "-"),
    `Rank Player${"".padEnd(Math.max(1, nameWidth - 6))}W-L   W%    Diff`,
  ];

  standings.forEach((row) => {
    const rank = `${row.rank}.`.padEnd(5);
    const name = String(row.displayName || "Player").padEnd(nameWidth);
    const record = `${row.wins}-${row.losses}`.padEnd(6);
    const pct = `${Math.round((row.winPct || 0) * 1000) / 10}%`.padEnd(7);
    const diff = row.pointDiff > 0 ? `+${row.pointDiff}` : String(row.pointDiff || 0);
    lines.push(`${rank}${name}${record}${pct}${diff}`);
  });

  lines.push("", "Great games, everyone!");
  return lines.join("\n");
}

export function roundRobinPlayerLabel(name = "") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Player";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].slice(0, 1)}.`;
}

function createMatrix(size) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function createCourtMatrix(playerCount, courtCount) {
  return Array.from({ length: playerCount }, () => Array(courtCount).fill(0));
}

function shuffleArray(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function chooseByes({ playerIndexes, byeCount, byeCounts, previousByes, roundIndex }) {
  if (byeCount <= 0) return [];

  const candidates = [...playerIndexes].sort((a, b) => {
    const previousPenaltyA = previousByes.has(a) ? 1000 : 0;
    const previousPenaltyB = previousByes.has(b) ? 1000 : 0;
    const scoreA = byeCounts[a] * 100 + previousPenaltyA + rotatePenalty(a, roundIndex, playerIndexes.length);
    const scoreB = byeCounts[b] * 100 + previousPenaltyB + rotatePenalty(b, roundIndex, playerIndexes.length);
    return scoreA - scoreB;
  });

  return candidates.slice(0, byeCount).sort((a, b) => a - b);
}

function rotatePenalty(playerIndex, roundIndex, playerCount) {
  return (playerIndex - roundIndex + playerCount) % playerCount;
}

function createMatchesForRound({
  playingIndexes,
  courtCount,
  roundIndex,
  totalPlayers,
  partnerHistory,
  opponentHistory,
  forbiddenPartnerPairs,
  usedPartnerPairs,
}) {
  const shouldUsePerfectEight =
    totalPlayers === 8 &&
    playingIndexes.length === 8 &&
    courtCount === 2 &&
    roundIndex < PERFECT_EIGHT_PARTNER_ROUNDS.length;

  if (shouldUsePerfectEight) {
    const perfectMatches = createPerfectEightMatches(playingIndexes, roundIndex, opponentHistory);
    const historicalPartnerPairs = usedPartnerPairs || partnerPairsFromHistory(partnerHistory);
    if (!matchesContainPartnerPairs(perfectMatches, historicalPartnerPairs)) return perfectMatches;
  }

  const strictPartnerPairs = shouldUsePerfectEight
    ? mergeSets(forbiddenPartnerPairs, usedPartnerPairs || partnerPairsFromHistory(partnerHistory))
    : forbiddenPartnerPairs;

  return createMatchesFromPool(playingIndexes, courtCount, partnerHistory, opponentHistory, {
    forbiddenPartnerPairs: strictPartnerPairs,
    strictUniquePartners: shouldUsePerfectEight,
  });
}

function createPerfectEightMatches(playingIndexes, roundIndex, opponentHistory) {
  const pairs = PERFECT_EIGHT_PARTNER_ROUNDS[roundIndex].map(([first, second]) => [
    playingIndexes[first],
    playingIndexes[second],
  ]);
  const pairings = [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]],
  ];
  let bestPairing = pairings[0];
  let bestScore = Number.POSITIVE_INFINITY;

  pairings.forEach((pairing) => {
    const score = pairing.reduce((total, [firstPairIndex, secondPairIndex]) => {
      const firstPair = pairs[firstPairIndex];
      const secondPair = pairs[secondPairIndex];
      return total + opponentScoreBetweenPairs(firstPair, secondPair, opponentHistory);
    }, 0);
    if (score < bestScore) {
      bestScore = score;
      bestPairing = pairing;
    }
  });

  return bestPairing.map(([firstPairIndex, secondPairIndex]) => [
    ...pairs[firstPairIndex],
    ...pairs[secondPairIndex],
  ]);
}

function opponentScoreBetweenPairs(firstPair, secondPair, opponentHistory) {
  return firstPair.reduce((sum, firstPlayer) => (
    sum + secondPair.reduce((innerSum, secondPlayer) => innerSum + opponentHistory[firstPlayer][secondPlayer], 0)
  ), 0);
}

function createMatchesFromPool(playingIndexes, courtCount, partnerHistory, opponentHistory, options = {}) {
  const requiredPlayers = courtCount * 4;
  const forbiddenPartnerPairs = options.forbiddenPartnerPairs || new Set();
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const pool = choosePlayablePool(shuffleArray(playingIndexes), requiredPlayers, forbiddenPartnerPairs);
    const pairs = createPartnerPairs(pool, partnerHistory, opponentHistory, forbiddenPartnerPairs);
    if (pairs.length * 2 === requiredPlayers) return createMatchesFromPairs(pairs, partnerHistory, opponentHistory);
  }

  throw new Error(
    options.strictUniquePartners
      ? "Unable to generate the next game without repeating an existing partner."
      : "Unable to generate the next game without repeating a partner from the previous round."
  );
}

function choosePlayablePool(playingIndexes, requiredPlayers, forbiddenPartnerPairs) {
  if (playingIndexes.length === requiredPlayers) return shuffleArray(playingIndexes);

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const candidate = shuffleArray(playingIndexes).slice(0, requiredPlayers);
    if (canPairWithoutForbiddenPartners(candidate, forbiddenPartnerPairs)) return candidate;
  }

  return shuffleArray(playingIndexes).slice(0, requiredPlayers);
}

function canPairWithoutForbiddenPartners(playerIndexes, forbiddenPartnerPairs) {
  if (playerIndexes.length < 2) return true;
  const [first, ...rest] = playerIndexes;
  for (let index = 0; index < rest.length; index += 1) {
    const candidate = rest[index];
    if (forbiddenPartnerPairs.has(pairKey(first, candidate))) continue;
    const remaining = rest.filter((_, restIndex) => restIndex !== index);
    if (canPairWithoutForbiddenPartners(remaining, forbiddenPartnerPairs)) return true;
  }
  return false;
}

function createPartnerPairs(playerIndexes, partnerHistory, opponentHistory, forbiddenPartnerPairs) {
  const pool = [...playerIndexes];
  const pairs = [];

  while (pool.length >= 2) {
    const player = pool.pop();
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    let foundAllowedPartner = false;

    pool.forEach((candidate, index) => {
      if (forbiddenPartnerPairs.has(pairKey(player, candidate))) return;
      const score =
        partnerHistory[player][candidate] * 1000 +
        opponentHistory[player][candidate] +
        Math.random() * 0.5;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
        foundAllowedPartner = true;
      }
    });

    if (!foundAllowedPartner) return [];
    pairs.push([player, pool.splice(bestIndex, 1)[0]]);
  }

  return pairs;
}

function createMatchesFromPairs(pairs, partnerHistory, opponentHistory) {
  const availablePairs = shuffleArray(pairs);
  const matches = [];

  while (availablePairs.length >= 2) {
    const firstPair = availablePairs.pop();
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    availablePairs.forEach((candidatePair, index) => {
      const allOpponents = [
        [firstPair[0], candidatePair[0]],
        [firstPair[0], candidatePair[1]],
        [firstPair[1], candidatePair[0]],
        [firstPair[1], candidatePair[1]],
      ];
      const opponentScore = allOpponents.reduce((sum, [a, b]) => sum + opponentHistory[a][b], 0);
      const totalInteraction = allOpponents.reduce((sum, [a, b]) => sum + partnerHistory[a][b] + opponentHistory[a][b], 0);
      const score = totalInteraction + opponentScore * 0.1 + Math.random() * 0.5;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    matches.push([...firstPair, ...availablePairs.splice(bestIndex, 1)[0]]);
  }

  return matches;
}

function previousPartnerPairsFromCourts(previousCourts = []) {
  const pairs = new Set();
  previousCourts.forEach((court) => {
    if (!Array.isArray(court) || court.length !== 4) return;
    pairs.add(pairKey(court[0], court[1]));
    pairs.add(pairKey(court[2], court[3]));
  });
  return pairs;
}

function partnerPairsFromHistory(partnerHistory) {
  const pairs = new Set();
  partnerHistory.forEach((row, first) => {
    row.forEach((count, second) => {
      if (second > first && count > 0) pairs.add(pairKey(first, second));
    });
  });
  return pairs;
}

function matchesContainPartnerPairs(matches, partnerPairs) {
  if (!partnerPairs || partnerPairs.size === 0) return false;
  return matches.some((match) => (
    match.length === 4 &&
    (partnerPairs.has(pairKey(match[0], match[1])) || partnerPairs.has(pairKey(match[2], match[3])))
  ));
}

function mergeSets(...sets) {
  const merged = new Set();
  sets.forEach((set) => {
    if (!set) return;
    set.forEach((value) => merged.add(value));
  });
  return merged;
}

function pairKey(first, second) {
  return [Number(first), Number(second)].sort((a, b) => a - b).join(":");
}

function balanceCourts(matches, courtHistory, courtCount, previousCourts) {
  const available = [...matches];
  const assigned = [];

  for (let courtIndex = 0; courtIndex < courtCount; courtIndex += 1) {
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    available.forEach((match, index) => {
      const courtFatigue = match.reduce((sum, playerIndex) => sum + courtHistory[playerIndex][courtIndex], 0);
      const previousOverlap = (previousCourts[courtIndex] || []).filter((playerIndex) => match.includes(playerIndex)).length;
      const score = courtFatigue + (previousOverlap >= 3 ? 1000 : previousOverlap * 5) + Math.random() * 0.1;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    assigned[courtIndex] = available.length ? available.splice(bestIndex, 1)[0] : [];
  }

  return assigned;
}

function updateHistory(round, players, partnerHistory, opponentHistory, courtHistory) {
  round.courts.forEach((court, courtIndex) => {
    const team1 = normalizePlayerList(court.team1).map((player) => players.findIndex((item) => item.id === player.id));
    const team2 = normalizePlayerList(court.team2).map((player) => players.findIndex((item) => item.id === player.id));
    if (team1.length !== 2 || team2.length !== 2) return;
    const [a, b] = team1;
    const [c, d] = team2;

    [a, b, c, d].forEach((playerIndex) => {
      courtHistory[playerIndex][courtIndex] += 1;
    });

    partnerHistory[a][b] += 1;
    partnerHistory[b][a] += 1;
    partnerHistory[c][d] += 1;
    partnerHistory[d][c] += 1;

    team1.forEach((playerIndex) => {
      team2.forEach((opponentIndex) => {
        opponentHistory[playerIndex][opponentIndex] += 1;
        opponentHistory[opponentIndex][playerIndex] += 1;
      });
    });
  });
}

function numericScore(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePlayerList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((player) => player && player.id).map((player) => ({
    ...player,
    id: String(player.id),
    displayName: player.displayName || player.display_name || player.name || "Player",
  }));
}

function blankStanding(player) {
  return {
    playerId: String(player.id),
    displayName: player.displayName || player.display_name || player.name || "Player",
    games: 0,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    byes: 0,
  };
}

function ensureStanding(rows, player) {
  const key = String(player.id);
  if (!rows.has(key)) rows.set(key, blankStanding(player));
}

function applyGame(row, pointsFor, pointsAgainst, won, opponentWon) {
  row.games += 1;
  row.pointsFor += pointsFor;
  row.pointsAgainst += pointsAgainst;
  if (won) row.wins += 1;
  if (opponentWon) row.losses += 1;
}
