import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSmsMessages } from "../../../lib/notifications";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Tournament SMS requires SUPABASE_SERVICE_ROLE_KEY on the server.");
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
    const message = String(body.message || "").trim();
    const phones = Array.isArray(body.phones) ? body.phones : [];

    if (!tournamentId || !eventCode) {
      return NextResponse.json(
        { success: false, error: "Tournament and event code are required." },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: "SMS message is required." },
        { status: 400 }
      );
    }

    const supabase = adminClient();
    const { data: tournament, error } = await loadTournament(supabase, tournamentId);

    if (error) throw error;

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

    const sms = await sendSmsMessages({
      phones,
      body: message,
    });

    await supabase.from("tournament_activity_log").insert({
      tournament_id: tournament.id,
      log_type: "sms",
      message: `SMS sent to ${sms.sent || 0} recipient${Number(sms.sent || 0) === 1 ? "" : "s"}.`,
      metadata: {
        requestedRecipients: phones.length,
        result: sms,
      },
    });

    return NextResponse.json({
      success: true,
      sms,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function loadTournament(supabase, identifier) {
  const query = supabase.from("tournaments").select("id, admin_code");

  return isUuid(identifier)
    ? await query.eq("id", identifier).maybeSingle()
    : await query.eq("slug", identifier).maybeSingle();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
