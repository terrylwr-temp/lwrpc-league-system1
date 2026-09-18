import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../lib/serverSupabase";
import { rejectViewAsMutation } from "../../lib/viewAsBoundary.js";
import {
  buildCompensatoryPointsPreview,
  COMPENSATORY_POINTS_CALCULATION_VERSION,
} from "../../lib/compensatoryPoints.js";
import { rebuildDivisionStandingsForDivision } from "../../lib/standingsRebuild.js";

export const runtime = "nodejs";

function actorMemberId(authorization) {
  return authorization.memberRows?.find((row) =>
    row.user_roles?.some((role) => ["league_manager", "commissioner"].includes(role.role))
  )?.id || authorization.memberRows?.[0]?.id || null;
}

async function divisionSchedule(supabase, divisionId) {
  const [{ data: division, error: divisionError }, { data: teams, error: teamsError }, { data: matches, error: matchesError }] = await Promise.all([
    supabase.from("divisions").select("id, league_id, name").eq("id", divisionId).maybeSingle(),
    supabase.from("teams").select("id, name").eq("division_id", divisionId).neq("is_active", false).order("name"),
    supabase
      .from("matches")
      .select("id, division_id, home_team_id, away_team_id, scheduled_date, week_number, status, score_status")
      .eq("division_id", divisionId)
      .eq("is_published", true)
      .order("scheduled_date")
      .order("id"),
  ]);
  if (divisionError || teamsError || matchesError) throw divisionError || teamsError || matchesError;
  if (!division) throw new Error("Division was not found.");
  if ((teams || []).length < 2) throw new Error("At least two active teams are required.");
  if ((matches || []).length === 0) throw new Error("Publish the starting schedule before capturing its DUPR Rules Rule 6.3.9 baseline.");
  if ((matches || []).some((match) => !match.scheduled_date)) {
    throw new Error("Every published starting-schedule match must have a scheduled date.");
  }

  const activeTeamIds = new Set((teams || []).map((team) => String(team.id)));
  const invalidMatch = (matches || []).find((match) =>
    !activeTeamIds.has(String(match.home_team_id)) || !activeTeamIds.has(String(match.away_team_id))
  );
  if (invalidMatch) throw new Error("Every published starting-schedule match must use two active teams in this Division/Pool.");

  return { division, teams: teams || [], matches: matches || [] };
}

function scheduleCounts(teams, matches) {
  const dates = new Map((teams || []).map((team) => [String(team.id), new Set()]));
  for (const match of matches || []) {
    dates.get(String(match.home_team_id))?.add(String(match.scheduled_date));
    dates.get(String(match.away_team_id))?.add(String(match.scheduled_date));
  }
  return new Map([...dates].map(([teamId, matchDates]) => [teamId, matchDates.size]));
}

function scheduleFingerprint(matches) {
  const text = (matches || []).map((match) => [
    match.id,
    match.home_team_id,
    match.away_team_id,
    match.scheduled_date || "",
    match.week_number ?? "",
  ].join(":")).sort().join("|");
  return createHash("sha256").update(text).digest("hex");
}

async function loadPreview(supabase, divisionId) {
  const { data: baseline, error: baselineError } = await supabase
    .from("division_compensation_baselines")
    .select("*")
    .eq("division_id", divisionId)
    .maybeSingle();
  if (baselineError) throw baselineError;

  if (!baseline) {
    const schedule = await divisionSchedule(supabase, divisionId);
    const counts = scheduleCounts(schedule.teams, schedule.matches);
    const maximumScheduledMatchDates = Math.max(...counts.values());
    return {
      baselineMissing: true,
      proposedBaseline: {
        divisionName: schedule.division.name,
        matchCount: schedule.matches.length,
        maximumScheduledMatchDates,
        rows: schedule.teams.map((team) => ({
          teamId: team.id,
          teamName: team.name,
          scheduledMatchDatesAtStart: counts.get(String(team.id)) || 0,
        })),
      },
    };
  }

  const [{ data: baselineTeams, error: teamsError }, { data: baselineMatches, error: matchesError }, { data: standings, error: standingsError }, { data: awards, error: awardsError }] = await Promise.all([
    supabase.from("division_compensation_baseline_teams").select("*").eq("baseline_id", baseline.id).order("team_name"),
    supabase.from("division_compensation_baseline_matches").select("*").eq("baseline_id", baseline.id).order("scheduled_date"),
    supabase.from("team_standings").select("team_id, matches_played, standings_points, earned_standings_points, compensatory_points").eq("division_id", divisionId),
    supabase.from("division_compensatory_point_awards").select("*").eq("division_id", divisionId),
  ]);
  if (teamsError || matchesError || standingsError || awardsError) throw teamsError || matchesError || standingsError || awardsError;

  const matchIds = (baselineMatches || []).map((match) => match.match_id);
  const currentResult = matchIds.length > 0
    ? await supabase.from("matches").select("id, status, score_status").in("id", matchIds)
    : { data: [], error: null };
  if (currentResult.error) throw currentResult.error;

  return {
    baselineMissing: false,
    ...buildCompensatoryPointsPreview({
      baseline,
      baselineTeams: baselineTeams || [],
      baselineMatches: baselineMatches || [],
      currentMatches: currentResult.data || [],
      standings: standings || [],
      awards: awards || [],
    }),
  };
}

export async function GET(req) {
  try {
    const authorization = await authorizeAdminRequest(req, "league_manager");
    if (authorization.error) {
      return NextResponse.json({ success: false, error: authorization.error }, { status: authorization.status });
    }
    const divisionId = new URL(req.url).searchParams.get("divisionId");
    if (!divisionId) return NextResponse.json({ success: false, error: "Select a division." }, { status: 400 });
    return NextResponse.json({ success: true, ...(await loadPreview(authorization.supabase, divisionId)) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || "Unable to load DUPR Rules Rule 6.3.9." }, { status: 500 });
  }
}

export async function POST(req) {
  const viewAsDenied = rejectViewAsMutation(req);
  if (viewAsDenied) return viewAsDenied;

  try {
    const authorization = await authorizeAdminRequest(req, "league_manager");
    if (authorization.error) {
      return NextResponse.json({ success: false, error: authorization.error }, { status: authorization.status });
    }
    const body = await req.json().catch(() => ({}));
    const divisionId = String(body.divisionId || "").trim();
    const action = String(body.action || "");
    const actorId = actorMemberId(authorization);
    if (!divisionId) return NextResponse.json({ success: false, error: "Select a division." }, { status: 400 });

    if (action === "capture") {
      if (body.confirmation !== "CAPTURE") {
        return NextResponse.json({ success: false, error: "Confirmation text did not match." }, { status: 400 });
      }
      const schedule = await divisionSchedule(authorization.supabase, divisionId);
      const counts = scheduleCounts(schedule.teams, schedule.matches);
      const { data: baseline, error: baselineError } = await authorization.supabase
        .from("division_compensation_baselines")
        .insert({
          division_id: divisionId,
          league_id: schedule.division.league_id,
          captured_by_member_id: actorId,
          max_scheduled_match_dates: Math.max(...counts.values()),
          schedule_match_count: schedule.matches.length,
          schedule_fingerprint: scheduleFingerprint(schedule.matches),
        })
        .select("id")
        .single();
      if (baselineError) throw baselineError;

      try {
        const teamRows = schedule.teams.map((team) => ({
          baseline_id: baseline.id,
          division_id: divisionId,
          team_id: team.id,
          team_name: team.name || "Team",
          scheduled_match_dates: counts.get(String(team.id)) || 0,
        }));
        const matchRows = schedule.matches.map((match) => ({
          baseline_id: baseline.id,
          division_id: divisionId,
          match_id: match.id,
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
          scheduled_date: match.scheduled_date,
          week_number: match.week_number,
        }));
        const [teamInsert, matchInsert] = await Promise.all([
          authorization.supabase.from("division_compensation_baseline_teams").insert(teamRows),
          authorization.supabase.from("division_compensation_baseline_matches").insert(matchRows),
        ]);
        if (teamInsert.error || matchInsert.error) throw teamInsert.error || matchInsert.error;
      } catch (error) {
        await authorization.supabase.from("division_compensation_baselines").delete().eq("id", baseline.id);
        throw error;
      }
      return NextResponse.json({ success: true, ...(await loadPreview(authorization.supabase, divisionId)) });
    }

    if (action === "apply") {
      if (body.confirmation !== "FINALIZE") {
        return NextResponse.json({ success: false, error: "Confirmation text did not match." }, { status: 400 });
      }
      const preview = await loadPreview(authorization.supabase, divisionId);
      if (preview.baselineMissing || !preview.readyToApply) {
        return NextResponse.json({ success: false, error: "DUPR Rules Rule 6.3.9 is not ready to finalize. Review the preview." }, { status: 409 });
      }
      const awardRows = preview.rows.map((row) => ({
        division_id: divisionId,
        team_id: row.teamId,
        baseline_id: preview.baseline.id,
        scheduled_match_dates_at_start: row.scheduledMatchDatesAtStart,
        maximum_scheduled_match_dates: row.maximumScheduledMatchDates,
        missing_match_dates: row.missingMatchDates,
        qualifying_match_dates: row.qualifyingMatchDates,
        verified_match_count: row.verifiedMatchCount,
        earned_standings_points: row.earnedPoints,
        average_points_per_match: row.averagePoints,
        raw_compensatory_points: row.rawCompensatoryPoints,
        compensatory_points: row.compensatoryPoints,
        calculation_version: COMPENSATORY_POINTS_CALCULATION_VERSION,
        applied_at: new Date().toISOString(),
        applied_by_member_id: actorId,
      }));
      const { error: awardError } = await authorization.supabase
        .from("division_compensatory_point_awards")
        .upsert(awardRows, { onConflict: "division_id,team_id" });
      if (awardError) throw awardError;

      const rebuild = await rebuildDivisionStandingsForDivision(authorization.supabase, divisionId);
      if (!rebuild.success) throw new Error(`Awards were saved, but standings rebuild failed: ${rebuild.error}`);
      return NextResponse.json({ success: true, rebuild, ...(await loadPreview(authorization.supabase, divisionId)) });
    }

    return NextResponse.json({ success: false, error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || "Unable to update DUPR Rules Rule 6.3.9." }, { status: 500 });
  }
}
