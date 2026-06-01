import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasRole } from "../../lib/permissions";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Season Reset requires SUPABASE_SERVICE_ROLE_KEY on the server.");
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

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authorized." },
        { status: 401 }
      );
    }

    const authSupabase = anonClient();
    const { data: userData, error: userError } = await authSupabase.auth.getUser(token);

    if (userError || !userData?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Not authorized." },
        { status: 401 }
      );
    }

    const supabase = adminClient();
    const { data: memberRows, error: roleError } = await supabase
      .from("members")
      .select("id, email, is_active_member, user_roles(role)")
      .eq("email", userData.user.email)
      .order("created_at", { ascending: true });

    if (roleError) {
      return NextResponse.json(
        { success: false, error: roleError.message },
        { status: 500 }
      );
    }

    const member = (memberRows || []).find((row) => row.is_active_member !== false) || memberRows?.[0] || null;
    const role = highestRole(member?.user_roles || []);

    if (!hasRole(role, "commissioner")) {
      return NextResponse.json(
        { success: false, error: "Only Commissioners can run Season Reset." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const seasonId = body.seasonId;

    if (!seasonId) {
      return NextResponse.json(
        { success: false, error: "Select a season to reset." },
        { status: 400 }
      );
    }

    if (body.confirmation !== "RESET SEASON") {
      return NextResponse.json(
        { success: false, error: "Confirmation text did not match." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: seasonRow, error: seasonError } = await supabase
      .from("seasons")
      .select("id, name, start_date, end_date")
      .eq("id", seasonId)
      .single();

    if (seasonError) throw seasonError;

    const { data: leagueRows, error: leagueLoadError } = await supabase
      .from("leagues")
      .select("id")
      .eq("season_id", seasonId);

    if (leagueLoadError) throw leagueLoadError;

    const leagueIds = (leagueRows || []).map((league) => league.id).filter(Boolean);
    const divisionRows = leagueIds.length > 0
      ? await selectInChunks(supabase, "divisions", "id", "league_id", leagueIds)
      : [];
    const divisionIds = divisionRows.map((division) => division.id).filter(Boolean);
    const teamRows = divisionIds.length > 0
      ? await selectInChunks(supabase, "teams", "id", "division_id", divisionIds)
      : [];
    const teamIds = teamRows.map((team) => team.id).filter(Boolean);
    const scheduleSettingRows = leagueIds.length > 0
      ? await selectInChunks(supabase, "league_schedule_settings", "id", "league_id", leagueIds)
      : [];
    const scheduleSettingIds = scheduleSettingRows.map((setting) => setting.id).filter(Boolean);

    if (teamIds.length > 0) {
      await updateInChunks(
        supabase,
        "teams",
        "id",
        teamIds,
        {
          is_active: false,
          updated_at: now,
        }
      );
    }

    if (divisionIds.length > 0) {
      await updateInChunks(
        supabase,
        "divisions",
        "id",
        divisionIds,
        {
          is_active: false,
          updated_at: now,
        }
      );
    }

    if (leagueIds.length > 0) {
      await updateInChunks(
        supabase,
        "leagues",
        "id",
        leagueIds,
        {
          is_active: false,
          updated_at: now,
        }
      );
    }

    const standingResetPayload = {
      rank: null,
      matches_played: 0,
      match_wins: 0,
      match_losses: 0,
      match_ties: 0,
      line_wins: 0,
      line_losses: 0,
      line_ties: 0,
      game_wins: 0,
      game_losses: 0,
      points_for: 0,
      points_against: 0,
      point_differential: 0,
      standings_points: 0,
      home_wins: 0,
      home_losses: 0,
      away_wins: 0,
      away_losses: 0,
      recent_form: "",
      current_streak: "-",
      updated_at: now,
    };

    if (teamIds.length > 0) {
      await updateInChunks(supabase, "team_standings", "team_id", teamIds, standingResetPayload);
    }

    if (divisionIds.length > 0) {
      await updateInChunks(supabase, "team_standings", "division_id", divisionIds, standingResetPayload);
    }

    const { error: ratingError } = await supabase
      .from("member_season_ratings")
      .update({
        dupr_doubles_rating: null,
        season_dupr_rating: null,
        season_primetime_rating: null,
        updated_at: now,
      })
      .eq("season_id", seasonId);

    if (ratingError) throw ratingError;

    if (scheduleSettingIds.length > 0) {
      await updateInChunks(
        supabase,
        "league_schedule_settings",
        "id",
        scheduleSettingIds,
        {
          league_id: null,
          division_id: null,
          season_start_date: null,
          season_end_date: null,
          actual_schedule_weeks: null,
          schedule_status: "draft",
          updated_at: now,
        }
      );
    }

    const deletedCourtAvailability = await deleteCourtAvailabilityForSeason(supabase, seasonRow);
    const deletedLeagueBlackouts = leagueIds.length > 0
      ? await deleteLeagueBlackoutsForSeason(supabase, leagueIds, seasonRow)
      : 0;

    return NextResponse.json({
      success: true,
      season: seasonRow,
      updated: {
        leagues: leagueIds.length,
        divisions: divisionIds.length,
        teams: teamIds.length,
        scheduleSettings: scheduleSettingIds.length,
        courtAvailabilityDeleted: deletedCourtAvailability,
        leagueBlackoutsDeleted: deletedLeagueBlackouts,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function highestRole(roleRows) {
  const ranks = {
    player: 1,
    captain: 2,
    club_pro: 3,
    league_manager: 4,
    commissioner: 5,
  };

  return (roleRows || []).reduce((highest, row) => {
    const role = row?.role || "player";
    return (ranks[role] || 0) > (ranks[highest] || 0) ? role : highest;
  }, "player");
}

async function selectInChunks(supabase, tableName, selectColumns, fieldName, ids) {
  const rows = [];

  for (const chunk of chunks(ids)) {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectColumns)
      .in(fieldName, chunk);

    if (error) throw error;
    rows.push(...(data || []));
  }

  return rows;
}

async function updateInChunks(supabase, tableName, fieldName, ids, payload) {
  for (const chunk of chunks(ids)) {
    const { error } = await supabase
      .from(tableName)
      .update(payload)
      .in(fieldName, chunk);

    if (error) throw error;
  }
}

async function deleteCourtAvailabilityForSeason(supabase, season) {
  if (!season?.start_date && !season?.end_date) return 0;

  let query = supabase
    .from("location_court_availability")
    .select("id")
    .not("specific_date", "is", null);

  if (season.start_date) query = query.gte("specific_date", season.start_date);
  if (season.end_date) query = query.lte("specific_date", season.end_date);

  const { data, error } = await query;
  if (error) throw error;

  const ids = (data || []).map((row) => row.id).filter(Boolean);
  if (ids.length === 0) return 0;

  await deleteInChunks(supabase, "location_court_availability", "id", ids);
  return ids.length;
}

async function deleteLeagueBlackoutsForSeason(supabase, leagueIds, season) {
  if (!season?.start_date && !season?.end_date) return 0;

  let query = supabase
    .from("league_blackout_dates")
    .select("id, league_id");

  if (season.start_date) query = query.gte("blackout_date", season.start_date);
  if (season.end_date) query = query.lte("blackout_date", season.end_date);

  const { data, error } = await query;
  if (error) throw error;

  const selectedLeagueIds = new Set(leagueIds.map(String));
  const ids = (data || [])
    .filter((row) => !row.league_id || selectedLeagueIds.has(String(row.league_id)))
    .map((row) => row.id)
    .filter(Boolean);

  if (ids.length === 0) return 0;

  await deleteInChunks(supabase, "league_blackout_dates", "id", ids);
  return ids.length;
}

async function deleteInChunks(supabase, tableName, fieldName, ids) {
  for (const chunk of chunks(ids)) {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .in(fieldName, chunk);

    if (error) throw error;
  }
}

function chunks(items, size = 200) {
  const result = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}
