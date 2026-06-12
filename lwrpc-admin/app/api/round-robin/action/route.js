import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSmsMessages } from "../../../lib/notifications";
import { createNextRoundRobinRound, createRoundRobinSchedule, roundRobinPlayerLabel, roundRobinStandings, summaryTextForStandings } from "../../../lib/roundRobinSchedule";

export const runtime = "nodejs";

const HOST_ALLOWED_ACTIONS = new Set([
  "updatePlannedSession",
  "updateSessionPlayerStatus",
  "addSessionPlayer",
  "addSessionNewPlayer",
  "startSession",
  "startSessionAndGenerateFirstGame",
  "generateNextGame",
  "updateMatchScore",
  "updateMatchLineup",
  "completeSession",
  "sendBroadcastText",
]);

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Round Robin actions require SUPABASE_SERVICE_ROLE_KEY on the server.");
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
    const supabase = adminClient();
    const action = String(body.action || "");
    const access = await validateRoundRobinAccess(supabase, body, action);
    const group = access.group;

    if (action === "saveSettings") {
      const result = await saveSettings(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "savePlayer") {
      const result = await savePlayer(supabase, group, body.player);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "savePlayerGroup") {
      const result = await savePlayerGroup(supabase, group, body.playerGroup);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "deletePlayerGroup") {
      const result = await deletePlayerGroup(supabase, group, body.playerGroupId);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "saveSmsSettings") {
      const result = await saveSmsSettings(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "deletePlayer") {
      const result = await deletePlayer(supabase, group, body.playerId);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "saveCourts") {
      const result = await saveCourts(supabase, group, body.courts);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "createSession") {
      const result = await createSession(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "createPlannedSession") {
      const result = await createPlannedSession(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "updatePlannedSession") {
      const result = await updatePlannedSession(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "deleteSession") {
      const result = await deleteSession(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "masterResetRoundRobin") {
      const result = await masterResetRoundRobin(supabase, group);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "updateSessionPlayerStatus") {
      const result = await updateSessionPlayerStatus(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "addSessionPlayer") {
      const result = await addSessionPlayer(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "addSessionNewPlayer") {
      const result = await addSessionNewPlayer(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "startSession") {
      const result = await startSession(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "startSessionAndGenerateFirstGame") {
      const started = await startSession(supabase, group, body);
      const generated = await generateNextGame(supabase, group, body);
      return NextResponse.json({ success: true, startedSession: started.session, ...generated });
    }

    if (action === "generateNextGame") {
      const result = await generateNextGame(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "updateMatchScore") {
      const result = await updateMatchScore(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "updateMatchLineup") {
      const result = await updateMatchLineup(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "completeSession") {
      const result = await completeSession(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "sendBroadcastText") {
      const result = await sendBroadcastText(supabase, group, body, access);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "sendSessionReminderText") {
      const result = await sendSessionReminderText(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "sendTestTemplateText") {
      const result = await sendTestTemplateText(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { success: false, error: "Unknown Round Robin action." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}

async function validateRoundRobinAccess(supabase, body, action) {
  const identifier = body.groupId;
  const eventCode = body.eventCode;
  const cleanIdentifier = String(identifier || "").trim();
  const cleanCode = String(eventCode || "").trim();

  if (!cleanIdentifier || (!cleanCode && !body.hostPhone)) {
    const error = new Error("Round Robin group and manager code are required.");
    error.status = 400;
    throw error;
  }

  const query = supabase.from("round_robin_groups").select("*");
  const { data, error } = isUuid(cleanIdentifier)
    ? await query.eq("id", cleanIdentifier).single()
    : await query.eq("slug", cleanIdentifier).single();

  if (error) throw error;

  if (cleanCode) {
    if (!isValidRoundRobinAdminCode(data, cleanCode)) {
      const codeError = new Error("Incorrect manager code.");
      codeError.status = 401;
      throw codeError;
    }

    return { mode: "manager", group: data };
  }

  if (!HOST_ALLOWED_ACTIONS.has(action)) {
    const hostScopeError = new Error("Host access can only manage assigned sessions.");
    hostScopeError.status = 403;
    throw hostScopeError;
  }

  const hostPlayer = await findPlayerByPhone(supabase, data.id, body.hostPhone);
  const sessionId = await resolveActionSessionId(supabase, body);
  if (!sessionId) {
    const sessionError = new Error("Session is required for host access.");
    sessionError.status = 400;
    throw sessionError;
  }

  const hostSession = await loadHostSessionForPlayer(supabase, data.id, sessionId, hostPlayer.id);
  if (!hostSession) {
    const codeError = new Error("This phone number is not assigned as host or co-host for that session.");
    codeError.status = 401;
    throw codeError;
  }

  return { mode: "host", group: data, hostPlayer, hostSession };
}

async function saveSettings(supabase, group, body) {
  const name = String(body.name || "").trim();
  if (!name) throw new Error("Group name is required.");

  const mode = body.mode === "ladder" ? "ladder" : "daily_round_robin";
  const payload = {
    name,
    mode,
    schedule_day: String(body.scheduleDay || "").trim() || null,
    schedule_time: String(body.scheduleTime || "").trim() || null,
    timezone: String(body.timezone || group.timezone || "America/New_York").trim(),
    settings: {
      ...(group.settings || {}),
      smsTemplates: body.smsTemplates || group.settings?.smsTemplates || {},
      defaultRounds: Number(body.defaultRounds || group.settings?.defaultRounds || 6),
    },
    updated_at: new Date().toISOString(),
  };

  const adminCode = String(body.adminCode || "").trim();
  if (adminCode) payload.admin_code = adminCode;

  const { error } = await supabase
    .from("round_robin_groups")
    .update(payload)
    .eq("id", group.id);

  if (error) throw error;
  await addLog(supabase, group.id, null, "setup", adminCode ? "Round Robin settings and manager code updated." : "Round Robin settings updated.");
  return { group: { ...group, ...payload, admin_code: undefined } };
}

async function savePlayer(supabase, group, player = {}) {
  const displayName = String(player.display_name || player.displayName || "").trim();
  if (!displayName) throw new Error("Player name is required.");
  const cleanPhone = normalizePhone(player.phone);
  if (!cleanPhone) throw new Error("Phone number is required.");
  if (cleanPhone.length < 10) throw new Error("Enter a full 10-digit phone number.");
  let existingPlayer = null;
  if (player.id) {
    const existingResult = await supabase
      .from("round_robin_players")
      .select("id, is_active")
      .eq("id", player.id)
      .eq("group_id", group.id)
      .maybeSingle();
    if (existingResult.error) throw existingResult.error;
    existingPlayer = existingResult.data || null;
  }

  const payload = {
    group_id: group.id,
    member_id: player.memberId || player.member_id || null,
    display_name: displayName,
    first_name: String(player.first_name || player.firstName || displayName.split(/\s+/)[0] || "").trim() || null,
    email: String(player.email || "").trim().toLowerCase() || null,
    phone: formatPhoneInput(cleanPhone),
    is_active: player.is_active !== false,
    notes: String(player.notes || "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (player.id) {
    const { data, error } = await supabase
      .from("round_robin_players")
      .update(payload)
      .eq("id", player.id)
      .eq("group_id", group.id)
      .select("*")
      .single();
    if (error) throw error;
    await addLog(supabase, group.id, null, "player", `${displayName} updated.`);
    await replacePlayerGroupMemberships(supabase, group.id, data.id, player.groupIds || player.group_ids || []);
    const shouldSendNewPlayerText = payload.is_active === true && existingPlayer?.is_active === false;
    const sms = shouldSendNewPlayerText ? await sendNewPlayerText(supabase, group, data, player.publicUrl) : null;
    return { player: data, sms, newPlayerTextSent: Boolean(shouldSendNewPlayerText) };
  }

  const { data, error } = await supabase
    .from("round_robin_players")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  await replacePlayerGroupMemberships(supabase, group.id, data.id, player.groupIds || player.group_ids || []);
  await addLog(supabase, group.id, null, "player", `${displayName} added.`);
  const sms = payload.is_active ? await sendNewPlayerText(supabase, group, data, player.publicUrl) : null;
  return { player: data, sms, newPlayerTextSent: payload.is_active };
}

async function sendNewPlayerText(supabase, group, player, publicUrl = "") {
  const smsEnabled = group.settings?.smsSendingEnabled === true;
  const phones = player.phone ? [player.phone] : [];
  const sms = smsEnabled
    ? await sendSmsMessages({
      phones,
      body: renderSmsTemplate(
        normalizeSmsTemplates(group.settings?.smsTemplates || {}).newPlayer,
        { group, publicUrl, playerName: player.display_name || "Player" }
      ),
    })
    : smsDisabledResult("SMS disabled in settings", 1, phones.length);

  await addLog(
    supabase,
    group.id,
    null,
    "sms",
    smsEnabled
      ? `New Player text sent to ${sms.sent || 0} recipient${Number(sms.sent || 0) === 1 ? "" : "s"} for ${player.display_name || "Player"}.`
      : `New Player text skipped for ${player.display_name || "Player"} because SMS is off.`,
    { sms, recipientScope: "newPlayer", recipientCount: 1, phoneCount: phones.length, playerId: player.id }
  );

  return sms;
}

async function savePlayerGroup(supabase, group, playerGroup = {}) {
  const name = String(playerGroup.name || "").trim();
  if (!name) throw new Error("Group name is required.");

  const payload = {
    group_id: group.id,
    name,
    description: String(playerGroup.description || "").trim() || null,
    is_active: playerGroup.is_active !== false,
    updated_at: new Date().toISOString(),
  };

  if (playerGroup.id) {
    const { data, error } = await supabase
      .from("round_robin_player_groups")
      .update(payload)
      .eq("id", playerGroup.id)
      .eq("group_id", group.id)
      .select("*")
      .single();
    if (error) throw error;
    await addLog(supabase, group.id, null, "group", `${name} group updated.`);
    return { playerGroup: data };
  }

  const { data, error } = await supabase
    .from("round_robin_player_groups")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  await addLog(supabase, group.id, null, "group", `${name} group added.`);
  return { playerGroup: data };
}

async function deletePlayerGroup(supabase, group, playerGroupId) {
  const cleanGroupId = String(playerGroupId || "").trim();
  if (!cleanGroupId) throw new Error("Group is required.");

  const { data: playerGroup, error: loadError } = await supabase
    .from("round_robin_player_groups")
    .select("id, name")
    .eq("id", cleanGroupId)
    .eq("group_id", group.id)
    .single();
  if (loadError) throw loadError;

  const { error } = await supabase
    .from("round_robin_player_groups")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", cleanGroupId)
    .eq("group_id", group.id);
  if (error) throw error;

  await addLog(supabase, group.id, null, "group", `${playerGroup.name || "Group"} deleted from active groups.`);
  return { playerGroupId: cleanGroupId };
}

async function saveSmsSettings(supabase, group, body) {
  const settings = {
    ...(group.settings || {}),
    smsSendingEnabled: body.smsSendingEnabled === true,
    smsTemplates: normalizeSmsTemplates(body.smsTemplates || group.settings?.smsTemplates || {}),
  };

  const { data, error } = await supabase
    .from("round_robin_groups")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", group.id)
    .select("*")
    .single();
  if (error) throw error;

  await addLog(supabase, group.id, null, "sms", settings.smsSendingEnabled ? "SMS sending enabled." : "SMS sending disabled.");
  return { group: { ...data, admin_code: undefined } };
}

async function deletePlayer(supabase, group, playerId) {
  const cleanPlayerId = String(playerId || "").trim();
  if (!cleanPlayerId) throw new Error("Player is required.");

  const { data: player, error: loadError } = await supabase
    .from("round_robin_players")
    .select("id, display_name")
    .eq("id", cleanPlayerId)
    .eq("group_id", group.id)
    .single();

  if (loadError) throw loadError;

  const activeSessions = await supabase
    .from("round_robin_sessions")
    .select("id")
    .eq("group_id", group.id)
    .in("status", ["draft", "open", "playing", "cancelled"]);
  if (activeSessions.error) throw activeSessions.error;

  const activeSessionIds = (activeSessions.data || []).map((session) => session.id);
  if (activeSessionIds.length > 0) {
    const removedUpcoming = await supabase
      .from("round_robin_session_players")
      .delete()
      .eq("player_id", cleanPlayerId)
      .in("session_id", activeSessionIds);
    if (removedUpcoming.error) throw removedUpcoming.error;
  }

  const { error } = await supabase
    .from("round_robin_players")
    .delete()
    .eq("id", cleanPlayerId)
    .eq("group_id", group.id);

  if (error) throw error;
  await addLog(supabase, group.id, null, "player", `${player.display_name || "Player"} deleted from saved players.`);
  return { playerId: cleanPlayerId };
}

async function replacePlayerGroupMemberships(supabase, groupId, playerId, groupIds = []) {
  const cleanGroupIds = [...new Set((Array.isArray(groupIds) ? groupIds : []).map((id) => String(id || "").trim()).filter(Boolean))];
  const existingGroups = cleanGroupIds.length > 0
    ? await supabase
      .from("round_robin_player_groups")
      .select("id")
      .eq("group_id", groupId)
      .in("id", cleanGroupIds)
    : { data: [], error: null };

  if (existingGroups.error) throw existingGroups.error;
  const allowedGroupIds = new Set((existingGroups.data || []).map((row) => String(row.id)));

  const removed = await supabase
    .from("round_robin_player_group_members")
    .delete()
    .eq("player_id", playerId);
  if (removed.error) throw removed.error;

  const payload = [...allowedGroupIds].map((playerGroupId) => ({
    player_group_id: playerGroupId,
    player_id: playerId,
  }));

  if (payload.length === 0) return [];

  const { data, error } = await supabase
    .from("round_robin_player_group_members")
    .insert(payload)
    .select("*");
  if (error) throw error;
  return data || [];
}

async function saveCourts(supabase, group, courts = []) {
  const cleanCourts = (Array.isArray(courts) ? courts : [])
    .map((court, index) => ({
      id: court.id || null,
      name: String(court.name || `Court ${index + 1}`).trim() || `Court ${index + 1}`,
      description: String(court.description || "").trim() || null,
      sort_order: index + 1,
      is_active: court.is_active !== false,
    }))
    .filter((court) => court.name);

  if (cleanCourts.length === 0) throw new Error("Add at least one court.");

  const existing = await supabase
    .from("round_robin_courts")
    .select("id")
    .eq("group_id", group.id);
  if (existing.error) throw existing.error;

  const keepIds = cleanCourts.map((court) => court.id).filter(Boolean).map(String);
  const removeIds = (existing.data || []).map((court) => court.id).filter((id) => !keepIds.includes(String(id)));

  if (removeIds.length > 0) {
    const removed = await supabase
      .from("round_robin_courts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("id", removeIds);
    if (removed.error) throw removed.error;
  }

  const savedCourts = [];
  for (const court of cleanCourts) {
    const payload = {
      group_id: group.id,
      name: court.name,
      description: court.description,
      sort_order: court.sort_order,
      is_active: court.is_active,
      updated_at: new Date().toISOString(),
    };

    const result = court.id
      ? await supabase.from("round_robin_courts").update(payload).eq("id", court.id).eq("group_id", group.id).select("*").single()
      : await supabase.from("round_robin_courts").insert(payload).select("*").single();

    if (result.error) throw result.error;
    savedCourts.push(result.data);
  }

  await addLog(supabase, group.id, null, "setup", `Saved ${savedCourts.length} court${savedCourts.length === 1 ? "" : "s"}.`);
  return { courts: savedCourts };
}

async function createSession(supabase, group, body) {
  const selectedPlayerIds = Array.isArray(body.playerIds) ? body.playerIds.map(String) : [];
  if (selectedPlayerIds.length < 4) throw new Error("Select at least 4 players.");

  const playersResult = await supabase
    .from("round_robin_players")
    .select("*")
    .eq("group_id", group.id)
    .in("id", selectedPlayerIds);
  if (playersResult.error) throw playersResult.error;

  const players = (playersResult.data || []).map((player) => ({
    id: player.id,
    displayName: player.display_name,
    firstLabel: roundRobinPlayerLabel(player.display_name),
    email: player.email || "",
    phone: player.phone || "",
  }));

  const courtsResult = await supabase
    .from("round_robin_courts")
    .select("*")
    .eq("group_id", group.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (courtsResult.error) throw courtsResult.error;

  const requestedCourtCount = Number(body.courtCount || 0);
  const schedule = createRoundRobinSchedule({
    players,
    courts: courtsResult.data || [],
    roundCount: Number(body.roundCount || group.settings?.defaultRounds || 6),
    courtCount: requestedCourtCount || undefined,
    shuffle: body.shuffle !== false,
  });

  const sessionPayload = {
    group_id: group.id,
    session_date: body.sessionDate || new Date().toISOString().slice(0, 10),
    starts_at: body.startsAt || group.schedule_time || null,
    mode: body.mode === "ladder" ? "ladder" : group.mode || "daily_round_robin",
    status: "playing",
    court_count: schedule.courtCount,
    round_count: schedule.roundCount,
    settings: {
      generatedAt: new Date().toISOString(),
      shuffle: body.shuffle !== false,
    },
  };

  const sessionResult = await supabase
    .from("round_robin_sessions")
    .insert(sessionPayload)
    .select("*")
    .single();
  if (sessionResult.error) throw sessionResult.error;

  const session = sessionResult.data;
  const sessionPlayersPayload = players.map((player, index) => ({
    session_id: session.id,
    player_id: player.id,
    display_name: player.displayName,
    email: player.email || null,
    phone: player.phone || null,
    source: "roster",
    response_status: "joined",
    sort_order: index + 1,
  }));

  const sessionPlayersResult = await supabase
    .from("round_robin_session_players")
    .insert(sessionPlayersPayload)
    .select("*");
  if (sessionPlayersResult.error) throw sessionPlayersResult.error;

  const matchPayload = [];
  schedule.rounds.forEach((round) => {
    round.courts.forEach((court, courtIndex) => {
      matchPayload.push({
        session_id: session.id,
        round_number: round.roundNumber,
        court_number: court.courtNumber,
        court_name: court.courtName,
        team1_players: court.team1.map(publicPlayerPayload),
        team2_players: court.team2.map(publicPlayerPayload),
        bye_players: courtIndex === 0 ? round.byes.map(publicPlayerPayload) : [],
        status: "scheduled",
      });
    });
  });

  const matchesResult = await supabase
    .from("round_robin_matches")
    .insert(matchPayload)
    .select("*");
  if (matchesResult.error) throw matchesResult.error;

  await rebuildResults(supabase, group, session.id);
  await addLog(supabase, group.id, session.id, "session", `Generated ${schedule.roundCount} round${schedule.roundCount === 1 ? "" : "s"} for ${players.length} player${players.length === 1 ? "" : "s"}.`);

  return {
    session,
    sessionPlayers: sessionPlayersResult.data || [],
    matches: matchesResult.data || [],
    results: await loadResults(supabase, session.id),
  };
}

async function createPlannedSession(supabase, group, body) {
  const sessionName = String(body.sessionName || "").trim();
  if (!sessionName) throw new Error("Session name is required.");

  const invitedGroupIds = [...new Set((Array.isArray(body.invitedGroupIds) ? body.invitedGroupIds : []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (invitedGroupIds.length === 0) throw new Error("Select at least one invited group.");

  const invitedPlayers = await loadPlayersForGroups(supabase, group.id, invitedGroupIds);
  if (invitedPlayers.length === 0) throw new Error("The selected groups do not have active players yet.");

  const maxPlayers = Number(body.maxPlayers || 8);
  if (!Number.isInteger(maxPlayers) || maxPlayers < 4) throw new Error("Max players must be at least 4.");

  const now = new Date().toISOString();
  const sessionPayload = {
    group_id: group.id,
    session_name: sessionName,
    location: String(body.location || "").trim() || null,
    session_date: body.sessionDate || new Date().toISOString().slice(0, 10),
    starts_at: String(body.startsAt || "").trim() || group.schedule_time || null,
    max_players: maxPlayers,
    repeats_weekly: Boolean(body.repeatsWeekly),
    host_player_id: body.hostPlayerId || null,
    cohost_player_id: body.cohostPlayerId || null,
    invited_group_ids: invitedGroupIds,
    mode: body.mode === "ladder" ? "ladder" : group.mode || "daily_round_robin",
    status: "open",
    court_count: 1,
    round_count: 0,
    settings: {
      createdFromGroups: invitedGroupIds,
      smsTemplates: normalizeSmsTemplates(group.settings?.smsTemplates || {}),
    },
    opened_at: now,
    updated_at: now,
  };

  const sessionResult = await supabase
    .from("round_robin_sessions")
    .insert(sessionPayload)
    .select("*")
    .single();
  if (sessionResult.error) throw sessionResult.error;

  const session = sessionResult.data;
  const sessionPlayersPayload = invitedPlayers.map((player, index) => ({
    session_id: session.id,
    player_id: player.id,
    display_name: player.display_name,
    email: player.email || null,
    phone: player.phone || null,
    source: "roster",
    response_status: "invited",
    sort_order: index + 1,
  }));

  const sessionPlayersResult = await supabase
    .from("round_robin_session_players")
    .insert(sessionPlayersPayload)
    .select("*");
  if (sessionPlayersResult.error) throw sessionPlayersResult.error;

  const smsEnabled = body.smsEnabled === true && group.settings?.smsSendingEnabled === true;
  let sms = smsDisabledResult(smsEnabled ? "" : body.smsEnabled ? "SMS disabled in settings" : "SMS disabled for this action", invitedPlayers.length);
  if (smsEnabled) {
    const template = normalizeSmsTemplates(group.settings?.smsTemplates || {}).sessionInvite;
    sms = await sendSmsMessages({
      phones: invitedPlayers.map((player) => player.phone).filter(Boolean),
      body: renderSmsTemplate(template, { group, session, publicUrl: body.publicUrl, ...sessionTextCounts(session, []) }),
    });
  }

  await addLog(supabase, group.id, session.id, "session", `${sessionName} opened for ${invitedPlayers.length} invited player${invitedPlayers.length === 1 ? "" : "s"}. Texts sent: ${sms.sent || 0}.`, { sms });
  return { session, sessionPlayers: sessionPlayersResult.data || [], sms };
}

async function updatePlannedSession(supabase, group, body) {
  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) throw new Error("Session is required.");

  const existingSession = await loadSessionForGroup(supabase, group.id, sessionId);
  const sessionName = String(body.sessionName || "").trim();
  if (!sessionName) throw new Error("Session name is required.");

  const invitedGroupIds = [...new Set((Array.isArray(body.invitedGroupIds) ? body.invitedGroupIds : []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (invitedGroupIds.length === 0) throw new Error("Select at least one invited group.");

  const invitedPlayers = await loadPlayersForGroups(supabase, group.id, invitedGroupIds);
  if (invitedPlayers.length === 0) throw new Error("The selected groups do not have active players yet.");

  const maxPlayers = Number(body.maxPlayers || 8);
  if (!Number.isInteger(maxPlayers) || maxPlayers < 4) throw new Error("Max players must be at least 4.");

  const now = new Date().toISOString();
  const sessionPayload = {
    session_name: sessionName,
    location: String(body.location || "").trim() || null,
    session_date: body.sessionDate || existingSession.session_date || new Date().toISOString().slice(0, 10),
    starts_at: String(body.startsAt || "").trim() || null,
    max_players: maxPlayers,
    repeats_weekly: Boolean(body.repeatsWeekly),
    host_player_id: body.hostPlayerId || null,
    cohost_player_id: body.cohostPlayerId || null,
    invited_group_ids: invitedGroupIds,
    mode: body.mode === "ladder" ? "ladder" : group.mode || "daily_round_robin",
    settings: {
      ...(existingSession.settings || {}),
      createdFromGroups: invitedGroupIds,
      smsTemplates: normalizeSmsTemplates(group.settings?.smsTemplates || {}),
    },
    updated_at: now,
  };

  const sessionResult = await supabase
    .from("round_robin_sessions")
    .update(sessionPayload)
    .eq("id", existingSession.id)
    .eq("group_id", group.id)
    .select("*")
    .single();
  if (sessionResult.error) throw sessionResult.error;

  const session = sessionResult.data;
  const existingPlayers = await loadSessionPlayers(supabase, session.id);
  const existingPlayerIds = new Set(existingPlayers.map((player) => String(player.player_id || "")).filter(Boolean));
  const addedPlayers = invitedPlayers.filter((player) => !existingPlayerIds.has(String(player.id)));

  if (addedPlayers.length > 0) {
    const sessionPlayersPayload = addedPlayers.map((player, index) => ({
      session_id: session.id,
      player_id: player.id,
      display_name: player.display_name,
      email: player.email || null,
      phone: player.phone || null,
      source: "roster",
      response_status: "invited",
      sort_order: existingPlayers.length + index + 1,
    }));

    const sessionPlayersResult = await supabase
      .from("round_robin_session_players")
      .insert(sessionPlayersPayload)
      .select("*");
    if (sessionPlayersResult.error) throw sessionPlayersResult.error;
  }

  const promotedPlayers = await promoteWaitlistSpots(supabase, session);
  const latestSessionPlayers = await loadSessionPlayers(supabase, session.id);
  const activeLatestSessionPlayers = await filterActiveSessionPlayers(supabase, group.id, latestSessionPlayers);
  const joinedPlayers = activeLatestSessionPlayers.filter((player) => player.response_status === "joined");
  const smsEnabled = body.smsEnabled === true && group.settings?.smsSendingEnabled === true && joinedPlayers.length > 0;
  let sms = smsDisabledResult(
    joinedPlayers.length === 0
      ? "No joined players"
      : smsEnabled ? "" : body.smsEnabled ? "SMS disabled in settings" : "SMS disabled for this action",
    joinedPlayers.length
  );
  if (smsEnabled) {
    const template = normalizeSmsTemplates(group.settings?.smsTemplates || {}).sessionInvite;
    sms = await sendSmsMessages({
      phones: joinedPlayers.map((player) => player.phone).filter(Boolean),
      body: renderSmsTemplate(template, { group, session, publicUrl: body.publicUrl, ...sessionTextCounts(session, activeLatestSessionPlayers) }),
    });
  }

  await addLog(
    supabase,
    group.id,
    session.id,
    "session",
    `${sessionName} updated. Added ${addedPlayers.length} new invited player${addedPlayers.length === 1 ? "" : "s"}.`,
    { sms, addedPlayers: addedPlayers.length, promotedPlayers: promotedPlayers.length, joinedTextRecipients: joinedPlayers.length }
  );

  return {
    session,
    sessionPlayers: latestSessionPlayers,
    sms,
    addedPlayers: addedPlayers.length,
    promotedPlayers: promotedPlayers.length,
    joinedTextRecipients: joinedPlayers.length,
  };
}

async function updateSessionPlayerStatus(supabase, group, body) {
  const sessionId = String(body.sessionId || "").trim();
  const playerId = String(body.playerId || "").trim();
  const status = ["invited", "joined", "declined", "waitlist"].includes(body.status) ? body.status : "";
  if (!sessionId || !playerId || !status) throw new Error("Session, player, and status are required.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  const currentPlayers = await loadSessionPlayers(supabase, session.id);
  const activeCurrentPlayers = await filterActiveSessionPlayers(supabase, group.id, currentPlayers);
  const target = activeCurrentPlayers.find((player) => String(player.player_id || "") === playerId);
  if (!target) throw new Error("Player is not part of this session.");

  let resolvedStatus = status;
  if (status === "joined" && session.max_players) {
    const joinedCount = activeCurrentPlayers.filter((player) => player.response_status === "joined" && String(player.player_id || "") !== playerId).length;
    if (joinedCount >= Number(session.max_players)) resolvedStatus = "waitlist";
  }

  const { data, error } = await supabase
    .from("round_robin_session_players")
    .update({ response_status: resolvedStatus, updated_at: new Date().toISOString() })
    .eq("session_id", session.id)
    .eq("player_id", playerId)
    .select("*")
    .single();
  if (error) throw error;

  const promotedPlayers = resolvedStatus === "declined" ? await promoteWaitlistSpots(supabase, session) : [];
  return { sessionPlayer: data, promotedPlayers };
}

async function addSessionPlayer(supabase, group, body) {
  const sessionId = String(body.sessionId || "").trim();
  const playerId = String(body.playerId || "").trim();
  if (!sessionId || !playerId) throw new Error("Session and player are required.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  if (["done", "cancelled"].includes(session.status)) throw new Error("This session is no longer accepting players.");

  const player = await loadRoundRobinPlayer(supabase, group.id, playerId);
  const currentPlayers = await loadSessionPlayers(supabase, session.id);
  const existingPlayer = currentPlayers.find((row) => String(row.player_id || "") === String(player.id));

  if (existingPlayer) {
    const { data, error } = await supabase
      .from("round_robin_session_players")
      .update({
        display_name: player.display_name,
        email: player.email || null,
        phone: player.phone || null,
        source: "roster",
        response_status: "joined",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPlayer.id)
      .select("*")
      .single();
    if (error) throw error;
    await addLog(supabase, group.id, session.id, "session", `${player.display_name} manually joined ${session.session_name || "Session"}.`);
    return { sessionPlayer: data, mode: "updated" };
  }

  const nextSortOrder = currentPlayers.reduce((max, row) => Math.max(max, Number(row.sort_order || 0)), 0) + 1;
  const { data, error } = await supabase
    .from("round_robin_session_players")
    .insert({
      session_id: session.id,
      player_id: player.id,
      display_name: player.display_name,
      email: player.email || null,
      phone: player.phone || null,
      source: "roster",
      response_status: "joined",
      sort_order: nextSortOrder,
    })
    .select("*")
    .single();
  if (error) throw error;

  await addLog(supabase, group.id, session.id, "session", `${player.display_name} manually added and joined ${session.session_name || "Session"}.`);
  return { sessionPlayer: data, mode: "inserted" };
}

async function addSessionNewPlayer(supabase, group, body) {
  const sessionId = String(body.sessionId || "").trim();
  const displayName = String(body.displayName || body.playerName || "").trim();
  const cleanPhone = normalizePhone(body.phone);
  if (!sessionId) throw new Error("Session is required.");
  if (!displayName) throw new Error("Player name is required.");
  if (!cleanPhone || cleanPhone.length < 10) throw new Error("Enter a full 10-digit phone number.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  if (["done", "cancelled"].includes(session.status)) throw new Error("This session is no longer accepting players.");

  const groupIds = Array.isArray(session.invited_group_ids) ? session.invited_group_ids : [];
  const playersResult = await supabase
    .from("round_robin_players")
    .select("*")
    .eq("group_id", group.id)
    .order("display_name", { ascending: true });
  if (playersResult.error) throw playersResult.error;

  const existingPlayer = (playersResult.data || []).find((player) => phonesMatch(player.phone, cleanPhone));
  const playerPayload = {
    group_id: group.id,
    display_name: displayName,
    first_name: displayName.split(/\s+/)[0] || null,
    phone: formatPhoneInput(cleanPhone),
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  let player = existingPlayer;
  if (existingPlayer) {
    const { data, error } = await supabase
      .from("round_robin_players")
      .update({
        display_name: playerPayload.display_name,
        first_name: playerPayload.first_name,
        phone: playerPayload.phone,
        is_active: true,
        updated_at: playerPayload.updated_at,
      })
      .eq("id", existingPlayer.id)
      .eq("group_id", group.id)
      .select("*")
      .single();
    if (error) throw error;
    player = data;
  } else {
    const { data, error } = await supabase
      .from("round_robin_players")
      .insert(playerPayload)
      .select("*")
      .single();
    if (error) throw error;
    player = data;
    await addLog(supabase, group.id, session.id, "player", `${displayName} added by host.`);
  }

  await replacePlayerGroupMemberships(supabase, group.id, player.id, groupIds);
  const sms = await sendNewPlayerText(supabase, group, player, body.publicUrl);
  const sessionPlayerResult = await addSessionPlayer(supabase, group, {
    sessionId: session.id,
    playerId: player.id,
  });

  return {
    player,
    groupIds,
    sms,
    ...sessionPlayerResult,
  };
}

async function deleteSession(supabase, group, body) {
  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) throw new Error("Session is required.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  const { data, error } = await supabase
    .from("round_robin_sessions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("group_id", group.id)
    .select("*")
    .single();
  if (error) throw error;

  await addLog(supabase, group.id, session.id, "session", `${session.session_name || "Session"} deleted from active sessions.`);
  return { session: data };
}

async function masterResetRoundRobin(supabase, group) {
  const sessionsResult = await supabase
    .from("round_robin_sessions")
    .select("id")
    .eq("group_id", group.id);
  if (sessionsResult.error) throw sessionsResult.error;

  const sessionIds = (sessionsResult.data || []).map((session) => session.id).filter(Boolean);

  if (sessionIds.length > 0) {
    const logDelete = await supabase
      .from("round_robin_activity_log")
      .delete()
      .eq("group_id", group.id)
      .in("session_id", sessionIds);
    if (logDelete.error) throw logDelete.error;

    const sessionDelete = await supabase
      .from("round_robin_sessions")
      .delete()
      .eq("group_id", group.id)
      .in("id", sessionIds);
    if (sessionDelete.error) throw sessionDelete.error;
  }

  const orphanedSessionLogDelete = await supabase
    .from("round_robin_activity_log")
    .delete()
    .eq("group_id", group.id)
    .is("session_id", null)
    .in("log_type", ["session", "lineup"]);
  if (orphanedSessionLogDelete.error) throw orphanedSessionLogDelete.error;

  await addLog(
    supabase,
    group.id,
    null,
    "setup",
    `Master Reset deleted ${sessionIds.length} session${sessionIds.length === 1 ? "" : "s"} and all session scoring/player history. Saved players, player groups, and group memberships were kept.`
  );

  return { sessionsDeleted: sessionIds.length };
}

async function startSession(supabase, group, body) {
  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) throw new Error("Session is required.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  const sessionPlayers = await filterActiveSessionPlayers(supabase, group.id, await loadSessionPlayers(supabase, session.id));
  let joinedPlayers = sessionPlayers.filter((player) => player.response_status === "joined");
  if (Array.isArray(body.selectedSessionPlayerIds)) {
    const selectedIds = new Set(body.selectedSessionPlayerIds.map((id) => String(id || "")).filter(Boolean));
    joinedPlayers = joinedPlayers.filter((player) => selectedIds.has(String(player.id || "")));
    if (joinedPlayers.length < 4) throw new Error("Confirm at least 4 joined players before starting.");

    const uncheckedJoinedPlayerIds = sessionPlayers
      .filter((player) => player.response_status === "joined")
      .filter((player) => !selectedIds.has(String(player.id || "")))
      .map((player) => player.id)
      .filter(Boolean);

    if (uncheckedJoinedPlayerIds.length > 0) {
      const { error: attendanceError } = await supabase
        .from("round_robin_session_players")
        .update({ response_status: "declined", updated_at: new Date().toISOString() })
        .in("id", uncheckedJoinedPlayerIds);
      if (attendanceError) throw attendanceError;
    }
  }
  if (joinedPlayers.length < 4) throw new Error("Confirm at least 4 joined players before starting.");

  const sessionCourts = sanitizeSessionCourts(body.sessionCourts);
  const courtCount = sessionCourts.length || Number(body.courtCount || suggestedCourtCount(joinedPlayers.length));
  const settings = {
    ...(session.settings || {}),
    sessionCourts,
  };
  const { data, error } = await supabase
    .from("round_robin_sessions")
    .update({
      status: "playing",
      court_count: courtCount,
      settings,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .select("*")
    .single();
  if (error) throw error;

  await addLog(supabase, group.id, session.id, "session", `${session.session_name || "Session"} started with ${joinedPlayers.length} player${joinedPlayers.length === 1 ? "" : "s"}.`);
  return { session: data };
}

async function generateNextGame(supabase, group, body) {
  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) throw new Error("Session is required.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  if (session.status !== "playing") throw new Error("Start the session before generating games.");

  const [sessionPlayersSnapshot, existingMatches, courtsResult] = await Promise.all([
    loadSessionPlayers(supabase, session.id),
    loadSessionMatches(supabase, session.id),
    supabase
      .from("round_robin_courts")
      .select("*")
      .eq("group_id", group.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);
  if (courtsResult.error) throw courtsResult.error;

  const sessionPlayers = await filterActiveSessionPlayers(supabase, group.id, sessionPlayersSnapshot);
  const joinedPlayers = sessionPlayers
    .filter((player) => player.response_status === "joined")
    .map((player) => ({
      id: player.player_id,
      displayName: player.display_name,
      firstLabel: roundRobinPlayerLabel(player.display_name),
      phone: player.phone || "",
      email: player.email || "",
    }));

  const nextRound = createNextRoundRobinRound({
    players: joinedPlayers,
    courts: resolveSessionCourts(session, courtsResult.data || []),
    existingMatches,
    courtCount: Number(session.court_count || 0) || undefined,
  });

  const matchPayload = nextRound.courts.map((court, courtIndex) => ({
    session_id: session.id,
    round_number: nextRound.roundNumber,
    court_number: court.courtNumber,
    court_name: court.courtName,
    team1_players: court.team1.map(publicPlayerPayload),
    team2_players: court.team2.map(publicPlayerPayload),
    bye_players: courtIndex === 0 ? nextRound.byes.map(publicPlayerPayload) : [],
    status: "scheduled",
  }));

  const matchesResult = await supabase
    .from("round_robin_matches")
    .insert(matchPayload)
    .select("*");
  if (matchesResult.error) throw matchesResult.error;

  const { data: updatedSession, error: sessionError } = await supabase
    .from("round_robin_sessions")
    .update({
      round_count: nextRound.roundNumber,
      court_count: nextRound.courtCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .select("*")
    .single();
  if (sessionError) throw sessionError;

  await rebuildResults(supabase, group, session.id);
  await addLog(supabase, group.id, session.id, "session", `Generated round ${nextRound.roundNumber}.`);
  return { session: updatedSession, matches: matchesResult.data || [], roundNumber: nextRound.roundNumber };
}

async function updateMatchScore(supabase, group, body) {
  const matchId = String(body.matchId || "").trim();
  if (!matchId) throw new Error("Match is required.");

  const existing = await loadMatchForGroup(supabase, group.id, matchId);
  const team1Score = normalizeScore(body.team1Score);
  const team2Score = normalizeScore(body.team2Score);

  const { data, error } = await supabase
    .from("round_robin_matches")
    .update({
      team1_score: team1Score,
      team2_score: team2Score,
      status: team1Score === null || team2Score === null ? "scheduled" : "complete",
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select("*")
    .single();

  if (error) throw error;
  const results = await rebuildResults(supabase, group, existing.session_id);
  return { match: data, results };
}

async function updateMatchLineup(supabase, group, body) {
  const matchId = String(body.matchId || "").trim();
  if (!matchId) throw new Error("Match is required.");

  const existing = await loadMatchForGroup(supabase, group.id, matchId);
  const payload = {
    team1_players: sanitizeMatchPlayers(body.team1Players),
    team2_players: sanitizeMatchPlayers(body.team2Players),
    bye_players: sanitizeMatchPlayers(body.byePlayers),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("round_robin_matches")
    .update(payload)
    .eq("id", matchId)
    .select("*")
    .single();

  if (error) throw error;
  const results = await rebuildResults(supabase, group, existing.session_id);
  await addLog(supabase, group.id, existing.session_id, "lineup", `Round ${existing.round_number} Court ${existing.court_number} lineup updated.`);
  return { match: data, results };
}

async function completeSession(supabase, group, body) {
  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) throw new Error("Session is required.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  const results = await rebuildResults(supabase, group, sessionId);
  const playedResults = results.filter((row) => Number(row.games || 0) > 0 || Number(row.byes || 0) > 0);
  const standings = playedResults.map((row) => ({
    rank: row.rank,
    displayName: row.display_name,
    wins: row.wins,
    losses: row.losses,
    winPct: row.games > 0 ? row.wins / row.games : 0,
    pointDiff: row.point_diff,
    pointsFor: row.points_for,
    pointsAgainst: row.points_against,
    byes: row.byes,
  }));
  const summaryText = summaryTextForStandings(group.name, session.session_date, standings);

  const { data, error } = await supabase
    .from("round_robin_sessions")
    .update({ status: "done", summary_text: summaryText, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error) throw error;

  const smsEnabled = body.smsEnabled === true && group.settings?.smsSendingEnabled === true;
  let sms = smsDisabledResult(smsEnabled ? "" : body.smsEnabled ? "SMS disabled in settings" : "SMS disabled", 0);
  if (smsEnabled) {
    const sessionPlayers = await filterActiveSessionPlayers(supabase, group.id, await loadSessionPlayers(supabase, sessionId));
    const playedPlayerIds = new Set(playedResults.map((row) => String(row.player_id)));
    const recipientPlayers = sessionPlayers.filter((player) => (
      playedPlayerIds.size > 0
        ? playedPlayerIds.has(String(player.player_id || player.id || ""))
        : player.response_status !== "declined"
    ));
    const resultMessage = renderSmsTemplate(
      normalizeSmsTemplates(group.settings?.smsTemplates || {}).sessionResults,
      {
        group,
        session,
        publicUrl: body.publicUrl,
        resultRankings: resultRankingsForSms(standings),
        ...sessionTextCounts(session, sessionPlayers),
      }
    );
    sms = await sendSmsMessages({
      phones: recipientPlayers.map((player) => player.phone).filter(Boolean),
      body: resultMessage,
    });
  }

  const repeatsWeekly = isWeeklyRepeatEnabled(data.repeats_weekly) || isWeeklyRepeatEnabled(session.repeats_weekly);
  let weeklyRepeat = { requested: repeatsWeekly, created: false, skipped: true, reason: "Session is not set to repeat weekly" };
  if (repeatsWeekly) {
    try {
      weeklyRepeat = await createNextWeeklySession(supabase, group, data, body);
    } catch (repeatError) {
      weeklyRepeat = { requested: true, created: false, skipped: true, reason: repeatError.message || "Unable to create next weekly session" };
      await addLog(supabase, group.id, sessionId, "session", `Weekly repeat was not created: ${weeklyRepeat.reason}`, { weeklyRepeat });
    }
  }

  await addLog(supabase, group.id, sessionId, "session", `Session completed. Result texts sent: ${sms.sent || 0}.`, { sms, weeklyRepeat });
  return { session: data, results, summaryText, sms, weeklyRepeat };
}

async function createNextWeeklySession(supabase, group, session, body) {
  const nextDate = addDaysToIsoDate(session.session_date, 7);
  const invitedGroupIds = [...new Set([
    ...(Array.isArray(session.invited_group_ids) ? session.invited_group_ids : []),
    ...(Array.isArray(session.settings?.createdFromGroups) ? session.settings.createdFromGroups : []),
  ].map((id) => String(id || "").trim()).filter(Boolean))];
  if (!nextDate) return { requested: true, created: false, skipped: true, reason: "Original session date is missing" };
  if (invitedGroupIds.length === 0) return { requested: true, created: false, skipped: true, reason: "Original session has no invited groups" };

  const duplicateResult = await supabase
    .from("round_robin_sessions")
    .select("id, session_name, session_date, starts_at")
    .eq("group_id", group.id)
    .eq("session_date", nextDate)
    .eq("session_name", session.session_name || "Round Robin Session")
    .limit(10);
  if (duplicateResult.error) throw duplicateResult.error;

  const existingRepeat = (duplicateResult.data || []).find((row) => String(row.starts_at || "") === String(session.starts_at || ""));
  if (existingRepeat) {
    return { requested: true, created: false, skipped: true, reason: "Next weekly session already exists", sessionId: existingRepeat.id, sessionDate: nextDate };
  }

  const repeatResult = await createPlannedSession(supabase, group, {
    sessionName: session.session_name || "Round Robin Session",
    location: session.location || "",
    sessionDate: nextDate,
    startsAt: session.starts_at || "",
    maxPlayers: session.max_players || 8,
    repeatsWeekly: true,
    hostPlayerId: session.host_player_id || "",
    cohostPlayerId: session.cohost_player_id || "",
    invitedGroupIds,
    mode: session.mode || group.mode,
    smsEnabled: true,
    publicUrl: body.publicUrl,
  });

  await addLog(
    supabase,
    group.id,
    session.id,
    "session",
    `Next weekly session opened for ${formatIsoDateForLog(nextDate)}.`,
    { nextSessionId: repeatResult.session?.id, nextSessionDate: nextDate, sms: repeatResult.sms }
  );

  return {
    requested: true,
    created: true,
    sessionId: repeatResult.session?.id,
    sessionDate: nextDate,
    sms: repeatResult.sms,
  };
}

async function sendBroadcastText(supabase, group, body, access = null) {
  const sessionId = String(body.sessionId || "").trim();
  const message = String(body.message || "").trim();
  if (!message) throw new Error("Message is required.");

  const recipientScope = access?.mode === "host"
    ? "joined"
    : ["joined", "invited", "session", "all"].includes(body.recipientScope) ? body.recipientScope : "joined";
  const smsEnabled = body.smsEnabled === true && group.settings?.smsSendingEnabled === true;
  let logSessionId = null;
  let session = null;
  let sessionPlayers = [];
  let players = [];

  if (sessionId) {
    session = await loadSessionForGroup(supabase, group.id, sessionId);
    logSessionId = session.id;
  }

  if (!logSessionId && recipientScope !== "all") {
    throw new Error("A session is required for that recipient group.");
  }
  if (access?.mode === "host" && !logSessionId) {
    throw new Error("A session is required for host text updates.");
  }

  if (recipientScope === "all" || !logSessionId) {
    players = await loadActivePlayers(supabase, group.id);
  } else {
    sessionPlayers = await filterActiveSessionPlayers(supabase, group.id, await loadSessionPlayers(supabase, logSessionId));
    if (recipientScope === "session") {
      players = sessionPlayers.filter((player) => player.response_status !== "declined");
    } else if (recipientScope === "invited") {
      players = sessionPlayers.filter((player) => player.response_status === "invited");
    } else {
      players = sessionPlayers.filter((player) => player.response_status === "joined");
    }
  }

  const phones = players.map((player) => player.phone).filter(Boolean);
  const renderedMessage = session
    ? renderSmsTemplate(message, { group, session, ...sessionTextCounts(session, sessionPlayers) })
    : message;
  const sms = smsEnabled
    ? await sendSmsMessages({ phones, body: renderedMessage })
    : smsDisabledResult(body.smsEnabled ? "SMS disabled in settings" : "SMS disabled for testing", players.length, phones.length);

  const recipientCount = players.length;
  const logMessage = smsEnabled
    ? `Broadcast text sent to ${sms.sent || 0} recipient${Number(sms.sent || 0) === 1 ? "" : "s"}.`
    : `Broadcast text logged in SMS test mode for ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}.`;

  await addLog(supabase, group.id, logSessionId, "sms", logMessage, { sms, recipientScope, recipientCount, phoneCount: phones.length });
  return { sms, recipients: recipientCount, phoneRecipients: phones.length };
}

async function sendTestTemplateText(supabase, group, body) {
  const phone = String(body.phone || "").replace(/\D/g, "");
  if (phone.length < 10) throw new Error("Enter a test phone number.");

  const sessionId = String(body.sessionId || "").trim();
  let session = null;
  let sessionPlayers = [];
  if (sessionId) {
    session = await loadSessionForGroup(supabase, group.id, sessionId);
    sessionPlayers = await loadSessionPlayers(supabase, session.id);
  }

  const template = String(body.template || body.message || "").trim();
  if (!template) throw new Error("Template text is required.");

  const message = session
    ? renderSmsTemplate(template, { group, session, publicUrl: body.publicUrl, ...sessionTextCounts(session, sessionPlayers) })
    : renderSmsTemplate(template, { group, publicUrl: body.publicUrl });
  const smsEnabled = body.smsEnabled === true && group.settings?.smsSendingEnabled === true;
  const sms = smsEnabled
    ? await sendSmsMessages({ phones: [phone], body: message })
    : smsDisabledResult(body.smsEnabled ? "SMS disabled in settings" : "SMS disabled for testing", 1, 1);

  await addLog(
    supabase,
    group.id,
    session?.id || null,
    "sms",
    smsEnabled ? `Test template text sent to ${phone}.` : `Test template text logged for ${phone}.`,
    { sms, recipientScope: "test", recipientCount: 1, phoneCount: 1 }
  );

  return { sms, recipients: 1, phoneRecipients: 1 };
}

async function sendSessionReminderText(supabase, group, body) {
  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) throw new Error("Session is required.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  const sessionPlayers = await filterActiveSessionPlayers(supabase, group.id, await loadSessionPlayers(supabase, session.id));
  const pendingPlayers = sessionPlayers.filter((player) => player.response_status === "invited");
  const phones = pendingPlayers.map((player) => player.phone).filter(Boolean);
  const templates = normalizeSmsTemplates(group.settings?.smsTemplates || {});
  const rawMessage = String(body.message || templates.sessionReminder || "").trim();
  const message = renderSmsTemplate(rawMessage, { group, session, publicUrl: body.publicUrl, ...sessionTextCounts(session, sessionPlayers) });
  const smsEnabled = body.smsEnabled === true && group.settings?.smsSendingEnabled === true;
  const sms = smsEnabled
    ? await sendSmsMessages({ phones, body: message })
    : smsDisabledResult(body.smsEnabled ? "SMS disabled in settings" : "SMS disabled for testing", pendingPlayers.length, phones.length);

  await addLog(
    supabase,
    group.id,
    session.id,
    "sms",
    smsEnabled
      ? `Reminder text sent to ${sms.sent || 0} pending player${Number(sms.sent || 0) === 1 ? "" : "s"}.`
      : `Reminder text logged in SMS test mode for ${pendingPlayers.length} pending player${pendingPlayers.length === 1 ? "" : "s"}.`,
    { sms, recipientScope: "pending", recipientCount: pendingPlayers.length, phoneCount: phones.length }
  );

  return { sms, recipients: pendingPlayers.length, phoneRecipients: phones.length };
}

async function rebuildResults(supabase, group, sessionId) {
  const [players, matches] = await Promise.all([
    loadSessionPlayers(supabase, sessionId),
    loadSessionMatches(supabase, sessionId),
  ]);

  const standings = roundRobinStandings(matches.map((match) => ({
    ...match,
    team1: match.team1_players || [],
    team2: match.team2_players || [],
    byes: match.bye_players || [],
  })), players.map((player) => ({
    id: player.player_id,
    displayName: player.display_name,
  })));

  await supabase
    .from("round_robin_player_session_results")
    .delete()
    .eq("session_id", sessionId);

  if (standings.length === 0) return [];

  const payload = standings.map((row) => ({
    session_id: sessionId,
    player_id: row.playerId,
    display_name: row.displayName,
    games: row.games,
    wins: row.wins,
    losses: row.losses,
    points_for: row.pointsFor,
    points_against: row.pointsAgainst,
    point_diff: row.pointDiff,
    byes: row.byes,
    rank: row.rank,
  }));

  const { data, error } = await supabase
    .from("round_robin_player_session_results")
    .insert(payload)
    .select("*")
    .order("rank", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function loadResults(supabase, sessionId) {
  const { data, error } = await supabase
    .from("round_robin_player_session_results")
    .select("*")
    .eq("session_id", sessionId)
    .order("rank", { ascending: true });
  if (error) throw error;
  return data || [];
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

async function loadActivePlayers(supabase, groupId) {
  const { data, error } = await supabase
    .from("round_robin_players")
    .select("*")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("display_name", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function loadRoundRobinPlayer(supabase, groupId, playerId) {
  const { data, error } = await supabase
    .from("round_robin_players")
    .select("*")
    .eq("id", playerId)
    .eq("group_id", groupId)
    .eq("is_active", true)
    .single();
  if (error) throw error;
  return data;
}

async function loadPlayersForGroups(supabase, groupId, invitedGroupIds) {
  const groupResult = await supabase
    .from("round_robin_player_groups")
    .select("id")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .in("id", invitedGroupIds);
  if (groupResult.error) throw groupResult.error;

  const allowedGroupIds = (groupResult.data || []).map((row) => row.id);
  if (allowedGroupIds.length === 0) return [];

  const membershipResult = await supabase
    .from("round_robin_player_group_members")
    .select("player_id")
    .in("player_group_id", allowedGroupIds);
  if (membershipResult.error) throw membershipResult.error;

  const playerIds = [...new Set((membershipResult.data || []).map((row) => row.player_id).filter(Boolean))];
  if (playerIds.length === 0) return [];

  const playerResult = await supabase
    .from("round_robin_players")
    .select("*")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .in("id", playerIds)
    .order("display_name", { ascending: true });
  if (playerResult.error) throw playerResult.error;
  return playerResult.data || [];
}

async function loadSessionMatches(supabase, sessionId) {
  const { data, error } = await supabase
    .from("round_robin_matches")
    .select("*")
    .eq("session_id", sessionId)
    .order("round_number", { ascending: true })
    .order("court_number", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function resolveActionSessionId(supabase, body) {
  const sessionId = String(body.sessionId || "").trim();
  if (sessionId) return sessionId;

  const matchId = String(body.matchId || "").trim();
  if (!matchId) return "";

  const { data, error } = await supabase
    .from("round_robin_matches")
    .select("session_id")
    .eq("id", matchId)
    .single();
  if (error) throw error;
  return data?.session_id || "";
}

async function loadHostSessionForPlayer(supabase, groupId, sessionId, playerId) {
  const { data, error } = await supabase
    .from("round_robin_sessions")
    .select("id, host_player_id, cohost_player_id, status")
    .eq("id", sessionId)
    .eq("group_id", groupId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const cleanPlayerId = String(playerId || "");
  if (
    String(data.host_player_id || "") !== cleanPlayerId &&
    String(data.cohost_player_id || "") !== cleanPlayerId
  ) {
    return null;
  }

  return data;
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
    const notFound = new Error("That phone number was not found in this Round Robin group.");
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

async function loadMatchForGroup(supabase, groupId, matchId) {
  const { data, error } = await supabase
    .from("round_robin_matches")
    .select("*")
    .eq("id", matchId)
    .single();
  if (error) throw error;
  await loadSessionForGroup(supabase, groupId, data.session_id);
  return data;
}

async function addLog(supabase, groupId, sessionId, logType, message, metadata = {}) {
  const { error } = await supabase.from("round_robin_activity_log").insert({
    group_id: groupId,
    session_id: sessionId,
    log_type: logType,
    message,
    metadata,
  });
  if (error) throw error;
}

function publicPlayerPayload(player) {
  return {
    id: player.id,
    displayName: player.displayName || player.display_name || player.name || "Player",
    firstLabel: player.firstLabel || roundRobinPlayerLabel(player.displayName || player.display_name || player.name),
  };
}

function sanitizeMatchPlayers(players = []) {
  if (!Array.isArray(players)) return [];
  return players
    .map((player) => ({
      id: String(player.id || "").trim(),
      displayName: String(player.displayName || player.display_name || player.name || "").trim(),
      firstLabel: String(player.firstLabel || "").trim() || roundRobinPlayerLabel(player.displayName || player.display_name || player.name),
    }))
    .filter((player) => player.id && player.displayName);
}

function normalizeScore(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error("Scores must be whole numbers.");
  return parsed;
}

function suggestedCourtCount(playerCount) {
  const count = Number(playerCount || 0);
  if (count <= 7) return 1;
  return Math.max(1, Math.ceil((count - 3) / 4));
}

function defaultSmsTemplates() {
  return {
    newPlayer: "{{group_name}}: {{player_name}}, you have been added to PBCourtCommand. You may receive session invite/update texts at this number. Reply STOP to opt out. {{public_link}}",
    sessionInvite: "{{group_name}}: {{session_name}} is open for {{date}} at {{time}}{{location_line}}. {{joined_count}} joined, {{available_spots}} spots open. Reply to the host or open {{public_link}} to join.",
    sessionReminder: "{{group_name}} reminder: {{session_name}} is still open for {{date}} at {{time}}{{location_line}}. {{joined_count}} joined, {{available_spots}} spots open. Please reply if you can play or if you are out.",
    gameUpdate: "{{group_name}} game update: ",
    weatherUpdate: "{{group_name}} weather update: ",
    sessionResults: "{{group_name}} Results for {{date}}:\n{{result_rankings}}",
  };
}

function normalizeSmsTemplates(templates = {}) {
  const defaults = defaultSmsTemplates();
  return {
    newPlayer: String(templates.newPlayer || defaults.newPlayer),
    sessionInvite: String(templates.sessionInvite || defaults.sessionInvite),
    sessionReminder: String(templates.sessionReminder || defaults.sessionReminder),
    gameUpdate: String(templates.gameUpdate || defaults.gameUpdate),
    weatherUpdate: String(templates.weatherUpdate || defaults.weatherUpdate),
    sessionResults: String(templates.sessionResults || defaults.sessionResults),
  };
}

function renderSmsTemplate(template, { group, session, publicUrl, joinedCount, availableSpots, resultRankings, playerName } = {}) {
  const date = session?.session_date ? new Date(`${session.session_date}T12:00:00`).toLocaleDateString("en-US") : "the next session";
  const time = session?.starts_at ? formatSessionTime(session.starts_at) : "TBD";
  const location = session?.location ? session.location : "";
  const maxPlayers = Number(session?.max_players || 0);
  const resolvedJoinedCount = Number(joinedCount || 0);
  const resolvedAvailableSpots = availableSpots ?? (maxPlayers > 0 ? Math.max(0, maxPlayers - resolvedJoinedCount) : "");
  const replacements = {
    group_name: group?.name || "Round Robin",
    session_name: session?.session_name || "Round Robin session",
    date,
    time,
    location,
    location_line: location ? ` at ${location}` : "",
    public_link: publicUrl || "",
    player_name: playerName || "Player",
    joined_count: resolvedJoinedCount,
    available_spots: resolvedAvailableSpots,
    result_rankings: resultRankings || "",
  };

  return String(template || "")
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => replacements[key] ?? "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sessionTextCounts(session, sessionPlayers = []) {
  const joinedCount = sessionPlayers.filter((player) => player.response_status === "joined").length;
  const maxPlayers = Number(session?.max_players || 0);
  return {
    joinedCount,
    availableSpots: maxPlayers > 0 ? Math.max(0, maxPlayers - joinedCount) : "",
  };
}

function resultRankingsForSms(standings = []) {
  if (!standings.length) return "Results pending.";
  return standings.map((row) => {
    const diff = Number(row.pointDiff || 0);
    const diffText = diff > 0 ? `+${diff}` : String(diff);
    return `${row.rank}. ${row.displayName || "Player"} ${row.wins || 0}-${row.losses || 0}, PF ${row.pointsFor || 0}, PA ${row.pointsAgainst || 0}, Diff ${diffText}, Byes ${row.byes || 0}`;
  }).join("\n");
}

function smsDisabledResult(reason = "SMS disabled", recipientCount = 0, phoneCount = 0) {
  return {
    skipped: true,
    reason,
    sent: 0,
    results: [],
    recipientCount,
    phoneCount,
  };
}

function sanitizeSessionCourts(courts = []) {
  if (!Array.isArray(courts)) return [];
  return courts
    .map((court, index) => ({
      name: String(court.name || `Court ${index + 1}`).trim() || `Court ${index + 1}`,
      description: String(court.description || "").trim(),
      sort_order: index + 1,
      is_active: true,
    }))
    .filter((court) => court.name);
}

function resolveSessionCourts(session, defaultCourts = []) {
  const sessionCourts = sanitizeSessionCourts(session?.settings?.sessionCourts || []);
  if (sessionCourts.length > 0) return sessionCourts;
  return (defaultCourts || []).filter((court) => court.is_active !== false);
}

function formatSessionTime(value) {
  const [hourText, minuteText] = String(value || "").split(":");
  const hour = Number(hourText || 0);
  const minute = Number(minuteText || 0);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function addDaysToIsoDate(value, days) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function isWeeklyRepeatEnabled(value) {
  return value === true || value === 1 || String(value || "").toLowerCase() === "true";
}

function formatIsoDateForLog(value) {
  if (!value) return "the next date";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US");
}

function isValidRoundRobinAdminCode(group, eventCode) {
  const cleanCode = String(eventCode || "").trim();
  const overrideCode = String(process.env.ROUND_ROBIN_ADMIN_OVERRIDE_CODE || "").trim();
  return String(group.admin_code || "") === cleanCode || (overrideCode && overrideCode === cleanCode);
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

function formatPhoneInput(value) {
  const digits = normalizePhone(value).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}
