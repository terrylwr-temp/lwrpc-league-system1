import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { runPbccMatchReminders } from "../../../lib/pbccReminders";

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

function authorizeCronRequest(req) {
  const authHeader = req.headers.get("authorization") || "";
  const cronSecrets = [process.env.CRON_SECRET, process.env.PBCC_REMINDER_SECRET]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (cronSecrets.length === 0) return process.env.NODE_ENV !== "production";
  return cronSecrets.some((cronSecret) => authHeader === `Bearer ${cronSecret}`);
}

async function handlePbccReminderRequest(req, options = {}) {
  try {
    if (!authorizeCronRequest(req)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = serviceClient();
    const result = await runPbccMatchReminders(supabase, options);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  return handlePbccReminderRequest(req, { dryRun: false });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  return handlePbccReminderRequest(req, { dryRun: body?.dryRun === true });
}
