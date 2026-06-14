import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Round Robin admin requires SUPABASE_SERVICE_ROLE_KEY on the server.");
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
    const groupId = String(body.groupId || "").trim();
    const eventCode = String(body.eventCode || "").trim();
    const hostPhone = String(body.hostPhone || "").trim();
    const hostSessionId = String(body.hostSessionId || "").trim();

    if (!groupId || (!eventCode && !hostPhone)) {
      return NextResponse.json(
        { success: false, error: "Round Robin group and manager access are required." },
        { status: 400 }
      );
    }

    const supabase = adminClient();
    const { data: group, error: groupError } = await loadGroup(supabase, groupId);
    if (groupError) throw groupError;

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Round Robin group not found. Run supabase-round-robin-schema.sql first if this is a new setup." },
        { status: 404 }
      );
    }

    let access = { mode: "manager", sessionIds: null, preferredSessionId: hostSessionId || "" };
    if (eventCode) {
      const codeAccessMode = roundRobinAdminAccessMode(group, eventCode);
      if (!codeAccessMode) {
        return NextResponse.json(
          { success: false, error: "Incorrect manager code." },
          { status: 401 }
        );
      }
      access = { mode: codeAccessMode, sessionIds: null, preferredSessionId: hostSessionId || "" };
    } else {
      access = await validateHostAccess(supabase, group, hostPhone, hostSessionId);
    }

    if (access.mode === "host" && access.sessionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No host matches were found for that phone number." },
        { status: 401 }
      );
    }

    let sessionsQuery = supabase
      .from("round_robin_sessions")
      .select("*")
      .eq("group_id", group.id)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (access.mode === "host") sessionsQuery = sessionsQuery.in("id", access.sessionIds);

    const [players, playerGroups, courts, sessions, log, members] = await Promise.all([
      supabase
        .from("round_robin_players")
        .select("*")
        .eq("group_id", group.id)
        .order("display_name", { ascending: true }),
      supabase
        .from("round_robin_player_groups")
        .select("*")
        .eq("group_id", group.id)
        .order("name", { ascending: true }),
      supabase
        .from("round_robin_courts")
        .select("*")
        .eq("group_id", group.id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      sessionsQuery,
      supabase
        .from("round_robin_activity_log")
        .select("*")
        .eq("group_id", group.id)
        .order("created_at", { ascending: false })
        .limit(100),
      access.mode !== "host" ? loadMemberDirectory(supabase) : { data: [], error: null },
    ]);

    const errors = [players.error, playerGroups.error, courts.error, sessions.error, log.error, members.error].filter(Boolean);
    if (errors.length > 0) throw errors[0];

    const playerGroupIds = (playerGroups.data || []).map((row) => row.id);
    const playerGroupMembers = playerGroupIds.length > 0
      ? await supabase
        .from("round_robin_player_group_members")
        .select("id, player_group_id, player_id")
        .in("player_group_id", playerGroupIds)
      : { data: [], error: null };
    if (playerGroupMembers.error) throw playerGroupMembers.error;

    const sessionRows = sessions.data || [];
    const sessionIds = sessionRows.map((session) => session.id);
    const allSessionPlayers = sessionIds.length > 0
      ? await supabase
        .from("round_robin_session_players")
        .select("*")
        .in("session_id", sessionIds)
        .order("sort_order", { ascending: true })
        .order("display_name", { ascending: true })
      : { data: [], error: null };
    if (allSessionPlayers.error) throw allSessionPlayers.error;

    const allPlayerResults = sessionIds.length > 0
      ? await supabase
        .from("round_robin_player_session_results")
        .select("*")
        .in("session_id", sessionIds)
      : { data: [], error: null };
    if (allPlayerResults.error) throw allPlayerResults.error;

    const allMatches = sessionIds.length > 0
      ? await supabase
        .from("round_robin_matches")
        .select("*")
        .in("session_id", sessionIds)
        .order("round_number", { ascending: true })
        .order("court_number", { ascending: true })
      : { data: [], error: null };
    if (allMatches.error) throw allMatches.error;

    const sessionDateById = new Map(sessionRows.map((session) => [String(session.id), session.session_date || null]));
    const sessionNameById = new Map(sessionRows.map((session) => [String(session.id), session.session_name || "Match"]));
    const resultsWithSessionContext = (allPlayerResults.data || []).map((row) => ({
      ...row,
      session_date: sessionDateById.get(String(row.session_id)) || null,
      session_name: sessionNameById.get(String(row.session_id)) || "Match",
    }));

    const activeSession = chooseManagerSession(sessionRows, access.preferredSessionId);
    const sessionState = activeSession ? await loadSessionState(supabase, activeSession.id) : emptySessionState();

    return NextResponse.json({
      success: true,
      accessMode: access.mode,
      hostPlayer: access.hostPlayer ? sanitizeHostPlayer(access.hostPlayer) : null,
      hostSessionId: access.preferredSessionId || activeSession?.id || null,
      group: sanitizeGroup(group),
      players: players.data || [],
      playerGroups: playerGroups.data || [],
      playerGroupMembers: playerGroupMembers.data || [],
      courts: courts.data || [],
      sessions: sessionRows,
      allSessionPlayers: allSessionPlayers.data || [],
      allPlayerResults: resultsWithSessionContext,
      allMatches: allMatches.data || [],
      activeSessionId: activeSession?.id || null,
      log: log.data || [],
      members: members.data || [],
      ...sessionState,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}

async function loadGroup(supabase, identifier) {
  const query = supabase.from("round_robin_groups").select("*");
  return isUuid(identifier)
    ? await query.eq("id", identifier).maybeSingle()
    : await query.eq("slug", identifier).maybeSingle();
}

async function loadMemberDirectory(supabase) {
  const pageSize = 1000;
  const members = [];
  let from = 0;

  while (from < 20000) {
    const { data, error } = await supabase
      .from("members")
      .select("id, full_name, first_name, last_name, email, phone, dupr_id, is_active_member")
      .or("is_active_member.eq.true,is_active_member.is.null")
      .order("first_name", { ascending: true })
      .order("last_name", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) return { data: null, error };
    members.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return { data: members, error: null };
}

async function loadSessionState(supabase, sessionId) {
  const [sessionPlayers, matches, results] = await Promise.all([
    supabase
      .from("round_robin_session_players")
      .select("*")
      .eq("session_id", sessionId)
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true }),
    supabase
      .from("round_robin_matches")
      .select("*")
      .eq("session_id", sessionId)
      .order("round_number", { ascending: true })
      .order("court_number", { ascending: true }),
    supabase
      .from("round_robin_player_session_results")
      .select("*")
      .eq("session_id", sessionId)
      .order("rank", { ascending: true }),
  ]);

  const errors = [sessionPlayers.error, matches.error, results.error].filter(Boolean);
  if (errors.length > 0) throw errors[0];

  return {
    sessionPlayers: sessionPlayers.data || [],
    matches: matches.data || [],
    results: results.data || [],
  };
}

function emptySessionState() {
  return {
    sessionPlayers: [],
    matches: [],
    results: [],
  };
}

function chooseManagerSession(sessions = [], preferredSessionId = "") {
  if (preferredSessionId) {
    const preferred = sessions.find((session) => String(session.id || "") === String(preferredSessionId));
    if (preferred) return preferred;
  }

  const today = new Date().toISOString().slice(0, 10);
  const sessionRows = [...sessions];
  const playing = sessionRows
    .filter((session) => session.status === "playing")
    .sort(sortSessionsAscending)[0];
  if (playing) return playing;

  const upcoming = sessionRows
    .filter((session) => !["done", "cancelled"].includes(session.status) && String(session.session_date || "") >= today)
    .sort(sortSessionsAscending)[0];
  if (upcoming) return upcoming;

  return sessionRows
    .filter((session) => session.status !== "cancelled")
    .sort(sortSessionsDescending)[0] || sessionRows.sort(sortSessionsDescending)[0] || null;
}

function sortSessionsAscending(a, b) {
  return sessionSortValue(a).localeCompare(sessionSortValue(b));
}

function sortSessionsDescending(a, b) {
  return sessionSortValue(b).localeCompare(sessionSortValue(a));
}

function sessionSortValue(session) {
  return `${session.session_date || ""} ${session.starts_at || "99:99:99"} ${session.created_at || ""}`;
}

function sanitizeGroup(group) {
  const safeGroup = { ...group };
  delete safeGroup.admin_code;
  safeGroup.settings = { ...(safeGroup.settings || {}) };
  delete safeGroup.settings.secondaryAdminCode;
  return safeGroup;
}

function sanitizeHostPlayer(player) {
  return {
    id: player.id,
    display_name: player.display_name,
    first_name: player.first_name,
  };
}

async function validateHostAccess(supabase, group, hostPhone, preferredSessionId = "") {
  const hostPlayer = await findPlayerByPhone(supabase, group.id, hostPhone);
  const { data, error } = await supabase
    .from("round_robin_sessions")
    .select("id, host_player_id, cohost_player_id, status")
    .eq("group_id", group.id)
    .or(`host_player_id.eq.${hostPlayer.id},cohost_player_id.eq.${hostPlayer.id}`)
    .neq("status", "cancelled");
  if (error) throw error;

  const sessionIds = (data || []).map((session) => session.id).filter(Boolean);
  if (preferredSessionId && !sessionIds.some((id) => String(id) === String(preferredSessionId))) {
    const accessError = new Error("That match is not assigned to this host or co-host.");
    accessError.status = 401;
    throw accessError;
  }

  return {
    mode: "host",
    hostPlayer,
    sessionIds,
    preferredSessionId: preferredSessionId || sessionIds[0] || "",
  };
}

async function findPlayerByPhone(supabase, groupId, phone) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    const error = new Error("Enter the full 10-digit phone number saved for this host.");
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
    const notFound = new Error("That phone number was not found in the PBCourtCommand system.");
    notFound.status = 404;
    throw notFound;
  }
  if (matches.length > 1) {
    const duplicate = new Error("More than one saved player uses that phone number. Please ask the manager to update the player list.");
    duplicate.status = 409;
    throw duplicate;
  }
  return matches[0];
}

function roundRobinAdminAccessMode(group, eventCode) {
  const cleanCode = String(eventCode || "").trim();
  const overrideCode = String(process.env.ROUND_ROBIN_ADMIN_OVERRIDE_CODE || "").trim();
  if (!cleanCode) return "";
  if (String(group.admin_code || "") === cleanCode || (overrideCode && overrideCode === cleanCode)) return "manager";
  if (String(group.settings?.secondaryAdminCode || "").trim() === cleanCode) return "secondary";
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
