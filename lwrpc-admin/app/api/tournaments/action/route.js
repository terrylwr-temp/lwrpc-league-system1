import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSmsMessages } from "../../../lib/notifications";
import { formatPhoneNumberForStorage } from "../../../lib/phone";

export const runtime = "nodejs";

const DEFAULT_SMS_TEMPLATES = {
  courtReady: "You're up! You are on Court {court}.\n\nPlease stop by the Desk to grab your basket and ball. Once you've finished your game, fill out the scoresheet and return the basket and ball.\nHave a great match!\n\n{division} {line}\n{home} vs {away}",
  result: "{tournament} Result\n{division} {line}\n\n{home} vs {away}\n{result}\n\nPlease let us know right away if anything is incorrect.",
  broadcast: "LWR PC Tournament Update\nWelcome to the {tournament}!\n{status}",
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Tournament actions require SUPABASE_SERVICE_ROLE_KEY on the server.");
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
    const tournament = await validateTournamentCode(supabase, body.tournamentId, body.eventCode);
    const action = String(body.action || "");

    if (action === "autoAssign") {
      const result = await autoAssignOpenCourts(supabase, tournament, body.smsEnabled);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "returnToQueue") {
      const result = await returnToQueue(supabase, tournament, body.matchId);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "swapToCourt") {
      const result = await swapToCourt(supabase, tournament, body.matchId, body.courtId, body.smsEnabled);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "completeMatch") {
      const result = await completeMatch(supabase, tournament, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "sendCourtText") {
      const result = await sendCourtText(supabase, tournament, body.matchId);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "updateSmsTemplates") {
      const result = await updateSmsTemplates(supabase, tournament, body.templates);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "sendBroadcastText") {
      const result = await sendBroadcastText(supabase, tournament, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "sendTestText") {
      const result = await sendTestText(supabase, tournament, body.phone);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "updatePlayerPhone") {
      const result = await updatePlayerPhone(supabase, tournament, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "syncLeagueDivisions") {
      const result = await syncLeagueDivisions(supabase, tournament);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "updateDivisionStatus") {
      const result = await updateDivisionStatus(supabase, tournament, body.divisionId, body.isActive);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "deleteDivision") {
      const result = await deleteTournamentDivision(supabase, tournament, body.divisionId);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "updateTournamentSettings") {
      const result = await updateTournamentSettings(supabase, tournament, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "updateTournamentTeam") {
      const result = await updateTournamentTeam(supabase, tournament, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "createTournamentTeam") {
      const result = await createTournamentTeam(supabase, tournament, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "deleteTournamentTeam") {
      const result = await deleteTournamentTeam(supabase, tournament, body.teamId);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "saveCourts") {
      const result = await saveCourts(supabase, tournament, body.courtNames);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "resetMatches") {
      const result = await resetTournamentMatches(supabase, tournament);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "clearLog") {
      const result = await clearTournamentLog(supabase, tournament);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "startTournament") {
      const result = await startTournament(supabase, tournament);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "generateRoundRobin") {
      const result = await generateRoundRobin(supabase, tournament, body.divisionIds);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { success: false, error: "Unknown tournament action." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}

async function validateTournamentCode(supabase, identifier, eventCode) {
  const cleanIdentifier = String(identifier || "").trim();
  const cleanCode = String(eventCode || "").trim();

  if (!cleanIdentifier || !cleanCode) {
    const error = new Error("Tournament and event code are required.");
    error.status = 400;
    throw error;
  }

  const query = supabase.from("tournaments").select("*");
  const { data, error } = isUuid(cleanIdentifier)
    ? await query.eq("id", cleanIdentifier).single()
    : await query.eq("slug", cleanIdentifier).single();

  if (error) throw error;

  if (!isValidTournamentAdminCode(data, cleanCode)) {
    const codeError = new Error("Incorrect event code.");
    codeError.status = 401;
    throw codeError;
  }

  return data;
}

async function autoAssignOpenCourts(supabase, tournament, smsEnabled = false) {
  const state = await loadActionState(supabase, tournament.id);
  const now = new Date().toISOString();
  const localBusy = new Set();
  const localDivisionLoad = {};
  const assignments = [];

  state.matches
    .filter((match) => match.status === "playing")
    .forEach((match) => {
      localBusy.add(teamKey(match.home_team_id));
      localBusy.add(teamKey(match.away_team_id));
      const divisionKey = teamKey(match.division_id);
      localDivisionLoad[divisionKey] = (localDivisionLoad[divisionKey] || 0) + 1;
    });

  for (const court of state.courts) {
    const already = state.matches.find((match) =>
      match.status === "playing" && String(match.court_id || "") === String(court.id)
    );

    if (already) continue;

    const chosen = chooseNextMatch(state.matches, localBusy, localDivisionLoad, tournament);
    if (!chosen) continue;

    assignments.push({ match: chosen, court });
    chosen.status = "playing";
    chosen.court_id = court.id;
    chosen.assigned_at = now;
    localBusy.add(teamKey(chosen.home_team_id));
    localBusy.add(teamKey(chosen.away_team_id));
    const divisionKey = teamKey(chosen.division_id);
    localDivisionLoad[divisionKey] = (localDivisionLoad[divisionKey] || 0) + 1;
  }

  for (const assignment of assignments) {
    await assignMatchToCourt(supabase, tournament.id, assignment.match.id, assignment.court.id, now);
    assignment.match.court = assignment.court;
    await addLog(
      supabase,
      tournament.id,
      "match",
      `Assigned Court ${assignment.court.name}: ${matchLabel(assignment.match)}`
    );
  }

  const sms = smsEnabled
    ? await sendCourtReadyTextsForAssignments(supabase, tournament, state.contactsByTeam, assignments)
    : { sent: 0, skipped: true, reason: "SMS disabled", results: [] };

  return { assigned: assignments.length, sms };
}

async function returnToQueue(supabase, tournament, matchId) {
  if (!matchId) throw new Error("Match is required.");

  const state = await loadActionState(supabase, tournament.id);
  const match = state.matches.find((item) => String(item.id) === String(matchId));
  if (!match) throw new Error("Match not found.");

  const now = new Date().toISOString();
  await supabase
    .from("tournament_matches")
    .update({
      status: "pending",
      result_type: "completed",
      winner_team_id: null,
      home_score: null,
      away_score: null,
      score_text: null,
      game_scores: null,
      court_id: null,
      assigned_at: null,
      completed_at: null,
      queue_entered_at: now,
      updated_at: now,
    })
    .eq("id", match.id);

  if (match.court_id) {
    await clearCourt(supabase, match.court_id);
  }

  await addLog(supabase, tournament.id, "match", `Returned to queue: ${matchLabel(match)}`);
  return { returned: true };
}

async function swapToCourt(supabase, tournament, matchId, courtId, smsEnabled = false) {
  if (!matchId || !courtId) throw new Error("Match and court are required.");

  const state = await loadActionState(supabase, tournament.id);
  const pending = state.matches.find((match) => String(match.id) === String(matchId) && match.status === "pending");
  const court = state.courts.find((item) => String(item.id) === String(courtId));
  if (!pending) throw new Error("Queued match not found.");
  if (!court) throw new Error("Court not found.");

  const current = state.matches.find((match) =>
    match.status === "playing" && String(match.court_id || "") === String(court.id)
  );
  const now = new Date().toISOString();

  if (current) {
    await supabase
      .from("tournament_matches")
      .update({
        status: "pending",
        court_id: null,
        assigned_at: null,
        queue_entered_at: now,
        updated_at: now,
      })
      .eq("id", current.id);
  }

  await assignMatchToCourt(supabase, tournament.id, pending.id, court.id, now);
  pending.court = court;
  await addLog(
    supabase,
    tournament.id,
    "match",
    `Override Court ${court.name}: ${matchLabel(pending)}${current ? ` replaced ${matchLabel(current)}` : ""}`
  );

  const sms = smsEnabled
    ? await sendCourtReadyText(supabase, tournament, state.contactsByTeam, pending)
    : { sent: 0, skipped: true, reason: "SMS disabled", results: [] };

  return { swapped: true, sms };
}

async function completeMatch(supabase, tournament, body) {
  const matchId = body.matchId;
  if (!matchId) throw new Error("Match is required.");

  const state = await loadActionState(supabase, tournament.id);
  const match = state.matches.find((item) => String(item.id) === String(matchId));
  if (!match) throw new Error("Match not found.");

  const resultType = body.resultType || "completed";
  const homeScore = numberOrNull(body.homeScore);
  const awayScore = numberOrNull(body.awayScore);
  const gameScores = Array.isArray(body.gameScores) ? body.gameScores : [];
  const matchScoreSummary = resultType === "completed"
    ? validateTournamentMatchScore(gameScores, tournament.settings)
    : null;
  const finalHomeScore = matchScoreSummary ? matchScoreSummary.homePoints : homeScore;
  const finalAwayScore = matchScoreSummary ? matchScoreSummary.awayPoints : awayScore;
  const winnerTeamId =
    resultType === "not_played"
      ? null
      : matchScoreSummary?.winner === "home"
        ? match.home_team_id
        : matchScoreSummary?.winner === "away"
          ? match.away_team_id
          : body.winnerTeamId || (Number(finalHomeScore || 0) > Number(finalAwayScore || 0) ? match.home_team_id : match.away_team_id);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("tournament_matches")
    .update({
      status: resultType === "not_played" ? "not_played" : "done",
      result_type: resultType,
      winner_team_id: winnerTeamId,
      home_score: finalHomeScore,
      away_score: finalAwayScore,
      score_text: body.scoreText || null,
      game_scores: matchScoreSummary ? matchScoreSummary.gameScores : gameScores.length > 0 ? gameScores : null,
      court_id: null,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", match.id);

  if (error) throw error;
  if (match.court_id) await clearCourt(supabase, match.court_id);

  await addLog(
    supabase,
    tournament.id,
    "match",
    `Result: ${matchLabel(match)} - ${resultType}${finalHomeScore !== null ? ` (${finalHomeScore}-${finalAwayScore})` : ""}`
  );

  const completedMatch = {
    ...match,
    status: resultType === "not_played" ? "not_played" : "done",
    result_type: resultType,
    winner_team_id: winnerTeamId,
    home_score: finalHomeScore,
    away_score: finalAwayScore,
    score_text: body.scoreText || null,
    game_scores: matchScoreSummary ? matchScoreSummary.gameScores : gameScores.length > 0 ? gameScores : null,
  };
  const sms = body.smsEnabled
    ? await sendResultText(supabase, tournament, state.contactsByTeam, completedMatch)
    : { sent: 0, skipped: true, reason: "SMS disabled", results: [] };

  return { completed: true, sms };
}

async function sendCourtText(supabase, tournament, matchId) {
  const state = await loadActionState(supabase, tournament.id);
  const match = state.matches.find((item) => String(item.id) === String(matchId));
  if (!match) throw new Error("Match not found.");

  const sms = await sendCourtReadyText(supabase, tournament, state.contactsByTeam, match);

  return { sms };
}

async function sendCourtReadyTextsForAssignments(supabase, tournament, contactsByTeam, assignments) {
  const results = [];

  for (const assignment of assignments) {
    results.push(await sendCourtReadyText(supabase, tournament, contactsByTeam, assignment.match));
  }

  return {
    sent: results.reduce((sum, result) => sum + Number(result.sent || 0), 0),
    results,
  };
}

async function sendCourtReadyText(supabase, tournament, contactsByTeam, match) {
  const phones = phonesForMatch(contactsByTeam, match);
  const templates = smsTemplates(tournament);
  const message = renderSmsTemplate(templates.courtReady, templateValues(tournament, match));
  const sms = await sendSmsMessages({ phones, body: message });

  await addLog(
    supabase,
    tournament.id,
    "sms",
    `Court text sent to ${sms.sent || 0} recipient${Number(sms.sent || 0) === 1 ? "" : "s"}: ${matchLabel(match)}`
  );

  return sms;
}

async function sendResultText(supabase, tournament, contactsByTeam, match) {
  const phones = phonesForMatch(contactsByTeam, match);
  const templates = smsTemplates(tournament);
  const message = renderSmsTemplate(templates.result, templateValues(tournament, match));
  const sms = await sendSmsMessages({ phones, body: message });

  await addLog(
    supabase,
    tournament.id,
    "sms",
    `Result text sent to ${sms.sent || 0} recipient${Number(sms.sent || 0) === 1 ? "" : "s"}: ${matchLabel(match)}`
  );

  return sms;
}

async function updateSmsTemplates(supabase, tournament, templates) {
  const settings = {
    ...(tournament.settings || {}),
    smsTemplates: smsTemplates({ settings: { smsTemplates: templates } }),
  };
  const { error } = await supabase
    .from("tournaments")
    .update({
      settings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tournament.id);

  if (error) throw error;
  await addLog(supabase, tournament.id, "sms", "SMS templates updated.");
  return { updated: true };
}

async function sendBroadcastText(supabase, tournament, body = {}) {
  const state = await loadActionState(supabase, tournament.id);
  const divisionIds = Array.isArray(body.divisionIds) ? body.divisionIds.map((divisionId) => String(divisionId)) : [];
  const selectedDivisionSet = new Set(divisionIds);
  const teamsById = (state.teams || []).reduce((map, team) => {
    map[String(team.id)] = team;
    return map;
  }, {});
  const selectedContacts = Object.entries(state.contactsByTeam)
    .filter(([teamId]) => {
      if (selectedDivisionSet.size === 0) return false;
      return selectedDivisionSet.has(String(teamsById[String(teamId)]?.division_id || ""));
    })
    .flatMap(([, contacts]) => contacts);
  const phones = uniquePhones(selectedContacts);
  const templates = smsTemplates(tournament);
  const template = String(body.message || templates.broadcast || "").trim();
  if (!template) throw new Error("Enter the broadcast message.");

  const message = renderSmsTemplate(template, {
    tournament: tournament.name,
    status: tournamentStatusText(state.matches),
  });
  const sms = await sendSmsMessages({ phones, body: message });

  await addLog(
    supabase,
    tournament.id,
    "sms",
    `Tournament broadcast sent to ${sms.sent || 0} recipient${Number(sms.sent || 0) === 1 ? "" : "s"}.`,
    { divisionIds, requestedRecipients: phones.length }
  );

  return { sms };
}

async function sendTestText(supabase, tournament, phone) {
  const cleanPhone = String(phone || "").trim();
  if (!cleanPhone) throw new Error("Enter a test phone number.");

  const templates = smsTemplates(tournament);
  const message = renderSmsTemplate(templates.broadcast, {
    tournament: tournament.name,
    status: "This is a test tournament text.",
  });
  const sms = await sendSmsMessages({ phones: [cleanPhone], body: message });

  await addLog(supabase, tournament.id, "sms", `Test SMS sent to ${cleanPhone}.`);
  return { sms };
}

async function updatePlayerPhone(supabase, tournament, body) {
  const teamId = String(body.teamId || "").trim();
  const slot = Number(body.slot || 0);
  const cleanPhone = formatPhoneNumberForStorage(body.phone);

  if (!teamId || ![1, 2].includes(slot)) throw new Error("Team and player are required.");
  if (!cleanPhone) throw new Error("Enter the phone number.");

  const { data: team, error: teamError } = await supabase
    .from("tournament_teams")
    .select("id, name, player_1_name, player_2_name")
    .eq("id", teamId)
    .eq("tournament_id", tournament.id)
    .single();
  if (teamError) throw teamError;

  const { data: contact, error: contactError } = await supabase
    .from("tournament_team_contacts")
    .select("id, member_id, display_name, phone")
    .eq("tournament_team_id", teamId)
    .eq("player_slot", slot)
    .maybeSingle();
  if (contactError) throw contactError;

  const fallbackPlayerName = slot === 1 ? team.player_1_name : team.player_2_name;
  const resolvedMember = await resolveTournamentPlayerMember(supabase, {
    memberId: contact?.member_id || body.memberId,
    playerName: contact?.display_name || fallbackPlayerName,
  });
  const memberId = resolvedMember?.id || null;
  const oldPhone = String(contact?.phone || resolvedMember?.phone || "").trim();
  const playerName = contact?.display_name || fallbackPlayerName || memberDisplayName(resolvedMember);
  const now = new Date().toISOString();

  if (memberId) {
    const { error: memberUpdateError } = await supabase
      .from("members")
      .update({ phone: cleanPhone, updated_at: now })
      .eq("id", memberId);
    if (memberUpdateError) throw memberUpdateError;
  }

  const { error: contactUpdateError } = await supabase
    .from("tournament_team_contacts")
    .upsert({
      tournament_team_id: teamId,
      player_slot: slot,
      member_id: memberId,
      display_name: playerName || null,
      phone: cleanPhone,
      updated_at: now,
    }, { onConflict: "tournament_team_id,player_slot" });
  if (contactUpdateError) throw contactUpdateError;

  const metadata = {
    playerName,
    memberId,
    teamId,
    teamName: team.name || "",
    playerSlot: slot,
    oldPhone,
    newPhone: cleanPhone,
    coreMemberUpdated: Boolean(memberId),
  };

  await addLog(
    supabase,
    tournament.id,
    "phone_change",
    `${playerName} phone changed from ${oldPhone || "blank"} to ${cleanPhone}.`,
    metadata
  );

  return { updated: true, oldPhone, newPhone: cleanPhone, playerName, memberId, coreMemberUpdated: Boolean(memberId), logMetadata: metadata };
}

async function syncLeagueDivisions(supabase, tournament) {
  const [leagueResult, tournamentResult] = await Promise.all([
    supabase
      .from("divisions")
      .select("id, name, sort_order, is_active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("tournament_divisions")
      .select("id, name")
      .eq("tournament_id", tournament.id),
  ]);

  if (leagueResult.error) throw leagueResult.error;
  if (tournamentResult.error) throw tournamentResult.error;

  const existingNames = new Set((tournamentResult.data || []).map((division) => normalizeName(division.name)));
  const now = new Date().toISOString();
  const rows = (leagueResult.data || [])
    .filter((division) => division.name && !existingNames.has(normalizeName(division.name)))
    .map((division, index) => ({
      tournament_id: tournament.id,
      name: division.name,
      sort_order: Number.isFinite(Number(division.sort_order)) ? Number(division.sort_order) : index,
      is_active: Boolean(division.is_active),
      settings: { sourceDivisionId: division.id },
      created_at: now,
      updated_at: now,
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("tournament_divisions").insert(rows);
    if (error) throw error;
  }

  await addLog(supabase, tournament.id, "setup", `Synced ${rows.length} division${rows.length === 1 ? "" : "s"} from the main system.`);
  return { synced: rows.length };
}

async function updateDivisionStatus(supabase, tournament, divisionId, isActive) {
  if (!divisionId) throw new Error("Division is required.");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("tournament_divisions")
    .update({
      is_active: Boolean(isActive),
      updated_at: now,
    })
    .eq("id", divisionId)
    .eq("tournament_id", tournament.id)
    .select("name, is_active")
    .single();

  if (error) throw error;
  await addLog(supabase, tournament.id, "setup", `${data.name} set ${data.is_active ? "active" : "inactive"}.`);
  return { division: data };
}

async function deleteTournamentDivision(supabase, tournament, divisionId) {
  if (!divisionId) throw new Error("Division is required.");

  const { count, error: countError } = await supabase
    .from("tournament_teams")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournament.id)
    .eq("division_id", divisionId);

  if (countError) throw countError;
  if (Number(count || 0) > 0) {
    const error = new Error("Only tournament divisions with no assigned teams can be deleted.");
    error.status = 400;
    throw error;
  }

  const { data, error: divisionError } = await supabase
    .from("tournament_divisions")
    .select("name")
    .eq("id", divisionId)
    .eq("tournament_id", tournament.id)
    .single();

  if (divisionError) throw divisionError;

  const { error: deleteError } = await supabase
    .from("tournament_divisions")
    .delete()
    .eq("id", divisionId)
    .eq("tournament_id", tournament.id);

  if (deleteError) throw deleteError;
  await addLog(supabase, tournament.id, "setup", `Deleted tournament division: ${data.name}.`);
  return { deleted: true };
}

async function updateTournamentSettings(supabase, tournament, body) {
  const name = String(body.name || tournament.name || "").trim();
  const scoreSettings = tournamentScoreSettings({
    ...(tournament.settings || {}),
    numberOfGames: body.numberOfGames,
    gamesPlayedTo: body.gamesPlayedTo,
    winBy: body.winBy,
    rallyScoring: body.rallyScoring,
  });
  const standingsRules = standingsRulesValue(body.standingsRules || tournament.settings?.standingsRules);
  const adminCode = String(body.adminCode || "").trim();
  if (!name) throw new Error("Tournament name is required.");
  if (adminCode) {
    const adminCodeConfirm = String(body.adminCodeConfirm || "").trim();
    const adminCodeConfirmation = String(body.adminCodeConfirmation || "").trim().toUpperCase();
    if (adminCode !== adminCodeConfirm || adminCodeConfirmation !== "CHANGE CODE") {
      throw new Error("Event entry code changes require matching entries and CHANGE CODE confirmation.");
    }
  }

  const settings = {
    ...(tournament.settings || {}),
    numberOfGames: scoreSettings.numberOfGames,
    matchFormat: scoreSettings.numberOfGames === 1 ? "Single Game" : `Best ${scoreSettings.gamesNeededToWin} of ${scoreSettings.numberOfGames}`,
    gamesPlayedTo: scoreSettings.gamesPlayedTo,
    winBy: scoreSettings.winBy,
    rallyScoring: scoreSettings.rallyScoring,
    standingsRules,
  };
  const now = new Date().toISOString();
  const updatePayload = {
    name,
    settings,
    updated_at: now,
  };
  if (adminCode) updatePayload.admin_code = adminCode;

  const { error } = await supabase
    .from("tournaments")
    .update(updatePayload)
    .eq("id", tournament.id);

  if (error) throw error;
  await addLog(supabase, tournament.id, "setup", adminCode ? "Tournament event entry code updated." : "Tournament settings updated.");
  return { updated: true };
}

function isValidTournamentAdminCode(tournament, eventCode) {
  const cleanCode = String(eventCode || "").trim();
  const overrideCode = String(process.env.TOURNAMENT_ADMIN_OVERRIDE_CODE || process.env.TOURNAMENT_EVENT_OVERRIDE_CODE || "").trim();
  return String(tournament.admin_code || "") === cleanCode || (overrideCode && overrideCode === cleanCode);
}

async function updateTournamentTeam(supabase, tournament, body) {
  const teamId = body.teamId;
  if (!teamId) throw new Error("Team is required.");

  const { data: existing, error: existingError } = await supabase
    .from("tournament_teams")
    .select("*")
    .eq("id", teamId)
    .eq("tournament_id", tournament.id)
    .single();
  if (existingError) throw existingError;

  const hasTeamFields = Object.prototype.hasOwnProperty.call(body, "name") ||
    Object.prototype.hasOwnProperty.call(body, "regularSeasonStanding") ||
    Object.prototype.hasOwnProperty.call(body, "player1Name") ||
    Object.prototype.hasOwnProperty.call(body, "player2Name");
  const nextP1Checked = booleanOrDefault(body.player1CheckedIn, existing.player_1_checked_in);
  const nextP2Checked = booleanOrDefault(body.player2CheckedIn, existing.player_2_checked_in);
  const now = new Date().toISOString();
  const payload = {
    player_1_checked_in: nextP1Checked,
    player_2_checked_in: nextP2Checked,
    checked_in: booleanOrDefault(body.checkedIn, nextP1Checked && nextP2Checked),
    updated_at: now,
  };

  if (hasTeamFields) {
    payload.name = String(body.name || existing.name || "").trim() || existing.name;
    payload.line_number = Number(body.lineNumber || existing.line_number || 1);
    payload.seed = body.regularSeasonStanding ? String(body.regularSeasonStanding) : null;
    payload.player_1_name = String(body.player1Name || "").trim() || null;
    payload.player_2_name = String(body.player2Name || "").trim() || null;

    const { data: sameLineTeams, error: duplicateError } = await supabase
      .from("tournament_teams")
      .select("id, name")
      .eq("tournament_id", tournament.id)
      .eq("line_number", payload.line_number);
    if (duplicateError) throw duplicateError;

    const duplicate = (sameLineTeams || []).some((team) =>
      String(team.id) !== String(teamId) &&
      normalizeName(team.name) === normalizeName(payload.name)
    );
    if (duplicate) {
      const error = new Error("A tournament team already exists with this Team Name and Line #.");
      error.status = 400;
      throw error;
    }
  }

  const { error } = await supabase
    .from("tournament_teams")
    .update(payload)
    .eq("id", teamId)
    .eq("tournament_id", tournament.id);
  if (error) throw error;

  if (hasTeamFields) {
    await updateMemberPhoneFromTournamentEdit(supabase, tournament, {
      teamId,
      teamName: payload.name || existing.name,
      slot: 1,
      memberId: body.player1MemberId,
      playerName: body.player1Name,
      newPhone: body.player1Phone,
    });
    await upsertTournamentContact(supabase, teamId, 1, {
      memberId: body.player1MemberId,
      displayName: body.player1Name,
      phone: body.player1Phone,
    });
    await updateMemberPhoneFromTournamentEdit(supabase, tournament, {
      teamId,
      teamName: payload.name || existing.name,
      slot: 2,
      memberId: body.player2MemberId,
      playerName: body.player2Name,
      newPhone: body.player2Phone,
    });
    await upsertTournamentContact(supabase, teamId, 2, {
      memberId: body.player2MemberId,
      displayName: body.player2Name,
      phone: body.player2Phone,
    });
  }

  await addLog(supabase, tournament.id, "team", `${payload.name || existing.name} updated.`);
  return { updated: true };
}

async function createTournamentTeam(supabase, tournament, body) {
  const sourceTeamId = String(body.sourceTeamId || "").trim();
  if (!sourceTeamId) throw new Error("Select the Main System Team.");

  const { data: sourceTeam, error: sourceTeamError } = await supabase
    .from("teams")
    .select(`
      id,
      name,
      divisions (
        id,
        name,
        team_dupr_max
      )
    `)
    .eq("id", sourceTeamId)
    .single();
  if (sourceTeamError) throw sourceTeamError;

  const sourceDivisionName = sourceTeam.divisions?.name || "";
  const { data: divisions, error: divisionsError } = await supabase
    .from("tournament_divisions")
    .select("id, name, is_active")
    .eq("tournament_id", tournament.id);
  if (divisionsError) throw divisionsError;

  const division = (divisions || []).find((item) =>
    item.is_active !== false && normalizeName(item.name) === normalizeName(sourceDivisionName)
  );
  if (!division) throw new Error(`No active tournament division matches ${sourceDivisionName || "that team division"}.`);

  const name = String(body.name || sourceTeam.name || "").trim();
  const lineNumber = Number(body.lineNumber);
  const regularSeasonStanding = Number(body.regularSeasonStanding);
  const player1MemberId = String(body.player1MemberId || "").trim();
  const player2MemberId = String(body.player2MemberId || "").trim();
  if (!name) throw new Error("Team name is required.");
  if (!String(body.lineNumber || "").trim() || !Number.isFinite(lineNumber) || lineNumber < 1) throw new Error("Line number is required.");
  if (!String(body.regularSeasonStanding || "").trim() || !Number.isFinite(regularSeasonStanding) || regularSeasonStanding < 1) {
    throw new Error("Regular Season Standing is required.");
  }
  if (!player1MemberId || !player2MemberId) throw new Error("Both players must be selected.");
  if (player1MemberId === player2MemberId) throw new Error("The same player cannot be entered twice on the same team.");

  const { data: sameLineTeams, error: duplicateError } = await supabase
    .from("tournament_teams")
    .select("id, name")
    .eq("tournament_id", tournament.id)
    .eq("line_number", lineNumber);
  if (duplicateError) throw duplicateError;

  const duplicate = (sameLineTeams || []).some((team) =>
    normalizeName(team.name) === normalizeName(name) ||
    normalizeName(team.name) === normalizeName(sourceTeam.name)
  );
  if (duplicate) {
    const error = new Error("That Main System Team already has a tournament team with this Line #.");
    error.status = 400;
    throw error;
  }

  const maxRating = Number(sourceTeam.divisions?.team_dupr_max);
  const player1Rating = Number(body.player1Rating || 0);
  const player2Rating = Number(body.player2Rating || 0);
  const teamTotalRating = [player1Rating, player2Rating].reduce((sum, rating) => Number.isFinite(rating) ? sum + rating : sum, 0);
  if (Number.isFinite(maxRating) && maxRating > 0 && teamTotalRating > maxRating) {
    throw new Error("The players' total rating must be at or below the Division Team Max.");
  }

  const { data: tournamentTeams, error: teamsError } = await supabase
    .from("tournament_teams")
    .select("id, name")
    .eq("tournament_id", tournament.id);
  if (teamsError) throw teamsError;

  const tournamentTeamIds = (tournamentTeams || []).map((team) => team.id);
  if (tournamentTeamIds.length > 0) {
    const { data: usedContacts, error: usedContactsError } = await supabase
      .from("tournament_team_contacts")
      .select("member_id, display_name, tournament_team_id")
      .in("tournament_team_id", tournamentTeamIds)
      .in("member_id", [player1MemberId, player2MemberId]);
    if (usedContactsError) throw usedContactsError;

    const usedContact = (usedContacts || []).find((contact) => contact.member_id);
    if (usedContact) {
      const usedTeam = (tournamentTeams || []).find((team) => String(team.id) === String(usedContact.tournament_team_id));
      throw new Error(`${usedContact.display_name || "A selected player"} is already on ${usedTeam?.name || "another tournament team"}.`);
    }
  }

  const now = new Date().toISOString();
  const { data: createdTeam, error: insertError } = await supabase
    .from("tournament_teams")
    .insert({
      tournament_id: tournament.id,
      division_id: division.id,
      name,
      line_number: lineNumber,
      seed: String(regularSeasonStanding),
      player_1_name: String(body.player1Name || "").trim() || null,
      player_2_name: String(body.player2Name || "").trim() || null,
      player_1_checked_in: false,
      player_2_checked_in: false,
      checked_in: false,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (insertError) throw insertError;

  await upsertTournamentContact(supabase, createdTeam.id, 1, {
    memberId: player1MemberId,
    displayName: body.player1Name,
    phone: body.player1Phone,
  });
  await upsertTournamentContact(supabase, createdTeam.id, 2, {
    memberId: player2MemberId,
    displayName: body.player2Name,
    phone: body.player2Phone,
  });

  await addLog(supabase, tournament.id, "team", `${name} added to ${division.name}.`);
  return { created: true, teamId: createdTeam.id };
}

async function updateMemberPhoneFromTournamentEdit(supabase, tournament, details) {
  const memberId = details.memberId || null;
  const cleanPhone = formatPhoneNumberForStorage(details.newPhone);
  if (!memberId || !cleanPhone) return { logged: false };

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, full_name, first_name, last_name, email, phone")
    .eq("id", memberId)
    .single();
  if (memberError) throw memberError;

  const oldPhone = String(member.phone || "").trim();
  if (oldPhone === cleanPhone) return { logged: false };

  const playerName = String(details.playerName || "").trim() || memberDisplayName(member);
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("members")
    .update({ phone: cleanPhone, updated_at: now })
    .eq("id", memberId);
  if (updateError) throw updateError;

  await addLog(
    supabase,
    tournament.id,
    "phone_change",
    `${playerName} phone changed from ${oldPhone || "blank"} to ${cleanPhone}.`,
    {
      playerName,
      memberId,
      teamId: details.teamId,
      teamName: details.teamName || "",
      playerSlot: details.slot,
      oldPhone,
      newPhone: cleanPhone,
    }
  );

  return { logged: true };
}

async function resolveTournamentPlayerMember(supabase, details) {
  const memberId = details.memberId || null;
  if (memberId) {
    const { data, error } = await supabase
      .from("members")
      .select("id, full_name, first_name, last_name, email, phone")
      .eq("id", memberId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }
  return null;
}

async function deleteTournamentTeam(supabase, tournament, teamId) {
  if (!teamId) throw new Error("Team is required.");

  const { data: existing, error: existingError } = await supabase
    .from("tournament_teams")
    .select("id, name")
    .eq("id", teamId)
    .eq("tournament_id", tournament.id)
    .single();
  if (existingError) throw existingError;

  const { error } = await supabase
    .from("tournament_teams")
    .delete()
    .eq("id", teamId)
    .eq("tournament_id", tournament.id);
  if (error) throw error;

  await addLog(supabase, tournament.id, "team", `${existing.name || "Tournament team"} deleted.`);
  return { deleted: true };
}

async function upsertTournamentContact(supabase, teamId, slot, contact) {
  const displayName = String(contact.displayName || "").trim();
  const phone = formatPhoneNumberForStorage(contact.phone);
  const memberId = contact.memberId || null;
  const now = new Date().toISOString();

  if (!displayName && !phone && !memberId) {
    const { error } = await supabase
      .from("tournament_team_contacts")
      .delete()
      .eq("tournament_team_id", teamId)
      .eq("player_slot", slot);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("tournament_team_contacts")
    .upsert({
      tournament_team_id: teamId,
      player_slot: slot,
      member_id: memberId,
      display_name: displayName || null,
      phone: phone || null,
      updated_at: now,
    }, { onConflict: "tournament_team_id,player_slot" });
  if (error) throw error;
}

async function saveCourts(supabase, tournament, courtNames) {
  const names = parseCourtNames(courtNames);
  if (names.length === 0) throw new Error("Enter at least one court number or name.");

  const now = new Date().toISOString();
  const rows = names.map((name, index) => ({
    tournament_id: tournament.id,
    name,
    sort_order: index + 1,
    updated_at: now,
  }));

  const { error: upsertError } = await supabase
    .from("tournament_courts")
    .upsert(rows, { onConflict: "tournament_id,name" });
  if (upsertError) throw upsertError;

  const { data: existing, error: existingError } = await supabase
    .from("tournament_courts")
    .select("id, name")
    .eq("tournament_id", tournament.id);
  if (existingError) throw existingError;

  const keep = new Set(names.map(normalizeName));
  const deleteIds = (existing || [])
    .filter((court) => !keep.has(normalizeName(court.name)))
    .map((court) => court.id);

  if (deleteIds.length > 0) {
    const { error: matchError } = await supabase
      .from("tournament_matches")
      .update({ court_id: null, updated_at: now })
      .in("court_id", deleteIds)
      .eq("tournament_id", tournament.id);
    if (matchError) throw matchError;

    const { error: deleteError } = await supabase
      .from("tournament_courts")
      .delete()
      .in("id", deleteIds)
      .eq("tournament_id", tournament.id);
    if (deleteError) throw deleteError;
  }

  await addLog(supabase, tournament.id, "setup", `Saved ${names.length} court${names.length === 1 ? "" : "s"}.`);
  return { courts: names.length };
}

async function resetTournamentMatches(supabase, tournament) {
  const now = new Date().toISOString();
  const { error: deleteError } = await supabase
    .from("tournament_matches")
    .delete()
    .eq("tournament_id", tournament.id);
  if (deleteError) throw deleteError;

  const { error: courtError } = await supabase
    .from("tournament_courts")
    .update({ current_match_id: null, updated_at: now })
    .eq("tournament_id", tournament.id);
  if (courtError) throw courtError;

  await clearTournamentLog(supabase, tournament);
  return { reset: true };
}

async function clearTournamentLog(supabase, tournament) {
  const { error } = await supabase
    .from("tournament_activity_log")
    .delete()
    .eq("tournament_id", tournament.id);
  if (error) throw error;
  return { cleared: true };
}

async function startTournament(supabase, tournament) {
  const now = new Date().toISOString();
  const { error: matchError } = await supabase
    .from("tournament_matches")
    .update({
      status: "pending",
      court_id: null,
      assigned_at: null,
      completed_at: null,
      queue_entered_at: now,
      updated_at: now,
    })
    .eq("tournament_id", tournament.id)
    .neq("status", "done");
  if (matchError) throw matchError;

  const { error: courtError } = await supabase
    .from("tournament_courts")
    .update({ current_match_id: null, updated_at: now })
    .eq("tournament_id", tournament.id);
  if (courtError) throw courtError;

  await addLog(supabase, tournament.id, "setup", "Tournament started and wait times reset.");
  return { started: true };
}

async function generateRoundRobin(supabase, tournament, divisionIds) {
  const selectedIds = new Set((Array.isArray(divisionIds) ? divisionIds : []).map(String).filter(Boolean));
  if (selectedIds.size === 0) throw new Error("Select at least one active division.");

  const [divisionResult, teamResult] = await Promise.all([
    supabase
      .from("tournament_divisions")
      .select("*")
      .eq("tournament_id", tournament.id)
      .eq("is_active", true),
    supabase
      .from("tournament_teams")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("name", { ascending: true }),
  ]);

  if (divisionResult.error) throw divisionResult.error;
  if (teamResult.error) throw teamResult.error;

  const divisions = (divisionResult.data || []).filter((division) => selectedIds.has(String(division.id)));
  if (divisions.length === 0) throw new Error("No active selected divisions were found.");

  const divisionIdList = divisions.map((division) => division.id);
  const { error: deleteError } = await supabase
    .from("tournament_matches")
    .delete()
    .eq("tournament_id", tournament.id)
    .in("division_id", divisionIdList);
  if (deleteError) throw deleteError;

  const now = new Date().toISOString();
  const rows = [];
  let order = 1;

  for (const division of divisions) {
    const teamsByLine = (teamResult.data || [])
      .filter((team) => String(team.division_id || "") === String(division.id))
      .reduce((map, team) => {
        const line = Number(team.line_number || 1);
        map[line] = [...(map[line] || []), team];
        return map;
      }, {});

    for (const [line, teams] of Object.entries(teamsByLine)) {
      const homeAwayCounts = {};

      for (let homeIndex = 0; homeIndex < teams.length; homeIndex += 1) {
        for (let awayIndex = homeIndex + 1; awayIndex < teams.length; awayIndex += 1) {
          const pair = balancedHomeAwayPair(teams[homeIndex], teams[awayIndex], homeAwayCounts, order);
          homeAwayCounts[pair.home.id].home += 1;
          homeAwayCounts[pair.away.id].away += 1;

          rows.push({
            tournament_id: tournament.id,
            division_id: division.id,
            home_team_id: pair.home.id,
            away_team_id: pair.away.id,
            line_number: Number(line),
            status: "pending",
            result_type: "completed",
            queue_entered_at: now,
            created_order: order,
            created_at: now,
            updated_at: now,
          });
          order += 1;
        }
      }
    }
  }

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("tournament_matches").insert(rows);
    if (insertError) throw insertError;
  }

  await addLog(supabase, tournament.id, "setup", `Generated ${rows.length} round robin match${rows.length === 1 ? "" : "es"}.`);
  return { generated: rows.length };
}

function balancedHomeAwayPair(teamA, teamB, counts, order) {
  counts[teamA.id] ||= { home: 0, away: 0 };
  counts[teamB.id] ||= { home: 0, away: 0 };

  const aHomeScore = homeAwayImbalance(counts[teamA.id].home + 1, counts[teamA.id].away) +
    homeAwayImbalance(counts[teamB.id].home, counts[teamB.id].away + 1);
  const bHomeScore = homeAwayImbalance(counts[teamB.id].home + 1, counts[teamB.id].away) +
    homeAwayImbalance(counts[teamA.id].home, counts[teamA.id].away + 1);

  if (aHomeScore < bHomeScore) return { home: teamA, away: teamB };
  if (bHomeScore < aHomeScore) return { home: teamB, away: teamA };
  return Number(order || 0) % 2 === 0
    ? { home: teamB, away: teamA }
    : { home: teamA, away: teamB };
}

function homeAwayImbalance(home, away) {
  return Math.abs(Number(home || 0) - Number(away || 0));
}

async function loadActionState(supabase, tournamentId) {
  const [courts, matches, teams, contacts] = await Promise.all([
    supabase
      .from("tournament_courts")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("tournament_matches")
      .select(`
        *,
        division:tournament_divisions(id, name),
        home_team:tournament_teams!tournament_matches_home_team_id_fkey(id, name, player_1_name, player_2_name, seed),
        away_team:tournament_teams!tournament_matches_away_team_id_fkey(id, name, player_1_name, player_2_name, seed),
        court:tournament_courts!tournament_matches_court_id_fkey(id, name),
        winner_team:tournament_teams!tournament_matches_winner_team_id_fkey(id, name)
      `)
      .eq("tournament_id", tournamentId)
      .order("created_order", { ascending: true }),
    supabase
      .from("tournament_teams")
      .select("id, division_id")
      .eq("tournament_id", tournamentId),
    Promise.resolve({ data: [], error: null }),
  ]);

  const errors = [courts.error, matches.error, teams.error, contacts.error].filter(Boolean);
  if (errors.length > 0) throw errors[0];

  const teamIds = (teams.data || []).map((team) => team.id);
  const contactResult = teamIds.length > 0
    ? await supabase
      .from("tournament_team_contacts")
      .select("*")
      .in("tournament_team_id", teamIds)
    : { data: [], error: null };
  if (contactResult.error) throw contactResult.error;

  const contactsByTeam = (contactResult.data || []).reduce((map, contact) => {
    const key = String(contact.tournament_team_id);
    map[key] = [...(map[key] || []), contact];
    return map;
  }, {});

  return {
    courts: courts.data || [],
    matches: matches.data || [],
    teams: teams.data || [],
    contactsByTeam,
  };
}

function chooseNextMatch(matches, localBusy, localDivisionLoad, tournament) {
  const now = Date.now();
  const minimumRest = Number(tournament.settings?.minimumRestMinutes || 0) * 60000;
  const lastPlayed = lastPlayedByTeam(matches);
  const fairness = divisionLineFairness(matches);
  const divisionBacklog = pendingCountBy(matches, (match) => match.division_id);
  const teamBacklog = teamPendingCounts(matches);
  const divLineUse = {};

  matches
    .filter((match) => match.status === "playing")
    .forEach((match) => {
      const key = divisionLineKey(match);
      divLineUse[key] = (divLineUse[key] || 0) + 1;
    });

  const candidates = matches
    .filter((match) =>
      match.status === "pending" &&
      !localBusy.has(teamKey(match.home_team_id)) &&
      !localBusy.has(teamKey(match.away_team_id))
    )
    .map((match) => {
      const homeRest = lastPlayed[teamKey(match.home_team_id)] ? now - lastPlayed[teamKey(match.home_team_id)] : Number.MAX_SAFE_INTEGER;
      const awayRest = lastPlayed[teamKey(match.away_team_id)] ? now - lastPlayed[teamKey(match.away_team_id)] : Number.MAX_SAFE_INTEGER;
      const minRest = Math.min(homeRest, awayRest);
      const group = fairness[divisionLineKey(match)] || { completed: 0, playing: 0, total: 1 };
      const progress = (group.completed + group.playing) / Math.max(1, group.total);
      const divisionPending = divisionBacklog[teamKey(match.division_id)] || 0;
      const teamPending = Math.max(
        teamBacklog[teamKey(match.home_team_id)] || 0,
        teamBacklog[teamKey(match.away_team_id)] || 0
      );

      return {
        ...match,
        _restOk: minRest >= minimumRest,
        _minRest: minRest,
        _progress: progress,
        _divisionPending: divisionPending,
        _divisionCourtLoad: localDivisionLoad[teamKey(match.division_id)] || 0,
        _teamPending: teamPending,
        _divLineLoad: divLineUse[divisionLineKey(match)] || 0,
        _wait: now - new Date(match.queue_entered_at || match.created_at || now).getTime(),
      };
    });

  const pool = candidates.some((match) => match._restOk)
    ? candidates.filter((match) => match._restOk)
    : candidates;

  pool.sort((a, b) =>
    a._divisionCourtLoad - b._divisionCourtLoad ||
    a._progress - b._progress ||
    a._divLineLoad - b._divLineLoad ||
    b._minRest - a._minRest ||
    b._divisionPending - a._divisionPending ||
    b._teamPending - a._teamPending ||
    b._wait - a._wait ||
    String(a.division?.name || "").localeCompare(String(b.division?.name || "")) ||
    Number(a.line_number || 1) - Number(b.line_number || 1) ||
    Number(a.created_order || 0) - Number(b.created_order || 0)
  );

  return pool[0] || null;
}

function lastPlayedByTeam(matches) {
  const last = {};

  matches
    .filter((match) => match.status === "done" || match.status === "playing")
    .forEach((match) => {
      const timestamp = new Date(match.completed_at || match.assigned_at || 0).getTime();
      [match.home_team_id, match.away_team_id].filter(Boolean).forEach((teamId) => {
        const key = teamKey(teamId);
        last[key] = Math.max(last[key] || 0, timestamp);
      });
    });

  return last;
}

function divisionLineFairness(matches) {
  return matches.reduce((stats, match) => {
    const key = divisionLineKey(match);
    stats[key] ||= { completed: 0, playing: 0, pending: 0, total: 0 };
    stats[key].total += 1;
    if (match.status === "done") stats[key].completed += 1;
    if (match.status === "playing") stats[key].playing += 1;
    if (match.status === "pending") stats[key].pending += 1;
    return stats;
  }, {});
}

function pendingCountBy(matches, keyFn) {
  return matches.reduce((counts, match) => {
    if (match.status !== "pending") return counts;
    const key = teamKey(keyFn(match));
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function teamPendingCounts(matches) {
  return matches.reduce((counts, match) => {
    if (match.status !== "pending") return counts;
    [match.home_team_id, match.away_team_id].filter(Boolean).forEach((teamId) => {
      const key = teamKey(teamId);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, {});
}

async function assignMatchToCourt(supabase, tournamentId, matchId, courtId, assignedAt) {
  const { error: matchError } = await supabase
    .from("tournament_matches")
    .update({
      status: "playing",
      court_id: courtId,
      assigned_at: assignedAt,
      updated_at: assignedAt,
    })
    .eq("id", matchId)
    .eq("tournament_id", tournamentId);
  if (matchError) throw matchError;

  const { error: courtError } = await supabase
    .from("tournament_courts")
    .update({
      current_match_id: matchId,
      updated_at: assignedAt,
    })
    .eq("id", courtId)
    .eq("tournament_id", tournamentId);
  if (courtError) throw courtError;
}

async function clearCourt(supabase, courtId) {
  const { error } = await supabase
    .from("tournament_courts")
    .update({
      current_match_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courtId);
  if (error) throw error;
}

async function addLog(supabase, tournamentId, logType, message, metadata = {}) {
  const { error } = await supabase.from("tournament_activity_log").insert({
    tournament_id: tournamentId,
    log_type: logType,
    message,
    metadata,
  });
  if (error) throw error;
}

function phonesForMatch(contactsByTeam, match) {
  return [
    ...(contactsByTeam[String(match.home_team_id)] || []),
    ...(contactsByTeam[String(match.away_team_id)] || []),
  ]
    .map((contact) => contact.phone)
    .filter(Boolean);
}

function uniquePhones(contacts) {
  return [...new Set(
    (contacts || [])
      .map((contact) => contact.phone)
      .filter(Boolean)
  )];
}

function smsTemplates(tournament) {
  const saved = tournament.settings?.smsTemplates || {};
  return {
    courtReady: saved.courtReady || DEFAULT_SMS_TEMPLATES.courtReady,
    result: saved.result || DEFAULT_SMS_TEMPLATES.result,
    broadcast: saved.broadcast || DEFAULT_SMS_TEMPLATES.broadcast,
  };
}

function renderSmsTemplate(template, values) {
  return String(template || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    return values[key] ?? "";
  });
}

function templateValues(tournament, match) {
  return {
    tournament: tournament.name || "Tournament",
    court: match.court?.name || "",
    division: match.division?.name || "Division",
    line: `Line ${match.line_number || 1}`,
    home: match.home_team?.name || "Home",
    away: match.away_team?.name || "Away",
    result: match.score_text || `${match.home_score ?? ""}-${match.away_score ?? ""}`,
    status: tournamentStatusText([match]),
  };
}

function tournamentStatusText(matches) {
  const total = (matches || []).length;
  const completed = (matches || []).filter((match) => match.status === "done").length;
  const playing = (matches || []).filter((match) => match.status === "playing").length;
  const queued = (matches || []).filter((match) => match.status === "pending").length;
  return `${completed}/${total} complete, ${playing} on court, ${queued} in queue.`;
}

function matchLabel(match) {
  return `${match.division?.name || "Division"} Line ${match.line_number || 1} - ${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"}`;
}

function memberDisplayName(member = {}) {
  return member.full_name || [member.first_name, member.last_name].filter(Boolean).join(" ") || member.email || "Member";
}

function divisionLineKey(match) {
  return `${match.division_id || ""}|${Number(match.line_number || 1)}`;
}

function teamKey(teamId) {
  return String(teamId || "");
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveIntegerOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function tournamentScoreSettings(settings = {}) {
  const numberOfGames = positiveIntegerOrDefault(settings.numberOfGames, legacyNumberOfGames(settings.matchFormat));
  return {
    numberOfGames,
    gamesNeededToWin: Math.floor(numberOfGames / 2) + 1,
    gamesPlayedTo: positiveIntegerOrDefault(settings.gamesPlayedTo, 11),
    winBy: positiveIntegerOrDefault(settings.winBy, 2),
    rallyScoring: settings.rallyScoring === true,
  };
}

function legacyNumberOfGames(matchFormat) {
  const value = String(matchFormat || "");
  if (/best\s*2\s*(of|out of)\s*3/i.test(value)) return 3;
  const numberMatch = value.match(/\d+/);
  return numberMatch ? Number(numberMatch[0]) : 1;
}

function validateTournamentScore(homeScore, awayScore, settings = {}) {
  if (homeScore === null || awayScore === null) throw new Error("Enter both team scores.");

  const home = Number(homeScore);
  const away = Number(awayScore);
  if (!Number.isFinite(home) || !Number.isFinite(away)) throw new Error("Enter valid numeric scores.");
  if (home < 0 || away < 0) throw new Error("Scores cannot be negative.");
  if (home === away) throw new Error("Completed matches cannot end in a tie.");

  const scoreSettings = tournamentScoreSettings(settings);
  const winner = Math.max(home, away);
  const loser = Math.min(home, away);
  if (winner < scoreSettings.gamesPlayedTo) {
    throw new Error(`Winning score must be at least ${scoreSettings.gamesPlayedTo}.`);
  }
  if (scoreSettings.winBy <= 1 && winner > scoreSettings.gamesPlayedTo) {
    throw new Error(`Winning score cannot be more than ${scoreSettings.gamesPlayedTo} when Win By is 1.`);
  }
  if (winner - loser < scoreSettings.winBy) {
    throw new Error(`Winning margin must be at least ${scoreSettings.winBy}.`);
  }
}

function validateTournamentMatchScore(gameScores, settings = {}) {
  const scoreSettings = tournamentScoreSettings(settings);
  const sourceGames = Array.isArray(gameScores) ? gameScores : [];
  let homeWins = 0;
  let awayWins = 0;
  let homePoints = 0;
  let awayPoints = 0;
  const completedGames = [];

  for (let index = 0; index < scoreSettings.numberOfGames; index += 1) {
    if (homeWins >= scoreSettings.gamesNeededToWin || awayWins >= scoreSettings.gamesNeededToWin) break;

    const game = sourceGames[index] || {};
    const homeScore = numberOrNull(game.home);
    const awayScore = numberOrNull(game.away);
    validateTournamentScore(homeScore, awayScore, scoreSettings);

    homePoints += homeScore;
    awayPoints += awayScore;
    if (homeScore > awayScore) homeWins += 1;
    if (awayScore > homeScore) awayWins += 1;
    completedGames.push({ home: homeScore, away: awayScore });
  }

  if (homeWins < scoreSettings.gamesNeededToWin && awayWins < scoreSettings.gamesNeededToWin) {
    throw new Error(`Enter enough game scores for one team to win ${scoreSettings.gamesNeededToWin} game${scoreSettings.gamesNeededToWin === 1 ? "" : "s"}.`);
  }

  return {
    homeWins,
    awayWins,
    homePoints,
    awayPoints,
    winner: homeWins > awayWins ? "home" : "away",
    gameScores: completedGames,
  };
}

function booleanOrDefault(value, fallback) {
  return value === true || value === false ? value : Boolean(fallback);
}

function standingsRulesValue(value) {
  const allowed = new Set(["wins", "point_differential", "points_for", "points_against", "losses", "regular_season_standing"]);
  const rules = (Array.isArray(value) ? value : []).filter((rule) => allowed.has(rule));
  return [...rules, "wins", "point_differential", "points_for", "regular_season_standing"].slice(0, 4);
}

function parseCourtNames(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];

  const rangeMatch = raw.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    return Array.from({ length: high - low + 1 }, (_, index) => String(low + index));
  }

  return [...new Set(
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  )];
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}
