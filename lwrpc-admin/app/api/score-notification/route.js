import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmailMessages, sendSmsMessages } from "../../lib/notifications";
import { EMAIL_TEMPLATE_KEYS, renderEmailTemplate } from "../../lib/emailTemplates";
import { loadEmailTemplate, loadServerSystemSettings } from "../../lib/serverEmailTemplates";
import { formatDisplayDateWithWeekday } from "../../lib/dateTime";
import { hasRole } from "../../lib/permissions";
import { highestRoleForMembers } from "../../lib/memberLookup";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Score notifications require SUPABASE_SERVICE_ROLE_KEY on the server.");
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

async function requireScoreNotificationSender(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) return { error: "Not authorized.", status: 401 };

  const authSupabase = anonClient();
  const { data: userData, error: userError } = await authSupabase.auth.getUser(token);
  if (userError || !userData?.user?.email) {
    return { error: "Not authorized.", status: 401 };
  }

  const supabase = adminClient();
  const { data: memberRows, error: memberError } = await supabase
    .from("members")
    .select("id, email, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true });

  if (memberError) throw memberError;

  const role = highestRoleForMembers(memberRows || []);
  if (!hasRole(role, "captain")) {
    return { error: "Only captains, Club Pros, League Managers, and Commissioners can send score notifications.", status: 403 };
  }

  return { role };
}

export async function POST(req) {
  try {
    const auth = await requireScoreNotificationSender(req);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();

    const {
      emails,
      phones,
      homeTeam,
      awayTeam,
      score,
      matchDate,
      enteredBy,
      notificationType = "submitted"
    } = body;

    const emailRecipients = Array.isArray(emails) ? emails : [];
    const phoneRecipients = Array.isArray(phones) ? phones : [];

    if (emailRecipients.length === 0 && phoneRecipients.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No notification recipients"
      });
    }

    if (emailRecipients.length + phoneRecipients.length > 20) {
      return NextResponse.json(
        { success: false, error: "A score notification can be sent to at most 20 recipients." },
        { status: 400 }
      );
    }

    const isVerified = notificationType === "verified";
    const isChanged = notificationType === "changed";
    const template = await loadEmailTemplate(
      isChanged
        ? EMAIL_TEMPLATE_KEYS.scoreChanged
        : isVerified
          ? EMAIL_TEMPLATE_KEYS.scoreValidated
          : EMAIL_TEMPLATE_KEYS.scoreSubmitted
    );
    const systemSettings = await loadServerSystemSettings();
    const rendered = renderEmailTemplate(template, {
      home_team: homeTeam || "Home",
      away_team: awayTeam || "Away",
      match_date: formatDisplayDateWithWeekday(matchDate, "N/A"),
      score: score || "N/A",
      actor_name: enteredBy || "Unknown",
      league_site_url: systemSettings.league_site_url,
      main_email: systemSettings.main_email,
    });

    const smsBody = isChanged
      ? `LWRPC scores changed and verified: ${homeTeam} vs ${awayTeam}, ${score}.`
      : isVerified
        ? `LWRPC scores validated: ${homeTeam} vs ${awayTeam}, ${score}.`
        : `LWRPC scores entered: ${homeTeam} vs ${awayTeam}, ${score}. Please log in to verify or dispute.`;

    const [emailResult, smsResult] = await Promise.all([
      sendEmailMessages({
        emails: emailRecipients,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      }),
      sendSmsMessages({
        phones: phoneRecipients,
        body: smsBody,
      }),
    ]);

    return NextResponse.json({
      success: true,
      email: emailResult,
      sms: smsResult
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err.message
    });
  }
}
