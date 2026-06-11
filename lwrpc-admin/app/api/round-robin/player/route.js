import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadServerSystemSettings } from "../../../lib/serverEmailTemplates";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Round Robin player responses require SUPABASE_SERVICE_ROLE_KEY on the server.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "load");
    const supabase = adminClient();
    const group = await loadGroup(supabase, body.groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Round Robin group not found." },
        { status: 404 }
      );
    }

    const player = await findPlayerByPhone(supabase, group.id, body.phone);
    const systemSettings = await loadServerSystemSettings();

    if (action === "updateStatus") {
      const result = await updatePlayerSessionStatus(supabase, group, player, body);
      const history = await loadPlayerHistory(supabase, group, player);
      const hostSetup = await loadHostSetupData(supabase, group, result.sessions);
      return NextResponse.json({ success: true, group: sanitizeGroup(group), player: sanitizePlayer(player), systemSettings: sanitizeSystemSettings(systemSettings), history, ...hostSetup, ...result });
    }

    const sessions = await loadPlayerSessions(supabase, group, player);
    const history = await loadPlayerHistory(supabase, group, player);
    const hostSetup = await loadHostSetupData(supabase, group, sessions);
    return NextResponse.json({ success: true, group: sanitizeGroup(group), player: sanitizePlayer(player), systemSettings: sanitizeSystemSettings(systemSettings), sessions, history, ...hostSetup });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}

async function loadGroup(supabase, identifier) {
  const cleanIdentifier = String(identifier || "").trim();
  if (!cleanIdentifier) return null;

  const query = supabase
    .from("round_robin_groups")
    .select("id, name, slug, public_status, mode, schedule_day, schedule_time, timezone, settings")
    .neq("public_status", "archived");

  const { data, error } = isUuid(cleanIdentifier)
    ? await query.eq("id", cleanIdentifier).maybeSingle()
    : await query.eq("slug", cleanIdentifier).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function findPlayerByPhone(supabase, groupId, phone) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) {
    const error = new Error("Enter the phone number saved for you by the host.");
    error.status = 400;
    throw error;
  }
  if (cleanPhone.length < 10) {
    const error = new Error("Enter the full 10-digit phone number saved for you by the host.");
    error.status = 400;
    throw error;
  }

  const { data, error } = await supabase
    .from("round_robin_players")
    .select("id, display_name, first_name, phone, is_active")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("display_name", { ascending: true });
  if (error) throw error;

  const matches = (data || []).filter((player) => phonesMatch(player.phone, cleanPhone));
  if (matches.length === 0) {
    const notFound = new Error("That phone number was not found in this Round Robin group.");
    notFound.status = 404;
    throw notFound;
  }
  if (matches.length > 1) {
    const duplicate = new Error("More than one saved player uses that phone number. Please ask the host to update the player list.");
    duplicate.status = 409;
    throw duplicate;
  }
  return matches[0];
}

async function loadPlayerSessions(supabase, group, player) {
  const today = new Date().toISOString().slice(0, 10);
  const playerRowsResult = await supabase
    .from("round_robin_session_players")
    .select("id, session_id, response_status, updated_at")
    .eq("player_id", player.id);
  if (playerRowsResult.error) throw playerRowsResult.error;

  const playerRows = playerRowsResult.data || [];
  const sessionIds = playerRows.map((row) => row.session_id).filter(Boolean);
  const invitedSessionIds = new Set(sessionIds.map(String));

  const sessionsResult = await supabase
    .from("round_robin_sessions")
    .select("id, session_name, location, session_date, starts_at, status, max_players, repeats_weekly, invited_group_ids, host_player_id, cohost_player_id, updated_at")
    .eq("group_id", group.id)
    .gte("session_date", today)
    .in("status", ["draft", "open", "playing"])
    .order("session_date", { ascending: true })
    .order("starts_at", { ascending: true });
  if (sessionsResult.error) throw sessionsResult.error;

  const sessions = (sessionsResult.data || []).filter((session) => (
    invitedSessionIds.has(String(session.id)) || isSessionHost(session, player.id)
  ));
  if (sessions.length === 0) return [];

  const sessionPlayerRowsResult = await supabase
    .from("round_robin_session_players")
    .select("id, session_id, player_id, display_name, email, phone, response_status, sort_order")
    .in("session_id", sessions.map((session) => session.id));
  if (sessionPlayerRowsResult.error) throw sessionPlayerRowsResult.error;
  const activeSessionPlayerRows = await filterActiveSessionPlayers(supabase, group.id, sessionPlayerRowsResult.data || []);

  const playerRowBySession = new Map(playerRows.map((row) => [String(row.session_id), row]));
  const sessionPlayersBySession = activeSessionPlayerRows.reduce((map, row) => {
    const key = String(row.session_id || "");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
    return map;
  }, new Map());
  sessionPlayersBySession.forEach((rows) => {
    rows.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.displayName || "").localeCompare(String(b.displayName || "")));
  });
  const countsBySession = activeSessionPlayerRows.reduce((counts, row) => {
    const key = String(row.session_id);
    counts[key] ||= { joined: 0, invited: 0, declined: 0, waitlist: 0 };
    if (counts[key][row.response_status] !== undefined) counts[key][row.response_status] += 1;
    return counts;
  }, {});

  return sessions.map((session) => {
    const counts = countsBySession[String(session.id)] || { joined: 0, invited: 0, declined: 0, waitlist: 0 };
    const playerRow = playerRowBySession.get(String(session.id));
    const maxPlayers = Number(session.max_players || 0);
    const canManageSession = isSessionHost(session, player.id);
    return {
      ...session,
      playerStatus: playerRow?.response_status || "invited",
      hasPlayerResponse: Boolean(playerRow),
      canManageSession,
      hostRole: hostRoleForSession(session, player.id),
      joinedCount: counts.joined,
      invitedCount: counts.invited,
      declinedCount: counts.declined,
      waitlistCount: counts.waitlist,
      sessionPlayers: (sessionPlayersBySession.get(String(session.id)) || []).map((row) => sanitizeSessionPlayer(row, canManageSession)),
      maxPlayers,
      isFull: maxPlayers > 0 && counts.joined >= maxPlayers,
    };
  });
}

async function loadPlayerHistory(supabase, group, player) {
  const today = new Date().toISOString().slice(0, 10);
  const playerRowsResult = await supabase
    .from("round_robin_session_players")
    .select("session_id, response_status, updated_at")
    .eq("player_id", player.id)
    .eq("response_status", "joined");
  if (playerRowsResult.error) throw playerRowsResult.error;

  const joinedSessionIds = [...new Set((playerRowsResult.data || []).map((row) => row.session_id).filter(Boolean))];
  if (joinedSessionIds.length === 0) return emptyHistory();

  const sessionsResult = await supabase
    .from("round_robin_sessions")
    .select("id, session_name, location, session_date, starts_at, status, summary_text, round_count, updated_at")
    .eq("group_id", group.id)
    .in("id", joinedSessionIds)
    .order("session_date", { ascending: false })
    .order("starts_at", { ascending: false });
  if (sessionsResult.error) throw sessionsResult.error;

  const historySessions = (sessionsResult.data || [])
    .filter((session) => session.status === "done" || String(session.session_date || "") < today)
    .slice(0, 50);
  if (historySessions.length === 0) return emptyHistory();

  const historySessionIds = historySessions.map((session) => session.id);
  const [resultsResult, matchesResult] = await Promise.all([
    supabase
      .from("round_robin_player_session_results")
      .select("*")
      .in("session_id", historySessionIds)
      .order("rank", { ascending: true }),
    supabase
      .from("round_robin_matches")
      .select("*")
      .in("session_id", historySessionIds)
      .order("round_number", { ascending: true })
      .order("court_number", { ascending: true }),
  ]);
  if (resultsResult.error) throw resultsResult.error;
  if (matchesResult.error) throw matchesResult.error;

  const resultsBySession = groupRowsBySession(resultsResult.data || []);
  const matchesBySession = groupRowsBySession(matchesResult.data || []);
  const playedIdsBySession = new Map();
  for (const session of historySessions) {
    playedIdsBySession.set(String(session.id), playerIdsFromMatches(matchesBySession.get(String(session.id)) || []));
  }
  const playerResults = (resultsResult.data || []).filter((row) => {
    if (String(row.player_id || "") !== String(player.id)) return false;
    const playedIds = playedIdsBySession.get(String(row.session_id || ""));
    return playedIds?.has(String(player.id));
  });
  const playerResultBySession = new Map(playerResults.map((row) => [String(row.session_id || ""), row]));
  const playedHistorySessions = historySessions.filter((session) => playerResultBySession.has(String(session.id)));
  if (playedHistorySessions.length === 0) return emptyHistory();

  return {
    stats: aggregateHistoryStats(playerResults, playedHistorySessions.length),
    sessions: playedHistorySessions.map((session) => {
      const sessionId = String(session.id);
      const playedIds = playedIdsBySession.get(sessionId) || new Set();
      return {
        ...session,
        playerResult: playerResultBySession.get(sessionId) || null,
        standings: (resultsBySession.get(sessionId) || []).filter((row) => playedIds.has(String(row.player_id || ""))),
        matches: matchesBySession.get(sessionId) || [],
      };
    }),
  };
}

async function updatePlayerSessionStatus(supabase, group, player, body) {
  const sessionId = String(body.sessionId || "").trim();
  const requestedStatus = body.status === "declined" ? "declined" : body.status === "joined" ? "joined" : "";
  if (!sessionId || !requestedStatus) throw new Error("Session and response are required.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  if (["done", "cancelled"].includes(session.status)) {
    const error = new Error("This session is no longer accepting responses.");
    error.status = 409;
    throw error;
  }

  const sessionPlayers = await loadSessionPlayers(supabase, session.id);
  const activeSessionPlayers = await filterActiveSessionPlayers(supabase, group.id, sessionPlayers);
  const target = sessionPlayers.find((row) => String(row.player_id || "") === String(player.id));
  if (!target) {
    const error = new Error("You are not currently invited to this session.");
    error.status = 404;
    throw error;
  }

  let resolvedStatus = requestedStatus;
  if (requestedStatus === "joined" && session.max_players) {
    const joinedCount = activeSessionPlayers.filter((row) => row.response_status === "joined" && String(row.player_id || "") !== String(player.id)).length;
    if (joinedCount >= Number(session.max_players)) resolvedStatus = "waitlist";
  }

  const { data, error } = await supabase
    .from("round_robin_session_players")
    .update({ response_status: resolvedStatus, updated_at: new Date().toISOString() })
    .eq("session_id", session.id)
    .eq("player_id", player.id)
    .select("*")
    .single();
  if (error) throw error;

  const promotedPlayers = resolvedStatus === "declined" ? await promoteWaitlistSpots(supabase, session) : [];
  const sessions = await loadPlayerSessions(supabase, group, player);
  return { sessionPlayer: data, resolvedStatus, promotedPlayers: promotedPlayers.length, sessions };
}

async function loadSessionForGroup(supabase, groupId, sessionId) {
  const { data, error } = await supabase
    .from("round_robin_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("group_id", groupId)
    .single();
  if (error) throw error;
  return data;
}

async function loadSessionPlayers(supabase, sessionId) {
  const { data, error } = await supabase
    .from("round_robin_session_players")
    .select("*")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function filterActiveSessionPlayers(supabase, groupId, sessionPlayers = []) {
  const playerIds = [...new Set((sessionPlayers || [])
    .map((player) => String(player.player_id || "").trim())
    .filter(Boolean))];
  if (playerIds.length === 0) return sessionPlayers || [];

  const { data, error } = await supabase
    .from("round_robin_players")
    .select("id")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .in("id", playerIds);
  if (error) throw error;

  const activePlayerIds = new Set((data || []).map((player) => String(player.id)));
  return (sessionPlayers || []).filter((player) => !player.player_id || activePlayerIds.has(String(player.player_id)));
}

async function promoteWaitlistSpots(supabase, session) {
  const maxPlayers = Number(session?.max_players || 0);
  if (!maxPlayers) return [];

  const players = await filterActiveSessionPlayers(supabase, session.group_id, await loadSessionPlayers(supabase, session.id));
  const joinedCount = players.filter((player) => player.response_status === "joined").length;
  const openSpots = maxPlayers - joinedCount;
  if (openSpots <= 0) return [];

  const waitlistPlayers = players
    .filter((player) => player.response_status === "waitlist")
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .slice(0, openSpots);
  if (waitlistPlayers.length === 0) return [];

  const { data, error } = await supabase
    .from("round_robin_session_players")
    .update({ response_status: "joined", updated_at: new Date().toISOString() })
    .in("id", waitlistPlayers.map((player) => player.id))
    .select("*");
  if (error) throw error;
  return data || [];
}

function sanitizeGroup(group) {
  return {
    id: group.id,
    name: group.name,
    slug: group.slug,
    mode: group.mode,
    settings: {
      smsSendingEnabled: group.settings?.smsSendingEnabled === true,
    },
  };
}

function sanitizePlayer(player) {
  return {
    id: player.id,
    displayName: player.display_name,
    firstName: player.first_name,
  };
}

function sanitizeSessionPlayer(player, includeContact = false) {
  const payload = {
    id: player.id,
    playerId: player.player_id,
    displayName: player.display_name,
    responseStatus: player.response_status || "invited",
    sortOrder: player.sort_order,
  };
  if (includeContact) {
    payload.email = player.email || "";
    payload.phone = player.phone || "";
  }
  return payload;
}

async function loadHostSetupData(supabase, group, sessions = []) {
  const hasHostSession = (sessions || []).some((session) => session.canManageSession);
  if (!hasHostSession) {
    return { players: [], playerGroups: [], playerGroupMembers: [] };
  }

  const [playersResult, groupsResult] = await Promise.all([
    supabase
      .from("round_robin_players")
      .select("id, display_name, first_name, phone, email, is_active")
      .eq("group_id", group.id)
      .eq("is_active", true)
      .order("display_name", { ascending: true }),
    supabase
      .from("round_robin_player_groups")
      .select("id, name, description, is_active")
      .eq("group_id", group.id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);
  if (playersResult.error) throw playersResult.error;
  if (groupsResult.error) throw groupsResult.error;

  const groupIds = (groupsResult.data || []).map((row) => row.id);
  const membershipsResult = groupIds.length > 0
    ? await supabase
      .from("round_robin_player_group_members")
      .select("id, player_group_id, player_id")
      .in("player_group_id", groupIds)
    : { data: [], error: null };
  if (membershipsResult.error) throw membershipsResult.error;

  return {
    players: playersResult.data || [],
    playerGroups: groupsResult.data || [],
    playerGroupMembers: membershipsResult.data || [],
    smsTemplates: group.settings?.smsTemplates || {},
  };
}

function sanitizeSystemSettings(settings) {
  return {
    club_name: settings?.club_name || "Lakewood Ranch Pickleball Club",
  };
}

function emptyHistory() {
  return {
    stats: aggregateHistoryStats([], 0),
    sessions: [],
  };
}

function aggregateHistoryStats(results, sessionsJoined) {
  const totals = results.reduce((summary, row) => ({
    games: summary.games + Number(row.games || 0),
    wins: summary.wins + Number(row.wins || 0),
    losses: summary.losses + Number(row.losses || 0),
    pointsFor: summary.pointsFor + Number(row.points_for || 0),
    pointsAgainst: summary.pointsAgainst + Number(row.points_against || 0),
    pointDiff: summary.pointDiff + Number(row.point_diff || 0),
    byes: summary.byes + Number(row.byes || 0),
    rankTotal: summary.rankTotal + Number(row.rank || 0),
    rankedSessions: summary.rankedSessions + (row.rank ? 1 : 0),
  }), {
    games: 0,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDiff: 0,
    byes: 0,
    rankTotal: 0,
    rankedSessions: 0,
  });

  return {
    sessionsJoined,
    sessionsScored: results.length,
    games: totals.games,
    wins: totals.wins,
    losses: totals.losses,
    pointsFor: totals.pointsFor,
    pointsAgainst: totals.pointsAgainst,
    pointDiff: totals.pointDiff,
    byes: totals.byes,
    winPct: totals.games > 0 ? totals.wins / totals.games : 0,
    averageRank: totals.rankedSessions > 0 ? totals.rankTotal / totals.rankedSessions : null,
  };
}

function groupRowsBySession(rows) {
  return rows.reduce((map, row) => {
    const key = String(row.session_id || "");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
    return map;
  }, new Map());
}

function playerIdsFromMatches(matches = []) {
  return matches.reduce((ids, match) => {
    [
      ...(match.team1_players || []),
      ...(match.team2_players || []),
      ...(match.bye_players || []),
    ].forEach((player) => {
      const id = String(player.id || player.player_id || "");
      if (id) ids.add(id);
    });
    return ids;
  }, new Set());
}

function isSessionHost(session, playerId) {
  const id = String(playerId || "");
  return Boolean(id && (
    String(session.host_player_id || "") === id ||
    String(session.cohost_player_id || "") === id
  ));
}

function hostRoleForSession(session, playerId) {
  const id = String(playerId || "");
  if (id && String(session.host_player_id || "") === id) return "Host";
  if (id && String(session.cohost_player_id || "") === id) return "Co-host";
  return "";
}

function phonesMatch(savedPhone, cleanPhone) {
  const saved = normalizePhone(savedPhone);
  if (!saved || !cleanPhone) return false;
  return saved === cleanPhone || saved.endsWith(cleanPhone) || cleanPhone.endsWith(saved);
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("1")) return digits.slice(-10);
  return digits;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}
