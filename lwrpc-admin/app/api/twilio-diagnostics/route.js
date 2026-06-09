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
    throw new Error("Twilio diagnostics require SUPABASE_SERVICE_ROLE_KEY on the server.");
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
  const { data: member, error: roleError } = await supabase
    .from("members")
    .select("id, email, user_roles(role)")
    .eq("email", userData.user.email)
    .maybeSingle();

  if (roleError) {
    return { error: roleError.message, status: 500 };
  }

  const role = member?.user_roles?.[0]?.role || "player";

  if (!hasRole(role, "league_manager")) {
    return { error: "Only League Managers and Commissioners can run Twilio diagnostics.", status: 403 };
  }

  return { member };
}

function envSummary(name, expectedPrefix = "") {
  const rawValue = process.env[name];
  const value = String(rawValue || "");
  const trimmed = value.trim();
  const prefix = trimmed.slice(0, expectedPrefix.length || 2);
  const wrappedInQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  return {
    name,
    present: rawValue !== undefined,
    trimmedPresent: Boolean(trimmed),
    length: value.length,
    trimmedLength: trimmed.length,
    prefix,
    expectedPrefix,
    startsWithExpectedPrefix: expectedPrefix ? trimmed.startsWith(expectedPrefix) : null,
    hasLeadingOrTrailingWhitespace: value !== trimmed,
    hasInternalWhitespace: /\s/.test(trimmed),
    wrappedInQuotes,
  };
}

function likelyWrongTwilioKeys() {
  return Object.keys(process.env)
    .filter((key) => key.toLowerCase().includes("twilio"))
    .filter((key) => ![
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_MESSAGING_SERVICE_SID",
      "TWILIO_FROM_PHONE_NUMBER",
    ].includes(key))
    .sort();
}

async function checkTwilioAuth(accountSid, authToken) {
  if (!accountSid || !authToken) {
    return {
      checked: false,
      ok: false,
      status: null,
      message: "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN.",
    };
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}.json`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      cache: "no-store",
    }
  );
  const data = await response.json().catch(() => ({}));

  return {
    checked: true,
    ok: response.ok,
    status: response.status,
    message: response.ok ? "Twilio accepted the Account SID/Auth Token pair." : data.message || "Twilio authentication check failed.",
    code: data.code || null,
  };
}

export async function GET(req) {
  try {
    const auth = await requireManager(req);

    if (auth.error) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const accountSid = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
    const authToken = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
    const messagingServiceSid = String(process.env.TWILIO_MESSAGING_SERVICE_SID || "").trim();
    const fromPhoneNumber = String(process.env.TWILIO_FROM_PHONE_NUMBER || "").trim();

    return NextResponse.json({
      success: true,
      senderMode: messagingServiceSid ? "messaging_service" : fromPhoneNumber ? "from_phone_number" : "not_configured",
      variables: [
        envSummary("TWILIO_ACCOUNT_SID", "AC"),
        envSummary("TWILIO_AUTH_TOKEN"),
        envSummary("TWILIO_MESSAGING_SERVICE_SID", "MG"),
        envSummary("TWILIO_FROM_PHONE_NUMBER", "+"),
      ],
      unexpectedTwilioVariableNames: likelyWrongTwilioKeys(),
      twilioAuthCheck: await checkTwilioAuth(accountSid, authToken),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
