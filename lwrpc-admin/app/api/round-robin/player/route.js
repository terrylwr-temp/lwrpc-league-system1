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
      const ladders = await loadPlayerLadders(supabase, group, player);
      return NextResponse.json({ success: true, group: sanitizeGroup(group), player: sanitizePlayer(player), systemSettings: sanitizeSystemSettings(systemSettings), history, ladders, ...hostSetup, ...result });
    }

    const sessions = await loadPlayerSessions(supabase, group, player);
    const history = await loadPlayerHistory(supabase, group, player);
    const hostSetup = await loadHostSetupData(supabase, group, sessions);
    const ladders = await loadPlayerLadders(supabase, group, player);
    return NextResponse.json({ success: true, group: sanitizeGroup(group), player: sanitizePlayer(player), systemSettings: sanitizeSystemSettings(systemSettings), sessions, history, ladders, ...hostSetup });
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
    .select("id, session_name, location, session_date, starts_at, status, max_players, repeats_weekly, invited_group_ids, host_player_id, cohost_player_id, mode, settings, updated_at")
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
  const ladderPositionsBySession = await loadLadderPositionMaps(supabase, group, sessions);

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
    const ladderPositionMap = ladderPositionsBySession.get(String(session.id)) || new Map();
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
      sessionPlayers: (sessionPlayersBySession.get(String(session.id)) || []).map((row) => sanitizeSessionPlayer(row, canManageSession, ladderPositionMap.get(String(row.player_id || "")))),
      maxPlayers,
      isFull: maxPlayers > 0 && counts.joined >= maxPlayers,
      settings: sanitizeSessionSettings(session.settings),
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
    .select("id, session_name, location, session_date, starts_at, status, summary_text, round_count, mode, settings, updated_at")
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
        settings: sanitizeSessionSettings(session.settings),
      };
    }),
  };
}

async function updatePlayerSessionStatus(supabase, group, player, body) {
  const sessionId = String(body.sessionId || "").trim();
  const requestedStatus = body.status === "declined" ? "declined" : body.status === "joined" ? "joined" : "";
  if (!sessionId || !requestedStatus) throw new Error("Match and response are required.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  if (["done", "cancelled"].includes(session.status)) {
    const error = new Error("This match is no longer accepting responses.");
    error.status = 409;
    throw error;
  }

  const sessionPlayers = await loadSessionPlayers(supabase, session.id);
  const activeSessionPlayers = await filterActiveSessionPlayers(supabase, group.id, sessionPlayers);
  const target = sessionPlayers.find((row) => String(row.player_id || "") === String(player.id));
  if (!target) {
    const error = new Error("You are not currently invited to this match.");
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

async function loadPlayerLadders(supabase, group, player) {
  const ladders = normalizeLadders(group.settings?.ladders || []).filter((ladder) => ladder.status !== "inactive");
  if (ladders.length === 0) return [];

  const ladderGroupIds = [...new Set(ladders.map((ladder) => ladder.playerGroupId).filter(Boolean))];
  if (ladderGroupIds.length === 0) return [];

  const membershipResult = await supabase
    .from("round_robin_player_group_members")
    .select("player_group_id, player_id")
    .eq("player_id", player.id)
    .in("player_group_id", ladderGroupIds);
  if (membershipResult.error) throw membershipResult.error;

  const playerGroupIds = new Set((membershipResult.data || []).map((row) => String(row.player_group_id)));
  const relevantLadders = ladders.filter((ladder) => playerGroupIds.has(String(ladder.playerGroupId)));
  if (relevantLadders.length === 0) return [];

  const sessionsResult = await supabase
    .from("round_robin_sessions")
    .select("id, session_name, session_date, starts_at, status, settings")
    .eq("group_id", group.id)
    .eq("mode", "ladder")
    .order("session_date", { ascending: true })
    .order("starts_at", { ascending: true });
  if (sessionsResult.error) throw sessionsResult.error;

  const ladderSessions = sessionsResult.data || [];
  const completedSessionIds = ladderSessions
    .filter((session) => session.status === "done")
    .map((session) => session.id);
  const resultsResult = completedSessionIds.length > 0
    ? await supabase
      .from("round_robin_player_session_results")
      .select("*")
      .in("session_id", completedSessionIds)
    : { data: [], error: null };
  if (resultsResult.error) throw resultsResult.error;
  const matchesResult = completedSessionIds.length > 0
    ? await supabase
      .from("round_robin_matches")
      .select("*")
      .in("session_id", completedSessionIds)
    : { data: [], error: null };
  if (matchesResult.error) throw matchesResult.error;

  const groupMembersResult = await supabase
    .from("round_robin_player_group_members")
    .select("player_group_id, player_id")
    .in("player_group_id", ladderGroupIds);
  if (groupMembersResult.error) throw groupMembersResult.error;

  const rosterIds = [...new Set((groupMembersResult.data || []).map((row) => row.player_id).filter(Boolean))];
  const playersResult = rosterIds.length > 0
    ? await supabase
      .from("round_robin_players")
      .select("id, display_name, is_active")
      .eq("group_id", group.id)
      .in("id", rosterIds)
    : { data: [], error: null };
  if (playersResult.error) throw playersResult.error;

  return relevantLadders.map((ladder) => {
    const sessionsForLadder = ladderSessions.filter((session) => String(session.settings?.ladderId || "") === String(ladder.id));
    const completed = sessionsForLadder.filter((session) => session.status === "done");
    const upcoming = sessionsForLadder.find((session) => ["draft", "open", "playing"].includes(session.status));
    const completedIds = new Set(completed.map((session) => String(session.id)));
    const results = (resultsResult.data || []).filter((row) => completedIds.has(String(row.session_id || "")));
    const matches = (matchesResult.data || []).filter((row) => completedIds.has(String(row.session_id || "")));
    const rows = ladderStandingsRows({
      ladder,
      sessions: completed,
      results,
      matches,
      players: playersResult.data || [],
      groupMembers: groupMembersResult.data || [],
    });
    const playerRow = rows.find((row) => String(row.playerId) === String(player.id)) || null;
    const playerResultRows = results.filter((row) => String(row.player_id || "") === String(player.id));
    const lastPlayedDate = playerResultRows
      .map((row) => {
        const session = completed.find((item) => String(item.id) === String(row.session_id || ""));
        return session?.session_date || "";
      })
      .filter(Boolean)
      .sort((a, b) => String(b).localeCompare(String(a)))[0] || "";
    const rankingRows = rows.map(sanitizeLadderRankingRow);
    return {
      id: ladder.id,
      name: ladder.name,
      startDate: ladder.startDate,
      endDate: ladder.endDate,
      nextDate: upcoming?.session_date || nextLadderDate(sessionsForLadder, ladder),
      nextTime: upcoming?.starts_at || ladder.startTime || "",
      nextSessionName: upcoming?.session_name || "",
      position: playerRow?.position || null,
      positionCount: rows.length,
      rankings: rankingRows,
      rankingRows,
      lastPlayedDate,
      eligible: playerRow?.eligible ?? true,
      stats: playerRow ? {
        sessionsPlayed: playerRow.sessionsPlayed,
        matchesPlayed: playerRow.matchesPlayed,
        wins: playerRow.wins,
        losses: playerRow.losses,
        pointsFor: playerRow.pointsFor,
        pointDiff: playerRow.pointDiff,
        winPct: playerRow.winPct,
        avgPointDiff: playerRow.avgPointDiff,
      } : null,
      sessionCount: completed.length,
      participationRequirement: ladder.participationRequirement,
      balanceMode: ladder.balanceMode,
      movementMode: ladder.movementMode,
    };
  });
}

async function loadLadderPositionMaps(supabase, group, sessions = []) {
  const ladderSessions = (sessions || []).filter((session) => session.mode === "ladder" || session.settings?.ladderId);
  if (ladderSessions.length === 0) return new Map();

  const visibleLadderIds = new Set(ladderSessions.map((session) => String(session.settings?.ladderId || "")).filter(Boolean));
  const ladders = normalizeLadders(group.settings?.ladders || []).filter((ladder) => visibleLadderIds.has(String(ladder.id)));
  if (ladders.length === 0) return new Map();

  const ladderGroupIds = [...new Set(ladders.map((ladder) => ladder.playerGroupId).filter(Boolean))];
  const completedSessionsResult = await supabase
    .from("round_robin_sessions")
    .select("id, session_date, status, settings")
    .eq("group_id", group.id)
    .eq("mode", "ladder")
    .eq("status", "done")
    .order("session_date", { ascending: true });
  if (completedSessionsResult.error) throw completedSessionsResult.error;

  const completedSessions = completedSessionsResult.data || [];
  const completedSessionIds = completedSessions.map((session) => session.id).filter(Boolean);
  const [resultsResult, groupMembersResult] = await Promise.all([
    completedSessionIds.length > 0
      ? supabase
        .from("round_robin_player_session_results")
        .select("*")
        .in("session_id", completedSessionIds)
      : { data: [], error: null },
    supabase
      .from("round_robin_player_group_members")
      .select("player_group_id, player_id")
      .in("player_group_id", ladderGroupIds),
  ]);
  if (resultsResult.error) throw resultsResult.error;
  if (groupMembersResult.error) throw groupMembersResult.error;
  const matchesResult = completedSessionIds.length > 0
    ? await supabase
      .from("round_robin_matches")
      .select("*")
      .in("session_id", completedSessionIds)
    : { data: [], error: null };
  if (matchesResult.error) throw matchesResult.error;

  const rosterIds = [...new Set((groupMembersResult.data || []).map((row) => row.player_id).filter(Boolean))];
  const playersResult = rosterIds.length > 0
    ? await supabase
      .from("round_robin_players")
      .select("id, display_name, is_active")
      .eq("group_id", group.id)
      .in("id", rosterIds)
    : { data: [], error: null };
  if (playersResult.error) throw playersResult.error;

  const positionsByLadder = new Map();
  ladders.forEach((ladder) => {
    const sessionsForLadder = completedSessions.filter((session) => String(session.settings?.ladderId || "") === String(ladder.id));
    const completedIds = new Set(sessionsForLadder.map((session) => String(session.id)));
    const rows = ladderStandingsRows({
      ladder,
      sessions: sessionsForLadder,
      results: (resultsResult.data || []).filter((row) => completedIds.has(String(row.session_id || ""))),
      matches: (matchesResult.data || []).filter((row) => completedIds.has(String(row.session_id || ""))),
      players: playersResult.data || [],
      groupMembers: groupMembersResult.data || [],
    });
    positionsByLadder.set(String(ladder.id), new Map(rows.map((row) => [String(row.playerId), {
      position: row.position,
      positionCount: rows.length,
    }])));
  });

  return new Map(ladderSessions.map((session) => [
    String(session.id),
    positionsByLadder.get(String(session.settings?.ladderId || "")) || new Map(),
  ]));
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

function sanitizeSessionSettings(settings = {}) {
  return {
    ladderId: settings?.ladderId || "",
    ladderName: settings?.ladderName || "",
    ladderConfig: settings?.ladderConfig ? {
      movementMode: settings.ladderConfig.movementMode === "top2" ? "top2" : "top1",
      participationRequirement: Number(settings.ladderConfig.participationRequirement || 50),
    } : null,
  };
}

function sanitizePlayer(player) {
  return {
    id: player.id,
    displayName: player.display_name,
    firstName: player.first_name,
  };
}

function sanitizeSessionPlayer(player, includeContact = false, ladderPosition = null) {
  const payload = {
    id: player.id,
    playerId: player.player_id,
    displayName: player.display_name,
    responseStatus: player.response_status || "invited",
    sortOrder: player.sort_order,
  };
  if (ladderPosition?.position) {
    payload.ladderPosition = ladderPosition.position;
    payload.ladderPositionCount = ladderPosition.positionCount || null;
  }
  if (includeContact) {
    payload.email = player.email || "";
    payload.phone = player.phone || "";
  }
  return payload;
}

function sanitizeLadderRankingRow(row) {
  return {
    playerId: row.playerId,
    displayName: row.displayName,
    position: row.position,
    sessionsPlayed: row.sessionsPlayed,
    matchesPlayed: row.matchesPlayed,
    wins: row.wins,
    losses: row.losses,
    pointsFor: row.pointsFor,
    pointDiff: row.pointDiff,
    winPct: row.winPct,
    avgPointDiff: row.avgPointDiff,
    eligible: row.eligible,
  };
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

function normalizeLadders(ladders = []) {
  return (Array.isArray(ladders) ? ladders : [])
    .map((ladder) => ({
      id: String(ladder.id || "").trim(),
      name: String(ladder.name || "").trim(),
      startDate: normalizeIsoDate(ladder.startDate),
      endDate: normalizeIsoDate(ladder.endDate),
      startTime: String(ladder.startTime || "").slice(0, 5),
      playerGroupId: String(ladder.playerGroupId || "").trim(),
      participationRequirement: Math.min(100, Math.max(10, Number(ladder.participationRequirement || 50))),
      balanceMode: ladder.balanceMode === "season" ? "season" : "session",
      movementMode: ladder.movementMode === "top2" ? "top2" : "top1",
      status: ladder.status === "inactive" ? "inactive" : "active",
      initialPositions: normalizeInitialPositions(ladder.initialPositions || ladder.initial_positions || {}),
    }))
    .filter((ladder) => ladder.id && ladder.name && ladder.playerGroupId);
}

function normalizeInitialPositions(positions = {}, rosterIds = []) {
  const source = positions && typeof positions === "object" ? positions : {};
  const rosterSet = new Set((rosterIds || []).map(String));
  const entries = Object.entries(source)
    .map(([playerId, position]) => [String(playerId), Number(position)])
    .filter(([playerId, position]) => (
      Number.isInteger(position) &&
      position > 0 &&
      (rosterSet.size === 0 || rosterSet.has(playerId))
    ))
    .sort((first, second) => first[1] - second[1] || first[0].localeCompare(second[0]));
  const normalized = {};
  const used = new Set();
  entries.forEach(([playerId, position]) => {
    if (used.has(position)) return;
    normalized[playerId] = position;
    used.add(position);
  });
  let nextPosition = 1;
  (rosterIds || []).map(String).forEach((playerId) => {
    if (normalized[playerId]) return;
    while (used.has(nextPosition)) nextPosition += 1;
    normalized[playerId] = nextPosition;
    used.add(nextPosition);
  });
  return normalized;
}

function ladderStandingsRows({ ladder, sessions, results, matches = [], players, groupMembers }) {
  const rosterIds = groupMembers
    .filter((row) => String(row.player_group_id || "") === String(ladder.playerGroupId))
    .map((row) => String(row.player_id || ""))
    .filter(Boolean);
  const activePlayers = (players || []).filter((player) => player.is_active !== false);
  const playerById = new Map(activePlayers.map((player) => [String(player.id), player]));
  const initialPositions = normalizeInitialPositions(ladder.initialPositions || {}, rosterIds);
  const orderedRosterIds = [...new Set(rosterIds)]
    .filter((playerId) => playerById.has(String(playerId)))
    .sort((a, b) => {
      const firstPosition = Number(initialPositions[a] || Number.MAX_SAFE_INTEGER);
      const secondPosition = Number(initialPositions[b] || Number.MAX_SAFE_INTEGER);
      return firstPosition - secondPosition || String(playerById.get(a)?.display_name || "").localeCompare(String(playerById.get(b)?.display_name || ""));
    });
  const statsByPlayer = new Map(orderedRosterIds.map((playerId, index) => [playerId, {
    playerId,
    displayName: playerById.get(playerId)?.display_name || "Player",
    seedIndex: index,
    sessionsPlayed: 0,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointDiff: 0,
  }]));

  results.forEach((row) => {
    const playerId = String(row.player_id || "");
    if (!statsByPlayer.has(playerId)) return;
    const stats = statsByPlayer.get(playerId);
    stats.sessionsPlayed += 1;
    stats.matchesPlayed += Number(row.games || 0);
    stats.wins += Number(row.wins || 0);
    stats.losses += Number(row.losses || 0);
    stats.pointsFor += Number(row.points_for || 0);
    stats.pointDiff += Number(row.point_diff || 0);
  });

  const order = ladderPositionOrder(orderedRosterIds, sessions, results, ladder, matches);
  const positionByPlayer = new Map(order.map((playerId, index) => [String(playerId), index + 1]));
  return [...statsByPlayer.values()].map((row) => {
    const games = row.wins + row.losses || row.matchesPlayed;
    const participationPct = sessions.length > 0 ? (row.sessionsPlayed / sessions.length) * 100 : 0;
    return {
      ...row,
      position: positionByPlayer.get(String(row.playerId)) || row.seedIndex + 1,
      winPct: games > 0 ? row.wins / games : 0,
      avgPointDiff: games > 0 ? row.pointDiff / games : 0,
      eligible: sessions.length < 4 || participationPct >= Number(ladder.participationRequirement || 50),
    };
  }).sort((a, b) => a.position - b.position);
}

function ladderPositionOrder(rosterIds, sessions, results, ladder, matches = []) {
  const order = rosterIds.map(String);
  const resultsBySession = groupRowsBySession(results);
  const matchesBySession = groupRowsBySession(matches);
  const movementCount = ladder.movementMode === "top2" ? 2 : 1;
  sessions.forEach((session) => {
    const sessionMatches = matchesBySession.get(String(session.id)) || [];
    const sessionResults = resultsBySession.get(String(session.id)) || [];
    const sessionPlayerIds = playerIdsFromMatches(sessionMatches);
    const participatingOrder = order.filter((playerId) => sessionPlayerIds.has(String(playerId)));
    const courts = splitLadderIdsIntoCourts(participatingOrder);

    courts.forEach((courtIds, courtIndex) => {
      const ranked = courtIds
        .map((playerId) => sessionResults.find((row) => String(row.player_id || "") === String(playerId)))
        .filter(Boolean)
        .sort((first, second) => compareLadderResultRows(first, second, sessionMatches));
      const topIds = courtIndex > 0 ? ranked.slice(0, movementCount).map((row) => String(row.player_id || "")) : [];
      const bottomIds = courtIndex < courts.length - 1 ? ranked.slice(-movementCount).map((row) => String(row.player_id || "")) : [];
      topIds.forEach((playerId) => movePlayerByStep(order, playerId, -Math.max(4, courts[courtIndex - 1]?.length || 4)));
      bottomIds.reverse().forEach((playerId) => movePlayerByStep(order, playerId, Math.max(4, courts[courtIndex + 1]?.length || 4)));
    });

    if (sessions.length >= 4) {
      const participationRequirement = Number(ladder.participationRequirement || 50);
      const completedSessionIdsForDate = sessions.filter((item) => String(item.session_date || "") <= String(session.session_date || "")).map((item) => String(item.id));
      order.forEach((playerId) => {
        const playedCount = completedSessionIdsForDate.filter((sessionId) => (resultsBySession.get(sessionId) || []).some((row) => String(row.player_id || "") === String(playerId))).length;
        const participationPct = completedSessionIdsForDate.length > 0 ? (playedCount / completedSessionIdsForDate.length) * 100 : 100;
        if (participationPct < participationRequirement) movePlayerByStep(order, playerId, 4);
      });
    }
  });
  return order;
}

function splitLadderIdsIntoCourts(playerIds = []) {
  return splitLadderPlayersIntoCourts(playerIds.map((id) => ({ id }))).map((court) => court.map((player) => String(player.id)));
}

function splitLadderPlayersIntoCourts(players = []) {
  const total = players.length;
  const courtCount = Math.max(1, Math.floor(total / 4));
  const baseSize = Math.floor(total / courtCount);
  const extra = total % courtCount;
  const courts = [];
  let offset = 0;
  for (let courtIndex = 0; courtIndex < courtCount; courtIndex += 1) {
    const size = baseSize + (courtIndex < extra ? 1 : 0);
    courts.push(players.slice(offset, offset + size));
    offset += size;
  }
  return courts.filter((court) => court.length >= 4);
}

function compareLadderResultRows(first, second, matches = []) {
  const firstPoints = Number(first.points_for || 0);
  const secondPoints = Number(second.points_for || 0);
  if (secondPoints !== firstPoints) return secondPoints - firstPoints;
  const headToHead = headToHeadResult(String(first.player_id || ""), String(second.player_id || ""), matches);
  if (headToHead !== 0) return -headToHead;
  const firstWin = winPctForResult(first);
  const secondWin = winPctForResult(second);
  if (secondWin !== firstWin) return secondWin - firstWin;
  const firstGames = Number(first.games || (Number(first.wins || 0) + Number(first.losses || 0)));
  const secondGames = Number(second.games || (Number(second.wins || 0) + Number(second.losses || 0)));
  const firstAvgDiff = firstGames > 0 ? Number(first.point_diff || 0) / firstGames : 0;
  const secondAvgDiff = secondGames > 0 ? Number(second.point_diff || 0) / secondGames : 0;
  if (secondAvgDiff !== firstAvgDiff) return secondAvgDiff - firstAvgDiff;
  if (secondGames !== firstGames) return secondGames - firstGames;
  return String(first.display_name || "").localeCompare(String(second.display_name || ""));
}

function headToHeadResult(firstPlayerId, secondPlayerId, matches = []) {
  let firstWins = 0;
  let secondWins = 0;
  matches.forEach((match) => {
    const team1Score = numericScore(match.team1_score);
    const team2Score = numericScore(match.team2_score);
    if (team1Score === null || team2Score === null || team1Score === team2Score) return;
    const team1Ids = (match.team1_players || []).map((player) => String(player.id));
    const team2Ids = (match.team2_players || []).map((player) => String(player.id));
    const firstTeam = team1Ids.includes(firstPlayerId) ? 1 : team2Ids.includes(firstPlayerId) ? 2 : 0;
    const secondTeam = team1Ids.includes(secondPlayerId) ? 1 : team2Ids.includes(secondPlayerId) ? 2 : 0;
    if (!firstTeam || !secondTeam || firstTeam === secondTeam) return;
    const winningTeam = team1Score > team2Score ? 1 : 2;
    if (firstTeam === winningTeam) firstWins += 1;
    if (secondTeam === winningTeam) secondWins += 1;
  });
  return firstWins - secondWins;
}

function numericScore(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function movePlayerByStep(order, playerId, step) {
  const index = order.findIndex((id) => String(id) === String(playerId));
  if (index < 0) return;
  const nextIndex = Math.max(0, Math.min(order.length - 1, index + step));
  if (nextIndex === index) return;
  const [item] = order.splice(index, 1);
  order.splice(nextIndex, 0, item);
}

function winPctForResult(row) {
  const wins = Number(row?.wins || 0);
  const losses = Number(row?.losses || 0);
  const games = Number(row?.games || wins + losses);
  return games > 0 ? wins / games : 0;
}

function nextLadderDate(sessions, ladder) {
  const ordered = (sessions || []).slice().sort((a, b) => String(a.session_date || "").localeCompare(String(b.session_date || "")));
  const latest = ordered[ordered.length - 1]?.session_date || "";
  return latest ? addDaysToIsoDate(latest, 7) : ladder.startDate || "";
}

function addDaysToIsoDate(value, days) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function normalizeIsoDate(value) {
  const clean = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : "";
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
