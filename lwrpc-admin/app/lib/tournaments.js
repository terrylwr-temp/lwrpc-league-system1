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
    .filter((match) => match.division?.is_active !== false && match.status === "done" && match.result_type !== "not_played")
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

export function tournamentPlayers(teams, divisions) {
  const divisionById = Object.fromEntries((divisions || []).map((division) => [division.id, division]));

  return (teams || [])
    .flatMap((team) => [
      team.player_1_name
        ? playerRow(team.player_1_name, team, divisionById)
        : null,
      team.player_2_name
        ? playerRow(team.player_2_name, team, divisionById)
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

export function courtName(court) {
  return court?.name || "Court";
}

function playerRow(name, team, divisionById) {
  const division = divisionById[team.division_id];

  return {
    name,
    team: team.name,
    teamId: team.id,
    division: division?.name || "Unassigned",
    line: team.line_number || 1,
  };
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

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
