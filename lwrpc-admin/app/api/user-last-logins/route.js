import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasRole } from "../../lib/permissions";
import { normalizeEmailAddress } from "../../lib/email";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Last login lookup requires SUPABASE_SERVICE_ROLE_KEY on the server.");
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

export async function GET(req) {
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
      .select("id, user_roles(role)")
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
        { success: false, error: "Only Commissioners can view user last logins." },
        { status: 403 }
      );
    }

    const lastLoginsByEmail = {};
    let page = 1;
    const perPage = 1000;

    while (page < 20) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) throw error;

      (data?.users || []).forEach((user) => {
        const email = normalizeEmailAddress(user.email);
        if (email) lastLoginsByEmail[email] = user.last_sign_in_at || null;
      });

      if (!data?.users || data.users.length < perPage) break;
      page += 1;
    }

    return NextResponse.json({
      success: true,
      lastLoginsByEmail,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
