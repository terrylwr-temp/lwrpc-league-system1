import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { hasRole } from "../../lib/permissions";
import { runMatchSetupReminders } from "../../lib/matchSetupReminders";

export const runtime = "nodejs";

function serviceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase service-role configuration.");
  }

  return createClient(url, key);
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

function isVercelCronRequest(req) {
  return (req.headers.get("user-agent") || "").includes("vercel-cron/1.0");
}

async function authorizeReminderRequest(req, supabase, { allowVercelCron = false } = {}) {
  const authHeader = req.headers.get("authorization") || "";
  const cronSecret = process.env.MATCH_SETUP_REMINDER_SECRET || process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  if (allowVercelCron && isVercelCronRequest(req)) {
    return true;
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (token) {
    const authSupabase = anonClient();
    const { data: userData, error: userError } = await authSupabase.auth.getUser(token);

    if (userError || !userData?.user?.email) {
      return false;
    }

    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, email, user_roles(role)")
      .eq("email", userData.user.email)
      .maybeSingle();

    if (memberError) {
      throw new Error(memberError.message);
    }

    const role = member?.user_roles?.[0]?.role || "player";
    return hasRole(role, "league_manager");
  }

  return !cronSecret && process.env.NODE_ENV !== "production";
}

async function handleReminderRequest(req, options = {}) {
  try {
    const supabase = serviceClient();
    const authorized = await authorizeReminderRequest(req, supabase, {
      allowVercelCron: options.allowVercelCron === true,
    });

    if (!authorized) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await runMatchSetupReminders(supabase, options);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  return handleReminderRequest(req, { dryRun: false, allowVercelCron: true });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  return handleReminderRequest(req, { dryRun: body?.dryRun === true });
}
