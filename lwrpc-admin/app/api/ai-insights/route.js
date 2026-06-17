import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasRole } from "../../lib/permissions";
import { highestRoleForMembers, memberEmailResolution } from "../../lib/memberLookup";

export const runtime = "nodejs";

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("AI Insights requires SUPABASE_SERVICE_ROLE_KEY on the server.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase anon credentials are not configured.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function requireManager(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) return { error: "Not authorized.", status: 401 };

  const authSupabase = anonClient();
  const { data: userData, error: userError } = await authSupabase.auth.getUser(token);

  if (userError || !userData?.user?.email) {
    return { error: "Not authorized.", status: 401 };
  }

  const supabase = adminClient();
  const { data: memberRows, error: memberError } = await supabase
    .from("members")
    .select("id, email, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true });

  if (memberError) return { error: memberError.message, status: 500 };

  const { activeMembers, selectedMember } = memberEmailResolution(memberRows);
  const role = highestRoleForMembers(activeMembers.length > 0 ? activeMembers : memberRows);

  if (!hasRole(role, "league_manager")) {
    return { error: "Only League Managers and Commissioners can use AI League Insights.", status: 403 };
  }

  return { supabase, member: selectedMember, role };
}

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + Number(days || 0));
  return next;
}

function memberName(member) {
  return `${member?.first_name || ""} ${member?.last_name || ""}`.trim() || member?.email || "Member";
}

function matchName(match) {
  return `${match?.home_team?.name || "Home"} vs ${match?.away_team?.name || "Away"}`;
}

function activeSeason(seasons = []) {
  return seasons.find((season) => season.is_active !== false) || seasons[0] || null;
}

function issue(severity, title, detail, path = "") {
  return { severity, title, detail, path };
}

function sanitizeTextForAi(value) {
  return String(value || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, "[phone]");
}

function sanitizeIssueForAi(item) {
  return {
    ...item,
    title: sanitizeTextForAi(item.title),
    detail: sanitizeTextForAi(item.detail),
  };
}

function severityRank(severity) {
  return { high: 1, medium: 2, low: 3 }[severity] || 4;
}

function completeLineupCount(lineups, matchId, teamId) {
  return new Set(
    (lineups || [])
      .filter((lineup) =>
        String(lineup.match_id) === String(matchId) &&
        String(lineup.team_id) === String(teamId) &&
        lineup.player_1_member_id &&
        lineup.player_2_member_id
      )
      .map((lineup) => Number(lineup.line_number || 0))
      .filter(Boolean)
  ).size;
}

async function loadInsightData(supabase) {
  const [
    membersResult,
    seasonsResult,
    leaguesResult,
    divisionsResult,
    teamsResult,
    rosterResult,
    ratingsResult,
    matchesResult,
    lineupsResult,
    standingsResult,
  ] = await Promise.all([
    supabase
      .from("members")
      .select("id, first_name, last_name, email, phone, dupr_id, is_active_member, created_at, user_roles(role)")
      .order("last_name", { ascending: true }),
    supabase.from("seasons").select("id, name, is_active").order("name", { ascending: true }),
    supabase.from("leagues").select("id, name, season_id, is_active, seasons(id, name, is_active)").order("name", { ascending: true }),
    supabase
      .from("divisions")
      .select("id, name, league_id, number_of_lines, min_dupr, max_dupr, team_dupr_max, is_active, leagues(id, name, season_id, seasons(id, name, is_active))")
      .order("sort_order", { ascending: true }),
    supabase
      .from("teams")
      .select(`
        id,
        name,
        division_id,
        is_active,
        captain_member_id,
        co_captain_member_id,
        co_captain_2_member_id,
        divisions(id, name, leagues(id, name, seasons(id, name, is_active))),
        captain:members!teams_captain_member_id_fkey(id, first_name, last_name, email, phone),
        co_captain_1:members!teams_co_captain_member_id_fkey(id, first_name, last_name, email, phone),
        co_captain_2:members!teams_co_captain_2_member_id_fkey(id, first_name, last_name, email, phone)
      `)
      .order("name", { ascending: true }),
    supabase
      .from("team_members")
      .select("id, team_id, member_id, teams(id, name, is_active, division_id), members(id, first_name, last_name, email, is_active_member)")
      .limit(5000),
    supabase
      .from("member_season_ratings")
      .select("id, member_id, season_id, dupr_doubles_rating, season_dupr_rating, season_primetime_rating, notes")
      .limit(5000),
    supabase
      .from("matches")
      .select(`
        id,
        league_id,
        division_id,
        home_team_id,
        away_team_id,
        scheduled_date,
        scheduled_time,
        week_number,
        status,
        score_status,
        is_published,
        home_score,
        away_score,
        score_entered_at,
        score_verified_at,
        divisions(id, name, number_of_lines, leagues(id, name, seasons(id, name, is_active))),
        home_team:teams!matches_home_team_id_fkey(id, name),
        away_team:teams!matches_away_team_id_fkey(id, name)
      `)
      .order("scheduled_date", { ascending: false })
      .limit(400),
    supabase
      .from("match_lineups")
      .select("id, match_id, team_id, line_number, player_1_member_id, player_2_member_id")
      .limit(8000),
    supabase
      .from("team_standings")
      .select("id, team_id, division_id, match_wins, match_losses, standings_points, rank, teams(id, name), divisions(id, name)")
      .limit(2000),
  ]);

  const errors = [
    membersResult.error,
    seasonsResult.error,
    leaguesResult.error,
    divisionsResult.error,
    teamsResult.error,
    rosterResult.error,
    ratingsResult.error,
    matchesResult.error,
    lineupsResult.error,
    standingsResult.error,
  ].filter(Boolean);

  if (errors.length > 0) throw new Error(errors.map((error) => error.message).join(" / "));

  return {
    members: membersResult.data || [],
    seasons: seasonsResult.data || [],
    leagues: leaguesResult.data || [],
    divisions: divisionsResult.data || [],
    teams: teamsResult.data || [],
    rosterRows: rosterResult.data || [],
    ratings: ratingsResult.data || [],
    matches: matchesResult.data || [],
    lineups: lineupsResult.data || [],
    standings: standingsResult.data || [],
  };
}

function buildInsightSnapshot(data) {
  const today = localDateValue();
  const weekEnd = localDateValue(addDays(new Date(), 7));
  const twoWeeksOut = localDateValue(addDays(new Date(), 14));
  const season = activeSeason(data.seasons);
  const activeMembers = data.members.filter((member) => member.is_active_member !== false);
  const activeTeams = data.teams.filter((team) => team.is_active !== false && team.divisions?.leagues?.seasons?.is_active !== false);
  const activeRosterRows = data.rosterRows.filter((row) => row.teams?.is_active !== false);
  const activeRosterMemberIds = new Set(activeRosterRows.map((row) => String(row.member_id)));
  const activeSeasonRatings = data.ratings.filter((rating) => !season?.id || String(rating.season_id) === String(season.id));
  const ratingsByMemberId = new Map(activeSeasonRatings.map((rating) => [String(rating.member_id), rating]));
  const publishedMatches = data.matches.filter((match) => match.is_published !== false);
  const upcomingWeekMatches = publishedMatches.filter((match) => match.scheduled_date >= today && match.scheduled_date <= weekEnd);
  const overdueScoreMatches = publishedMatches.filter((match) =>
    match.scheduled_date &&
    match.scheduled_date < today &&
    match.status !== "cancelled" &&
    match.score_status !== "verified"
  );
  const pendingVerification = publishedMatches.filter((match) => match.score_status === "pending_verification");
  const verifiedCompleted = publishedMatches.filter((match) => match.status === "completed" && match.score_status === "verified");
  const completedNotVerified = publishedMatches.filter((match) => match.status === "completed" && match.score_status !== "verified");
  const verifiedNotCompleted = publishedMatches.filter((match) => match.score_status === "verified" && match.status !== "completed");
  const futureLineupMatches = publishedMatches
    .filter((match) => match.scheduled_date >= today && match.scheduled_date <= twoWeeksOut && match.status !== "cancelled")
    .sort((a, b) => `${a.scheduled_date || ""} ${a.scheduled_time || ""}`.localeCompare(`${b.scheduled_date || ""} ${b.scheduled_time || ""}`));

  const lineupNeeds = [];
  futureLineupMatches.forEach((match) => {
    const expectedLines = Math.max(1, Number(match.divisions?.number_of_lines || 0));
    [
      { side: "Home", teamId: match.home_team_id, teamName: match.home_team?.name || "Home" },
      { side: "Away", teamId: match.away_team_id, teamName: match.away_team?.name || "Away" },
    ].forEach((team) => {
      const complete = completeLineupCount(data.lineups, match.id, team.teamId);
      if (complete < expectedLines) {
        lineupNeeds.push({
          matchId: match.id,
          date: match.scheduled_date,
          match: matchName(match),
          team: team.teamName,
          side: team.side,
          complete,
          expected: expectedLines,
          path: `/matches/${match.id}?from=scoring`,
        });
      }
    });
  });

  const ratingGaps = activeMembers
    .filter((member) => activeRosterMemberIds.has(String(member.id)))
    .map((member) => {
      const rating = ratingsByMemberId.get(String(member.id));
      const missingSeasonRating = !rating || (rating.season_dupr_rating === null && rating.season_dupr_rating === undefined);
      const rawValue = String(rating?.dupr_doubles_rating || "").trim().toUpperCase();
      return {
        memberId: member.id,
        name: memberName(member),
        missingDuprId: !String(member.dupr_id || "").trim(),
        missingSeasonRating,
        rawNr: rawValue === "NR",
      };
    })
    .filter((row) => row.missingDuprId || row.missingSeasonRating || row.rawNr);

  const emails = new Map();
  data.members.forEach((member) => {
    const email = String(member.email || "").trim().toLowerCase();
    if (!email) return;
    emails.set(email, [...(emails.get(email) || []), member]);
  });

  const duplicateEmails = [...emails.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([email, rows]) => ({
      email,
      count: rows.length,
      names: rows.map(memberName),
    }));

  const missingContactMembers = activeMembers
    .filter((member) => !String(member.email || "").trim() && !String(member.phone || "").trim())
    .map((member) => ({ id: member.id, name: memberName(member) }));

  const inactiveRosterRows = activeRosterRows
    .filter((row) => row.members?.is_active_member === false)
    .map((row) => ({
      member: memberName(row.members),
      team: row.teams?.name || "Team",
    }));

  const teamsMissingCaptain = activeTeams
    .filter((team) => !team.captain_member_id)
    .map((team) => ({ id: team.id, name: team.name, division: team.divisions?.name || "Division" }));

  const divisionsWithVerified = new Set(verifiedCompleted.map((match) => String(match.division_id)).filter(Boolean));
  const divisionsWithStandings = new Set(data.standings.map((row) => String(row.division_id)).filter(Boolean));
  const standingsMissing = [...divisionsWithVerified]
    .filter((divisionId) => !divisionsWithStandings.has(divisionId))
    .map((divisionId) => {
      const match = verifiedCompleted.find((item) => String(item.division_id) === String(divisionId));
      return match?.divisions?.name || "Division";
    });

  const anomalies = [
    ...completedNotVerified.slice(0, 12).map((match) =>
      issue("high", "Completed match not verified", `${matchName(match)} on ${match.scheduled_date || "No date"} is completed but not verified.`, `/matches/${match.id}`)
    ),
    ...verifiedNotCompleted.slice(0, 12).map((match) =>
      issue("medium", "Verified score with non-completed match status", `${matchName(match)} is verified but match status is ${match.status || "blank"}.`, `/matches/${match.id}`)
    ),
    ...standingsMissing.slice(0, 8).map((divisionName) =>
      issue("medium", "Standings may need rebuild", `${divisionName} has verified matches but no standings rows in the current snapshot.`, "/standings")
    ),
  ].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const cleanupSuggestions = [
    ...teamsMissingCaptain.slice(0, 12).map((team) =>
      issue("high", "Team missing captain", `${team.name} (${team.division}) does not have a captain assigned.`, `/teams`)
    ),
    ...duplicateEmails.slice(0, 12).map((entry) =>
      issue("medium", "Duplicate member email", `${entry.email} appears on ${entry.count} member records: ${entry.names.join(", ")}.`, "/members")
    ),
    ...inactiveRosterRows.slice(0, 12).map((entry) =>
      issue("medium", "Inactive member on active roster", `${entry.member} is still assigned to ${entry.team}.`, "/members")
    ),
    ...missingContactMembers.slice(0, 12).map((member) =>
      issue("low", "Missing contact information", `${member.name} has no email or phone saved.`, "/members")
    ),
    ...ratingGaps.slice(0, 16).map((gap) =>
      issue(
        gap.missingSeasonRating ? "medium" : "low",
        "Rating cleanup",
        `${gap.name}: ${[
          gap.missingDuprId ? "missing DUPR ID" : "",
          gap.missingSeasonRating ? "missing season rating" : "",
          gap.rawNr ? "raw DUPR is NR" : "",
        ].filter(Boolean).join(", ")}.`,
        "/ratings"
      )
    ),
  ].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const weekly = [
    { label: "Matches Next 7 Days", value: upcomingWeekMatches.length, tone: "blue" },
    { label: "Overdue Score Entry", value: overdueScoreMatches.length, tone: overdueScoreMatches.length ? "red" : "emerald" },
    { label: "Pending Verification", value: pendingVerification.length, tone: pendingVerification.length ? "amber" : "emerald" },
    { label: "Lineup Gaps Next 14 Days", value: lineupNeeds.length, tone: lineupNeeds.length ? "amber" : "emerald" },
    { label: "Rating/Member Cleanup Items", value: cleanupSuggestions.length, tone: cleanupSuggestions.length ? "amber" : "emerald" },
  ];

  return {
    generatedAt: new Date().toISOString(),
    season: season?.name || "All Seasons",
    counts: {
      activeMembers: activeMembers.length,
      activeTeams: activeTeams.length,
      activeLeagues: data.leagues.filter((league) => league.is_active !== false && league.seasons?.is_active !== false).length,
      activeDivisions: data.divisions.filter((division) => division.is_active !== false && division.leagues?.seasons?.is_active !== false).length,
      verifiedCompleted: verifiedCompleted.length,
    },
    weekly,
    overdueScoreMatches: overdueScoreMatches.slice(0, 12).map((match) => ({
      id: match.id,
      date: match.scheduled_date,
      match: matchName(match),
      status: match.score_status || "not_entered",
      path: `/matches/${match.id}`,
    })),
    anomalies,
    lineupNeeds: lineupNeeds.slice(0, 16),
    cleanupSuggestions: cleanupSuggestions.slice(0, 24),
    searchCorpus: [
      ...overdueScoreMatches.slice(0, 20).map((match) => `Overdue score: ${matchName(match)} ${match.scheduled_date || ""} ${match.score_status || ""}`),
      ...pendingVerification.slice(0, 20).map((match) => `Pending verification: ${matchName(match)} ${match.scheduled_date || ""}`),
      ...lineupNeeds.slice(0, 30).map((item) => `Lineup gap: ${item.team} ${item.complete}/${item.expected} for ${item.match} ${item.date}`),
      ...cleanupSuggestions.slice(0, 40).map((item) => `${item.title}: ${item.detail}`),
      ...anomalies.slice(0, 20).map((item) => `${item.title}: ${item.detail}`),
    ],
  };
}

function localAskAnswer(question, snapshot) {
  const query = String(question || "").toLowerCase();
  const buckets = [];

  if (/(score|verify|verification|unverified|overdue)/.test(query)) {
    buckets.push(...snapshot.overdueScoreMatches.map((item) => `${item.match} on ${item.date || "No date"} is ${item.status}.`));
    buckets.push(...snapshot.anomalies.filter((item) => /score|verified|match/i.test(item.title)).map((item) => item.detail));
  }

  if (/(lineup|captain|setup)/.test(query)) {
    buckets.push(...snapshot.lineupNeeds.map((item) => `${item.team} has ${item.complete}/${item.expected} lineups for ${item.match} on ${item.date}.`));
  }

  if (/(rating|member|dupr|cleanup|duplicate|contact)/.test(query)) {
    buckets.push(...snapshot.cleanupSuggestions.map((item) => item.detail));
  }

  if (buckets.length === 0) {
    buckets.push(
      `This snapshot has ${snapshot.weekly.find((item) => item.label === "Overdue Score Entry")?.value || 0} overdue score item(s), ${snapshot.weekly.find((item) => item.label === "Lineup Gaps Next 14 Days")?.value || 0} lineup gap(s), and ${snapshot.cleanupSuggestions.length} cleanup suggestion(s).`
    );
  }

  return {
    answer: buckets.slice(0, 8).join("\n") || "No matching LMS issues were found in the current snapshot.",
    aiEnabled: false,
    model: null,
  };
}

async function openAiAsk(question, snapshot) {
  if (!process.env.OPENAI_API_KEY) return localAskAnswer(question, snapshot);

  const safeSnapshot = {
    season: snapshot.season,
    counts: snapshot.counts,
    weekly: snapshot.weekly,
    overdueScoreMatches: snapshot.overdueScoreMatches,
    anomalies: snapshot.anomalies.map(sanitizeIssueForAi),
    lineupNeeds: snapshot.lineupNeeds,
    cleanupSuggestions: snapshot.cleanupSuggestions.map(sanitizeIssueForAi),
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      reasoning: { effort: "low" },
      instructions:
        "You are Ask LMS, a read-only league operations assistant for Lakewood Ranch Pickleball Club admins. Answer from the provided LMS snapshot only. Be concise, operational, and include specific next actions and links when paths are present. Do not invent records.",
      input: [
        {
          role: "user",
          content: `Admin question: ${question}\n\nCurrent LMS snapshot JSON:\n${JSON.stringify(safeSnapshot, null, 2)}`,
        },
      ],
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ...localAskAnswer(question, snapshot),
      warning: result?.error?.message || "OpenAI answer failed; showing rule-based LMS answer.",
    };
  }

  return {
    answer: result.output_text || "No AI answer was returned.",
    aiEnabled: true,
    model: OPENAI_MODEL,
  };
}

export async function GET(req) {
  try {
    const auth = await requireManager(req);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const data = await loadInsightData(auth.supabase);
    return NextResponse.json({
      success: true,
      snapshot: buildInsightSnapshot(data),
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.OPENAI_API_KEY ? OPENAI_MODEL : null,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await requireManager(req);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    const question = String(body.question || "").trim();
    if (!question) {
      return NextResponse.json({ success: false, error: "Question is required." }, { status: 400 });
    }

    const data = await loadInsightData(auth.supabase);
    const snapshot = buildInsightSnapshot(data);
    const ask = await openAiAsk(question, snapshot);

    return NextResponse.json({
      success: true,
      ...ask,
      snapshot,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
