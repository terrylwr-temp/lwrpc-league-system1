import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../lib/serverSupabase";
import { rejectViewAsMutation } from "../../lib/viewAsBoundary.js";
import {
  buildEndOfSeasonPointsPreview,
  COMPENSATORY_POINTS_CALCULATION_VERSION,
} from "../../lib/compensatoryPoints.js";
import { rebuildDivisionStandingsForDivision } from "../../lib/standingsRebuild.js";

export const runtime = "nodejs";

function actorMemberId(authorization) {
  return authorization.memberRows?.find((row) =>
    row.user_roles?.some((role) => ["league_manager", "commissioner"].includes(role.role))
  )?.id || authorization.memberRows?.[0]?.id || null;
}

async function loadPreview(supabase, divisionId) {
  const [
    { data: division, error: divisionError },
    { data: teams, error: teamsError },
    { data: matches, error: matchesError },
    { data: standings, error: standingsError },
    { data: awards, error: awardsError },
  ] = await Promise.all([
    supabase.from("divisions").select("id, league_id, name").eq("id", divisionId).maybeSingle(),
    supabase.from("teams").select("id, name").eq("division_id", divisionId).order("name"),
    supabase
      .from("matches")
      .select("id, division_id, home_team_id, away_team_id, scheduled_date, status, score_status")
      .eq("division_id", divisionId)
      .order("scheduled_date")
      .order("id"),
    supabase
      .from("team_standings")
      .select("team_id, matches_played, standings_points, earned_standings_points, compensatory_points")
      .eq("division_id", divisionId),
    supabase.from("division_compensatory_point_awards").select("*").eq("division_id", divisionId),
  ]);

  if (divisionError || teamsError || matchesError || standingsError || awardsError) {
    throw divisionError || teamsError || matchesError || standingsError || awardsError;
  }
  if (!division) throw new Error("Division was not found.");
  if ((teams || []).length < 2) throw new Error("At least two teams are required.");
  if ((matches || []).length === 0) throw new Error("No matches are available for this Division/Pool.");

  const teamIds = new Set((teams || []).map((team) => String(team.id)));
  const invalidMatch = (matches || []).find((match) =>
    !teamIds.has(String(match.home_team_id)) || !teamIds.has(String(match.away_team_id))
  );
  if (invalidMatch) throw new Error("Every match must use two teams from this Division/Pool.");

  return {
    division,
    ...buildEndOfSeasonPointsPreview({
      teams: teams || [],
      matches: matches || [],
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
    return NextResponse.json({ success: false, error: error.message || "Unable to load end-of-season points." }, { status: 500 });
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
    if (action !== "apply") return NextResponse.json({ success: false, error: "Unsupported action." }, { status: 400 });
    if (body.confirmation !== "FINALIZE") {
      return NextResponse.json({ success: false, error: "Confirmation text did not match." }, { status: 400 });
    }

    const preview = await loadPreview(authorization.supabase, divisionId);
    if (!preview.readyToApply) {
      return NextResponse.json({ success: false, error: "End-of-season points are not ready to finalize. Review the preview." }, { status: 409 });
    }

    const awardRows = preview.rows.map((row) => ({
      division_id: divisionId,
      team_id: row.teamId,
      baseline_id: null,
      scheduled_match_dates_at_start: row.matchDatesPlayed,
      maximum_scheduled_match_dates: row.maximumMatchDatesPlayed,
      missing_match_dates: row.missingMatchDates,
      qualifying_match_dates: row.matchDatesPlayed,
      verified_match_count: row.verifiedMatchCount,
      earned_standings_points: row.earnedPoints,
      average_points_per_match: row.averagePoints,
      raw_compensatory_points: row.rawCompensatoryPoints,
      compensatory_points: row.compensatoryPoints,
      calculation_version: COMPENSATORY_POINTS_CALCULATION_VERSION,
      calculation_basis: "verified_match_dates",
      match_dates_played: row.matchDatesPlayed,
      maximum_match_dates_played: row.maximumMatchDatesPlayed,
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
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || "Unable to update end-of-season points." }, { status: 500 });
  }
}
