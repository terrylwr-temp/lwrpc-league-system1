import { supabase } from "./auth";

export const TOURNAMENT_DIVISION_COLORS = [
  {
    border: "border-l-blue-500",
    panel: "bg-blue-950/70",
    badge: "bg-blue-500/20 text-blue-100",
    accent: "text-blue-200",
    publicBadge: "bg-blue-100 text-blue-900",
    standingsPanel: "border-blue-500/70 bg-blue-950/80",
  },
  {
    border: "border-l-rose-500",
    panel: "bg-rose-950/60",
    badge: "bg-rose-400/25 text-rose-100",
    accent: "text-rose-200",
    publicBadge: "bg-rose-100 text-rose-950",
    standingsPanel: "border-rose-500/70 bg-rose-950/70",
  },
  {
    border: "border-l-emerald-500",
    panel: "bg-emerald-950/70",
    badge: "bg-emerald-400/25 text-emerald-100",
    accent: "text-emerald-200",
    publicBadge: "bg-emerald-100 text-emerald-900",
    standingsPanel: "border-emerald-500/70 bg-emerald-950/70",
  },
  {
    border: "border-l-orange-400",
    panel: "bg-stone-950/70",
    badge: "bg-orange-400/25 text-orange-100",
    accent: "text-orange-200",
    publicBadge: "bg-orange-100 text-orange-950",
    standingsPanel: "border-orange-400/70 bg-stone-950/75",
  },
  {
    border: "border-l-fuchsia-400",
    panel: "bg-indigo-950/70",
    badge: "bg-fuchsia-400/25 text-fuchsia-100",
    accent: "text-fuchsia-200",
    publicBadge: "bg-fuchsia-100 text-fuchsia-950",
    standingsPanel: "border-fuchsia-400/70 bg-indigo-950/75",
  },
  {
    border: "border-l-cyan-400",
    panel: "bg-slate-900/80",
    badge: "bg-cyan-400/25 text-cyan-100",
    accent: "text-cyan-200",
    publicBadge: "bg-cyan-100 text-cyan-950",
    standingsPanel: "border-cyan-400/70 bg-slate-900/85",
  },
];

export function tournamentDivisionColors(value) {
  const text = String(value || "Unassigned");
  const index = Math.abs([...text].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % TOURNAMENT_DIVISION_COLORS.length;
  return TOURNAMENT_DIVISION_COLORS[index];
}

export function tournamentDisplayName(tournament) {
  return tournament?.name || "Tournament";
}

export function tournamentFormat(settings = {}) {
  const value = String(settings?.format || settings?.tournamentFormat || "round_robin").trim().toLowerCase();
  if (["round_robin_top4", "round-robin-top4", "round_robin_top_4", "round-robin-top-4", "rr_top4", "rr-top4"].includes(value)) return "round_robin_top4";
  if (["single", "single_elimination", "single-elimination"].includes(value)) return "single_elimination";
  if (["double", "double_elimination", "double-elimination"].includes(value)) return "double_elimination";
  return "round_robin";
}

export function isEliminationTournament(settings = {}) {
  const format = tournamentFormat(settings);
  return format === "single_elimination" || format === "double_elimination";
}

export function isRoundRobinTop4Tournament(settings = {}) {
  return tournamentFormat(settings) === "round_robin_top4";
}

export function isBracketMatch(match = {}) {
  return String(match.legacy_id || "").startsWith("BR|");
}

export function tournamentFormatLabel(settings = {}) {
  const format = tournamentFormat(settings);
  if (format === "single_elimination") return "Single Elimination";
  if (format === "double_elimination") return "Double Elimination";
  if (format === "round_robin_top4") return "Round Robin + Top 4 Playoff";
  return "Round Robin";
}

export async function loadPublicTournaments() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, name, slug, public_status, updated_at")
    .eq("public_status", "public")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function loadPublicTournament(identifier) {
  const tournament = await loadTournamentRecord(identifier);
  if (!tournament) return null;

  const [divisions, teams, courts, matches] = await Promise.all([
    loadTournamentDivisions(tournament.id),
    loadTournamentTeams(tournament.id),
    loadTournamentCourts(tournament.id),
    loadTournamentMatches(tournament.id),
  ]);

  return {
    tournament,
    divisions,
    teams,
    courts,
    matches,
  };
}

async function loadTournamentRecord(identifier) {
  const clean = String(identifier || "").trim();
  if (!clean) return null;

  const query = supabase
    .from("tournaments")
    .select("id, name, slug, public_status, settings, updated_at")
    .eq("public_status", "public");

  const { data, error } = isUuid(clean)
    ? await query.eq("id", clean).maybeSingle()
    : await query.eq("slug", clean).maybeSingle();

  if (error) throw error;
  return data || null;
}

async function loadTournamentDivisions(tournamentId) {
  const { data, error } = await supabase
    .from("tournament_divisions")
    .select("id, name, sort_order, is_active, settings")
    .eq("tournament_id", tournamentId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function loadTournamentTeams(tournamentId) {
  const { data, error } = await supabase
    .from("tournament_teams")
    .select("id, division_id, name, line_number, seed, player_1_name, player_2_name, player_1_checked_in, player_2_checked_in, checked_in")
    .eq("tournament_id", tournamentId)
    .order("name", { ascending: true })
    .order("line_number", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function loadTournamentCourts(tournamentId) {
  const { data, error } = await supabase
    .from("tournament_courts")
    .select("id, name, sort_order, current_match_id")
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function loadTournamentMatches(tournamentId) {
  const { data, error } = await supabase
    .from("tournament_matches")
    .select(`
      id,
      legacy_id,
      division_id,
      home_team_id,
      away_team_id,
      court_id,
      line_number,
      status,
      result_type,
      winner_team_id,
      home_score,
      away_score,
      game_scores,
      score_text,
      queue_entered_at,
      assigned_at,
      completed_at,
      created_order,
      division:tournament_divisions(id, name, is_active),
      home_team:tournament_teams!tournament_matches_home_team_id_fkey(id, name, player_1_name, player_2_name, seed),
      away_team:tournament_teams!tournament_matches_away_team_id_fkey(id, name, player_1_name, player_2_name, seed),
      court:tournament_courts!tournament_matches_court_id_fkey(id, name),
      winner_team:tournament_teams!tournament_matches_winner_team_id_fkey(id, name)
    `)
    .eq("tournament_id", tournamentId)
    .order("created_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export function standingsByDivision(matches, teams = [], divisions = [], settings = {}) {
  const teamRecords = Object.fromEntries((teams || []).map((team) => [String(team.id), team]));
  const divisionsById = Object.fromEntries((divisions || []).map((division) => [String(division.id), division]));
  const activeDivisionIds = new Set((divisions || []).filter((division) => division.is_active !== false).map((division) => String(division.id)));
  const standings = {};

  (teams || [])
    .filter((team) => activeDivisionIds.size === 0 || activeDivisionIds.has(String(team.division_id)))
    .forEach((team) => {
      const divisionName = divisionsById[String(team.division_id)]?.name || "Unassigned";
      const teamName = team.name || "Team";
      standings[divisionName] ||= {};
      standings[divisionName][teamName] ||= blankStanding(teamName, team);
    });

  (matches || [])
    .filter((match) => !isBracketMatch(match) && match.division?.is_active !== false && match.status === "done" && match.result_type !== "not_played")
    .forEach((match) => {
      const divisionName = match.division?.name || "Unassigned";
      const homeName = match.home_team?.name || "Home";
      const awayName = match.away_team?.name || "Away";

      if (!standings[divisionName]) standings[divisionName] = {};
      if (!standings[divisionName][homeName]) standings[divisionName][homeName] = blankStanding(homeName, match.home_team || teamRecords[String(match.home_team_id)]);
      if (!standings[divisionName][awayName]) standings[divisionName][awayName] = blankStanding(awayName, match.away_team || teamRecords[String(match.away_team_id)]);

      const homeScore = Number(match.home_score || 0);
      const awayScore = Number(match.away_score || 0);

      standings[divisionName][homeName].pf += homeScore;
      standings[divisionName][homeName].pa += awayScore;
      standings[divisionName][awayName].pf += awayScore;
      standings[divisionName][awayName].pa += homeScore;

      const winnerName = match.winner_team?.name ||
        (homeScore > awayScore ? homeName : awayScore > homeScore ? awayName : "");

      if (winnerName === homeName) {
        standings[divisionName][homeName].w += 1;
        standings[divisionName][awayName].l += 1;
      } else if (winnerName === awayName) {
        standings[divisionName][awayName].w += 1;
        standings[divisionName][homeName].l += 1;
      }
    });

  return Object.fromEntries(
    Object.entries(standings).map(([division, rows]) => [
      division,
      sortTournamentStandings(Object.values(rows), settings?.standingsRules),
    ])
  );
}

export function tournamentStandingLabel(row) {
  return row?.regularSeasonStanding ? `${row.team} (${row.regularSeasonStanding})` : row?.team || "Team";
}

export function bracketByDivision(matches = [], teams = [], divisions = [], settings = {}) {
  const format = bracketDisplayFormat(settings);
  const teamsById = Object.fromEntries((teams || []).map((team) => [String(team.id), team]));
  const activeDivisions = (divisions || []).filter((division) => division.is_active !== false);
  const fallbackDivisions = activeDivisions.length > 0 ? activeDivisions : divisions || [];

  return fallbackDivisions.map((division) => {
    const divisionMatches = withBracketEliminationMarkers(withBracketSlotSources(withBracketMatchNumbers((matches || [])
      .filter((match) => String(match.division_id || "") === String(division.id))
      .map((match) => bracketMatchRow(match, teamsById))
      .filter((match) => match.bracketMeta)
      .sort((a, b) =>
        bracketSectionOrder(a.bracketMeta.bracket, format) - bracketSectionOrder(b.bracketMeta.bracket, format) ||
        Number(a.bracketMeta.round || 0) - Number(b.bracketMeta.round || 0) ||
        Number(a.bracketMeta.match || 0) - Number(b.bracketMeta.match || 0) ||
        Number(a.created_order || 0) - Number(b.created_order || 0)
      ), format)), format);

    return {
      division,
      sections: bracketSections(divisionMatches, format),
      champion: bracketChampion(divisionMatches, teamsById, format),
    };
  }).filter((division) => division.sections.length > 0);
}

function bracketDisplayFormat(settings = {}) {
  const format = tournamentFormat(settings);
  return format === "round_robin_top4" ? "single_elimination" : format;
}

export function bracketMatchesById(matches = [], teams = [], divisions = [], settings = {}) {
  return Object.fromEntries(
    bracketByDivision(matches, teams, divisions, settings)
      .flatMap((division) => division.sections)
      .flatMap((section) => section.rounds)
      .flatMap((round) => round.matches)
      .map((match) => [String(match.id), match])
  );
}

export function parseBracketMatchId(legacyId) {
  const parts = String(legacyId || "").split("|");
  if (parts[0] !== "BR" || parts.length < 6) return null;

  const formatCode = parts[1];
  const bracket = parts[3];
  const round = Number(parts[4]);
  const match = Number(parts[5]);
  if (!Number.isFinite(round) || !Number.isFinite(match)) return null;

  return {
    format: formatCode === "DE" ? "double_elimination" : "single_elimination",
    divisionId: parts[2],
    bracket,
    round,
    match,
  };
}

export function tournamentPlayers(teams, divisions) {
  const divisionById = Object.fromEntries((divisions || []).map((division) => [division.id, division]));

  return (teams || [])
    .flatMap((team) => [
      team.player_1_name
        ? playerRow(team.player_1_name, team, divisionById, 1)
        : null,
      team.player_2_name
        ? playerRow(team.player_2_name, team, divisionById, 2)
        : null,
    ])
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name) || a.team.localeCompare(b.team));
}

export function matchesForTeam(matches, teamId) {
  return (matches || []).filter((match) =>
    String(match.home_team_id || "") === String(teamId) ||
    String(match.away_team_id || "") === String(teamId)
  );
}

export function scoreDisplay(match) {
  if (Array.isArray(match?.game_scores) && match.game_scores.length > 0) {
    return match.game_scores
      .map((game, index) => `G${index + 1} ${game.home}-${game.away}`)
      .join(" | ");
  }

  if (match?.score_text) return match.score_text;

  if (match?.home_score !== null && match?.home_score !== undefined) {
    return `${match.home_score}-${match.away_score ?? 0}`;
  }

  return "";
}

export function bracketSingleGameScore(match, side) {
  const key = side === "away" ? "away" : "home";

  if (Array.isArray(match?.game_scores)) {
    const games = match.game_scores
      .map((game) => ({ home: scoreValue(game?.home), away: scoreValue(game?.away) }))
      .filter((game) => game.home !== "" || game.away !== "");
    if (games.length === 1) return games[0][key];
    return "";
  }

  const home = scoreValue(match?.home_score);
  const away = scoreValue(match?.away_score);
  if (home !== "" && away !== "") return key === "home" ? home : away;
  return "";
}

export function bracketStatusLabel(match) {
  if (match?.result_type === "bye" || String(match?.score_text || "").toLowerCase() === "bye") return "bye";
  if (match?.status === "done") return "done";
  if (match?.status === "playing") return "playing";
  if (match?.home_team_id || match?.away_team_id) return match?.status || "pending";
  return "waiting";
}

export function courtName(court) {
  return court?.name || "Court";
}

function playerRow(name, team, divisionById, slot) {
  const division = divisionById[team.division_id];

  return {
    playerKey: `${team.id}:${slot}`,
    slot,
    name,
    team: team.name,
    teamId: team.id,
    division: division?.name || "Unassigned",
    line: team.line_number || 1,
  };
}

function bracketMatchRow(match, teamsById) {
  const bracketMeta = parseBracketMatchId(match.legacy_id);
  const homeTeam = match.home_team || teamsById[String(match.home_team_id || "")] || null;
  const awayTeam = match.away_team || teamsById[String(match.away_team_id || "")] || null;

  return {
    ...match,
    bracketMeta,
    home_team: homeTeam,
    away_team: awayTeam,
    homeName: homeTeam?.name || "TBD",
    awayName: awayTeam?.name || "TBD",
  };
}

function withBracketMatchNumbers(matches, format) {
  const numbers = new Map(
    [...(matches || [])]
      .sort((a, b) =>
        bracketNumberSectionRound(a, format) - bracketNumberSectionRound(b, format) ||
        bracketSectionOrder(a.bracketMeta?.bracket, format) - bracketSectionOrder(b.bracketMeta?.bracket, format) ||
        Number(a.bracketMeta?.match || 0) - Number(b.bracketMeta?.match || 0) ||
        Number(a.created_order || 0) - Number(b.created_order || 0)
      )
      .map((match, index) => [String(match.id), index + 1])
  );

  return (matches || []).map((match) => ({
    ...match,
    bracketMatchNumber: numbers.get(String(match.id)) || match.bracketMeta?.match || "",
  }));
}

function withBracketSlotSources(matches) {
  return (matches || []).map((match) => ({
    ...match,
    homeSourceLabel: bracketSourceLabel(matches, match, match.home_team_id),
    awaySourceLabel: bracketSourceLabel(matches, match, match.away_team_id),
  }));
}

function withBracketEliminationMarkers(matches, format) {
  const lossesByTeam = {};
  const maxLosses = format === "double_elimination" ? 2 : 1;
  const eliminatedMatches = {};

  [...(matches || [])]
    .sort((a, b) => Number(a.created_order || 0) - Number(b.created_order || 0))
    .forEach((match) => {
      if (match.status !== "done" || !match.winner_team_id || match.result_type === "not_played") return;
      const loserId = loserTeamId(match);
      if (!loserId) return;

      lossesByTeam[loserId] = (lossesByTeam[loserId] || 0) + 1;
      if (lossesByTeam[loserId] >= maxLosses) {
        eliminatedMatches[`${match.id}:${loserId}`] = true;
      }
    });

  return (matches || []).map((match) => ({
    ...match,
    homeEliminated: Boolean(eliminatedMatches[`${match.id}:${match.home_team_id}`]),
    awayEliminated: Boolean(eliminatedMatches[`${match.id}:${match.away_team_id}`]),
  }));
}

function loserTeamId(match) {
  const winnerId = String(match?.winner_team_id || "");
  if (!winnerId) return "";
  if (String(match.home_team_id || "") === winnerId) return String(match.away_team_id || "");
  if (String(match.away_team_id || "") === winnerId) return String(match.home_team_id || "");
  return "";
}

function bracketSourceLabel(matches, currentMatch, teamId) {
  const cleanTeamId = String(teamId || "");
  if (!cleanTeamId) return "";

  const currentOrder = Number(currentMatch?.created_order || Number.MAX_SAFE_INTEGER);
  const candidates = (matches || [])
    .filter((match) => String(match.id) !== String(currentMatch.id))
    .filter((match) => match.status === "done" && match.winner_team_id)
    .filter((match) => String(match.home_team_id || "") === cleanTeamId || String(match.away_team_id || "") === cleanTeamId)
    .filter((match) => {
      const order = Number(match.created_order || 0);
      return !Number.isFinite(currentOrder) || currentOrder === Number.MAX_SAFE_INTEGER || order < currentOrder;
    })
    .sort((a, b) =>
      Number(b.created_order || 0) - Number(a.created_order || 0) ||
      Number(b.bracketMatchNumber || 0) - Number(a.bracketMatchNumber || 0)
    );
  const source = candidates[0];
  if (!source) return "";

  const resultPrefix = String(source.winner_team_id || "") === cleanTeamId ? "W" : "L";
  return `${resultPrefix}${source.bracketMatchNumber || source.bracketMeta?.match || ""}`;
}

function bracketNumberSectionRound(match, format) {
  const meta = match.bracketMeta || {};
  if (format !== "double_elimination") return Number(meta.round || 0) * 10;
  if (meta.bracket === "F") return 999;
  return Number(meta.round || 0) * 10 + (meta.bracket === "L" ? 1 : 0);
}

function bracketSections(matches, format) {
  const groups = (matches || []).reduce((map, match) => {
    const bracket = match.bracketMeta?.bracket || "W";
    map[bracket] ||= {};
    const round = Number(match.bracketMeta?.round || 1);
    map[bracket][round] ||= [];
    map[bracket][round].push(match);
    return map;
  }, {});

  return Object.entries(groups)
    .sort(([a], [b]) => bracketSectionOrder(a, format) - bracketSectionOrder(b, format))
    .map(([bracket, rounds]) => ({
      key: bracket,
      title: bracketTitle(bracket, format),
      rounds: displayBracketRounds(bracket, rounds, format)
        .filter((round) => round.matches.length > 0),
    }))
    .filter((section) => section.rounds.length > 0);
}

function displayBracketRounds(bracket, rounds, format) {
  let previousRoundCount = 0;

  return Object.entries(rounds)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([round, roundMatches]) => {
      const sortedMatches = [...roundMatches].sort((a, b) =>
        Number(a.bracketMeta?.match || 0) - Number(b.bracketMeta?.match || 0)
      );
      const visibleMatches = sortedMatches.filter(visibleBracketMatch);
      const futureMatchCount = visibleMatches.length === 0 && previousRoundCount > 1
        ? Math.ceil(previousRoundCount / 2)
        : 0;
      const matches = visibleMatches.length > 0
        ? visibleMatches
        : sortedMatches.slice(0, futureMatchCount);

      if (matches.length > 0) previousRoundCount = matches.length;

      return {
        key: `${bracket}-${round}`,
        title: roundTitle(bracket, Number(round), matches.length, format),
        matches,
      };
    });
}

function visibleBracketMatch(match) {
  if (match?.home_team_id || match?.away_team_id) return true;
  if (match?.status === "done" || match?.status === "playing") return true;
  return false;
}

function bracketChampion(matches, teamsById, format) {
  if (format === "double_elimination") {
    const finalMatches = (matches || [])
      .filter((match) => match.bracketMeta?.bracket === "F")
      .sort((a, b) => Number(a.bracketMeta?.round || 0) - Number(b.bracketMeta?.round || 0));
    const firstFinal = finalMatches.find((match) => Number(match.bracketMeta?.round || 0) === 1);
    const resetFinal = finalMatches.find((match) => Number(match.bracketMeta?.round || 0) === 2);

    if (resetFinal?.status === "done" && resetFinal.winner_team_id) {
      return teamsById[String(resetFinal.winner_team_id)] || resetFinal.winner_team || null;
    }

    if (!firstFinal || firstFinal.status !== "done" || !firstFinal.winner_team_id) return null;
    if (String(firstFinal.winner_team_id || "") !== String(firstFinal.home_team_id || "")) return null;
    return teamsById[String(firstFinal.winner_team_id)] || firstFinal.winner_team || null;
  }

  const finalBracket = format === "double_elimination" ? "F" : "W";
  const finalMatches = (matches || [])
    .filter((match) => match.bracketMeta?.bracket === finalBracket)
    .sort((a, b) =>
      Number(b.bracketMeta?.round || 0) - Number(a.bracketMeta?.round || 0) ||
      Number(b.bracketMeta?.match || 0) - Number(a.bracketMeta?.match || 0)
    );
  const final = finalMatches[0];
  if (!final || final.status !== "done" || !final.winner_team_id) return null;
  return teamsById[String(final.winner_team_id)] || final.winner_team || null;
}

function bracketSectionOrder(bracket, format) {
  if (format === "double_elimination") {
    if (bracket === "W") return 0;
    if (bracket === "L") return 1;
    if (bracket === "F") return 2;
  }
  return bracket === "W" ? 0 : 9;
}

function bracketTitle(bracket, format) {
  if (format === "double_elimination") {
    if (bracket === "W") return "Winners Bracket";
    if (bracket === "L") return "Elimination Bracket";
    if (bracket === "F") return "Championship";
  }
  return "Bracket";
}

function roundTitle(bracket, round, matchCount, format) {
  if (bracket === "F") return round > 1 ? "Championship If Necessary" : "Championship Match";
  if (format === "single_elimination" && matchCount === 1 && round > 1) return "Final";
  if (matchCount === 2) return "Semifinals";
  return `Round ${round}`;
}

function blankStanding(team, teamRecord = {}) {
  return {
    team,
    regularSeasonStanding: regularSeasonStandingValue(teamRecord),
    w: 0,
    l: 0,
    pf: 0,
    pa: 0,
  };
}

function sortTournamentStandings(rows, rules = []) {
  const normalizedRules = Array.isArray(rules) && rules.length > 0
    ? rules
    : ["wins", "point_differential", "points_for", "regular_season_standing"];

  return [...(rows || [])].sort((a, b) => {
    for (const rule of normalizedRules) {
      const result = compareStandingRule(a, b, rule);
      if (result !== 0) return result;
    }

    return a.team.localeCompare(b.team);
  });
}

function compareStandingRule(a, b, rule) {
  if (rule === "regular_season_standing") {
    const aValue = Number(a.regularSeasonStanding || Number.MAX_SAFE_INTEGER);
    const bValue = Number(b.regularSeasonStanding || Number.MAX_SAFE_INTEGER);
    return aValue - bValue;
  }

  if (rule === "losses") return Number(a.l || 0) - Number(b.l || 0);
  if (rule === "point_differential") return (Number(b.pf || 0) - Number(b.pa || 0)) - (Number(a.pf || 0) - Number(a.pa || 0));
  if (rule === "points_for") return Number(b.pf || 0) - Number(a.pf || 0);
  if (rule === "points_against") return Number(a.pa || 0) - Number(b.pa || 0);
  return Number(b.w || 0) - Number(a.w || 0);
}

function regularSeasonStandingValue(teamRecord = {}) {
  const value = teamRecord.seed;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function scoreValue(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
