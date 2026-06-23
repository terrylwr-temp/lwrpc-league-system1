import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSmsMessages as sendSmsMessagesWithFallback } from "../../../lib/notifications";
import { compareLadderRowsByCriteria, normalizeLadderRankingCriteria } from "../../../lib/roundRobinLadderRankings";
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
  "sendSessionResultsText",
  "sendBroadcastText",
]);
const SECONDARY_ALLOWED_ACTIONS = new Set([
  "savePlayer",
  "deletePlayer",
  "saveLadder",
  "deleteLadder",
  "saveLadderPositions",
  "recalculateLadderRankings",
  "createLadderMatch",
]);
const DEFAULT_ROUND_ROBIN_SCORING = {
  pointsToWin: 21,
  winBy: 1,
  scoreType: "standard",
};

function sendSmsMessages(options) {
  return sendSmsMessagesWithFallback({
    ...options,
    preferAppNotifications: true,
    appNotificationTitle: "PBCourtCommand",
    appNotificationUrl: options?.appNotificationUrl || options?.publicUrl || "/pbcc/player",
    appNotificationIcon: "/favicon.ico",
  });
}

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

    if (action === "saveLadder") {
      const result = await saveLadder(supabase, group, body.ladder);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "deleteLadder") {
      const result = await deleteLadder(supabase, group, body.ladderId);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "saveLadderPositions") {
      const result = await saveLadderPositions(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "recalculateLadderRankings") {
      const result = await recalculateLadderRankings(supabase, group, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "createLadderMatch") {
      const result = await createLadderMatch(supabase, group, body);
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

    if (action === "markSessionDuprExported") {
      const result = await markSessionDuprExported(supabase, group, body);
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

    if (action === "sendSessionResultsText") {
      const result = await sendSessionResultsText(supabase, group, body);
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

    if (action === "sendGroupNewPlayerText") {
      const result = await sendGroupNewPlayerText(supabase, group, body);
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
    const codeAccessMode = roundRobinAdminAccessMode(data, cleanCode);
    if (!codeAccessMode) {
      const codeError = new Error("Incorrect manager code.");
      codeError.status = 401;
      throw codeError;
    }

    if (codeAccessMode === "secondary" && !SECONDARY_ALLOWED_ACTIONS.has(action)) {
      const scopeError = new Error("Secondary code access can only manage Ladders and Players.");
      scopeError.status = 403;
      throw scopeError;
    }

    return { mode: codeAccessMode, group: data };
  }

  if (!HOST_ALLOWED_ACTIONS.has(action)) {
    const hostScopeError = new Error("Host access can only manage assigned matches.");
    hostScopeError.status = 403;
    throw hostScopeError;
  }

  const hostPlayer = await findPlayerByPhone(supabase, data.id, body.hostPhone);
  const sessionId = await resolveActionSessionId(supabase, body);
  if (!sessionId) {
    const sessionError = new Error("Match is required for host access.");
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

function sanitizeActionGroup(group = {}) {
  const safeGroup = { ...group };
  delete safeGroup.admin_code;
  safeGroup.settings = { ...(safeGroup.settings || {}) };
  delete safeGroup.settings.secondaryAdminCode;
  return safeGroup;
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
      defaultLocation: String(body.defaultLocation || "").trim(),
      defaultHostPlayerId: String(body.defaultHostPlayerId || "").trim(),
      secondaryAdminCode: String(body.secondaryCode || "").trim() || String(group.settings?.secondaryAdminCode || "").trim(),
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
  return { group: sanitizeActionGroup({ ...group, ...payload }) };
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
    dupr_id: normalizeDuprId(player.duprId || player.dupr_id) || null,
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

async function sendLadderAddedText(supabase, group, ladder, publicUrl = "") {
  const smsEnabled = group.settings?.smsSendingEnabled === true;
  const ladderPlayers = await loadPlayersForGroups(supabase, group.id, [ladder.playerGroupId]);
  const phones = ladderPlayers.map((player) => player.phone).filter(Boolean);
  const template = normalizeSmsTemplates(group.settings?.smsTemplates || {}).ladderAdded;
  const results = [];

  if (smsEnabled) {
    for (const player of ladderPlayers) {
      if (!player.phone) continue;
      const result = await sendSmsMessages({
        phones: [player.phone],
        body: renderSmsTemplate(template, {
          group,
          publicUrl,
          playerName: player.display_name || "Player",
          ladderName: ladder.name || "Ladder",
        }),
      });
      results.push({ playerId: player.id, ...result });
    }
  }

  const sms = smsEnabled
    ? {
      skipped: false,
      sent: results.reduce((total, result) => total + Number(result.sent || 0), 0),
      results,
      recipientCount: ladderPlayers.length,
      phoneCount: phones.length,
    }
    : smsDisabledResult("SMS disabled in settings", ladderPlayers.length, phones.length);

  await addLog(
    supabase,
    group.id,
    null,
    "sms",
    smsEnabled
      ? `Ladder Added text sent to ${sms.sent || 0} recipient${Number(sms.sent || 0) === 1 ? "" : "s"} for ${ladder.name || "Ladder"}.`
      : `Ladder Added text skipped for ${ladder.name || "Ladder"} because SMS is off.`,
    { sms, recipientScope: "ladderAdded", recipientCount: ladderPlayers.length, phoneCount: phones.length, ladderId: ladder.id }
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
  return { group: sanitizeActionGroup(data) };
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

async function saveLadder(supabase, group, ladder = {}) {
  const normalized = normalizeLadder(ladder);
  if (!normalized.name) throw new Error("Ladder name is required.");
  if (!normalized.startDate) throw new Error("Start date is required.");
  if (!normalized.playerGroupId) throw new Error("Player group is required.");
  const existingLadders = normalizeLadders(group.settings?.ladders || []);
  const existing = existingLadders.find((item) => item.id === normalized.id);
  const isNewLadder = !existing;
  const ladderToSave = {
    ...normalized,
    initialPositions: Object.keys(normalized.initialPositions || {}).length > 0
      ? normalized.initialPositions
      : existing?.initialPositions || {},
  };
  const nextLadders = existingLadders.some((item) => item.id === normalized.id)
    ? existingLadders.map((item) => item.id === normalized.id ? ladderToSave : item)
    : [...existingLadders, ladderToSave];

  const settings = {
    ...(group.settings || {}),
    ladders: nextLadders,
  };

  const { error } = await supabase
    .from("round_robin_groups")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", group.id);
  if (error) throw error;

  await addLog(supabase, group.id, null, "setup", `${ladderToSave.name} ladder saved.`);
  const sms = isNewLadder ? await sendLadderAddedText(supabase, group, ladderToSave, ladder.publicUrl) : null;
  return { ladder: ladderToSave, ladders: nextLadders, group: sanitizeActionGroup({ ...group, settings }), sms, ladderTextSent: Boolean(isNewLadder) };
}

async function deleteLadder(supabase, group, ladderId) {
  const cleanId = String(ladderId || "").trim();
  if (!cleanId) throw new Error("Ladder is required.");

  const existingLadders = normalizeLadders(group.settings?.ladders || []);
  const target = existingLadders.find((item) => item.id === cleanId);
  if (!target) throw new Error("Ladder was not found.");
  const ladderSessions = await loadLadderSessionsForGroup(supabase, group, target);
  const sessionIds = ladderSessions.map((session) => session.id).filter(Boolean);
  if (sessionIds.length > 0) {
    const [matchesResult, resultsResult] = await Promise.all([
      supabase
        .from("round_robin_matches")
        .select("id, team1_score, team2_score, status")
        .in("session_id", sessionIds),
      supabase
        .from("round_robin_player_session_results")
        .select("id, games, wins, losses, points_for, points_against")
        .in("session_id", sessionIds),
    ]);
    if (matchesResult.error) throw matchesResult.error;
    if (resultsResult.error) throw resultsResult.error;

    const hasPlayedGames = (matchesResult.data || []).some((match) => (
      match.status === "complete" ||
      match.team1_score !== null ||
      match.team2_score !== null
    )) || (resultsResult.data || []).some((row) => (
      Number(row.games || 0) > 0 ||
      Number(row.wins || 0) > 0 ||
      Number(row.losses || 0) > 0 ||
      Number(row.points_for || 0) > 0 ||
      Number(row.points_against || 0) > 0
    ));
    if (hasPlayedGames) throw new Error("This ladder has played games and cannot be deleted. Use Master Reset if you need to remove ladder match history.");

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
  const nextLadders = existingLadders.filter((item) => item.id !== cleanId);
  const settings = {
    ...(group.settings || {}),
    ladders: nextLadders,
  };

  const { error } = await supabase
    .from("round_robin_groups")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", group.id);
  if (error) throw error;

  await addLog(supabase, group.id, null, "setup", `${target.name || "Ladder"} deleted. Removed ${sessionIds.length} unplayed ladder match date${sessionIds.length === 1 ? "" : "s"}.`);
  return { ladders: nextLadders, group: sanitizeActionGroup({ ...group, settings }), sessionsDeleted: sessionIds.length };
}

async function saveLadderPositions(supabase, group, body = {}) {
  const ladderId = String(body.ladderId || "").trim();
  const requestedPositions = body.positions && typeof body.positions === "object" ? body.positions : {};
  if (!ladderId) throw new Error("Ladder is required.");

  const existingLadders = normalizeLadders(group.settings?.ladders || []);
  const ladder = existingLadders.find((item) => item.id === ladderId);
  if (!ladder) throw new Error("Ladder was not found.");

  const existingSessions = await loadLadderSessionsForGroup(supabase, group, ladder);
  const startedSession = existingSessions.find((session) => ["playing", "done"].includes(session.status));
  if (startedSession) throw new Error("Initial ladder positions can only be changed before the first ladder match starts.");

  const rosterPlayers = await loadPlayersForGroups(supabase, group.id, [ladder.playerGroupId]);
  const rosterIds = rosterPlayers.map((player) => String(player.id));
  const rawPositionValues = rosterIds
    .map((playerId) => Number(requestedPositions[playerId]))
    .filter((position) => Number.isFinite(position));
  if (
    rawPositionValues.length !== rosterIds.length ||
    rawPositionValues.some((position) => !Number.isInteger(position) || position < 1 || position > rosterIds.length) ||
    new Set(rawPositionValues).size !== rawPositionValues.length
  ) {
    throw new Error(`Positions must be unique numbers from 1 to ${rosterIds.length}.`);
  }
  const normalizedPositions = normalizeInitialPositions(requestedPositions, rosterIds);
  const positionValues = Object.values(normalizedPositions);
  const uniqueValues = new Set(positionValues);
  if (positionValues.length !== rosterIds.length || uniqueValues.size !== rosterIds.length) {
    throw new Error("Each ladder player must have a unique position.");
  }

  const nextLadders = existingLadders.map((item) => (
    item.id === ladderId ? { ...item, initialPositions: normalizedPositions, updatedAt: new Date().toISOString() } : item
  ));
  const settings = {
    ...(group.settings || {}),
    ladders: nextLadders,
  };

  const { error } = await supabase
    .from("round_robin_groups")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", group.id);
  if (error) throw error;

  await addLog(supabase, group.id, null, "setup", `${ladder.name} ladder positions saved.`);
  return { ladder: nextLadders.find((item) => item.id === ladderId), ladders: nextLadders, group: sanitizeActionGroup({ ...group, settings }) };
}

async function recalculateLadderRankings(supabase, group, body = {}) {
  const requestedId = String(body.ladderId || body.ladder?.id || "").trim();
  if (!requestedId) throw new Error("Ladder is required.");

  const existingLadders = normalizeLadders(group.settings?.ladders || []);
  const existing = existingLadders.find((item) => item.id === requestedId);
  if (!existing) throw new Error("Ladder was not found.");

  const requested = body.ladder && typeof body.ladder === "object"
    ? normalizeLadder({ ...existing, ...body.ladder, id: requestedId }, { allowExistingId: true })
    : existing;
  if (!requested.name) throw new Error("Ladder name is required.");
  if (!requested.startDate) throw new Error("Start date is required.");
  if (!requested.playerGroupId) throw new Error("Player group is required.");

  const ladderToSave = {
    ...existing,
    ...requested,
    initialPositions: Object.keys(requested.initialPositions || {}).length > 0
      ? requested.initialPositions
      : existing.initialPositions || {},
    updatedAt: new Date().toISOString(),
  };
  const nextLadders = existingLadders.map((item) => item.id === requestedId ? ladderToSave : item);
  const settings = {
    ...(group.settings || {}),
    ladders: nextLadders,
  };
  const workingGroup = { ...group, settings };

  const updateResult = await supabase
    .from("round_robin_groups")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", group.id);
  if (updateResult.error) throw updateResult.error;

  const ladderSessions = (await loadLadderSessionsForGroup(supabase, workingGroup, ladderToSave))
    .filter((session) => session.status === "done")
    .sort(compareLadderSessions);
  let resultsRecalculated = 0;

  for (const session of ladderSessions) {
    const rebuilt = await rebuildResults(supabase, workingGroup, session.id);
    resultsRecalculated += rebuilt.length;
  }

  await rebuildLadderPositionMetadata(supabase, workingGroup, ladderToSave, ladderSessions);
  await addLog(
    supabase,
    group.id,
    null,
    "setup",
    `${ladderToSave.name} ladder rankings recalculated for ${ladderSessions.length} completed match${ladderSessions.length === 1 ? "" : "es"}.`
  );

  return {
    ladder: ladderToSave,
    ladders: nextLadders,
    group: sanitizeActionGroup(workingGroup),
    sessionsRecalculated: ladderSessions.length,
    resultsRecalculated,
  };
}

async function createLadderMatch(supabase, group, body = {}) {
  const ladderId = String(body.ladderId || "").trim();
  const ladder = normalizeLadders(group.settings?.ladders || []).find((item) => item.id === ladderId);
  if (!ladder) throw new Error("Ladder was not found.");
  if (!ladder.playerGroupId) throw new Error("Select a ladder player group first.");

  const requestedSessionDate = normalizeIsoDate(body.sessionDate);
  const sessionDate = requestedSessionDate || await nextLadderSessionDate(supabase, group, ladder);
  const startsAt = String(body.startsAt || ladder.startTime || group.schedule_time || "").trim();
  const result = await createPlannedSession(supabase, group, {
    sessionName: ladder.name,
    location: group.settings?.defaultLocation || "",
    sessionDate,
    startsAt,
    maxPlayers: 100,
    repeatsWeekly: false,
    hostPlayerId: body.hostPlayerId || ladder.hostPlayerId || group.settings?.defaultHostPlayerId || "",
    cohostPlayerId: body.cohostPlayerId || ladder.cohostPlayerId || "",
    invitedGroupIds: [ladder.playerGroupId],
    mode: "ladder",
    publicUrl: body.publicUrl,
    smsEnabled: body.smsEnabled === true,
    reminderHoursBefore: normalizeReminderHours(body.reminderHoursBefore ?? ladder.reminderHoursBefore),
    ladderId: ladder.id,
    ladderName: ladder.name,
    ladderConfig: ladder,
  });

  await addLog(supabase, group.id, result.session?.id || null, "setup", `${ladder.name} ladder match created for ${formatIsoDateForLog(sessionDate)}.`);
  return { ...result, ladder, sessionDate };
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
    duprId: normalizeDuprId(player.dupr_id),
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
  const scoring = normalizeRoundRobinScoring(body);
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
      scoring,
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
    dupr_id: normalizeDuprId(player.duprId) || null,
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
  if (!sessionName) throw new Error("Match name is required.");

  const invitedGroupIds = [...new Set((Array.isArray(body.invitedGroupIds) ? body.invitedGroupIds : []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (invitedGroupIds.length === 0) throw new Error("Select at least one invited group.");

  const invitedPlayers = await loadPlayersForGroups(supabase, group.id, invitedGroupIds);
  if (invitedPlayers.length === 0) throw new Error("The selected groups do not have active players yet.");

  const maxPlayers = Number(body.maxPlayers || 8);
  if (!Number.isInteger(maxPlayers) || maxPlayers < 4) throw new Error("Max players must be at least 4.");

  const now = new Date().toISOString();
  const isLadderMode = body.mode === "ladder";
  const scoring = normalizeRoundRobinScoring(body);
  const ladderSettings = isLadderMode ? {
    ladderId: String(body.ladderId || "").trim(),
    ladderName: String(body.ladderName || "").trim(),
    ladderConfig: body.ladderConfig || null,
  } : {};
  const sessionPayload = {
    group_id: group.id,
    session_name: sessionName,
    location: String(body.location || group.settings?.defaultLocation || "").trim() || null,
    session_date: body.sessionDate || new Date().toISOString().slice(0, 10),
    starts_at: String(body.startsAt || "").trim() || group.schedule_time || null,
    max_players: maxPlayers,
    repeats_weekly: Boolean(body.repeatsWeekly),
    host_player_id: body.hostPlayerId || group.settings?.defaultHostPlayerId || null,
    cohost_player_id: body.cohostPlayerId || null,
    invited_group_ids: invitedGroupIds,
    mode: body.mode === "ladder" ? "ladder" : group.mode || "daily_round_robin",
    status: "open",
    court_count: 1,
    round_count: 0,
    settings: {
      createdFromGroups: invitedGroupIds,
      smsTemplates: normalizeSmsTemplates(group.settings?.smsTemplates || {}),
      reminderHoursBefore: normalizeReminderHours(body.reminderHoursBefore),
      scoring,
      ...ladderSettings,
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
    dupr_id: normalizeDuprId(player.dupr_id) || null,
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
  if (!sessionId) throw new Error("Match is required.");

  const existingSession = await loadSessionForGroup(supabase, group.id, sessionId);
  const sessionName = String(body.sessionName || "").trim();
  if (!sessionName) throw new Error("Match name is required.");

  const invitedGroupIds = [...new Set((Array.isArray(body.invitedGroupIds) ? body.invitedGroupIds : []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (invitedGroupIds.length === 0) throw new Error("Select at least one invited group.");

  const invitedPlayers = await loadPlayersForGroups(supabase, group.id, invitedGroupIds);
  if (invitedPlayers.length === 0) throw new Error("The selected groups do not have active players yet.");

  const maxPlayers = Number(body.maxPlayers || 8);
  if (!Number.isInteger(maxPlayers) || maxPlayers < 4) throw new Error("Max players must be at least 4.");

  const now = new Date().toISOString();
  const isLadderMode = body.mode === "ladder";
  const scoring = normalizeRoundRobinScoring({
    ...(existingSession.settings?.scoring || {}),
    ...body,
  });
  const ladderSettings = isLadderMode ? {
    ladderId: String(body.ladderId || existingSession.settings?.ladderId || "").trim(),
    ladderName: String(body.ladderName || existingSession.settings?.ladderName || "").trim(),
    ladderConfig: body.ladderConfig || existingSession.settings?.ladderConfig || null,
  } : {
    ladderId: "",
    ladderName: "",
    ladderConfig: null,
  };
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
      reminderHoursBefore: normalizeReminderHours(body.reminderHoursBefore),
      scoring,
      ...ladderSettings,
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
      dupr_id: normalizeDuprId(player.dupr_id) || null,
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
  if (!target) throw new Error("Player is not part of this match.");

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
  const promotionSms = await sendWaitlistPromotionTexts(group, session, promotedPlayers);
  const directPromotionSms = target.response_status === "waitlist" && resolvedStatus === "joined"
    ? await sendWaitlistPromotionTexts(group, session, [data])
    : smsDisabledResult("No direct waitlist promotion", 0, 0);
  if (promotedPlayers.length > 0) {
    await addLog(
      supabase,
      group.id,
      session.id,
      "session",
      `${target.display_name || "Player"} declined. ${promotedPlayers.length} waitlisted player${promotedPlayers.length === 1 ? "" : "s"} moved to Joined.`,
      { promotionSms, promotedPlayers: promotedPlayers.length }
    );
  }
  return { sessionPlayer: data, promotedPlayers, promotionSms, directPromotionSms };
}

async function addSessionPlayer(supabase, group, body) {
  const sessionId = String(body.sessionId || "").trim();
  const playerId = String(body.playerId || "").trim();
  if (!sessionId || !playerId) throw new Error("Match and player are required.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  if (["done", "cancelled"].includes(session.status)) throw new Error("This match is no longer accepting players.");

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
    const directPromotionSms = existingPlayer.response_status === "waitlist"
      ? await sendWaitlistPromotionTexts(group, session, [data])
      : smsDisabledResult("No direct waitlist promotion", 0, 0);
    await addLog(supabase, group.id, session.id, "session", `${player.display_name} manually joined ${session.session_name || "Session"}.`);
    return { sessionPlayer: data, mode: "updated", directPromotionSms };
  }

  const nextSortOrder = currentPlayers.reduce((max, row) => Math.max(max, Number(row.sort_order || 0)), 0) + 1;
  const { data, error } = await supabase
    .from("round_robin_session_players")
    .insert({
      session_id: session.id,
      player_id: player.id,
      display_name: player.display_name,
      dupr_id: normalizeDuprId(player.dupr_id) || null,
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
  if (!sessionId) throw new Error("Match is required.");
  if (!displayName) throw new Error("Player name is required.");
  if (!cleanPhone || cleanPhone.length < 10) throw new Error("Enter a full 10-digit phone number.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  if (["done", "cancelled"].includes(session.status)) throw new Error("This match is no longer accepting players.");

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
    dupr_id: normalizeDuprId(body.duprId || body.dupr_id) || null,
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
  if (!sessionId) throw new Error("Match is required.");

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

  await addLog(supabase, group.id, session.id, "session", `${session.session_name || "Match"} deleted from active matches.`);
  return { session: data };
}

async function markSessionDuprExported(supabase, group, body = {}) {
  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) throw new Error("Match is required.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  const exportedAt = new Date().toISOString();
  const eventName = String(body.eventName || session.session_name || "DUPR Export").trim();
  const rowCount = Math.max(0, Number(body.rowCount || 0));
  const settings = {
    ...(session.settings || {}),
    duprExportedAt: exportedAt,
    duprExport: {
      ...(session.settings?.duprExport || {}),
      exportedAt,
      eventName,
      rowCount,
    },
  };

  const { data, error } = await supabase
    .from("round_robin_sessions")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", session.id)
    .eq("group_id", group.id)
    .select("*")
    .single();
  if (error) throw error;

  await addLog(supabase, group.id, session.id, "setup", `${session.session_name || "Match"} marked as exported to DUPR.`);
  return { session: data, eventName, rowCount };
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
    `Master Reset deleted ${sessionIds.length} regular/ladders match${sessionIds.length === 1 ? "" : "es"} and all match scoring/player history. Saved players, player groups, and group memberships were kept.`
  );

  return { sessionsDeleted: sessionIds.length };
}

async function startSession(supabase, group, body) {
  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) throw new Error("Match is required.");

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
  if (!sessionId) throw new Error("Match is required.");

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
  let joinedSessionPlayers = sessionPlayers.filter((player) => player.response_status === "joined");
  if (Array.isArray(body.selectedSessionPlayerIds)) {
    const selectedIds = new Set(body.selectedSessionPlayerIds.map((id) => String(id || "")).filter(Boolean));
    joinedSessionPlayers = joinedSessionPlayers.filter((player) => selectedIds.has(String(player.id || "")));
  }

  const joinedPlayers = joinedSessionPlayers
    .map((player) => ({
      id: player.player_id,
      displayName: player.display_name,
      firstLabel: roundRobinPlayerLabel(player.display_name),
      phone: player.phone || "",
      email: player.email || "",
    }));

  if (isLadderSession(session)) {
    return generateNextLadderGame(supabase, group, session, joinedPlayers, existingMatches, courtsResult.data || []);
  }

  const historyMatches = await loadLadderSeasonHistoryMatches(supabase, group, session);

  const nextRound = createNextRoundRobinRound({
    players: joinedPlayers,
    courts: resolveSessionCourts(session, courtsResult.data || []),
    existingMatches,
    historyMatches,
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

async function generateNextLadderGame(supabase, group, session, joinedPlayers, existingMatches, courts = []) {
  const ladder = await loadCurrentLadderForSession(supabase, group, session);
  if (!ladder) throw new Error("Ladder settings were not found for this match.");
  if (joinedPlayers.length < 4) throw new Error("Confirm at least 4 joined players before generating a ladder round.");

  const priorContext = await loadPriorLadderSessionContext(supabase, group, ladder, session);
  const rosterPlayers = await loadPlayersForGroups(supabase, group.id, [ladder.playerGroupId]);
  const rosterIds = rosterPlayers.map((player) => String(player.id));
  const positionOrder = ladderPositionOrderForRoster(rosterIds, priorContext.sessions, priorContext.results, ladder, priorContext.matches);
  const positionIndexByPlayer = new Map(positionOrder.map((playerId, index) => [String(playerId), index]));
  const orderedJoinedPlayers = joinedPlayers
    .slice()
    .sort((first, second) => {
      const firstIndex = positionIndexByPlayer.has(String(first.id)) ? positionIndexByPlayer.get(String(first.id)) : Number.MAX_SAFE_INTEGER;
      const secondIndex = positionIndexByPlayer.has(String(second.id)) ? positionIndexByPlayer.get(String(second.id)) : Number.MAX_SAFE_INTEGER;
      return firstIndex - secondIndex || String(first.displayName || "").localeCompare(String(second.displayName || ""));
    });
  const ladderCourts = splitLadderPlayersIntoCourts(orderedJoinedPlayers);
  const sessionCourts = resolveSessionCourts(session, courts);
  const generatedRounds = ladderCourts.map((players, courtIndex) => createNextRoundRobinRound({
    players,
    courts: [sessionCourts[courtIndex] || { name: `Ladder Court ${courtIndex + 1}` }],
    existingMatches: existingMatches.filter((match) => Number(match.court_number || 0) === courtIndex + 1),
    courtCount: 1,
  }));
  const roundNumber = Math.max(1, ...generatedRounds.map((round) => Number(round.roundNumber || 1)));

  const matchPayload = generatedRounds.flatMap((round, courtIndex) => round.courts.map((court) => ({
    session_id: session.id,
    round_number: roundNumber,
    court_number: courtIndex + 1,
    court_name: court.courtName || `Ladder Court ${courtIndex + 1}`,
    team1_players: court.team1.map(publicPlayerPayload),
    team2_players: court.team2.map(publicPlayerPayload),
    bye_players: round.byes.map(publicPlayerPayload),
    status: "scheduled",
  })));

  const matchesResult = await supabase
    .from("round_robin_matches")
    .insert(matchPayload)
    .select("*");
  if (matchesResult.error) throw matchesResult.error;

  const settings = {
    ...(session.settings || {}),
    ladderCourtCount: ladderCourts.length,
    ladderCourtGroups: ladderCourts.map((players, index) => ({
      courtNumber: index + 1,
      playerIds: players.map((player) => String(player.id)),
    })),
  };

  const { data: updatedSession, error: sessionError } = await supabase
    .from("round_robin_sessions")
    .update({
      round_count: roundNumber,
      court_count: ladderCourts.length,
      settings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .select("*")
    .single();
  if (sessionError) throw sessionError;

  await rebuildResults(supabase, group, session.id);
  await addLog(supabase, group.id, session.id, "session", `Generated ladder round ${roundNumber} across ${ladderCourts.length} court${ladderCourts.length === 1 ? "" : "s"}.`);
  return { session: updatedSession, matches: matchesResult.data || [], roundNumber };
}

async function updateMatchScore(supabase, group, body) {
  const matchId = String(body.matchId || "").trim();
  if (!matchId) throw new Error("Match is required.");

  const existing = await loadMatchForGroup(supabase, group.id, matchId);
  const team1Score = normalizeScore(body.team1Score);
  const team2Score = normalizeScore(body.team2Score);
  const session = await loadSessionForGroup(supabase, group.id, existing.session_id);
  const scoreError = validateRoundRobinMatchScore(team1Score, team2Score, session.settings?.scoring);
  if (scoreError) throw new Error(scoreError);

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
  if (!sessionId) throw new Error("Match is required.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  const results = await rebuildResults(supabase, group, sessionId);
  const playedResults = results.filter((row) => Number(row.games || 0) > 0 || Number(row.byes || 0) > 0);
  let ladderPositionContext = new Map();
  if (isLadderSession(session)) {
    const ladder = await loadCurrentLadderForSession(supabase, group, session);
    if (ladder) {
      const [priorContext, rosterPlayers, currentMatches] = await Promise.all([
        loadPriorLadderSessionContext(supabase, group, ladder, session),
        loadPlayersForGroups(supabase, group.id, [ladder.playerGroupId]),
        loadSessionMatches(supabase, session.id),
      ]);
      const rosterIds = rosterPlayers.map((player) => String(player.id));
      const previousOrder = ladderPositionOrderForRoster(rosterIds, priorContext.sessions, priorContext.results, ladder, priorContext.matches);
      const nextOrder = ladderPositionOrderForRoster(
        rosterIds,
        [...priorContext.sessions, { ...session, status: "done" }],
        [...priorContext.results, ...playedResults],
        ladder,
        [...priorContext.matches, ...currentMatches]
      );
      ladderPositionContext = new Map(rosterIds.map((playerId) => [
        String(playerId),
        {
          previousPosition: previousOrder.findIndex((id) => String(id) === String(playerId)) + 1 || null,
          newPosition: nextOrder.findIndex((id) => String(id) === String(playerId)) + 1 || null,
          positionCount: rosterIds.length,
        },
      ]));
    }
  }
  if (ladderPositionContext.size > 0 && playedResults.length > 0) {
    await Promise.all(playedResults.map(async (row) => {
      const context = ladderPositionContext.get(String(row.player_id || ""));
      if (!context) return null;
      const metadata = {
        ...resultMetadata(row),
        ladderPreviousPosition: context.previousPosition || null,
        ladderNewPosition: context.newPosition || null,
        ladderPositionCount: context.positionCount || null,
      };
      const { error } = await supabase
        .from("round_robin_player_session_results")
        .update({ metadata })
        .eq("id", row.id);
      if (error) throw error;
      row.metadata = metadata;
      return null;
    }));
  }
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
    ...(ladderPositionContext.get(String(row.player_id || "")) || {}),
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
  let weeklyRepeat = { requested: repeatsWeekly, created: false, skipped: true, reason: "Match is not set to repeat weekly" };
  if (repeatsWeekly) {
    try {
      weeklyRepeat = await createNextWeeklySession(supabase, group, data, body);
    } catch (repeatError) {
      weeklyRepeat = { requested: true, created: false, skipped: true, reason: repeatError.message || "Unable to create next weekly session" };
      await addLog(supabase, group.id, sessionId, "session", `Weekly repeat was not created: ${weeklyRepeat.reason}`, { weeklyRepeat });
    }
  }

  await addLog(supabase, group.id, sessionId, "session", `Match completed. Result texts sent: ${sms.sent || 0}.`, { sms, weeklyRepeat });
  return { session: data, results, summaryText, sms, weeklyRepeat };
}

async function sendSessionResultsText(supabase, group, body) {
  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) throw new Error("Match is required.");

  const session = await loadSessionForGroup(supabase, group.id, sessionId);
  const results = await rebuildResults(supabase, group, sessionId);
  const playedResults = results.filter((row) => Number(row.games || 0) > 0 || Number(row.byes || 0) > 0);
  const standings = playedResults.map((row) => {
    const metadata = resultMetadata(row);
    return {
      rank: row.rank,
      displayName: row.display_name,
      wins: row.wins,
      losses: row.losses,
      winPct: row.games > 0 ? row.wins / row.games : 0,
      pointDiff: row.point_diff,
      pointsFor: row.points_for,
      pointsAgainst: row.points_against,
      byes: row.byes,
      previousPosition: metadata.ladderPreviousPosition ?? metadata.previousPosition ?? null,
      newPosition: metadata.ladderNewPosition ?? metadata.newPosition ?? null,
      positionCount: metadata.ladderPositionCount ?? metadata.positionCount ?? null,
    };
  });
  const summaryText = summaryTextForStandings(group.name, session.session_date, standings);

  const { error: summaryError } = await supabase
    .from("round_robin_sessions")
    .update({ summary_text: summaryText, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (summaryError) throw summaryError;

  const smsEnabled = body.smsEnabled === true && group.settings?.smsSendingEnabled === true;
  const sessionPlayers = await filterActiveSessionPlayers(supabase, group.id, await loadSessionPlayers(supabase, sessionId));
  const recipientPlayers = sessionPlayers.filter((player) => player.response_status === "joined");
  let sms = smsDisabledResult(smsEnabled ? "" : body.smsEnabled ? "SMS disabled in settings" : "SMS disabled", recipientPlayers.length, recipientPlayers.filter((player) => player.phone).length);

  if (smsEnabled) {
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

  await addLog(supabase, group.id, sessionId, "session", `Result texts sent after stats review: ${sms.sent || 0}.`, { sms });
  return { results, summaryText, sms, recipients: recipientPlayers.length };
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
    .eq("session_name", session.session_name || "Round Robin Match")
    .limit(10);
  if (duplicateResult.error) throw duplicateResult.error;

  const existingRepeat = (duplicateResult.data || []).find((row) => String(row.starts_at || "") === String(session.starts_at || ""));
  if (existingRepeat) {
    return { requested: true, created: false, skipped: true, reason: "Next weekly session already exists", sessionId: existingRepeat.id, sessionDate: nextDate };
  }

  const repeatResult = await createPlannedSession(supabase, group, {
    sessionName: session.session_name || "Round Robin Match",
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
    ...normalizeRoundRobinScoring(session.settings?.scoring),
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
    throw new Error("A match is required for that recipient group.");
  }
  if (access?.mode === "host" && !logSessionId) {
    throw new Error("A match is required for host text updates.");
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
  const messageGroup = session ? await loadSmsGroupForSession(supabase, group, session) : group;
  const renderedMessage = session
    ? renderSmsTemplate(message, { group: messageGroup, session, ...sessionTextCounts(session, sessionPlayers) })
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
  if (!sessionId) throw new Error("Match is required.");

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

async function sendGroupNewPlayerText(supabase, group, body) {
  const playerGroupId = String(body.playerGroupId || "").trim();
  if (!playerGroupId) throw new Error("Player group is required.");

  const groupResult = await supabase
    .from("round_robin_player_groups")
    .select("id, name")
    .eq("id", playerGroupId)
    .eq("group_id", group.id)
    .eq("is_active", true)
    .single();
  if (groupResult.error) throw groupResult.error;

  const playerGroup = groupResult.data;
  const players = await loadPlayersForGroups(supabase, group.id, [playerGroup.id]);
  const phones = players.map((player) => player.phone).filter(Boolean);
  const smsEnabled = body.smsEnabled === true && group.settings?.smsSendingEnabled === true;
  const template = normalizeSmsTemplates(group.settings?.smsTemplates || {}).newPlayer;
  let sms = smsDisabledResult(
    players.length === 0
      ? "No active saved players in selected group"
      : smsEnabled ? "" : body.smsEnabled ? "SMS disabled in settings" : "SMS disabled for this action",
    players.length,
    phones.length
  );

  if (smsEnabled && players.length > 0) {
    const results = [];
    for (const player of players) {
      if (!player.phone) continue;
      const result = await sendSmsMessages({
        phones: [player.phone],
        publicUrl: body.publicUrl,
        body: renderSmsTemplate(template, {
          group,
          publicUrl: body.publicUrl,
          playerName: player.display_name || "Player",
        }),
      });
      results.push({ playerId: player.id, ...result });
    }

    sms = {
      skipped: false,
      sent: results.reduce((total, result) => total + Number(result.sent || 0), 0),
      smsSent: results.reduce((total, result) => total + Number(result.smsSent || 0), 0),
      appSent: results.reduce((total, result) => total + Number(result.appSent || 0), 0),
      results,
      recipientCount: players.length,
      phoneCount: phones.length,
    };

    if (phones.length === 0) sms = smsDisabledResult("No phone numbers", players.length, 0);
  }

  await addLog(
    supabase,
    group.id,
    null,
    "sms",
    sms.skipped
      ? smsEnabled
        ? `New Player launch text was not sent for ${playerGroup.name || "selected group"}: ${sms.reason || "SMS unavailable"}.`
        : `New Player launch text logged for ${players.length} active saved player${players.length === 1 ? "" : "s"} in ${playerGroup.name || "selected group"}. SMS is off.`
      : `New Player launch text sent to ${sms.sent || 0} recipient${Number(sms.sent || 0) === 1 ? "" : "s"} in ${playerGroup.name || "selected group"}.`,
    { sms, recipientScope: "newPlayerGroup", recipientCount: players.length, phoneCount: phones.length, playerGroupId: playerGroup.id }
  );

  return {
    sms,
    recipients: players.length,
    phoneRecipients: phones.length,
    playerGroup,
  };
}

async function rebuildResults(supabase, group, sessionId) {
  const [session, players, matches] = await Promise.all([
    loadSessionForGroup(supabase, group.id, sessionId),
    loadSessionPlayers(supabase, sessionId),
    loadSessionMatches(supabase, sessionId),
  ]);

  let standings = roundRobinStandings(matches.map((match) => ({
    ...match,
    team1: match.team1_players || [],
    team2: match.team2_players || [],
    byes: match.bye_players || [],
  })), players.map((player) => ({
    id: player.player_id,
    displayName: player.display_name,
  })));
  if (isLadderSession(session)) {
    const ladder = await loadCurrentLadderForSession(supabase, group, session);
    standings = sortLadderStandings(standings, matches, ladder);
  }

  const { data: existingResults, error: existingResultsError } = await supabase
    .from("round_robin_player_session_results")
    .select("player_id, metadata")
    .eq("session_id", sessionId);
  if (existingResultsError) throw existingResultsError;
  const existingMetadataByPlayer = new Map((existingResults || [])
    .map((row) => [String(row.player_id || ""), resultMetadata(row)])
    .filter(([, metadata]) => Object.keys(metadata).length > 0));

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
    ...(existingMetadataByPlayer.has(String(row.playerId))
      ? { metadata: existingMetadataByPlayer.get(String(row.playerId)) }
      : {}),
  }));

  const { data, error } = await supabase
    .from("round_robin_player_session_results")
    .insert(payload)
    .select("*")
    .order("rank", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function rebuildLadderPositionMetadata(supabase, group, ladder, sessions = []) {
  const sessionIds = sessions.map((session) => session.id).filter(Boolean);
  if (sessionIds.length === 0) return;

  const rosterPlayers = await loadPlayersForGroups(supabase, group.id, [ladder.playerGroupId]);
  const rosterIds = rosterPlayers.map((player) => String(player.id));
  if (rosterIds.length === 0) return;

  const [matchesResult, resultsResult] = await Promise.all([
    supabase
      .from("round_robin_matches")
      .select("*")
      .in("session_id", sessionIds)
      .order("round_number", { ascending: true })
      .order("court_number", { ascending: true }),
    supabase
      .from("round_robin_player_session_results")
      .select("*")
      .in("session_id", sessionIds),
  ]);
  if (matchesResult.error) throw matchesResult.error;
  if (resultsResult.error) throw resultsResult.error;

  const allMatches = matchesResult.data || [];
  const allResults = resultsResult.data || [];
  const updates = [];
  sessions.forEach((session, index) => {
    const priorSessions = sessions.slice(0, index);
    const currentSessions = sessions.slice(0, index + 1);
    const priorSessionIds = new Set(priorSessions.map((row) => String(row.id)));
    const currentSessionIds = new Set(currentSessions.map((row) => String(row.id)));
    const previousOrder = ladderPositionOrderForRoster(
      rosterIds,
      priorSessions,
      allResults.filter((row) => priorSessionIds.has(String(row.session_id || ""))),
      ladder,
      allMatches.filter((row) => priorSessionIds.has(String(row.session_id || "")))
    );
    const nextOrder = ladderPositionOrderForRoster(
      rosterIds,
      currentSessions,
      allResults.filter((row) => currentSessionIds.has(String(row.session_id || ""))),
      ladder,
      allMatches.filter((row) => currentSessionIds.has(String(row.session_id || "")))
    );
    allResults
      .filter((row) => String(row.session_id || "") === String(session.id))
      .filter((row) => Number(row.games || 0) > 0 || Number(row.byes || 0) > 0)
      .forEach((row) => {
        const playerId = String(row.player_id || "");
        updates.push({
          id: row.id,
          metadata: {
            ...resultMetadata(row),
            ladderPreviousPosition: previousOrder.findIndex((id) => String(id) === playerId) + 1 || null,
            ladderNewPosition: nextOrder.findIndex((id) => String(id) === playerId) + 1 || null,
            ladderPositionCount: rosterIds.length,
          },
        });
      });
  });

  await Promise.all(updates.map(async (row) => {
    const { error } = await supabase
      .from("round_robin_player_session_results")
      .update({ metadata: row.metadata })
      .eq("id", row.id);
    if (error) throw error;
  }));
}

function resultMetadata(row) {
  const metadata = row?.metadata;
  if (!metadata) return {};
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
}

function resultRowHasScoredMatch(row) {
  return Number(row?.games || 0) > 0 || Number(row?.wins || 0) > 0 || Number(row?.losses || 0) > 0;
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

function sortLadderStandings(standings = [], matches = [], ladder = {}) {
  return standings
    .slice()
    .sort((first, second) => compareLadderRowsByCriteria(first, second, matches, ladder?.rankingCriteria))
    .map((row, index) => ({ ...row, rank: index + 1 }));
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

async function sendWaitlistPromotionTexts(group, session, promotedPlayers = []) {
  const phones = (promotedPlayers || []).map((player) => player.phone).filter(Boolean);
  if (promotedPlayers.length === 0) return smsDisabledResult("No waitlist promotions", 0, 0);
  if (group.settings?.smsSendingEnabled !== true) {
    return smsDisabledResult("SMS disabled in settings", promotedPlayers.length, phones.length);
  }
  if (phones.length === 0) return smsDisabledResult("No phone numbers", promotedPlayers.length, 0);

  return sendSmsMessages({
    phones,
    body: waitlistPromotionSmsBody(group, session),
  });
}

function waitlistPromotionSmsBody(group, session) {
  const date = session?.session_date ? new Date(`${session.session_date}T12:00:00`).toLocaleDateString("en-US") : "the next match";
  const time = session?.starts_at ? formatSessionTime(session.starts_at) : "TBD";
  const location = session?.location ? ` at ${session.location}` : "";
  return `${group?.name || "PBCourtCommand"}: A spot opened for ${session?.session_name || "your match"} on ${date} at ${time}${location}. You have been moved from Waitlist to Joined.`;
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

async function loadSmsGroupForSession(supabase, group, session) {
  const invitedGroupIds = Array.isArray(session?.invited_group_ids)
    ? session.invited_group_ids.map((id) => String(id)).filter(Boolean)
    : [];
  if (invitedGroupIds.length === 0) return group;

  const { data, error } = await supabase
    .from("round_robin_player_groups")
    .select("id, name")
    .eq("group_id", group.id)
    .in("id", invitedGroupIds)
    .order("name", { ascending: true });
  if (error) throw error;

  const groupNames = (data || [])
    .map((row) => String(row.name || "").trim())
    .filter(Boolean);
  if (groupNames.length === 0) return group;

  return {
    ...group,
    name: groupNames.join(", "),
  };
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

async function loadLadderSeasonHistoryMatches(supabase, group, session) {
  const ladderId = String(session.settings?.ladderId || "").trim();
  const balanceMode = String(session.settings?.ladderConfig?.balanceMode || "");
  if (session.mode !== "ladder" || !ladderId || balanceMode !== "season") return [];

  const { data: sessions, error: sessionsError } = await supabase
    .from("round_robin_sessions")
    .select("id, settings")
    .eq("group_id", group.id)
    .eq("mode", "ladder")
    .lt("session_date", session.session_date || new Date().toISOString().slice(0, 10))
    .limit(100);
  if (sessionsError) throw sessionsError;

  const sessionIds = (sessions || [])
    .filter((row) => String(row.settings?.ladderId || "") === ladderId)
    .map((row) => row.id)
    .filter(Boolean);
  if (sessionIds.length === 0) return [];

  const { data, error } = await supabase
    .from("round_robin_matches")
    .select("*")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function loadCurrentLadderForSession(supabase, group, session) {
  const ladderId = String(session.settings?.ladderId || "").trim();
  if (!ladderId) return null;
  const current = normalizeLadders(group.settings?.ladders || []).find((item) => item.id === ladderId);
  if (current) return current;
  return normalizeLadder({ ...(session.settings?.ladderConfig || {}), id: ladderId }, { allowExistingId: true });
}

async function loadPriorLadderSessionContext(supabase, group, ladder, session) {
  const { data: sessions, error: sessionsError } = await supabase
    .from("round_robin_sessions")
    .select("id, session_date, settings")
    .eq("group_id", group.id)
    .eq("mode", "ladder")
    .lt("session_date", session.session_date || new Date().toISOString().slice(0, 10))
    .order("session_date", { ascending: true });
  if (sessionsError) throw sessionsError;

  const ladderSessions = (sessions || [])
    .filter((row) => String(row.settings?.ladderId || "") === String(ladder.id));
  const sessionIds = ladderSessions.map((row) => row.id).filter(Boolean);
  if (sessionIds.length === 0) return { sessions: [], matches: [], results: [] };

  const [matchesResult, resultsResult] = await Promise.all([
    supabase
      .from("round_robin_matches")
      .select("*")
      .in("session_id", sessionIds)
      .order("round_number", { ascending: true })
      .order("court_number", { ascending: true }),
    supabase
      .from("round_robin_player_session_results")
      .select("*")
      .in("session_id", sessionIds),
  ]);
  if (matchesResult.error) throw matchesResult.error;
  if (resultsResult.error) throw resultsResult.error;

  return {
    sessions: ladderSessions,
    matches: matchesResult.data || [],
    results: resultsResult.data || [],
  };
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

function ladderPositionOrderForRoster(rosterIds = [], sessions = [], resultRows = [], ladder = {}, matches = []) {
  const initialPositions = normalizeInitialPositions(ladder.initialPositions || {}, rosterIds);
  const order = rosterIds
    .map(String)
    .sort((first, second) => {
      const firstPosition = Number(initialPositions[first] || Number.MAX_SAFE_INTEGER);
      const secondPosition = Number(initialPositions[second] || Number.MAX_SAFE_INTEGER);
      return firstPosition - secondPosition || first.localeCompare(second);
    });
  const resultsBySession = groupRowsByKey(resultRows, "session_id");
  const matchesBySession = groupRowsByKey(matches, "session_id");
  const movementCount = ladder.movementMode === "top2" ? 2 : 1;

  sessions.forEach((session) => {
    const sessionResults = resultsBySession.get(String(session.id)) || [];
    const sessionMatches = matchesBySession.get(String(session.id)) || [];
    const sessionPlayerIds = sessionPlayerIdsFromMatches(sessionMatches);
    const participatingOrder = order.filter((playerId) => sessionPlayerIds.has(String(playerId)));
    const courts = splitLadderIdsIntoCourts(participatingOrder);

    courts.forEach((courtIds, courtIndex) => {
      const ranked = courtIds
        .map((playerId) => sessionResults.find((row) => String(row.player_id || "") === String(playerId)))
        .filter(Boolean)
        .sort((first, second) => compareLadderRowsByCriteria(first, second, sessionMatches, ladder.rankingCriteria));
      const topIds = courtIndex > 0 ? ranked.slice(0, movementCount).map((row) => String(row.player_id || "")) : [];
      const bottomIds = courtIndex < courts.length - 1 ? ranked.slice(-movementCount).map((row) => String(row.player_id || "")) : [];
      topIds.forEach((playerId) => movePlayerByStep(order, playerId, -Math.max(4, courts[courtIndex - 1]?.length || 4)));
      bottomIds.reverse().forEach((playerId) => movePlayerByStep(order, playerId, Math.max(4, courts[courtIndex + 1]?.length || 4)));
    });

    if (sessions.length >= 4) {
      const participationRequirement = Number(ladder.participationRequirement || 50);
      const completedSessionIds = sessions.filter((item) => String(item.session_date || "") <= String(session.session_date || "")).map((item) => String(item.id));
      order.forEach((playerId) => {
        const playedCount = completedSessionIds.filter((sessionId) => (
          resultsBySession.get(sessionId) || []
        ).some((row) => String(row.player_id || "") === String(playerId) && resultRowHasScoredMatch(row))).length;
        const participationPct = completedSessionIds.length > 0 ? (playedCount / completedSessionIds.length) * 100 : 100;
        if (participationPct < participationRequirement) movePlayerByStep(order, playerId, 1);
      });
    }
  });

  return order;
}

function splitLadderIdsIntoCourts(playerIds = []) {
  return splitLadderPlayersIntoCourts(playerIds.map((id) => ({ id }))).map((court) => court.map((player) => String(player.id)));
}

function sessionPlayerIdsFromMatches(matches = []) {
  const ids = new Set();
  matches.forEach((match) => {
    [...(match.team1_players || []), ...(match.team2_players || []), ...(match.bye_players || [])]
      .forEach((player) => {
        if (player?.id) ids.add(String(player.id));
      });
  });
  return ids;
}

function movePlayerByStep(order, playerId, step) {
  const index = order.findIndex((id) => String(id) === String(playerId));
  if (index < 0) return;
  const nextIndex = Math.max(0, Math.min(order.length - 1, index + Number(step || 0)));
  if (nextIndex === index) return;
  const [item] = order.splice(index, 1);
  order.splice(nextIndex, 0, item);
}

function groupRowsByKey(rows = [], key) {
  return rows.reduce((map, row) => {
    const mapKey = String(row[key] || "");
    if (!map.has(mapKey)) map.set(mapKey, []);
    map.get(mapKey).push(row);
    return map;
  }, new Map());
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
    duprId: normalizeDuprId(player.duprId || player.dupr_id),
  };
}

function normalizeDuprId(value) {
  return String(value || "").trim().toUpperCase();
}

function sanitizeMatchPlayers(players = []) {
  if (!Array.isArray(players)) return [];
  return players
    .map((player) => ({
      id: String(player.id || "").trim(),
      displayName: String(player.displayName || player.display_name || player.name || "").trim(),
      firstLabel: String(player.firstLabel || "").trim() || roundRobinPlayerLabel(player.displayName || player.display_name || player.name),
      duprId: normalizeDuprId(player.duprId || player.dupr_id),
    }))
    .filter((player) => player.id && player.displayName);
}

function normalizeScore(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error("Scores must be whole numbers.");
  return parsed;
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeRoundRobinScoreType(value) {
  return String(value || "").trim().toLowerCase() === "rally" ? "rally" : "standard";
}

function normalizeRoundRobinScoring(settings = {}) {
  const source = settings?.scoring && typeof settings.scoring === "object" ? settings.scoring : settings;
  return {
    pointsToWin: Math.round(clampNumber(source.pointsToWin ?? source.points_to_win, 1, 99, DEFAULT_ROUND_ROBIN_SCORING.pointsToWin)),
    winBy: Math.round(clampNumber(source.winBy ?? source.win_by, 1, 20, DEFAULT_ROUND_ROBIN_SCORING.winBy)),
    scoreType: normalizeRoundRobinScoreType(source.scoreType ?? source.score_type),
  };
}

function roundRobinScoringLabel(settings = {}) {
  const scoring = normalizeRoundRobinScoring(settings);
  const scoreTypeLabel = scoring.scoreType === "rally" ? "Rally" : "Standard";
  return `${scoreTypeLabel} to ${scoring.pointsToWin}, win by ${scoring.winBy}`;
}

function validateRoundRobinMatchScore(team1Score, team2Score, settings = {}) {
  if (team1Score === null || team2Score === null) return "";
  if (team1Score === team2Score) return "Scores cannot be tied.";

  const scoring = normalizeRoundRobinScoring(settings);
  const highScore = Math.max(team1Score, team2Score);
  const lowScore = Math.min(team1Score, team2Score);
  if (highScore < scoring.pointsToWin) return `Score must be ${roundRobinScoringLabel(scoring)}. The winning score must be at least ${scoring.pointsToWin}.`;
  if (scoring.winBy <= 1 && highScore !== scoring.pointsToWin) return `Score must be ${roundRobinScoringLabel(scoring)}. The winning score must be exactly ${scoring.pointsToWin}.`;
  if (highScore - lowScore < scoring.winBy) return `Score must be ${roundRobinScoringLabel(scoring)}. The winner must win by at least ${scoring.winBy}.`;
  return "";
}

function suggestedCourtCount(playerCount) {
  const count = Number(playerCount || 0);
  if (count <= 7) return 1;
  return Math.max(1, Math.ceil((count - 3) / 4));
}

function defaultSmsTemplates() {
  return {
    newPlayer: "{{group_name}}: {{player_name}}, you have been added to PBCourtCommand. You may receive match invite/update texts at this number. Reply STOP to opt out. {{public_link}}",
    ladderAdded: "{{group_name}}: {{player_name}}, you have been added to {{ladder_name}}. Watch for ladder match invites and results texts. {{public_link}}",
    sessionInvite: "{{group_name}}: {{session_name}} match is open for {{date}} at {{time}}{{location_line}}. {{joined_count}} joined, {{available_spots}} spots open. Reply to the host or open {{public_link}} to join.",
    sessionReminder: "{{group_name}} reminder: {{session_name}} match is still open for {{date}} at {{time}}{{location_line}}. {{joined_count}} joined, {{available_spots}} spots open. Please reply if you can play or if you are out.",
    gameUpdate: "{{group_name}} game update: ",
    weatherUpdate: "{{group_name}} weather update: ",
    sessionResults: "{{group_name}} Results for {{date}}:\n{{result_rankings}}",
  };
}

function normalizeSmsTemplates(templates = {}) {
  const defaults = defaultSmsTemplates();
  return {
    newPlayer: String(templates.newPlayer || defaults.newPlayer),
    ladderAdded: String(templates.ladderAdded || defaults.ladderAdded),
    sessionInvite: String(templates.sessionInvite || defaults.sessionInvite),
    sessionReminder: String(templates.sessionReminder || defaults.sessionReminder),
    gameUpdate: String(templates.gameUpdate || defaults.gameUpdate),
    weatherUpdate: String(templates.weatherUpdate || defaults.weatherUpdate),
    sessionResults: String(templates.sessionResults || defaults.sessionResults),
  };
}

function renderSmsTemplate(template, { group, session, publicUrl, joinedCount, availableSpots, resultRankings, playerName, ladderName } = {}) {
  const date = session?.session_date ? new Date(`${session.session_date}T12:00:00`).toLocaleDateString("en-US") : "the next match";
  const time = session?.starts_at ? formatSessionTime(session.starts_at) : "TBD";
  const location = session?.location ? session.location : "";
  const maxPlayers = Number(session?.max_players || 0);
  const resolvedJoinedCount = Number(joinedCount || 0);
  const resolvedAvailableSpots = availableSpots ?? (maxPlayers > 0 ? Math.max(0, maxPlayers - resolvedJoinedCount) : "");
  const replacements = {
    group_name: group?.name || "Round Robin",
    session_name: session?.session_name || "Round Robin match",
    date,
    time,
    location,
    location_line: location ? ` at ${location}` : "",
    public_link: publicUrl || "",
    player_name: playerName || "Player",
    ladder_name: ladderName || session?.settings?.ladderName || session?.settings?.ladderConfig?.name || "Ladder",
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
    const positionText = row.previousPosition && row.newPosition
      ? `, Position #${row.previousPosition} -> #${row.newPosition} out of ${row.positionCount || "?"}`
      : "";
    return `${row.rank}. ${row.displayName || "Player"} ${row.wins || 0}-${row.losses || 0}, PF ${row.pointsFor || 0}, PA ${row.pointsAgainst || 0}, Diff ${diffText}, Byes ${row.byes || 0}${positionText}`;
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

async function nextLadderSessionDate(supabase, group, ladder) {
  const sessionsResult = await supabase
    .from("round_robin_sessions")
    .select("id, session_date, settings")
    .eq("group_id", group.id)
    .eq("mode", "ladder")
    .order("session_date", { ascending: false })
    .limit(100);
  if (sessionsResult.error) throw sessionsResult.error;

  const ladderSessions = (sessionsResult.data || [])
    .filter((session) => String(session.settings?.ladderId || "") === String(ladder.id))
    .sort((a, b) => String(b.session_date || "").localeCompare(String(a.session_date || "")));
  const latestDate = ladderSessions[0]?.session_date || "";
  return latestDate ? addDaysToIsoDate(latestDate, 7) : normalizeIsoDate(ladder.startDate) || new Date().toISOString().slice(0, 10);
}

async function loadLadderSessionsForGroup(supabase, group, ladder) {
  const { data, error } = await supabase
    .from("round_robin_sessions")
    .select("id, session_date, status, settings")
    .eq("group_id", group.id)
    .eq("mode", "ladder")
    .limit(200);
  if (error) throw error;
  return (data || []).filter((session) => String(session.settings?.ladderId || "") === String(ladder.id));
}

function compareLadderSessions(first, second) {
  return String(first.session_date || "").localeCompare(String(second.session_date || "")) ||
    String(first.id || "").localeCompare(String(second.id || ""));
}

function normalizeLadders(ladders = []) {
  return (Array.isArray(ladders) ? ladders : [])
    .map((ladder) => normalizeLadder(ladder, { allowExistingId: true }))
    .filter((ladder) => ladder.name && ladder.startDate && ladder.playerGroupId);
}

function normalizeLadder(ladder = {}, options = {}) {
  const id = options.allowExistingId
    ? String(ladder.id || "").trim()
    : String(ladder.id || "").trim() || `ladder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startDate = normalizeIsoDate(ladder.startDate) || new Date().toISOString().slice(0, 10);
  const dayOfWeek = normalizeDayOfWeek(ladder.dayOfWeek) || dayOfWeekForDate(startDate);
  const participationRequirement = Math.min(100, Math.max(10, Number(ladder.participationRequirement || 50)));
  return {
    id: id || `ladder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(ladder.name || "").trim(),
    format: ladder.format === "ladder" ? "ladder" : "round_robin",
    startDate,
    endDate: normalizeIsoDate(ladder.endDate),
    dayOfWeek,
    startTime: String(ladder.startTime || "").slice(0, 5),
    hostPlayerId: String(ladder.hostPlayerId || "").trim(),
    cohostPlayerId: String(ladder.cohostPlayerId || "").trim(),
    reminderHoursBefore: normalizeReminderHours(ladder.reminderHoursBefore),
    playerGroupId: String(ladder.playerGroupId || "").trim(),
    participationRequirement,
    balanceMode: ladder.balanceMode === "season" ? "season" : "session",
    movementMode: ladder.movementMode === "top2" ? "top2" : "top1",
    rankingCriteria: normalizeLadderRankingCriteria(ladder.rankingCriteria || ladder.ranking_criteria),
    status: ladder.status === "inactive" ? "inactive" : "active",
    initialPositions: normalizeInitialPositions(ladder.initialPositions || ladder.initial_positions || {}),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeReminderHours(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(168, Math.max(0, Math.round(numeric)));
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

function isLadderSession(session) {
  return Boolean(session?.settings?.ladderId) || session?.mode === "ladder";
}

function normalizeIsoDate(value) {
  const clean = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : "";
}

function normalizeDayOfWeek(value) {
  const clean = String(value || "").trim().toLowerCase();
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days.includes(clean) ? clean : "";
}

function dayOfWeekForDate(value) {
  const date = new Date(`${String(value || "").slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getDay()];
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

function formatPhoneInput(value) {
  const digits = normalizePhone(value).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}
