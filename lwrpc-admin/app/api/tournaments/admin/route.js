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
    throw new Error("Tournament admin requires SUPABASE_SERVICE_ROLE_KEY on the server.");
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
    const tournamentId = String(body.tournamentId || "").trim();
    const eventCode = String(body.eventCode || "").trim();

    if (!tournamentId || !eventCode) {
      return NextResponse.json(
        { success: false, error: "Tournament and event code are required." },
        { status: 400 }
      );
    }

    const supabase = adminClient();
    const { data: tournament, error: tournamentError } = await loadTournament(supabase, tournamentId);

    if (tournamentError) throw tournamentError;

    if (!tournament) {
      return NextResponse.json(
        { success: false, error: "Tournament not found." },
        { status: 404 }
      );
    }

    if (String(tournament.admin_code || "") !== eventCode) {
      return NextResponse.json(
        { success: false, error: "Incorrect event code." },
        { status: 401 }
      );
    }

    const teamIds = await tournamentTeamIds(supabase, tournament.id);
    const contactsPromise = teamIds.length > 0
      ? supabase
        .from("tournament_team_contacts")
        .select("*")
        .in("tournament_team_id", teamIds)
      : Promise.resolve({ data: [], error: null });

    const [divisions, leagueDivisions, teams, contacts, courts, matches, log, sourceTeams] = await Promise.all([
      supabase
        .from("tournament_divisions")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("divisions")
        .select("id, name, sort_order, is_active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("tournament_teams")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("name", { ascending: true }),
      contactsPromise,
      supabase
        .from("tournament_courts")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("tournament_matches")
        .select(`
          *,
          division:tournament_divisions(id, name),
          home_team:tournament_teams!tournament_matches_home_team_id_fkey(id, name, player_1_name, player_2_name),
          away_team:tournament_teams!tournament_matches_away_team_id_fkey(id, name, player_1_name, player_2_name),
          court:tournament_courts!tournament_matches_court_id_fkey(id, name),
          winner_team:tournament_teams!tournament_matches_winner_team_id_fkey(id, name)
        `)
        .eq("tournament_id", tournament.id)
        .order("created_order", { ascending: true }),
      supabase
        .from("tournament_activity_log")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("teams")
        .select(`
          id,
          name,
          division_id,
          is_active,
          divisions (
            id,
            name,
            team_dupr_max,
            rating_type,
            leagues (
              id,
              season_id
            )
          )
        `)
        .or("is_active.eq.true,is_active.is.null")
        .order("name", { ascending: true }),
    ]);

    const errors = [divisions.error, leagueDivisions.error, teams.error, contacts.error, courts.error, matches.error, log.error, sourceTeams.error].filter(Boolean);
    if (errors.length > 0) throw errors[0];

    const sourceTeamIds = (sourceTeams.data || []).map((team) => team.id);
    const sourceRosters = sourceTeamIds.length > 0
      ? await supabase
        .from("team_members")
        .select(`
          id,
          team_id,
          member_id,
          role,
          members (
            id,
            full_name,
            first_name,
            last_name,
            email,
            phone,
            self_rating,
            dupr_id
          )
        `)
        .in("team_id", sourceTeamIds)
      : { data: [], error: null };

    if (sourceRosters.error) throw sourceRosters.error;

    const sourceMemberIds = [...new Set((sourceRosters.data || []).map((row) => row.member_id).filter(Boolean))];
    const sourceRatings = sourceMemberIds.length > 0
      ? await supabase
        .from("member_season_ratings")
        .select("member_id, season_id, season_dupr_rating, season_primetime_rating")
        .in("member_id", sourceMemberIds)
      : { data: [], error: null };

    if (sourceRatings.error) throw sourceRatings.error;

    return NextResponse.json({
      success: true,
      tournament: sanitizeTournament(tournament),
      divisions: divisions.data || [],
      leagueDivisions: leagueDivisions.data || [],
      teams: teams.data || [],
      contacts: contacts.data || [],
      courts: courts.data || [],
      matches: matches.data || [],
      log: log.data || [],
      sourceTeams: sourceTeams.data || [],
      sourceRosters: sourceRosters.data || [],
      sourceRatings: sourceRatings.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function loadTournament(supabase, identifier) {
  const query = supabase.from("tournaments").select("*");

  return isUuid(identifier)
    ? await query.eq("id", identifier).maybeSingle()
    : await query.eq("slug", identifier).maybeSingle();
}

async function tournamentTeamIds(supabase, tournamentId) {
  const { data, error } = await supabase
    .from("tournament_teams")
    .select("id")
    .eq("tournament_id", tournamentId);

  if (error) throw error;
  return (data || []).map((team) => team.id);
}

function sanitizeTournament(tournament) {
  const safeTournament = { ...tournament };
  delete safeTournament.admin_code;
  return safeTournament;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
