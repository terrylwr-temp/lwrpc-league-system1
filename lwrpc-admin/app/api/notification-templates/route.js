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
    throw new Error("Notification template saves require SUPABASE_SERVICE_ROLE_KEY on the server.");
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
    const { data: roleRows, error: roleError } = await supabase
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

    const role = roleRows?.user_roles?.[0]?.role || "player";

    if (!hasRole(role, "league_manager")) {
      return NextResponse.json(
        { success: false, error: "Only League Managers and Commissioners can save dashboard messages." },
        { status: 403 }
      );
    }

    const { template_key, subject, body } = await req.json();

    if (!template_key) {
      return NextResponse.json(
        { success: false, error: "Template key is required." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("notification_templates")
      .upsert(
        {
          template_key,
          subject: subject || "",
          body: body || "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "template_key" }
      );

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
