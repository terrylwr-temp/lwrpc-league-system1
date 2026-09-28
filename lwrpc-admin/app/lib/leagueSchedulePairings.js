// Location preference is deliberately separate from schedule eligibility.
const BYE = "BYE";

function locationId(team) {
  const id = team?.home_location_id;
  return id === null || id === undefined || id === "" ? null : String(id);
}

export function countSameLocationMatchups(rounds, teams) {
  const locations = new Map(teams.map((team) => [team.id, locationId(team)]));
  return rounds.flat().filter((game) => !game.is_bye &&
    locations.get(game.home_team_id) != null &&
    locations.get(game.home_team_id) === locations.get(game.away_team_id)).length;
}

export function generateLeagueRoundRobin(teams) {
  const list = [...teams];
  if (list.length % 2) list.push({ id: BYE });
  const rounds = [];
  for (let round = 0; round < list.length - 1; round++) {
    rounds.push(Array.from({ length: list.length / 2 }, (_, i) => {
      const home = list[i].id;
      const away = list[list.length - 1 - i].id;
      return {
        home_team_id: round % 2 === 0 ? home : away,
        away_team_id: round % 2 === 0 ? away : home,
        is_bye: home === BYE || away === BYE,
      };
    }));
    list.splice(1, 0, list.pop());
  }
  return rounds;
}

function repeatRounds(base, weekCount) {
  return Array.from({ length: weekCount }, (_, index) => base[index % base.length].map((game) =>
    Math.floor(index / base.length) % 2 && !game.is_bye
      ? { ...game, home_team_id: game.away_team_id, away_team_id: game.home_team_id }
      : { ...game }));
}

function pairKey(game) {
  return JSON.stringify([game.home_team_id, game.away_team_id].sort());
}

function compareScores(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * Preserve one appearance per round and no repeated opponent/bye within a
 * round-robin cycle. Search zero-location schedules first, then raise only
 * that soft cost. A bounded search and improving swaps keep client work finite.
 * evaluate returns hard-quality costs (omissions, court warnings) BEFORE the
 * location cost. It must be pure: no candidate may persist rows.
 */
export function scheduleLeagueRounds(teams, requestedWeeks, {
  evaluate = () => [0, 0],
  searchNodeLimit = 100000,
} = {}) {
  if (teams.length < 2) return [];
  const base = generateLeagueRoundRobin(teams);
  const weekCount = Number(requestedWeeks || base.length);
  let best = repeatRounds(base, weekCount);
  const score = (rounds) => [...evaluate(rounds), countSameLocationMatchups(rounds, teams)];
  let bestScore = score(best);
  const consider = (rounds) => {
    const candidateScore = score(rounds);
    if (compareScores(candidateScore, bestScore) < 0) {
      best = rounds.map((round) => round.map((game) => ({ ...game })));
      bestScore = candidateScore;
    }
  };

  const ids = teams.map((team) => team.id);
  if (ids.length % 2) ids.push(BYE);
  const locations = new Map(teams.map((team) => [team.id, locationId(team)]));
  const sameLocation = (a, b) => a !== BYE && b !== BYE && locations.get(a) != null && locations.get(a) === locations.get(b);
  const cycleLength = ids.length - 1;
  const rounds = [];
  let nodes = 0;
  let totalNodes = 0;
  const perBudgetLimit = Math.max(1000, Math.floor(searchNodeLimit / 10));
  const exhausted = () => nodes >= perBudgetLimit || totalNodes >= searchNodeLimit;
  const tick = () => { nodes++; totalNodes++; };
  const deficitBound = (length, available) => {
    const deficits = new Map();
    for (const a of ids) {
      const location = locations.get(a);
      if (location == null) continue;
      const deficit = Math.max(0, length - ids.filter((b) => a !== b && available(a, b) && !sameLocation(a, b)).length);
      deficits.set(location, (deficits.get(location) || 0) + deficit);
    }
    // A same-location game satisfies two deficits at that specific location.
    return [...deficits.values()].reduce((sum, deficit) => sum + Math.ceil(deficit / 2), 0);
  };
  // Sum of per-team opponent deficits is a valid lower bound, including the
  // unique bye opportunity for odd divisions. Full cycles cannot omit a pair.
  const lowerBound = Array.from({ length: Math.ceil(weekCount / cycleLength) }, (_, cycle) => {
    const length = Math.min(cycleLength, weekCount - cycle * cycleLength);
    return deficitBound(length, () => true);
  }).reduce((a, b) => a + b, 0);
  if (bestScore.slice(0, -1).every((value) => value === 0) && bestScore.at(-1) === lowerBound) return best;

  const search = (budget) => {
    const visitWeek = (cost, used) => {
      if (exhausted()) return false;
      if (rounds.length === weekCount) { consider(rounds); return true; }
      const week = rounds.length;
      const cycleUsed = week % cycleLength === 0 ? new Set() : used;
      const games = [];
      const remainingWeeks = Math.min(cycleLength - week % cycleLength, weekCount - week);
      // Prune stranded teams rather than accept the first locally cheap round.
      const available = (a, b) => a !== b && !cycleUsed.has(pairKey({ home_team_id: a, away_team_id: b })) &&
        (cost < budget || !sameLocation(a, b));
      if (ids.some((a) => ids.filter((b) => available(a, b)).length < remainingWeeks)) return false;
      const deficit = deficitBound(remainingWeeks, available);
      if (cost + deficit > budget) return false;

      const pair = (remaining, roundCost) => {
        tick();
        if (exhausted()) return false;
        if (!remaining.length) {
          rounds.push(games.map((game) => ({ ...game })));
          // Host orientation affects only this date's court assignment. Find a
          // feasible orientation once; do not repeat future pairing searches
          // for equivalent home/away permutations of the same matching.
          const orient = (index) => {
            tick();
            if (exhausted()) return false;
            if (evaluate(rounds).every((value) => value === 0)) return true;
            if (index === games.length) return false;
            if (orient(index + 1)) return true;
            const game = rounds.at(-1)[index];
            if (game.is_bye) return false;
            [game.home_team_id, game.away_team_id] = [game.away_team_id, game.home_team_id];
            if (orient(index + 1)) return true;
            [game.home_team_id, game.away_team_id] = [game.away_team_id, game.home_team_id];
            return false;
          };
          if (orient(0)) {
            const nextUsed = new Set(cycleUsed);
            games.forEach((game) => nextUsed.add(pairKey(game)));
            if (visitWeek(cost + roundCost, nextUsed)) { rounds.pop(); return true; }
          }
          rounds.pop();
          return false;
        }
        const first = [...remaining].sort((a, b) =>
          remaining.filter((id) => available(a, id)).length - remaining.filter((id) => available(b, id)).length)[0];
        const partners = remaining.filter((id) => available(first, id)).sort((a, b) =>
          Number(sameLocation(first, a)) - Number(sameLocation(first, b)));
        for (const second of partners) {
          const extra = Number(sameLocation(first, second));
          if (cost + roundCost + extra > budget) continue;
          // Try the baseline orientation; court feasibility may reverse it.
          const baseline = best[week].find((game) => game.home_team_id === first || game.away_team_id === first);
          const [home, away] = baseline?.home_team_id === first ? [first, second] : [second, first];
          games.push({ home_team_id: home, away_team_id: away, is_bye: home === BYE || away === BYE });
          if (pair(remaining.filter((id) => id !== first && id !== second), roundCost + extra)) { games.pop(); return true; }
          games.pop();
        }
        return false;
      };
      return pair(ids, 0);
    };
    return visitWeek(0, new Set());
  };

  // A positive mathematical lower bound proves zero impossible without search.
  const maximumCost = bestScore.slice(0, -1).some((value) => value > 0)
    ? weekCount * Math.floor(teams.length / 2) : bestScore.at(-1);
  for (let budget = lowerBound; budget <= maximumCost && totalNodes < searchNodeLimit; budget++) {
    nodes = 0;
    if (search(budget)) break;
  }

  // Evaluate alternate round ordering and two-game opponent swaps against the
  // full draft. Hard-quality costs always outrank the same-location objective.
  let improved = true;
  for (let pass = 0; improved && pass < 8; pass++) {
    if (bestScore.every((value) => value === 0)) break;
    improved = false;
    const previousScore = bestScore;
    for (let week = 0; week < weekCount; week++) {
      const cycleStart = Math.floor(week / cycleLength) * cycleLength;
      const cycleEnd = Math.min(cycleStart + cycleLength, weekCount);
      for (let i = 0; i < best[week].length; i++) {
        if (best[week][i].is_bye) continue;
        const candidate = best.map((round) => [...round]);
        const game = candidate[week][i];
        candidate[week][i] = { ...game, home_team_id: game.away_team_id, away_team_id: game.home_team_id };
        consider(candidate);
      }
      for (let other = week + 1; other < cycleEnd; other++) {
        const candidate = [...best];
        [candidate[week], candidate[other]] = [candidate[other], candidate[week]];
        consider(candidate);
      }
      for (let i = 0; i < best[week].length; i++) for (let j = i + 1; j < best[week].length; j++) {
        const a = best[week][i];
        const b = best[week][j];
        if (a.is_bye || b.is_bye) continue;
        for (const swapHome of [false, true]) {
          const changed = swapHome
            ? [{ ...a, away_team_id: b.home_team_id }, { ...b, home_team_id: a.away_team_id }]
            : [{ ...a, away_team_id: b.away_team_id }, { ...b, away_team_id: a.away_team_id }];
          const candidate = best.map((round) => [...round]);
          candidate[week][i] = changed[0];
          candidate[week][j] = changed[1];
          const keys = candidate.slice(cycleStart, cycleEnd).flat().map(pairKey);
          if (new Set(keys).size === keys.length) consider(candidate);
        }
      }
    }
    improved = compareScores(bestScore, previousScore) < 0;
  }
  return best;
}
