import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmailMessages, sendSmsMessages } from "../../lib/notifications";
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
    throw new Error("Notifications require SUPABASE_SERVICE_ROLE_KEY on the server.");
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

async function requireNotificationSender(req) {
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
    return { error: "Only captains, Club Pros, League Managers, and Commissioners can send notifications.", status: 403 };
  }

  return { role };
}

export async function POST(req) {
  try {
    const auth = await requireNotificationSender(req);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const {
      emails,
      phones,
      subject,
      text,
      html,
      smsBody,
    } = body;

    const emailRecipients = Array.isArray(emails) ? emails : [];
    const phoneRecipients = Array.isArray(phones) ? phones : [];

    if (emailRecipients.length + phoneRecipients.length > 100) {
      return NextResponse.json(
        { success: false, error: "A notification can be sent to at most 100 recipients." },
        { status: 400 }
      );
    }

    const [emailResult, smsResult] = await Promise.all([
      sendEmailMessages({
        emails: emailRecipients,
        subject,
        text,
        html,
      }),
      sendSmsMessages({
        phones: phoneRecipients,
        body: smsBody || text,
      }),
    ]);

    return NextResponse.json({
      success: true,
      email: emailResult,
      sms: smsResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
