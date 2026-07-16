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
    throw new Error("Master Reset requires SUPABASE_SERVICE_ROLE_KEY on the server.");
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
    const { data: memberRow, error: roleError } = await supabase
      .from("members")
      .select("id, email, user_roles(role)")
      .eq("email", userData.user.email)
      .maybeSingle();

    if (roleError) {
      return NextResponse.json(
        { success: false, error: roleError.message },
        { status: 500 }
      );
    }

    const role = memberRow?.user_roles?.[0]?.role || "player";

    if (!hasRole(role, "commissioner")) {
      return NextResponse.json(
        { success: false, error: "Only Commissioners can run Master Reset All." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (body.confirmation !== "MASTER RESET ALL") {
      return NextResponse.json(
        { success: false, error: "Confirmation text did not match." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: matchRows, error: matchLoadError } = await supabase
      .from("matches")
      .select("id");

    if (matchLoadError) throw matchLoadError;

    const matchIds = (matchRows || []).map((match) => match.id);
    let lineIds = [];

    if (matchIds.length > 0) {
      const { data: lineRows, error: lineLoadError } = await supabase
        .from("match_lines")
        .select("id")
        .in("match_id", matchIds);

      if (lineLoadError) throw lineLoadError;
      lineIds = (lineRows || []).map((line) => line.id);

      if (lineIds.length > 0) {
        await checkedDelete(supabase.from("line_games").delete().in("match_line_id", lineIds));
      }

      await checkedDelete(supabase.from("match_lineups").delete().in("match_id", matchIds));
      await checkedDelete(supabase.from("match_lines").delete().in("match_id", matchIds));
      await checkedDelete(supabase.from("matches").delete().in("id", matchIds));
    }

    await checkedDelete(supabase.from("team_byes").delete().not("id", "is", null));
    await checkedDelete(supabase.from("team_standings").delete().not("id", "is", null));
    await checkedDelete(supabase.from("team_members").delete().not("id", "is", null));

    const { error: teamError } = await supabase
      .from("teams")
      .update({
        captain_member_id: null,
        co_captain_member_id: null,
        co_captain_2_member_id: null,
        updated_at: now,
      })
      .not("id", "is", null);

    if (teamError) throw teamError;

    const { error: captainRoleError } = await supabase
      .from("user_roles")
      .update({
        role: "player",
        updated_at: now,
      })
      .eq("role", "captain");

    if (captainRoleError) throw captainRoleError;

    return NextResponse.json({
      success: true,
      deleted: {
        matches: matchIds.length,
        match_lines: lineIds.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function checkedDelete(query) {
  const { error } = await query;
  if (error) throw error;
}
