import { supabase } from "./auth";
import { roundRobinPlayerLabel, roundRobinStandings } from "./roundRobinSchedule";

export function roundRobinDisplayName(group) {
  return group?.name || "Round Robin";
}

export function roundRobinModeLabel(value) {
  if (value === "ladder") return "Ladder League";
  return "Daily Round Robin";
}

export async function loadPublicRoundRobinGroups() {
  const { data, error } = await supabase
    .from("round_robin_groups")
    .select("id, name, slug, public_status, mode, schedule_day, schedule_time, timezone, updated_at")
    .eq("public_status", "public")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function loadPublicRoundRobin(identifier) {
  const group = await loadRoundRobinGroup(identifier);
  if (!group) return null;

  const [courts, sessions] = await Promise.all([
    loadRoundRobinCourts(group.id),
    loadRoundRobinSessions(group.id),
  ]);

  const latestSession = sessions[0] || null;
  const latestSessionId = latestSession?.id;
  const [matches, results] = latestSessionId
    ? await Promise.all([
      loadRoundRobinMatches(latestSessionId),
      loadRoundRobinSessionResults(latestSessionId),
    ])
    : [[], []];

  return {
    group,
    courts,
    sessions,
    latestSession,
    matches,
    results,
  };
}

export async function loadRoundRobinGroup(identifier) {
  const clean = String(identifier || "").trim();
  if (!clean) return null;

  const query = supabase
    .from("round_robin_groups")
    .select("id, name, slug, public_status, mode, schedule_day, schedule_time, timezone, settings, updated_at")
    .eq("public_status", "public");

  const { data, error } = isUuid(clean)
    ? await query.eq("id", clean).maybeSingle()
    : await query.eq("slug", clean).maybeSingle();

  if (error) throw error;
  return data || null;
}

async function loadRoundRobinCourts(groupId) {
  const { data, error } = await supabase
    .from("round_robin_courts")
    .select("id, name, description, sort_order, is_active")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function loadRoundRobinSessions(groupId) {
  const { data, error } = await supabase
    .from("round_robin_sessions")
    .select("id, session_name, location, session_date, starts_at, mode, status, court_count, round_count, max_players, summary_text, created_at, updated_at")
    .eq("group_id", groupId)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}

async function loadRoundRobinMatches(sessionId) {
  const { data, error } = await supabase
    .from("round_robin_matches")
    .select("id, round_number, court_number, court_name, team1_players, team2_players, bye_players, team1_score, team2_score, status")
    .eq("session_id", sessionId)
    .order("round_number", { ascending: true })
    .order("court_number", { ascending: true });

  if (error) throw error;
  return (data || []).map(publicMatch);
}

async function loadRoundRobinSessionResults(sessionId) {
  const { data, error } = await supabase
    .from("round_robin_player_session_results")
    .select("player_id, display_name, games, wins, losses, points_for, points_against, point_diff, byes, rank")
    .eq("session_id", sessionId)
    .order("rank", { ascending: true });

  if (error) throw error;
  return data || [];
}

export function publicMatch(match) {
  return {
    ...match,
    team1_players: publicPlayers(match.team1_players),
    team2_players: publicPlayers(match.team2_players),
    bye_players: publicPlayers(match.bye_players),
  };
}

export function publicPlayers(players = []) {
  return Array.isArray(players)
    ? players.map((player) => ({
      id: player.id,
      displayName: player.displayName || player.display_name || player.name || "Player",
      firstLabel: player.firstLabel || roundRobinPlayerLabel(player.displayName || player.display_name || player.name),
    }))
    : [];
}

export function standingsFromRoundRobinMatches(matches = [], sessionPlayers = []) {
  const players = sessionPlayers.map((row) => ({
    id: row.player_id || row.id,
    displayName: row.display_name || row.displayName || row.name,
  }));
  return roundRobinStandings(matches, players);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}
