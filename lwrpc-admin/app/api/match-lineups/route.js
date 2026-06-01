import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasRole } from "../../lib/permissions";
import { highestRoleForMembers } from "../../lib/memberLookup";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Match setup save requires SUPABASE_SERVICE_ROLE_KEY on the server.");
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

    const body = await req.json().catch(() => ({}));
    const matchId = body.matchId;
    const teamId = body.teamId;
    const lineups = Array.isArray(body.lineups) ? body.lineups : [];

    if (!matchId || !teamId) {
      return NextResponse.json(
        { success: false, error: "Match and team are required." },
        { status: 400 }
      );
    }

    if (lineups.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one lineup row is required." },
        { status: 400 }
      );
    }

    const supabase = adminClient();
    const { data: memberRows, error: memberError } = await supabase
      .from("members")
      .select("id, email, is_active_member, user_roles(role)")
      .eq("email", userData.user.email)
      .order("created_at", { ascending: true });

    if (memberError) throw memberError;

    const memberIds = (memberRows || []).map((member) => String(member.id));
    const role = highestRoleForMembers(memberRows || []);

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, home_team_id, away_team_id")
      .eq("id", matchId)
      .single();

    if (matchError) throw matchError;

    if (
      String(match.home_team_id || "") !== String(teamId) &&
      String(match.away_team_id || "") !== String(teamId)
    ) {
      return NextResponse.json(
        { success: false, error: "This team is not assigned to that match." },
        { status: 400 }
      );
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, captain_member_id, co_captain_member_id, co_captain_2_member_id, club_pro_member_id")
      .eq("id", teamId)
      .single();

    if (teamError) throw teamError;

    const teamManagerIds = [
      team.captain_member_id,
      team.co_captain_member_id,
      team.co_captain_2_member_id,
      team.club_pro_member_id,
    ]
      .filter(Boolean)
      .map(String);
    const isTeamManager = teamManagerIds.some((memberId) => memberIds.includes(memberId));

    if (!hasRole(role, "league_manager") && !isTeamManager) {
      return NextResponse.json(
        { success: false, error: "You are not allowed to save match setup for this team." },
        { status: 403 }
      );
    }

    const playerIds = [
      ...new Set(
        lineups
          .flatMap((lineup) => [lineup.player_1_member_id, lineup.player_2_member_id])
          .filter(Boolean)
          .map(String)
      ),
    ];

    if (playerIds.length > 0) {
      const { data: rosterRows, error: rosterError } = await supabase
        .from("team_members")
        .select("member_id")
        .eq("team_id", teamId)
        .in("member_id", playerIds);

      if (rosterError) throw rosterError;

      const rosterMemberIds = new Set((rosterRows || []).map((row) => String(row.member_id)));
      const missingRosterPlayer = playerIds.find((playerId) => !rosterMemberIds.has(playerId));

      if (missingRosterPlayer) {
        return NextResponse.json(
          { success: false, error: "Every selected lineup player must be on this team roster." },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    const rows = lineups.map((lineup) => ({
      match_id: matchId,
      team_id: teamId,
      line_number: Number(lineup.line_number),
      player_1_member_id: lineup.player_1_member_id || null,
      player_2_member_id: lineup.player_2_member_id || null,
      updated_at: now,
    }));

    const invalidLine = rows.find(
      (row) =>
        !Number.isInteger(row.line_number) ||
        row.line_number < 1 ||
        !row.player_1_member_id ||
        !row.player_2_member_id ||
        String(row.player_1_member_id) === String(row.player_2_member_id)
    );

    if (invalidLine) {
      return NextResponse.json(
        { success: false, error: "Each match setup line needs two different players." },
        { status: 400 }
      );
    }

    const { data: savedRows, error: saveError } = await supabase
      .from("match_lineups")
      .upsert(rows, {
        onConflict: "match_id,team_id,line_number",
      })
      .select("match_id, team_id, line_number, player_1_member_id, player_2_member_id");

    if (saveError) throw saveError;

    return NextResponse.json({
      success: true,
      lineups: savedRows || rows,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
