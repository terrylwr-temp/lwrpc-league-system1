import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SYSTEM_SETTINGS, mergeSystemSettings } from "../../lib/systemSettings";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("System settings require SUPABASE_SERVICE_ROLE_KEY on the server.");
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

  if (!token) {
    return { error: "Not authorized.", status: 401 };
  }

  const authSupabase = anonClient();
  const { data: userData, error: userError } = await authSupabase.auth.getUser(token);

  if (userError || !userData?.user?.email) {
    return { error: "Not authorized.", status: 401 };
  }

  const supabase = adminClient();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, email, user_roles(role)")
    .eq("email", userData.user.email)
    .maybeSingle();

  if (memberError) {
    return { error: memberError.message, status: 500 };
  }

  const role = member?.user_roles?.[0]?.role || "player";

  if (role !== "commissioner") {
    return { error: "Only Commissioners can save system settings.", status: 403 };
  }

  return { member };
}

export async function GET() {
  try {
    const supabase = adminClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value");

    if (error) {
      return NextResponse.json({
        success: true,
        settings: DEFAULT_SYSTEM_SETTINGS,
        schemaMissing: error.code === "42P01",
        warning: error.code === "42P01" ? "Run supabase-system-settings.sql to save custom system settings." : error.message,
      });
    }

    const savedSettings = Object.fromEntries(
      (data || []).map((row) => [row.setting_key, row.setting_value])
    );

    return NextResponse.json({
      success: true,
      settings: mergeSystemSettings(savedSettings),
      schemaMissing: false,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await requireManager(req);

    if (auth.error) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { settings } = await req.json();
    const now = new Date().toISOString();
    const rows = Object.entries(mergeSystemSettings(settings)).map(([setting_key, setting_value]) => ({
      setting_key,
      setting_value: String(setting_value || ""),
      updated_at: now,
    }));
    const supabase = adminClient();
    const { error } = await supabase
      .from("system_settings")
      .upsert(rows, { onConflict: "setting_key" });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.code === "42P01"
            ? "System settings table is missing. Run supabase-system-settings.sql, then try again."
            : error.message,
        },
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
