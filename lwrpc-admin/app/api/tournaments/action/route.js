import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSmsMessages } from "../../../lib/notifications";
import { formatPhoneNumberForStorage } from "../../../lib/phone";

export const runtime = "nodejs";

const DEFAULT_SMS_TEMPLATES = {
  checkIn: "LWR PC Tournament Check-In\nHi {player}, please check in at the tournament desk for {team} in {division}.\n\n{tournament}",
  courtReady: "You're up! You are on Court {court}.\n\nPlease stop by the Desk to grab your basket and ball. Once you've finished your game, fill out the scoresheet and return the basket and ball.\nHave a great match!\n\n{division} {line}\n{home} vs {away}",
  returnToQueue: "Tournament update: your game is not ready to play yet. Please do not go to Court {court}. We will text you again when your game is ready.\n\n{division} {line}\n{home} vs {away}",
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
      const result = await returnToQueue(supabase, tournament, body.matchId, body.smsEnabled);
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

    if (action === "sendCheckInText") {
      const result = await sendCheckInText(supabase, tournament, body);
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

    if (action === "resetTournamentSystem") {
      const result = await resetTournamentSystem(supabase, tournament);
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

    if (action === "generateEliminationBracket") {
      const result = await generateEliminationBracket(supabase, tournament, body.divisionIds);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "generateTop4Playoff") {
      const result = await generateTop4Playoff(supabase, tournament, body.divisionIds);
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

  const bracketGameNumbers = bracketDisplayNumbersById(state.matches);

  return {
    assigned: assignments.length,
    assignments: assignments.map((assignment) => ({
      court: assignment.court.name || "",
      homeTeam: assignment.match.home_team?.name || "Home",
      awayTeam: assignment.match.away_team?.name || "Away",
      division: assignment.match.division?.name || "Division",
      line: assignment.match.line_number || 1,
      lineLabel: autoAssignLineLabel(assignment.match, bracketGameNumbers),
    })),
    sms,
  };
}

async function returnToQueue(supabase, tournament, matchId, smsEnabled = false) {
  if (!matchId) throw new Error("Match is required.");

  const state = await loadActionState(supabase, tournament.id);
  const match = state.matches.find((item) => String(item.id) === String(matchId));
  if (!match) throw new Error("Match not found.");

  const now = new Date().toISOString();
  const sms = smsEnabled
    ? await sendReturnToQueueText(supabase, tournament, state.contactsByTeam, match)
    : { sent: 0, skipped: true, reason: "SMS disabled", results: [] };

  const { error } = await supabase
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
  if (error) throw error;

  if (match.court_id) {
    await clearCourt(supabase, match.court_id);
  }

  await addLog(supabase, tournament.id, "match", `Returned to queue: ${matchLabel(match)}`);
  return { returned: true, sms };
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
  if (resultType !== "not_played" && winnerTeamId) {
    await advanceBracketMatch(supabase, tournament, completedMatch);
  }
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

async function sendReturnToQueueText(supabase, tournament, contactsByTeam, match) {
  const phones = phonesForMatch(contactsByTeam, match);
  const templates = smsTemplates(tournament);
  const message = renderSmsTemplate(templates.returnToQueue, templateValues(tournament, match));
  const sms = await sendSmsMessages({ phones, body: message });

  await addLog(
    supabase,
    tournament.id,
    "sms",
    `Return-to-queue text sent to ${sms.sent || 0} recipient${Number(sms.sent || 0) === 1 ? "" : "s"}: ${matchLabel(match)}`
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

async function sendCheckInText(supabase, tournament, body = {}) {
  const cleanPhone = formatPhoneNumberForStorage(body.phone);
  const teamId = String(body.teamId || "").trim();
  const slot = Number(body.slot || 0);
  if (!cleanPhone) throw new Error("Enter the player phone number.");
  if (!teamId) throw new Error("Team is required.");

  const { data: team, error: teamError } = await supabase
    .from("tournament_teams")
    .select(`
      id,
      name,
      player_1_name,
      player_2_name,
      division:tournament_divisions(name)
    `)
    .eq("id", teamId)
    .eq("tournament_id", tournament.id)
    .single();
  if (teamError) throw teamError;

  const playerName = String(body.playerName || "").trim() ||
    (slot === 2 ? team.player_2_name : team.player_1_name) ||
    "Player";
  const templates = smsTemplates(tournament);
  const message = renderSmsTemplate(templates.checkIn, {
    tournament: tournament.name || "Tournament",
    player: playerName,
    team: team.name || "Team",
    division: team.division?.name || "Division",
    status: tournamentStatusText([]),
  });
  const sms = await sendSmsMessages({ phones: [cleanPhone], body: message });

  await addLog(
    supabase,
    tournament.id,
    "sms",
    `Check-In SMS sent to ${playerName} at ${cleanPhone}.`,
    { teamId, playerSlot: slot || null, playerName, phone: cleanPhone }
  );
  return { sms, playerName };
}

async function updatePlayerPhone(supabase, tournament, body) {
  const teamId = String(body.teamId || "").trim();
  const slot = Number(body.slot || 0);
  const cleanPhone = formatPhoneNumberForStorage(body.phone);

  if (!teamId || ![1, 2].includes(slot)) throw new Error("Team and player are required.");
  if (!cleanPhone) throw new Error("Enter the phone number.");

  const { data: team, error: teamError } = await supabase
    .from("tournament_teams")
    .select(`
      id,
      name,
      player_1_name,
      player_2_name,
      division:tournament_divisions(name)
    `)
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
    sourceTeamId: "",
    teamName: team.name,
    divisionName: team.division?.name,
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
      .select("id, name, seed")
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
    format: tournamentFormatValue(body.format || tournament.settings?.format),
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
    Object.prototype.hasOwnProperty.call(body, "divisionId") ||
    Object.prototype.hasOwnProperty.call(body, "regularSeasonStanding") ||
    Object.prototype.hasOwnProperty.call(body, "player1Name") ||
    Object.prototype.hasOwnProperty.call(body, "player2Name");
  const isElimination = isBracketTeamTournament(tournament.settings);
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
    const standing = Number(body.regularSeasonStanding);
    if (!String(body.regularSeasonStanding || "").trim() || !Number.isFinite(standing) || standing < 1) {
      throw new Error(isElimination ? "Standings is required." : "Regular Season Standing is required.");
    }

    const divisionId = String(body.divisionId || existing.division_id || "").trim();
    if (!divisionId) throw new Error("Select the tournament division.");

    const { data: division, error: divisionError } = await supabase
      .from("tournament_divisions")
      .select("id, name, is_active")
      .eq("id", divisionId)
      .eq("tournament_id", tournament.id)
      .single();
    if (divisionError) throw divisionError;
    if (division.is_active === false) throw new Error("Select an active tournament division.");

    payload.name = String(body.name || existing.name || "").trim() || existing.name;
    payload.division_id = division.id;
    payload.line_number = isElimination ? 1 : Number(body.lineNumber || existing.line_number || 1);
    payload.seed = String(standing);
    payload.player_1_name = String(body.player1Name || "").trim() || null;
    payload.player_2_name = String(body.player2Name || "").trim() || null;

    const { data: sameLineTeams, error: duplicateError } = await supabase
      .from("tournament_teams")
      .select("id, name")
      .eq("tournament_id", tournament.id)
      .eq(isElimination ? "division_id" : "line_number", isElimination ? payload.division_id : payload.line_number);
    if (duplicateError) throw duplicateError;

    const duplicate = (sameLineTeams || []).some((team) =>
      String(team.id) !== String(teamId) &&
      normalizeName(team.name) === normalizeName(payload.name)
    );
    if (duplicate) {
      const error = new Error(isElimination ? "A tournament team already exists with this Team Name in that Division." : "A tournament team already exists with this Team Name and Line #.");
      error.status = 400;
      throw error;
    }

    if (isElimination) {
      await verifyTournamentDivisionTeamMax(supabase, tournament, payload.division_id, body.player1Rating, body.player2Rating);
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
  if (isBracketTeamTournament(tournament.settings)) {
    return createEliminationTournamentTeam(supabase, tournament, body);
  }

  return createRoundRobinTournamentTeam(supabase, tournament, body);
}

async function createRoundRobinTournamentTeam(supabase, tournament, body) {
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

async function createEliminationTournamentTeam(supabase, tournament, body) {
  const divisionId = String(body.divisionId || "").trim();
  const player1MemberId = String(body.player1MemberId || "").trim();
  const player2MemberId = String(body.player2MemberId || "").trim();
  const player1Name = String(body.player1Name || "").trim();
  const player2Name = String(body.player2Name || "").trim();
  const name = String(body.name || eliminationTeamName(player1Name, player2Name)).trim();
  const standing = Number(body.regularSeasonStanding);

  if (!divisionId) throw new Error("Select the tournament division.");
  if (!name) throw new Error("Team name is required.");
  if (!String(body.regularSeasonStanding || "").trim() || !Number.isFinite(standing) || standing < 1) throw new Error("Standings is required.");
  if (!player1MemberId || !player2MemberId) throw new Error("Both players must be selected.");
  if (player1MemberId === player2MemberId) throw new Error("The same player cannot be entered twice on the same team.");

  const { data: division, error: divisionError } = await supabase
    .from("tournament_divisions")
    .select("id, name, is_active")
    .eq("id", divisionId)
    .eq("tournament_id", tournament.id)
    .single();
  if (divisionError) throw divisionError;
  if (division.is_active === false) throw new Error("Select an active tournament division.");

  await verifyTournamentDivisionTeamMax(supabase, tournament, division.id, body.player1Rating, body.player2Rating);

  const { data: tournamentTeams, error: teamsError } = await supabase
    .from("tournament_teams")
    .select("id, name, division_id")
    .eq("tournament_id", tournament.id);
  if (teamsError) throw teamsError;

  const duplicateName = (tournamentTeams || []).some((team) =>
    String(team.division_id || "") === divisionId &&
    normalizeName(team.name) === normalizeName(name)
  );
  if (duplicateName) {
    const error = new Error("A tournament team already exists with this Team Name in that Division.");
    error.status = 400;
    throw error;
  }

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
      line_number: 1,
      seed: String(standing),
      player_1_name: player1Name || null,
      player_2_name: player2Name || null,
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
    displayName: player1Name,
    phone: body.player1Phone,
  });
  await upsertTournamentContact(supabase, createdTeam.id, 2, {
    memberId: player2MemberId,
    displayName: player2Name,
    phone: body.player2Phone,
  });

  await addLog(supabase, tournament.id, "team", `${name} added to ${division.name}.`);
  return { created: true, teamId: createdTeam.id };
}

async function verifyTournamentDivisionTeamMax(supabase, tournament, tournamentDivisionId, player1Rating, player2Rating) {
  const divisionId = String(tournamentDivisionId || "").trim();
  if (!divisionId) throw new Error("Select the tournament division.");

  const { data: tournamentDivision, error: tournamentDivisionError } = await supabase
    .from("tournament_divisions")
    .select("id, name")
    .eq("id", divisionId)
    .eq("tournament_id", tournament.id)
    .single();
  if (tournamentDivisionError) throw tournamentDivisionError;

  const { data: leagueDivisions, error: leagueDivisionError } = await supabase
    .from("divisions")
    .select("name, team_dupr_max");
  if (leagueDivisionError) throw leagueDivisionError;

  const leagueDivision = (leagueDivisions || []).find((division) =>
    normalizeName(division.name) === normalizeName(tournamentDivision.name)
  );
  const maxRating = Number(leagueDivision?.team_dupr_max);
  if (!Number.isFinite(maxRating) || maxRating <= 0) return;

  const ratings = [Number(player1Rating), Number(player2Rating)].filter((rating) => Number.isFinite(rating));
  const teamTotalRating = ratings.reduce((sum, rating) => sum + rating, 0);
  if (ratings.length > 0 && teamTotalRating > maxRating) {
    throw new Error("The players' total rating must be at or below the Division Team Max.");
  }
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

  const playerName = normalizeName(details.playerName);
  if (!playerName) return null;

  const sourceTeamIds = await resolveTournamentSourceTeamIds(supabase, details);
  if (sourceTeamIds.length === 0) return null;

  const { data: rosterRows, error: rosterError } = await supabase
    .from("team_members")
    .select(`
      member_id,
      members (
        id,
        full_name,
        first_name,
        last_name,
        email,
        phone
      )
    `)
    .in("team_id", sourceTeamIds);
  if (rosterError) throw rosterError;

  const matches = (rosterRows || [])
    .map((row) => row.members)
    .filter(Boolean)
    .filter((member) => normalizeName(memberDisplayName(member)) === playerName);
  const uniqueMatches = [...new Map(matches.map((member) => [String(member.id), member])).values()];

  return uniqueMatches.length === 1 ? uniqueMatches[0] : null;
}

async function resolveTournamentSourceTeamIds(supabase, details) {
  const explicitSourceTeamId = String(details.sourceTeamId || "").trim();
  if (explicitSourceTeamId) return [explicitSourceTeamId];

  const teamName = String(details.teamName || "").trim();
  if (!teamName) return [];

  const { data: teams, error } = await supabase
    .from("teams")
    .select(`
      id,
      name,
      divisions (
        name
      )
    `)
    .ilike("name", teamName)
    .or("is_active.eq.true,is_active.is.null");
  if (error) throw error;

  const normalizedTeamName = normalizeName(teamName);
  const normalizedDivisionName = normalizeName(details.divisionName);
  const exactTeams = (teams || []).filter((team) => normalizeName(team.name) === normalizedTeamName);
  const divisionMatches = normalizedDivisionName
    ? exactTeams.filter((team) => normalizeName(team.divisions?.name) === normalizedDivisionName)
    : exactTeams;

  const candidates = divisionMatches.length > 0 ? divisionMatches : exactTeams;
  return candidates.length === 1 ? [candidates[0].id] : [];
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

async function resetTournamentSystem(supabase, tournament) {
  const now = new Date().toISOString();
  const { data: teams, error: teamsError } = await supabase
    .from("tournament_teams")
    .select("id")
    .eq("tournament_id", tournament.id);
  if (teamsError) throw teamsError;

  const teamIds = (teams || []).map((team) => team.id).filter(Boolean);
  const [
    matchCount,
    teamCount,
    divisionCount,
    contactCount,
    logCount,
  ] = await Promise.all([
    countTournamentRows(supabase, "tournament_matches", tournament.id),
    countTournamentRows(supabase, "tournament_teams", tournament.id),
    countTournamentRows(supabase, "tournament_divisions", tournament.id),
    countTournamentContacts(supabase, teamIds),
    countTournamentRows(supabase, "tournament_activity_log", tournament.id),
  ]);

  const { error: courtResetError } = await supabase
    .from("tournament_courts")
    .update({ current_match_id: null, updated_at: now })
    .eq("tournament_id", tournament.id);
  if (courtResetError) throw courtResetError;

  const { error: matchDeleteError } = await supabase
    .from("tournament_matches")
    .delete()
    .eq("tournament_id", tournament.id);
  if (matchDeleteError) throw matchDeleteError;

  if (teamIds.length > 0) {
    const { error: contactDeleteError } = await supabase
      .from("tournament_team_contacts")
      .delete()
      .in("tournament_team_id", teamIds);
    if (contactDeleteError) throw contactDeleteError;
  }

  const { error: teamDeleteError } = await supabase
    .from("tournament_teams")
    .delete()
    .eq("tournament_id", tournament.id);
  if (teamDeleteError) throw teamDeleteError;

  const { error: divisionDeleteError } = await supabase
    .from("tournament_divisions")
    .delete()
    .eq("tournament_id", tournament.id);
  if (divisionDeleteError) throw divisionDeleteError;

  const { error: logDeleteError } = await supabase
    .from("tournament_activity_log")
    .delete()
    .eq("tournament_id", tournament.id);
  if (logDeleteError) throw logDeleteError;

  const { error: tournamentUpdateError } = await supabase
    .from("tournaments")
    .update({ updated_at: now })
    .eq("id", tournament.id);
  if (tournamentUpdateError) throw tournamentUpdateError;

  return {
    reset: true,
    deleted: {
      matches: matchCount,
      teams: teamCount,
      divisions: divisionCount,
      contacts: contactCount,
      logs: logCount,
    },
  };
}

async function countTournamentRows(supabase, table, tournamentId) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);
  if (error) throw error;
  return Number(count || 0);
}

async function countTournamentContacts(supabase, teamIds) {
  if (!teamIds.length) return 0;
  const { count, error } = await supabase
    .from("tournament_team_contacts")
    .select("id", { count: "exact", head: true })
    .in("tournament_team_id", teamIds);
  if (error) throw error;
  return Number(count || 0);
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

async function generateEliminationBracket(supabase, tournament, divisionIds) {
  const selectedIds = new Set((Array.isArray(divisionIds) ? divisionIds : []).map(String).filter(Boolean));
  if (selectedIds.size === 0) throw new Error("Select at least one active division.");

  const format = tournamentFormatValue(tournament.settings?.format);
  if (format !== "single_elimination" && format !== "double_elimination") throw new Error("Set the Tournament Format to Single or Double Elimination first.");

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

  const invalidDivision = divisions.find((division) =>
    (teamResult.data || []).filter((team) => String(team.division_id || "") === String(division.id)).length < 2
  );
  if (invalidDivision) throw new Error(`${invalidDivision.name} needs at least 2 teams for an elimination bracket.`);

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
    const divisionTeams = (teamResult.data || [])
      .filter((team) => String(team.division_id || "") === String(division.id))
      .sort(compareBracketSeed);
    const generated = buildEliminationBracketRows(tournament.id, division.id, divisionTeams, format, now, order);
    rows.push(...generated.rows);
    order = generated.nextOrder;
  }

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("tournament_matches").insert(rows);
    if (insertError) throw insertError;
  }

  await addLog(supabase, tournament.id, "setup", `Generated ${rows.length} ${tournamentFormatLabel(format).toLowerCase()} bracket match${rows.length === 1 ? "" : "es"}.`);
  return { generated: rows.length, format };
}

async function generateTop4Playoff(supabase, tournament, divisionIds) {
  const selectedIds = new Set((Array.isArray(divisionIds) ? divisionIds : []).map(String).filter(Boolean));
  if (selectedIds.size === 0) throw new Error("Select at least one active division.");

  const format = tournamentFormatValue(tournament.settings?.format);
  if (format !== "round_robin_top4") throw new Error("Set the Tournament Format to Round Robin + Top 4 Playoff first.");

  const [divisionResult, teamResult, matchResult] = await Promise.all([
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
    supabase
      .from("tournament_matches")
      .select(`
        *,
        home_team:tournament_teams!tournament_matches_home_team_id_fkey(id, name, seed),
        away_team:tournament_teams!tournament_matches_away_team_id_fkey(id, name, seed),
        winner_team:tournament_teams!tournament_matches_winner_team_id_fkey(id, name)
      `)
      .eq("tournament_id", tournament.id)
      .order("created_order", { ascending: true }),
  ]);

  if (divisionResult.error) throw divisionResult.error;
  if (teamResult.error) throw teamResult.error;
  if (matchResult.error) throw matchResult.error;

  const divisions = (divisionResult.data || []).filter((division) => selectedIds.has(String(division.id)));
  if (divisions.length === 0) throw new Error("No active selected divisions were found.");

  const divisionIdList = divisions.map((division) => division.id);
  const existingBracketIds = (matchResult.data || [])
    .filter((match) => divisionIdList.map(String).includes(String(match.division_id)) && isBracketLegacyId(match.legacy_id))
    .map((match) => match.id);

  if (existingBracketIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("tournament_matches")
      .delete()
      .in("id", existingBracketIds);
    if (deleteError) throw deleteError;
  }

  const now = new Date().toISOString();
  const rows = [];
  let order = Math.max(...(matchResult.data || []).map((match) => Number(match.created_order || 0)), 0) + 1;

  for (const division of divisions) {
    const divisionTeams = (teamResult.data || [])
      .filter((team) => String(team.division_id || "") === String(division.id));
    if (divisionTeams.length < 4) throw new Error(`${division.name} needs at least 4 teams for the Top 4 Playoff.`);

    const roundRobinMatches = (matchResult.data || [])
      .filter((match) => String(match.division_id || "") === String(division.id))
      .filter((match) => !isBracketLegacyId(match.legacy_id));
    if (roundRobinMatches.length === 0) throw new Error(`${division.name} needs generated round robin matches before the Top 4 Playoff.`);
    const unfinished = roundRobinMatches.filter((match) => match.status !== "done" && match.status !== "not_played");
    if (unfinished.length > 0) throw new Error(`${division.name} still has ${unfinished.length} round robin match${unfinished.length === 1 ? "" : "es"} left to finish.`);

    const seeds = top4PlayoffSeeds(roundRobinMatches, divisionTeams, tournament.settings);
    if (seeds.length < 4) throw new Error(`${division.name} needs four ranked teams before generating the Top 4 Playoff.`);

    const generated = buildTop4PlayoffRows(tournament.id, division.id, seeds, now, order);
    rows.push(...generated.rows);
    order = generated.nextOrder;
  }

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("tournament_matches").insert(rows);
    if (insertError) throw insertError;
  }

  await addLog(supabase, tournament.id, "setup", `Generated ${rows.length} top 4 playoff match${rows.length === 1 ? "" : "es"}.`);
  return { generated: rows.length, format };
}

function top4PlayoffSeeds(matches, teams, settings = {}) {
  const rows = Object.fromEntries((teams || []).map((team) => [String(team.id), {
    team,
    w: 0,
    l: 0,
    pf: 0,
    pa: 0,
    regularSeasonStanding: regularSeasonStandingValue(team),
  }]));

  (matches || [])
    .filter((match) => match.status === "done" && match.result_type !== "not_played")
    .forEach((match) => {
      const homeId = String(match.home_team_id || "");
      const awayId = String(match.away_team_id || "");
      const home = rows[homeId];
      const away = rows[awayId];
      if (!home || !away) return;

      const homeScore = Number(match.home_score || 0);
      const awayScore = Number(match.away_score || 0);
      home.pf += homeScore;
      home.pa += awayScore;
      away.pf += awayScore;
      away.pa += homeScore;

      const winnerId = String(match.winner_team_id || "");
      if (winnerId === homeId || (!winnerId && homeScore > awayScore)) {
        home.w += 1;
        away.l += 1;
      } else if (winnerId === awayId || (!winnerId && awayScore > homeScore)) {
        away.w += 1;
        home.l += 1;
      }
    });

  return Object.values(rows)
    .sort((a, b) => compareTop4SeedRows(a, b, settings?.standingsRules))
    .slice(0, 4)
    .map((row, index) => ({ ...row.team, playoffSeed: index + 1 }));
}

function compareTop4SeedRows(a, b, rules = []) {
  const normalizedRules = standingsRulesValue(rules);

  for (const rule of normalizedRules) {
    if (rule === "regular_season_standing") {
      const aStanding = Number(a.regularSeasonStanding || Number.MAX_SAFE_INTEGER);
      const bStanding = Number(b.regularSeasonStanding || Number.MAX_SAFE_INTEGER);
      if (aStanding !== bStanding) return aStanding - bStanding;
    } else if (rule === "losses") {
      if (Number(a.l || 0) !== Number(b.l || 0)) return Number(a.l || 0) - Number(b.l || 0);
    } else if (rule === "point_differential") {
      const aDiff = Number(a.pf || 0) - Number(a.pa || 0);
      const bDiff = Number(b.pf || 0) - Number(b.pa || 0);
      if (aDiff !== bDiff) return bDiff - aDiff;
    } else if (rule === "points_for") {
      if (Number(a.pf || 0) !== Number(b.pf || 0)) return Number(b.pf || 0) - Number(a.pf || 0);
    } else if (rule === "points_against") {
      if (Number(a.pa || 0) !== Number(b.pa || 0)) return Number(a.pa || 0) - Number(b.pa || 0);
    } else if (Number(a.w || 0) !== Number(b.w || 0)) {
      return Number(b.w || 0) - Number(a.w || 0);
    }
  }

  return String(a.team?.name || "").localeCompare(String(b.team?.name || ""));
}

function buildTop4PlayoffRows(tournamentId, divisionId, seeds, now, startOrder) {
  const rowsByKey = {};
  const rows = [];
  const homeAwayCounts = {};
  let order = startOrder;

  for (let matchNumber = 1; matchNumber <= 2; matchNumber += 1) {
    const row = bracketRow({
      tournamentId,
      divisionId,
      legacyId: bracketLegacyId("T4", divisionId, "W", 1, matchNumber),
      lineNumber: 1,
      order,
      now,
    });
    rowsByKey[row.legacy_id] = row;
    rows.push(row);
    order += 1;
  }

  const final = bracketRow({
    tournamentId,
    divisionId,
    legacyId: bracketLegacyId("T4", divisionId, "W", 2, 1),
    lineNumber: 1,
    order,
    now,
  });
  rowsByKey[final.legacy_id] = final;
  rows.push(final);
  order += 1;

  assignGeneratedMatchSides(rowsByKey[bracketLegacyId("T4", divisionId, "W", 1, 1)], seeds[0], seeds[3], homeAwayCounts);
  assignGeneratedMatchSides(rowsByKey[bracketLegacyId("T4", divisionId, "W", 1, 2)], seeds[1], seeds[2], homeAwayCounts);

  return { rows, nextOrder: order };
}

function buildEliminationBracketRows(tournamentId, divisionId, teams, format, now, startOrder) {
  const winnerRoundCounts = winnerRoundMatchCounts(teams.length);
  const rounds = winnerRoundCounts.length;
  const code = format === "double_elimination" ? "DE" : "SE";
  const rowsByKey = {};
  const rows = [];
  let order = startOrder;

  for (let round = 1; round <= rounds; round += 1) {
    const matchCount = winnerRoundCounts[round - 1];
    for (let matchNumber = 1; matchNumber <= matchCount; matchNumber += 1) {
      const row = bracketRow({
        tournamentId,
        divisionId,
        legacyId: bracketLegacyId(code, divisionId, "W", round, matchNumber),
        lineNumber: 1,
        order,
        now,
      });
      rowsByKey[row.legacy_id] = row;
      rows.push(row);
      order += 1;
    }
  }

  seedWinnersBracketRows(rowsByKey, code, divisionId, teams, winnerRoundCounts);

  if (format === "double_elimination") {
    const loserRoundCounts = loserRoundMatchCounts(teams.length);
    for (let round = 1; round <= loserRoundCounts.length; round += 1) {
      const matchCount = loserRoundCounts[round - 1];
      for (let matchNumber = 1; matchNumber <= matchCount; matchNumber += 1) {
        rows.push(bracketRow({
          tournamentId,
          divisionId,
          legacyId: bracketLegacyId(code, divisionId, "L", round, matchNumber),
          lineNumber: 1,
          order,
          now,
        }));
        order += 1;
      }
    }

    rows.push(bracketRow({
      tournamentId,
      divisionId,
      legacyId: bracketLegacyId(code, divisionId, "F", 1, 1),
      lineNumber: 1,
      order,
      now,
    }));
    order += 1;

    rows.push(bracketRow({
      tournamentId,
      divisionId,
      legacyId: bracketLegacyId(code, divisionId, "F", 2, 1),
      lineNumber: 1,
      order,
      now,
    }));
    order += 1;
  }

  return { rows, nextOrder: order };
}

function seedWinnersBracketRows(rowsByKey, code, divisionId, teams, winnerRoundCounts) {
  const teamCount = teams.length;
  const firstRoundCount = winnerRoundCounts[0] || 0;
  const mainSize = highestPowerOfTwoAtMost(teamCount);
  const preliminaryCount = Math.max(0, teamCount - mainSize);
  const homeAwayCounts = {};

  if (preliminaryCount === 0) {
    for (let matchNumber = 1; matchNumber <= firstRoundCount; matchNumber += 1) {
      const row = rowsByKey[bracketLegacyId(code, divisionId, "W", 1, matchNumber)];
      assignGeneratedMatchSides(row, teams[matchNumber - 1], teams[teamCount - matchNumber], homeAwayCounts);
    }
    return;
  }

  const byeCount = mainSize - preliminaryCount;
  for (let matchNumber = 1; matchNumber <= preliminaryCount; matchNumber += 1) {
    const row = rowsByKey[bracketLegacyId(code, divisionId, "W", 1, matchNumber)];
    assignGeneratedMatchSides(row, teams[byeCount + matchNumber - 1], teams[teamCount - matchNumber], homeAwayCounts);
  }

  const roundTwoCount = winnerRoundCounts[1] || 0;
  const roundTwoSlots = winnerRoundSlots(roundTwoCount);
  const preliminarySlots = new Set(
    Array.from({ length: preliminaryCount }, (_, index) =>
      `${preliminaryWinnerSlot(index + 1, preliminaryCount, roundTwoCount).matchNumber}:${preliminaryWinnerSlot(index + 1, preliminaryCount, roundTwoCount).slot}`
    )
  );
  const byeSlots = roundTwoSlots.filter((slot) => !preliminarySlots.has(`${slot.matchNumber}:${slot.slot}`));

  for (let index = 0; index < byeCount; index += 1) {
    const slot = byeSlots[index];
    const row = rowsByKey[bracketLegacyId(code, divisionId, "W", 2, slot.matchNumber)];
    assignGeneratedTeamSlot(row, slot.slot, teams[index], homeAwayCounts);
  }
}

function assignGeneratedMatchSides(row, teamA, teamB, counts) {
  if (!row) return;
  if (teamA && teamB) {
    const pair = balancedHomeAwayPair(teamA, teamB, counts, row.created_order);
    row.home_team_id = pair.home.id;
    row.away_team_id = pair.away.id;
    incrementHomeAwayCount(counts, pair.home.id, "home_team_id");
    incrementHomeAwayCount(counts, pair.away.id, "away_team_id");
    return;
  }

  assignGeneratedTeamSlot(row, "home_team_id", teamA || teamB, counts);
}

function assignGeneratedTeamSlot(row, slot, team, counts) {
  if (!row || !slot || !team?.id) return;
  row[slot] = team.id;
  incrementHomeAwayCount(counts, team.id, slot);
}

function winnerRoundMatchCounts(teamCount) {
  const count = Math.max(2, Number(teamCount || 0));
  const mainSize = highestPowerOfTwoAtMost(count);
  const preliminaryCount = Math.max(0, count - mainSize);
  const counts = [];

  if (preliminaryCount > 0) counts.push(preliminaryCount);
  for (let matchCount = mainSize / 2; matchCount >= 1; matchCount = Math.floor(matchCount / 2)) {
    counts.push(matchCount);
  }

  return counts;
}

function loserRoundMatchCounts(teamCount) {
  const winnerCounts = winnerRoundMatchCounts(teamCount);
  if (winnerCounts.length <= 1) return [];

  const counts = [];
  const hasPreliminary = winnerCounts.length > 1 && winnerCounts[0] <= winnerCounts[1];
  let winnerRoundIndex = 0;
  let survivors = 0;

  if (hasPreliminary) {
    counts.push(Math.floor((winnerCounts[0] + winnerCounts[1]) / 2));
    survivors = Math.ceil((winnerCounts[0] + winnerCounts[1]) / 2);
    winnerRoundIndex = 2;
  } else {
    counts.push(Math.floor(winnerCounts[0] / 2));
    survivors = Math.ceil(winnerCounts[0] / 2);
    winnerRoundIndex = 1;
  }

  while (winnerRoundIndex < winnerCounts.length) {
    if (hasPreliminary) {
      const collapseMatches = Math.floor(survivors / 2);
      if (collapseMatches > 0) counts.push(collapseMatches);
      survivors = Math.ceil(survivors / 2);

      const incomingLosers = winnerCounts[winnerRoundIndex];
      const incomingMatches = Math.floor((survivors + incomingLosers) / 2);
      if (incomingMatches > 0) counts.push(incomingMatches);
      survivors = Math.ceil((survivors + incomingLosers) / 2);
    } else {
      const incomingLosers = winnerCounts[winnerRoundIndex];
      const incomingMatches = Math.floor((survivors + incomingLosers) / 2);
      if (incomingMatches > 0) counts.push(incomingMatches);
      survivors = Math.ceil((survivors + incomingLosers) / 2);

      if (winnerRoundIndex < winnerCounts.length - 1) {
        const collapseMatches = Math.floor(survivors / 2);
        if (collapseMatches > 0) counts.push(collapseMatches);
        survivors = Math.ceil(survivors / 2);
      }
    }
    winnerRoundIndex += 1;
  }

  return counts.filter((count) => count > 0);
}

function winnerRoundSlots(matchCount) {
  const slots = [];
  for (let matchNumber = 1; matchNumber <= Number(matchCount || 0); matchNumber += 1) {
    slots.push({ matchNumber, slot: "home_team_id" }, { matchNumber, slot: "away_team_id" });
  }
  return slots;
}

function preliminaryWinnerSlot(matchNumber, preliminaryCount, roundTwoCount) {
  const totalSlots = Number(roundTwoCount || 0) * 2;
  const startIndex = Math.max(0, totalSlots - Number(preliminaryCount || 0) * 2);
  const slotIndex = startIndex + (Number(matchNumber || 1) - 1) * 2 + 1;
  return {
    matchNumber: Math.floor(slotIndex / 2) + 1,
    slot: slotIndex % 2 === 0 ? "home_team_id" : "away_team_id",
  };
}

function bracketRow({ tournamentId, divisionId, legacyId, lineNumber, order, now }) {
  return {
    tournament_id: tournamentId,
    division_id: divisionId,
    legacy_id: legacyId,
    home_team_id: null,
    away_team_id: null,
    line_number: lineNumber,
    status: "pending",
    result_type: "completed",
    queue_entered_at: now,
    created_order: order,
    created_at: now,
    updated_at: now,
  };
}

async function advanceBracketMatch(supabase, tournament, match) {
  const meta = parseBracketLegacyId(match.legacy_id);
  if (!meta) return;

  const { data: matches, error } = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", tournament.id)
    .eq("division_id", match.division_id)
    .order("created_order", { ascending: true });
  if (error) throw error;

  const winnerTeamId = String(match.winner_team_id || "");
  const loserTeamId = loserTeamIdForMatch(match);
  const now = new Date().toISOString();

  if (meta.format === "single_elimination" || meta.format === "round_robin_top4") {
    await advanceTeamToNextBracketSlot(supabase, matches, meta, winnerTeamId, now);
    return;
  }

  if (meta.bracket === "W") {
    const advanced = await advanceTeamToNextBracketSlot(supabase, matches, meta, winnerTeamId, now);
    if (!advanced) {
      await placeTeamInFinalSlot(supabase, matches, winnerTeamId, now, "home_team_id");
    }
    if (loserTeamId) await placeTeamInNextOpenEliminationSlot(supabase, matches, meta, loserTeamId, now);
  } else if (meta.bracket === "L") {
    const advanced = await advanceTeamToNextBracketSlot(supabase, matches, meta, winnerTeamId, now);
    if (!advanced) {
      await placeTeamInFinalSlot(supabase, matches, winnerTeamId, now, "away_team_id");
    }
  } else if (meta.bracket === "F" && Number(meta.round || 0) === 1) {
    if (bracketLossCountBeforeMatch(matches, match, winnerTeamId) > 0) {
      await placeTeamsInFinalReset(supabase, tournament, matches, match, loserTeamId, winnerTeamId, now);
    }
  }
}

async function advanceTeamToNextBracketSlot(supabase, matches, meta, teamId, now) {
  const nextRound = Number(meta.round || 0) + 1;
  const roundCounts = bracketRoundCounts(matches, meta.bracket);
  const compactPreliminary = meta.bracket === "W" && roundCounts[Number(meta.round || 0)] === roundCounts[nextRound];
  const parallelLoserRound = meta.bracket === "L" && roundCounts[Number(meta.round || 0)] === roundCounts[nextRound];
  const preliminaryWithByes = meta.bracket === "W" && Number(meta.round || 0) === 1 && roundCounts[1] <= roundCounts[2];
  const preliminarySlot = preliminaryWithByes ? preliminaryWinnerSlot(Number(meta.match || 0), roundCounts[1], roundCounts[2]) : null;
  const nextMatchNumber = preliminarySlot?.matchNumber || (compactPreliminary || parallelLoserRound ? Number(meta.match || 0) : Math.ceil(Number(meta.match || 0) / 2));
  const target = (matches || []).find((item) => {
    const itemMeta = parseBracketLegacyId(item.legacy_id);
    return itemMeta &&
      itemMeta.bracket === meta.bracket &&
      Number(itemMeta.round) === nextRound &&
      Number(itemMeta.match) === nextMatchNumber;
  });
  if (!target && meta.bracket === "L") {
    return placeTeamInNextOpenLoserSlot(supabase, matches, nextRound + 1, teamId, now);
  }
  if (!target) return false;

  const preferredSlot = preliminarySlot?.slot || (compactPreliminary ? "away_team_id" : parallelLoserRound ? "home_team_id" : Number(meta.match || 0) % 2 === 1 ? "home_team_id" : "away_team_id");
  const slot = balancedOpenSlot(target, teamId, matches, preferredSlot);
  await placeTeamInMatchSlot(supabase, target, slot, teamId, now);
  return true;
}

async function placeTeamInNextOpenLoserSlot(supabase, matches, minimumRound, teamId, now) {
  const target = (matches || []).find((item) => {
    const itemMeta = parseBracketLegacyId(item.legacy_id);
    return itemMeta?.bracket === "L" &&
      Number(itemMeta.round || 0) >= Number(minimumRound || 1) &&
      String(item.home_team_id || "") !== String(teamId) &&
      String(item.away_team_id || "") !== String(teamId) &&
      (!item.home_team_id || !item.away_team_id);
  });
  if (!target) return false;

  const preferredSlot = target.home_team_id ? "away_team_id" : "home_team_id";
  const slot = balancedOpenSlot(target, teamId, matches, preferredSlot);
  await placeTeamInMatchSlot(supabase, target, slot, teamId, now);
  return true;
}

async function placeTeamInNextOpenEliminationSlot(supabase, matches, winnersMeta, teamId, now) {
  const preferredRound = loserRoundForWinnersLoser(matches, winnersMeta);
  const preferredMatchNumber = loserMatchForWinnersLoser(matches, winnersMeta, preferredRound);
  if (preferredMatchNumber) {
    const preferredTarget = (matches || []).find((item) => {
      const itemMeta = parseBracketLegacyId(item.legacy_id);
      return itemMeta?.bracket === "L" &&
        Number(itemMeta.round || 0) === preferredRound &&
        Number(itemMeta.match || 0) === preferredMatchNumber &&
        String(item.home_team_id || "") !== String(teamId) &&
        String(item.away_team_id || "") !== String(teamId) &&
        (!item.home_team_id || !item.away_team_id);
    });
    if (preferredTarget) {
      const preferredSlot = preferredTarget.away_team_id ? "home_team_id" : "away_team_id";
      const slot = balancedOpenSlot(preferredTarget, teamId, matches, preferredSlot);
      await placeTeamInMatchSlot(supabase, preferredTarget, slot, teamId, now);
      return true;
    }
  }

  const target = (matches || []).find((item) => {
    const itemMeta = parseBracketLegacyId(item.legacy_id);
    return itemMeta?.bracket === "L" &&
      Number(itemMeta.round || 0) >= preferredRound &&
      String(item.home_team_id || "") !== String(teamId) &&
      String(item.away_team_id || "") !== String(teamId) &&
      (!item.home_team_id || !item.away_team_id);
  });
  if (!target) return false;

  const preferredSlot = target.home_team_id ? "away_team_id" : "home_team_id";
  const slot = balancedOpenSlot(target, teamId, matches, preferredSlot);
  await placeTeamInMatchSlot(supabase, target, slot, teamId, now);
  return true;
}

function loserMatchForWinnersLoser(matches, winnersMeta, preferredRound) {
  const loserCounts = bracketRoundCounts(matches, "L");
  const winnerCounts = bracketRoundCounts(matches, "W");
  const targetCount = Number(loserCounts[preferredRound] || 0);
  const winnerRoundCount = Number(winnerCounts[Number(winnersMeta?.round || 0)] || 0);
  const winnerMatchNumber = Number(winnersMeta?.match || 0);

  if (targetCount <= 0 || winnerMatchNumber <= 0) return null;
  if (targetCount === 1) return 1;
  if (winnerRoundCount <= 1) return Math.min(targetCount, winnerMatchNumber);

  const zeroBased = (winnerMatchNumber - 1) % targetCount;
  return targetCount - zeroBased;
}

function loserRoundForWinnersLoser(matches, winnersMeta) {
  const winnerCounts = bracketRoundCounts(matches, "W");
  const round = Number(winnersMeta?.round || 1);
  const hasPreliminary = Number(winnerCounts[1] || 0) > 0 && Number(winnerCounts[1] || 0) <= Number(winnerCounts[2] || 0);

  if (hasPreliminary) {
    if (round <= 2) return 1;
    return (round - 2) * 2 + 1;
  }

  if (round <= 1) return 1;
  return (round - 1) * 2;
}

function bracketRoundCounts(matches, bracket) {
  return (matches || []).reduce((counts, match) => {
    const meta = parseBracketLegacyId(match.legacy_id);
    if (meta?.bracket !== bracket) return counts;
    const round = Number(meta.round || 0);
    counts[round] = (counts[round] || 0) + 1;
    return counts;
  }, {});
}

async function placeTeamInFinalSlot(supabase, matches, teamId, now, preferredSlot) {
  const target = (matches || []).find((item) => {
    const meta = parseBracketLegacyId(item.legacy_id);
    return meta?.bracket === "F" && Number(meta.round || 0) === 1;
  });
  if (!target) return false;
  const slot = balancedOpenSlot(target, teamId, matches, preferredSlot);
  await placeTeamInMatchSlot(supabase, target, slot, teamId, now);
  return true;
}

async function placeTeamsInFinalReset(supabase, tournament, matches, firstFinal, winnersBracketTeamId, eliminationBracketTeamId, now) {
  let target = (matches || []).find((item) => {
    const meta = parseBracketLegacyId(item.legacy_id);
    return meta?.bracket === "F" && Number(meta.round || 0) === 2;
  });
  if (!winnersBracketTeamId || !eliminationBracketTeamId) return false;

  if (!target) {
    const meta = parseBracketLegacyId(firstFinal?.legacy_id);
    const createdOrder = Math.max(...(matches || []).map((match) => Number(match.created_order || 0)), 0) + 1;
    const { data, error } = await supabase
      .from("tournament_matches")
      .insert(bracketRow({
        tournamentId: tournament.id,
        divisionId: firstFinal.division_id,
        legacyId: bracketLegacyId(meta?.format === "double_elimination" ? "DE" : "SE", firstFinal.division_id, "F", 2, 1),
        lineNumber: firstFinal.line_number || 1,
        order: createdOrder,
        now,
      }))
      .select("*")
      .single();
    if (error) throw error;
    target = data;
  }

  const counts = homeAwayCountsForMatches(matches, target.id);
  const pair = balancedHomeAwayPair(
    { id: winnersBracketTeamId },
    { id: eliminationBracketTeamId },
    counts,
    target.created_order
  );
  const payload = {
    home_team_id: pair.home.id,
    away_team_id: pair.away.id,
    queue_entered_at: target.queue_entered_at || now,
    updated_at: now,
  };

  const { error } = await supabase
    .from("tournament_matches")
    .update(payload)
    .eq("id", target.id);
  if (error) throw error;
  Object.assign(target, payload);
  return true;
}

async function placeTeamInMatchSlot(supabase, match, slot, teamId, now) {
  if (!match?.id || !slot || !teamId) return;
  const existing = String(match[slot] || "");
  if (existing === String(teamId)) return;
  if (existing && existing !== String(teamId)) return;

  const { error } = await supabase
    .from("tournament_matches")
    .update({
      [slot]: teamId,
      queue_entered_at: match.queue_entered_at || now,
      updated_at: now,
    })
    .eq("id", match.id);
  if (error) throw error;
  match[slot] = teamId;
  match.queue_entered_at = match.queue_entered_at || now;
  match.updated_at = now;
}

function balancedOpenSlot(match, teamId, matches, preferredSlot = "home_team_id") {
  if (!match || !teamId) return preferredSlot;
  const openSlots = ["home_team_id", "away_team_id"].filter((slot) =>
    !match[slot] || String(match[slot]) === String(teamId)
  );
  if (openSlots.length === 0) return preferredSlot;
  if (openSlots.length === 1) return openSlots[0];

  const counts = homeAwayCountsForMatches(matches, match.id);
  const current = counts[String(teamId)] || { home: 0, away: 0 };
  const homeScore = homeAwayImbalance(Number(current.home || 0) + 1, current.away);
  const awayScore = homeAwayImbalance(current.home, Number(current.away || 0) + 1);

  if (homeScore < awayScore) return "home_team_id";
  if (awayScore < homeScore) return "away_team_id";
  return openSlots.includes(preferredSlot) ? preferredSlot : openSlots[0];
}

function homeAwayCountsForMatches(matches, excludeMatchId = "") {
  return (matches || []).reduce((counts, match) => {
    if (excludeMatchId && String(match.id) === String(excludeMatchId)) return counts;
    incrementHomeAwayCount(counts, match.home_team_id, "home_team_id");
    incrementHomeAwayCount(counts, match.away_team_id, "away_team_id");
    return counts;
  }, {});
}

function incrementHomeAwayCount(counts, teamId, slot) {
  const key = String(teamId || "");
  if (!key) return;
  counts[key] ||= { home: 0, away: 0 };
  if (slot === "home_team_id") counts[key].home += 1;
  if (slot === "away_team_id") counts[key].away += 1;
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
  const candidates = matches
    .filter((match) =>
      match.status === "pending" &&
      match.home_team_id &&
      match.away_team_id &&
      !localBusy.has(teamKey(match.home_team_id)) &&
      !localBusy.has(teamKey(match.away_team_id))
    )
    .map((match) => {
      const homeRest = lastPlayed[teamKey(match.home_team_id)] ? now - lastPlayed[teamKey(match.home_team_id)] : Number.MAX_SAFE_INTEGER;
      const awayRest = lastPlayed[teamKey(match.away_team_id)] ? now - lastPlayed[teamKey(match.away_team_id)] : Number.MAX_SAFE_INTEGER;
      const minRest = Math.min(homeRest, awayRest);
      const neverPlayedCount = [match.home_team_id, match.away_team_id]
        .filter(Boolean)
        .filter((teamId) => !lastPlayed[teamKey(teamId)])
        .length;

      return {
        ...match,
        _restOk: minRest >= minimumRest,
        _minRest: minRest,
        _neverPlayedCount: neverPlayedCount,
        _wait: now - new Date(match.queue_entered_at || match.created_at || now).getTime(),
      };
    });

  const bracketCandidates = candidates.filter((match) => parseBracketLegacyId(match.legacy_id));
  if (isEliminationTournament(tournament.settings) || (isRoundRobinTop4Tournament(tournament.settings) && bracketCandidates.length > 0)) {
    return chooseNextEliminationMatch(bracketCandidates.length > 0 ? bracketCandidates : candidates, matches, localDivisionLoad);
  }

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

  const roundRobinCandidates = candidates.map((match) => {
    const group = fairness[divisionLineKey(match)] || { completed: 0, playing: 0, total: 1 };
    const divisionPending = divisionBacklog[teamKey(match.division_id)] || 0;
    const teamPending = Math.max(
      teamBacklog[teamKey(match.home_team_id)] || 0,
      teamBacklog[teamKey(match.away_team_id)] || 0
    );

    return {
      ...match,
      _progress: (group.completed + group.playing) / Math.max(1, group.total),
      _divisionPending: divisionPending,
      _divisionCourtLoad: localDivisionLoad[teamKey(match.division_id)] || 0,
      _teamPending: teamPending,
      _divLineLoad: divLineUse[divisionLineKey(match)] || 0,
    };
  });

  const pool = roundRobinCandidates.some((match) => match._restOk)
    ? roundRobinCandidates.filter((match) => match._restOk)
    : roundRobinCandidates;

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

function chooseNextEliminationMatch(candidates, allMatches, localDivisionLoad) {
  const readyByDivision = pendingCountBy(allMatches.filter((match) => match.home_team_id && match.away_team_id), (match) => match.division_id);
  const divisionProgress = divisionBracketProgress(allMatches);
  const bracketGameNumbers = bracketDisplayNumbersById(allMatches);
  const bracketRemaining = bracketRemainingPotentialByKey(allMatches);
  const enriched = candidates.map((match) => {
    const meta = parseBracketLegacyId(match.legacy_id);
    const bracketKey = divisionBracketKey(match.division_id, meta?.bracket);
    return {
      ...match,
      _bracketMeta: meta,
      _bracketPriority: eliminationBracketPriority(meta),
      _bracketGameNumber: bracketGameNumbers[String(match.id)] || Number.MAX_SAFE_INTEGER,
      _bracketRemainingPotential: bracketRemaining[bracketKey]?.score || 0,
      _divisionCourtLoad: localDivisionLoad[teamKey(match.division_id)] || 0,
      _divisionReadyPending: readyByDivision[teamKey(match.division_id)] || 0,
      _divisionProgress: divisionProgress[teamKey(match.division_id)] || 0,
    };
  });

  const pool = enriched;

  pool.sort((a, b) =>
    a._divisionCourtLoad - b._divisionCourtLoad ||
    b._neverPlayedCount - a._neverPlayedCount ||
    b._bracketRemainingPotential - a._bracketRemainingPotential ||
    a._bracketPriority - b._bracketPriority ||
    b._minRest - a._minRest ||
    String(a.division?.name || "").localeCompare(String(b.division?.name || "")) ||
    a._divisionProgress - b._divisionProgress ||
    b._divisionReadyPending - a._divisionReadyPending ||
    a._bracketGameNumber - b._bracketGameNumber ||
    b._wait - a._wait ||
    Number(a._bracketMeta?.round || 0) - Number(b._bracketMeta?.round || 0) ||
    Number(a.created_order || 0) - Number(b.created_order || 0)
  );

  return pool[0] || null;
}

function bracketRemainingPotentialByKey(matches) {
  const groups = (matches || [])
    .map((match) => ({ match, meta: parseBracketLegacyId(match.legacy_id) }))
    .filter((item) => item.meta)
    .reduce((map, item) => {
      const key = divisionBracketKey(item.match.division_id, item.meta.bracket);
      map[key] ||= { openMatches: 0, openRounds: new Set() };
      if (item.match.status !== "done" && item.match.status !== "not_played") {
        map[key].openMatches += 1;
        map[key].openRounds.add(Number(item.meta.round || 0));
      }
      return map;
    }, {});

  return Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [
      key,
      {
        openMatches: value.openMatches,
        openRounds: value.openRounds.size,
        score: value.openRounds.size * 100 + value.openMatches,
      },
    ])
  );
}

function divisionBracketKey(divisionId, bracket) {
  return `${teamKey(divisionId)}|${bracket || ""}`;
}

function bracketDisplayNumbersById(matches) {
  const byDivision = (matches || [])
    .map((match) => ({ match, meta: parseBracketLegacyId(match.legacy_id) }))
    .filter((item) => item.meta)
    .reduce((map, item) => {
      const key = teamKey(item.match.division_id);
      map[key] ||= [];
      map[key].push(item);
      return map;
    }, {});

  return Object.values(byDivision).reduce((numbers, items) => {
    const format = items.find((item) => item.meta?.format)?.meta?.format || "single_elimination";
    items
      .sort((a, b) =>
        bracketNumberSectionRoundForAssignment(a.meta, format) - bracketNumberSectionRoundForAssignment(b.meta, format) ||
        bracketSectionOrderForAssignment(a.meta?.bracket, format) - bracketSectionOrderForAssignment(b.meta?.bracket, format) ||
        Number(a.meta?.match || 0) - Number(b.meta?.match || 0) ||
        Number(a.match.created_order || 0) - Number(b.match.created_order || 0)
      )
      .forEach((item, index) => {
        numbers[String(item.match.id)] = index + 1;
      });
    return numbers;
  }, {});
}

function bracketNumberSectionRoundForAssignment(meta, format) {
  if (format !== "double_elimination") return Number(meta?.round || 0) * 10;
  if (meta?.bracket === "F") return 999;
  return Number(meta?.round || 0) * 10 + (meta?.bracket === "L" ? 1 : 0);
}

function bracketSectionOrderForAssignment(bracket, format) {
  if (format === "double_elimination") {
    if (bracket === "W") return 0;
    if (bracket === "L") return 1;
    if (bracket === "F") return 2;
  }
  return bracket === "W" ? 0 : 9;
}

function eliminationBracketPriority(meta) {
  if (!meta) return 5;
  if (meta.bracket === "L") return 0;
  if (meta.bracket === "W") return 1;
  if (meta.bracket === "F") return 2;
  return 4;
}

function divisionBracketProgress(matches) {
  const stats = (matches || []).reduce((map, match) => {
    const key = teamKey(match.division_id);
    map[key] ||= { total: 0, completed: 0, playing: 0 };
    map[key].total += 1;
    if (match.status === "done") map[key].completed += 1;
    if (match.status === "playing") map[key].playing += 1;
    return map;
  }, {});

  return Object.fromEntries(
    Object.entries(stats).map(([key, value]) => [
      key,
      (value.completed + value.playing) / Math.max(1, value.total),
    ])
  );
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
    checkIn: saved.checkIn || DEFAULT_SMS_TEMPLATES.checkIn,
    courtReady: saved.courtReady || DEFAULT_SMS_TEMPLATES.courtReady,
    returnToQueue: saved.returnToQueue || DEFAULT_SMS_TEMPLATES.returnToQueue,
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
    line: matchLineLabel(match),
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
  return `${match.division?.name || "Division"} ${matchLineLabel(match)} - ${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"}`;
}

function matchLineLabel(match) {
  return match.legacy_id?.startsWith("BR|") ? "Bracket" : `Line ${match.line_number || 1}`;
}

function autoAssignLineLabel(match, bracketGameNumbers = {}) {
  if (!match?.legacy_id?.startsWith("BR|")) return matchLineLabel(match);
  const gameNumber = bracketGameNumbers[String(match.id)];
  return gameNumber ? `Game #${gameNumber}` : "Game #";
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

function tournamentFormatValue(value) {
  const clean = String(value || "round_robin").trim().toLowerCase();
  if (["round_robin_top4", "round-robin-top4", "round_robin_top_4", "round-robin-top-4", "rr_top4", "rr-top4"].includes(clean)) return "round_robin_top4";
  if (["single", "single_elimination", "single-elimination"].includes(clean)) return "single_elimination";
  if (["double", "double_elimination", "double-elimination"].includes(clean)) return "double_elimination";
  return "round_robin";
}

function isEliminationTournament(settings = {}) {
  const format = tournamentFormatValue(settings?.format);
  return format === "single_elimination" || format === "double_elimination";
}

function isRoundRobinTop4Tournament(settings = {}) {
  return tournamentFormatValue(settings?.format) === "round_robin_top4";
}

function isBracketTeamTournament(settings = {}) {
  return isEliminationTournament(settings) || isRoundRobinTop4Tournament(settings);
}

function tournamentFormatLabel(formatOrSettings = {}) {
  const format = typeof formatOrSettings === "string" ? tournamentFormatValue(formatOrSettings) : tournamentFormatValue(formatOrSettings?.format);
  if (format === "single_elimination") return "Single Elimination";
  if (format === "double_elimination") return "Double Elimination";
  if (format === "round_robin_top4") return "Round Robin + Top 4 Playoff";
  return "Round Robin";
}

function bracketLegacyId(code, divisionId, bracket, round, matchNumber) {
  return ["BR", code, divisionId, bracket, round, matchNumber].join("|");
}

function isBracketLegacyId(legacyId) {
  return String(legacyId || "").startsWith("BR|");
}

function parseBracketLegacyId(legacyId) {
  const parts = String(legacyId || "").split("|");
  if (parts[0] !== "BR" || parts.length < 6) return null;
  const round = Number(parts[4]);
  const match = Number(parts[5]);
  if (!Number.isFinite(round) || !Number.isFinite(match)) return null;

  return {
    format: parts[1] === "DE" ? "double_elimination" : parts[1] === "T4" ? "round_robin_top4" : "single_elimination",
    divisionId: parts[2],
    bracket: parts[3],
    round,
    match,
  };
}

function highestPowerOfTwoAtMost(value) {
  let result = 1;
  const number = Math.max(1, Number(value || 1));
  while (result * 2 <= number) result *= 2;
  return result;
}

function compareBracketSeed(a, b) {
  const aSeed = Number(a.seed || Number.MAX_SAFE_INTEGER);
  const bSeed = Number(b.seed || Number.MAX_SAFE_INTEGER);
  return aSeed - bSeed || String(a.name || "").localeCompare(String(b.name || ""));
}

function regularSeasonStandingValue(team = {}) {
  const value = team.seed;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function loserTeamIdForMatch(match) {
  const winner = String(match.winner_team_id || "");
  if (!winner) return "";
  if (String(match.home_team_id || "") === winner) return String(match.away_team_id || "");
  if (String(match.away_team_id || "") === winner) return String(match.home_team_id || "");
  return "";
}

function bracketLossCountBeforeMatch(matches, currentMatch, teamId) {
  const cleanTeamId = String(teamId || "");
  if (!cleanTeamId) return 0;
  const currentOrder = Number(currentMatch?.created_order || Number.MAX_SAFE_INTEGER);

  return (matches || []).filter((match) => {
    if (String(match.id) === String(currentMatch?.id || "")) return false;
    if (!isBracketLegacyId(match.legacy_id)) return false;
    if (match.status !== "done" || match.result_type === "not_played" || !match.winner_team_id) return false;
    const order = Number(match.created_order || 0);
    if (Number.isFinite(currentOrder) && order >= currentOrder) return false;
    return String(loserTeamIdForMatch(match)) === cleanTeamId;
  }).length;
}

function eliminationTeamName(player1Name, player2Name) {
  const lastNames = [player1Name, player2Name]
    .map((name) => {
      const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
      return parts[parts.length - 1];
    })
    .filter(Boolean);
  return lastNames.join(" / ");
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
