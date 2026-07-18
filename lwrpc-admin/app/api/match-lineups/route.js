import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasRole } from "../../lib/permissions";
import { highestRoleForMembers } from "../../lib/memberLookup";
import { currentMemberRating, divisionRatingIssue, numericRating } from "../../lib/ratingEligibility";

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
      .select(`
        id,
        home_team_id,
        away_team_id,
        leagues (
          season_id
        ),
        divisions (
          id,
          number_of_lines,
          primary_team_type,
          secondary_number_of_lines,
          secondary_team_type,
          rating_type,
          min_dupr,
          max_dupr,
          team_dupr_max
        )
      `)
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
        .select("member_id, members(id, first_name, last_name, self_rating)")
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


      let ratingRows = [];
      const seasonId = match.leagues?.season_id;

      if (seasonId) {
        const { data, error } = await supabase
          .from("member_season_ratings")
          .select("member_id, season_dupr_rating, season_primetime_rating")
          .eq("season_id", seasonId)
          .in("member_id", playerIds);

        if (error) throw error;
        ratingRows = data || [];
      }

      const ratingByMemberId = new Map(
        ratingRows.map((row) => [String(row.member_id), row])
      );
      const memberById = new Map(
        (rosterRows || []).map((row) => [String(row.member_id), row.members])
      );
      const ratingType = match.divisions?.rating_type || "dupr";
      const ratingLabel = ratingType === "primetime" ? "PT" : ratingType === "self_rating" ? "Self" : "DUPR";
      const currentRatingByMemberId = new Map();
      const ratingIssues = playerIds
        .map((playerId) => {
          const member = memberById.get(String(playerId));
          const rating = currentMemberRating(
            member,
            ratingByMemberId.get(String(playerId)),
            ratingType
          );
          currentRatingByMemberId.set(String(playerId), rating);
          const playerName =
            ((member?.first_name || "") + " " + (member?.last_name || "")).trim() ||
            "Selected player";

          return divisionRatingIssue({
            rating,
            minRating: match.divisions?.min_dupr,
            maxRating: match.divisions?.max_dupr,
            ratingLabel,
            playerName,
          });
        })
        .filter(Boolean);

      if (ratingIssues.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: ["Match setup cannot be saved because current ratings are outside the division requirements.", "", ...ratingIssues.map((issue) => "- " + issue)].join("\n"),
          },
          { status: 400 }
        );
      }

      const doublesMaximum = numericRating(match.divisions?.team_dupr_max);

      if (doublesMaximum !== null) {
        const overMaximumLine = lineups.find((lineup) => {
          const player1Rating = currentRatingByMemberId.get(String(lineup.player_1_member_id));
          const player2Rating = currentRatingByMemberId.get(String(lineup.player_2_member_id));
          return player1Rating !== null && player2Rating !== null &&
            player1Rating + player2Rating > doublesMaximum;
        });

        if (overMaximumLine) {
          const combinedRating =
            currentRatingByMemberId.get(String(overMaximumLine.player_1_member_id)) +
            currentRatingByMemberId.get(String(overMaximumLine.player_2_member_id));

          return NextResponse.json(
            {
              success: false,
              error: "Match setup cannot be saved. Line " + Number(overMaximumLine.line_number) +
                " has a combined " + ratingLabel + " rating of " + combinedRating.toFixed(2) +
                ", above the division doubles-team maximum of " + doublesMaximum.toFixed(2) + ".",
            },
            { status: 400 }
          );
        }
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

    const duplicateByTeamType = duplicatePlayerByTeamType(rows, match.divisions);

    if (duplicateByTeamType) {
      return NextResponse.json(
        {
          success: false,
          error: `A player can only be used once in the ${matchSetupTeamTypeLabel(duplicateByTeamType)} match setup teams.`,
        },
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

function duplicatePlayerByTeamType(rows, division) {
  const seen = new Set();

  for (const row of rows) {
    const type = matchSetupLineType(division, row.line_number);
    const playerIds = [row.player_1_member_id, row.player_2_member_id].filter(Boolean);

    for (const playerId of playerIds) {
      const key = `${type}:${playerId}`;
      if (seen.has(key)) return type;
      seen.add(key);
    }
  }

  return "";
}

function matchSetupTeamBlocks(division = {}) {
  const primaryCount = Math.max(1, Number(division?.number_of_lines || 3));
  const primaryType = division?.primary_team_type || "gender_doubles";
  const secondaryCount = Math.max(0, Number(division?.secondary_number_of_lines || 0));
  const secondaryType = division?.secondary_team_type || "";
  const blocks = [
    {
      start: 1,
      count: primaryCount,
      type: primaryType,
    },
  ];

  if (secondaryCount > 0 && secondaryType && secondaryType !== primaryType) {
    blocks.push({
      start: primaryCount + 1,
      count: secondaryCount,
      type: secondaryType,
    });
  }

  return blocks;
}

function matchSetupLineType(division = {}, lineNumber) {
  const number = Number(lineNumber || 0);
  const block = matchSetupTeamBlocks(division).find((candidate) => (
    number >= candidate.start && number < candidate.start + candidate.count
  ));

  return block?.type || "gender_doubles";
}

function matchSetupTeamTypeLabel(type) {
  if (type === "mixed_doubles") return "Mixed Doubles";
  return "Gender Doubles";
}
