export function suggestedRoundRobinCourts(playerCount, configuredCourtCount = 8) {
  const count = Number(playerCount || 0);
  const maxConfigured = Math.max(1, Number(configuredCourtCount || 1));
  if (count < 4) return 0;
  return Math.min(maxConfigured, Math.max(1, Math.floor(count / 4)));
}

// Six-round tournament designs for the most common two-court rosters. These
// balance the entire session instead of making a locally optimal choice after
// each game. The eight-player design gives everyone three games per court,
// never repeats a partner, and caps opponents at three. The nine-player design
// rotates six different byes, never repeats a partner, and caps opponents at two.
const PERFECT_EIGHT_ROUNDS = [
  [[[0, 1], [2, 3]], [[4, 5], [6, 7]]],
  [[[4, 6], [5, 7]], [[0, 2], [1, 3]]],
  [[[0, 3], [4, 7]], [[1, 2], [5, 6]]],
  [[[1, 5], [2, 6]], [[0, 4], [3, 7]]],
  [[[0, 7], [1, 6]], [[2, 5], [3, 4]]],
  [[[2, 4], [3, 5]], [[0, 6], [1, 7]]],
];

const PERFECT_NINE_ROUNDS = [
  { bye: 0, courts: [[[1, 2], [3, 4]], [[5, 6], [7, 8]]] },
  { bye: 1, courts: [[[0, 5], [3, 7]], [[2, 6], [4, 8]]] },
  { bye: 2, courts: [[[4, 5], [6, 8]], [[0, 3], [1, 7]]] },
  { bye: 3, courts: [[[1, 6], [5, 7]], [[0, 8], [2, 4]]] },
  { bye: 4, courts: [[[2, 3], [6, 7]], [[0, 1], [5, 8]]] },
  { bye: 5, courts: [[[0, 7], [2, 8]], [[1, 3], [4, 6]]] },
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
  const groupHistory = createMatrix(totalPlayers);
  const groupSignatureHistory = new Map();
  const courtHistory = createCourtMatrix(totalPlayers, resolvedCourtCount);
  const courtGroupHistory = Array.from({ length: resolvedCourtCount }, () => []);
  const byeCounts = Array(totalPlayers).fill(0);
  let previousByes = new Set();
  let previousCourts = [];
  const rounds = [];

  for (let roundIndex = 0; roundIndex < roundsToPlay; roundIndex += 1) {
    const byeCount = Math.max(0, totalPlayers - resolvedCourtCount * 4);
    const perfectRound = createPerfectBalancedRound({
      playerIndexes: workingIndexes,
      courtCount: resolvedCourtCount,
      roundIndex,
      partnerHistory,
      opponentHistory,
      byeCounts,
      previousByes,
    });
    const byes = perfectRound?.byes || chooseByes({
      playerIndexes: workingIndexes,
      byeCount,
      byeCounts,
      previousByes,
      roundIndex,
    });
    const byeSet = new Set(byes);
    const playingIndexes = workingIndexes.filter((index) => !byeSet.has(index));
    const matches = perfectRound?.matches || createMatchesForRound({
      playingIndexes,
      courtCount: resolvedCourtCount,
      partnerHistory,
      opponentHistory,
      groupHistory,
      groupSignatureHistory,
      courtHistory,
      forbiddenPartnerPairs: previousPartnerPairsFromCourts(previousCourts),
      usedPartnerPairs: partnerPairsFromHistory(partnerHistory),
    });
    const balancedMatches = perfectRound?.matches || balanceCourts(matches, courtHistory, resolvedCourtCount, previousCourts, courtGroupHistory);
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
    updateHistory(round, activePlayers, partnerHistory, opponentHistory, groupHistory, groupSignatureHistory, courtHistory, courtGroupHistory);
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
  const groupHistory = createMatrix(totalPlayers);
  const groupSignatureHistory = new Map();
  const courtHistory = createCourtMatrix(totalPlayers, resolvedCourtCount);
  const courtGroupHistory = Array.from({ length: resolvedCourtCount }, () => []);
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
    recordGroupHistory(allPlayers, groupHistory, groupSignatureHistory, courtGroupHistory[courtIndex]);

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
  const perfectRound = createPerfectBalancedRound({
    playerIndexes,
    courtCount: resolvedCourtCount,
    roundIndex: previousRoundNumber,
    partnerHistory,
    opponentHistory,
    byeCounts,
    previousByes,
  });
  const byes = perfectRound?.byes || chooseByes({
    playerIndexes,
    byeCount,
    byeCounts,
    previousByes,
    roundIndex: previousRoundNumber,
  });
  const byeSet = new Set(byes);
  const playingIndexes = playerIndexes.filter((index) => !byeSet.has(index));
  const matches = perfectRound?.matches || createMatchesForRound({
    playingIndexes,
    courtCount: resolvedCourtCount,
    partnerHistory,
    opponentHistory,
    groupHistory,
    groupSignatureHistory,
    courtHistory,
    forbiddenPartnerPairs: previousPartnerPairs,
    usedPartnerPairs,
  });
  const balancedMatches = perfectRound?.matches || balanceCourts(matches, courtHistory, resolvedCourtCount, previousCourts, courtGroupHistory);

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

function createPerfectBalancedRound({
  playerIndexes,
  courtCount,
  roundIndex,
  partnerHistory,
  opponentHistory,
  byeCounts,
  previousByes,
}) {
  if (courtCount !== 2) return null;

  let blueprint = null;
  if (playerIndexes.length === 8 && roundIndex < PERFECT_EIGHT_ROUNDS.length) {
    blueprint = { courts: PERFECT_EIGHT_ROUNDS[roundIndex], bye: null };
  } else if (playerIndexes.length === 9 && roundIndex < PERFECT_NINE_ROUNDS.length) {
    blueprint = PERFECT_NINE_ROUNDS[roundIndex];
  }
  if (!blueprint) return null;

  const byes = blueprint.bye === null ? [] : [playerIndexes[blueprint.bye]];
  if (byes.length > 0) {
    const lowestByeCount = Math.min(...playerIndexes.map((playerIndex) => byeCounts[playerIndex] || 0));
    if ((byeCounts[byes[0]] || 0) > lowestByeCount || previousByes.has(byes[0])) return null;
  }

  const matches = blueprint.courts.map(([team1, team2]) => [
    ...team1.map((position) => playerIndexes[position]),
    ...team2.map((position) => playerIndexes[position]),
  ]);

  const repeatsPartner = matches.some(([a, b, c, d]) => (
    partnerHistory[a][b] > 0 || partnerHistory[c][d] > 0
  ));
  const exceedsOpponentLimit = matches.some(([a, b, c, d]) => (
    [a, b].some((playerIndex) => [c, d].some((opponentIndex) => opponentHistory[playerIndex][opponentIndex] >= 3))
  ));
  if (repeatsPartner || exceedsOpponentLimit) return null;

  return { byes, matches };
}

function createMatchesForRound({
  playingIndexes,
  courtCount,
  partnerHistory,
  opponentHistory,
  groupHistory,
  groupSignatureHistory,
  courtHistory,
  forbiddenPartnerPairs,
  usedPartnerPairs,
}) {
  const strictPartnerPairs = mergeSets(
    forbiddenPartnerPairs,
    usedPartnerPairs || partnerPairsFromHistory(partnerHistory)
  );

  try {
    return createMatchesFromPool(playingIndexes, courtCount, partnerHistory, opponentHistory, {
      forbiddenPartnerPairs: strictPartnerPairs,
      strictUniquePartners: true,
      groupHistory,
      groupSignatureHistory,
      courtHistory,
    });
  } catch {
    return createMatchesFromPool(playingIndexes, courtCount, partnerHistory, opponentHistory, {
      forbiddenPartnerPairs,
      strictUniquePartners: false,
      groupHistory,
      groupSignatureHistory,
      courtHistory,
    });
  }
}

function createMatchesFromPool(playingIndexes, courtCount, partnerHistory, opponentHistory, options = {}) {
  const requiredPlayers = courtCount * 4;
  const forbiddenPartnerPairs = options.forbiddenPartnerPairs || new Set();
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const pool = choosePlayablePool(shuffleArray(playingIndexes), requiredPlayers, forbiddenPartnerPairs);
    const pairs = createPartnerPairs(pool, partnerHistory, opponentHistory, forbiddenPartnerPairs);
    if (pairs.length * 2 === requiredPlayers) {
      return createMatchesFromPairs(
        pairs,
        partnerHistory,
        opponentHistory,
        options.groupHistory,
        options.groupSignatureHistory,
        options.courtHistory
      );
    }
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
  let bestPairs = null;
  let bestScore = Number.POSITIVE_INFINITY;

  function search(remainingPlayers, pairs, score) {
    if (remainingPlayers.length === 0) {
      if (score < bestScore) {
        bestScore = score;
        bestPairs = pairs;
      }
      return;
    }

    let player = null;
    let candidates = [];
    for (const candidatePlayer of remainingPlayers) {
      const eligiblePartners = remainingPlayers
        .filter((candidate) => candidate !== candidatePlayer && !forbiddenPartnerPairs.has(pairKey(candidatePlayer, candidate)))
        .sort((first, second) => partnerPairScore(candidatePlayer, first, partnerHistory, opponentHistory) - partnerPairScore(candidatePlayer, second, partnerHistory, opponentHistory));
      if (eligiblePartners.length === 0) return;
      if (player === null || eligiblePartners.length < candidates.length) {
        player = candidatePlayer;
        candidates = eligiblePartners;
      }
    }

    candidates.forEach((partner) => {
      const pairScore = partnerPairScore(player, partner, partnerHistory, opponentHistory);
      if (score + pairScore >= bestScore) return;
      search(
        remainingPlayers.filter((candidate) => candidate !== player && candidate !== partner),
        [...pairs, [player, partner]],
        score + pairScore
      );
    });
  }

  search([...playerIndexes], [], 0);
  return bestPairs || [];
}

function partnerPairScore(first, second, partnerHistory, opponentHistory) {
  return partnerHistory[first][second] * 1000 + opponentHistory[first][second];
}

function createMatchesFromPairs(pairs, partnerHistory, opponentHistory, groupHistory, groupSignatureHistory, courtHistory) {
  let bestMatches = null;
  let bestScore = Number.POSITIVE_INFINITY;

  function search(remainingPairs, matches, score) {
    if (remainingPairs.length === 0) {
      if (score < bestScore) {
        bestScore = score;
        bestMatches = matches;
      }
      return;
    }

    const [firstPair, ...otherPairs] = remainingPairs;
    otherPairs.forEach((opposingPair, opposingIndex) => {
      const match = [...firstPair, ...opposingPair];
      const matchScore = courtGroupScore(match, partnerHistory, opponentHistory, groupHistory, groupSignatureHistory, courtHistory);
      if (score + matchScore >= bestScore) return;
      search(
        otherPairs.filter((_, index) => index !== opposingIndex),
        [...matches, match],
        score + matchScore
      );
    });
  }

  search(shuffleArray(pairs), [], 0);
  return bestMatches || [];
}

function courtGroupScore(match, partnerHistory, opponentHistory, groupHistory, groupSignatureHistory, courtHistory) {
  const exactGroupRepeats = groupSignatureHistory?.get(playerGroupKey(match)) || 0;
  const courtFitScore = matchCourtFitScore(match, courtHistory);
  let coCourtHistory = 0;
  let opponentHistoryScore = 0;
  let partnerHistoryScore = 0;

  match.forEach((playerIndex, firstIndex) => {
    match.slice(firstIndex + 1).forEach((otherPlayerIndex, offset) => {
      coCourtHistory += groupHistory?.[playerIndex]?.[otherPlayerIndex] || 0;
      const secondIndex = firstIndex + offset + 1;
      const teammates = (firstIndex < 2 && secondIndex < 2) || (firstIndex >= 2 && secondIndex >= 2);
      if (teammates) {
        partnerHistoryScore += partnerHistory[playerIndex][otherPlayerIndex];
      } else {
        opponentHistoryScore += opponentHistory[playerIndex][otherPlayerIndex];
      }
    });
  });

  // A full repeated four-player court is the least desirable outcome. Repeated
  // two- and three-player clusters are then minimized through pair history.
  return exactGroupRepeats * 1_000_000 + courtFitScore * 10_000 + coCourtHistory * 1_000 + opponentHistoryScore * 10 + partnerHistoryScore;
}

function matchCourtFitScore(match, courtHistory) {
  if (!courtHistory?.length || !courtHistory[0]?.length) return 0;

  return Math.min(...courtHistory[0].map((_, courtIndex) => {
    const projected = match.map((playerIndex) => {
      const counts = [...courtHistory[playerIndex]];
      counts[courtIndex] += 1;
      return counts;
    });
    const ranges = projected.map((counts) => Math.max(...counts) - Math.min(...counts));
    return Math.max(...ranges) * 100 + ranges.reduce((sum, range) => sum + range, 0) * 10
      + projected.reduce((sum, counts) => sum + counts.reduce((innerSum, count) => innerSum + count * count, 0), 0);
  }));
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

function balanceCourts(matches, courtHistory, courtCount, previousCourts, courtGroupHistory = []) {
  const courtSlots = Math.min(courtCount, matches.length);
  let bestAssignment = matches.slice(0, courtSlots);
  let bestScore = null;

  function considerAssignment(assignment) {
    const projectedHistory = courtHistory.map((row) => [...row]);
    const previousOverlaps = [];
    const historicalGroupOverlaps = [];
    assignment.forEach((match, courtIndex) => {
      match.forEach((playerIndex) => {
        projectedHistory[playerIndex][courtIndex] += 1;
      });
      previousOverlaps.push((previousCourts[courtIndex] || []).filter((playerIndex) => match.includes(playerIndex)).length);
      historicalGroupOverlaps.push((courtGroupHistory[courtIndex] || []).reduce((sum, previousGroup) => {
        const sharedPlayers = previousGroup.filter((playerIndex) => match.includes(playerIndex)).length;
        if (sharedPlayers === 4) return sum + 1000;
        if (sharedPlayers === 3) return sum + 100;
        if (sharedPlayers === 2) return sum + 1;
        return sum;
      }, 0));
    });

    const courtRanges = projectedHistory.map((row) => Math.max(...row) - Math.min(...row));
    const score = [
      Math.max(...courtRanges),
      courtRanges.reduce((sum, range) => sum + range, 0),
      historicalGroupOverlaps.reduce((sum, overlap) => sum + overlap, 0),
      Math.max(0, ...historicalGroupOverlaps),
      Math.max(0, ...previousOverlaps),
      previousOverlaps.reduce((sum, overlap) => sum + overlap * overlap, 0),
      projectedHistory.reduce((sum, row) => sum + row.reduce((innerSum, count) => innerSum + count * count, 0), 0),
    ];

    if (!bestScore || compareNumericScores(score, bestScore) < 0) {
      bestScore = score;
      bestAssignment = assignment.map((match) => [...match]);
    }
  }

  function assignCourts(assignment, remaining) {
    if (assignment.length === courtSlots) {
      considerAssignment(assignment);
      return;
    }
    remaining.forEach((match, index) => {
      assignCourts([...assignment, match], remaining.filter((_, remainingIndex) => remainingIndex !== index));
    });
  }

  assignCourts([], matches.slice(0, courtSlots));
  return bestAssignment;
}

function compareNumericScores(first, second) {
  for (let index = 0; index < Math.max(first.length, second.length); index += 1) {
    const difference = Number(first[index] || 0) - Number(second[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function updateHistory(round, players, partnerHistory, opponentHistory, groupHistory, groupSignatureHistory, courtHistory, courtGroupHistory) {
  round.courts.forEach((court, courtIndex) => {
    const team1 = normalizePlayerList(court.team1).map((player) => players.findIndex((item) => item.id === player.id));
    const team2 = normalizePlayerList(court.team2).map((player) => players.findIndex((item) => item.id === player.id));
    if (team1.length !== 2 || team2.length !== 2) return;
    const [a, b] = team1;
    const [c, d] = team2;

    [a, b, c, d].forEach((playerIndex) => {
      courtHistory[playerIndex][courtIndex] += 1;
    });
    recordGroupHistory([a, b, c, d], groupHistory, groupSignatureHistory, courtGroupHistory[courtIndex]);

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

function recordGroupHistory(playerIndexes, groupHistory, groupSignatureHistory, courtGroups) {
  if (!Array.isArray(playerIndexes) || playerIndexes.length !== 4) return;
  groupSignatureHistory.set(playerGroupKey(playerIndexes), (groupSignatureHistory.get(playerGroupKey(playerIndexes)) || 0) + 1);
  playerIndexes.forEach((playerIndex, firstIndex) => {
    playerIndexes.slice(firstIndex + 1).forEach((otherPlayerIndex) => {
      groupHistory[playerIndex][otherPlayerIndex] += 1;
      groupHistory[otherPlayerIndex][playerIndex] += 1;
    });
  });
  courtGroups?.push([...playerIndexes]);
}

function playerGroupKey(playerIndexes) {
  return [...playerIndexes].map(Number).sort((a, b) => a - b).join(":");
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
