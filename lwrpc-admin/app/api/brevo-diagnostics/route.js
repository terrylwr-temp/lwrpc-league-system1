import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasRole } from "../../lib/permissions";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Brevo diagnostics require SUPABASE_SERVICE_ROLE_KEY on the server.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase anon credentials are not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requireManager(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: "Not authorized.", status: 401 };
  const { data: userData, error: userError } = await anonClient().auth.getUser(token);
  if (userError || !userData?.user?.email) return { error: "Not authorized.", status: 401 };

  const { data: member, error: roleError } = await adminClient()
    .from("members")
    .select("id, email, user_roles(role)")
    .eq("email", userData.user.email)
    .maybeSingle();
  if (roleError) return { error: roleError.message, status: 500 };
  if (!hasRole(member?.user_roles?.[0]?.role || "player", "league_manager")) {
    return { error: "Only League Managers and Commissioners can run Brevo diagnostics.", status: 403 };
  }
  return { member };
}

function envSummary(name) {
  const rawValue = process.env[name];
  const value = String(rawValue || "");
  const trimmed = value.trim();
  const wrappedInQuotes = (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return {
    name,
    present: rawValue !== undefined,
    trimmedPresent: Boolean(trimmed),
    prefix: trimmed.slice(0, 2),
    trimmedLength: trimmed.length,
    hasLeadingOrTrailingWhitespace: value !== trimmed,
    hasInternalWhitespace: /\s/.test(trimmed),
    wrappedInQuotes,
  };
}

async function checkBrevoSender(apiKey, fromEmail) {
  if (!apiKey || !fromEmail) return { checked: false, ok: false, status: null, message: "Missing BREVO_API_KEY or BREVO_FROM_EMAIL." };
  const response = await fetch("https://api.brevo.com/v3/senders", {
    headers: { Accept: "application/json", "api-key": apiKey },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  const configuredSender = (data.senders || []).find((sender) => String(sender?.email || "").trim().toLowerCase() === fromEmail.toLowerCase());
  const senderIsActive = Boolean(configuredSender?.active);
  return {
    checked: true,
    ok: response.ok && senderIsActive,
    status: response.status,
    message: !response.ok
      ? data.message || data.code || "Brevo authentication check failed."
      : !configuredSender
        ? "Brevo accepted the API key, but BREVO_FROM_EMAIL is not a registered sender."
        : !senderIsActive
          ? "Brevo accepted the API key, but BREVO_FROM_EMAIL is not active."
          : "Brevo accepted the API key and found the active configured sender.",
  };
}

export async function GET(req) {
  try {
    const auth = await requireManager(req);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const apiKey = String(process.env.BREVO_API_KEY || "").trim();
    const fromEmail = String(process.env.BREVO_FROM_EMAIL || "").trim();
    return NextResponse.json({
      success: true,
      fromEmail,
      variables: [envSummary("BREVO_API_KEY"), envSummary("BREVO_FROM_EMAIL"), envSummary("BREVO_FROM_NAME")],
      brevoSenderCheck: await checkBrevoSender(apiKey, fromEmail),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
