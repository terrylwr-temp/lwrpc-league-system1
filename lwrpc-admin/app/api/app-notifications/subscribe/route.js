import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeAppNotificationPhone } from "../../../lib/appNotifications";

export const runtime = "nodejs";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("App Notifications require Supabase service-role configuration.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function subscriptionKeys(subscription) {
  return {
    endpoint: String(subscription?.endpoint || "").trim(),
    p256dh: String(subscription?.keys?.p256dh || "").trim(),
    auth: String(subscription?.keys?.auth || "").trim(),
  };
}

async function resolvePbccRecipient(supabase, body) {
  const groupId = String(body.groupId || "").trim();
  const phone = normalizeAppNotificationPhone(body.phone);
  if (!groupId || !phone) throw new Error("Sign in to PBCourtCommand before enabling App Notifications.");

  const { data: players, error } = await supabase
    .from("round_robin_players")
    .select("id, group_id, display_name, phone, email, is_active")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("display_name", { ascending: true });
  if (error) throw error;

  const matches = (players || []).filter((player) => normalizeAppNotificationPhone(player.phone) === phone);
  if (matches.length !== 1) {
    throw new Error(matches.length > 1 ? "More than one PBCourtCommand player uses this phone number." : "Your PBCourtCommand phone number could not be verified.");
  }

  return {
    app_scope: "pbcc",
    round_robin_group_id: groupId,
    round_robin_player_id: matches[0].id,
    recipient_email: String(matches[0].email || "").trim().toLowerCase() || null,
    recipient_phone: phone,
  };
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { endpoint, p256dh, auth } = subscriptionKeys(body.subscription);
    const action = String(body.action || "subscribe");
    const supabase = serviceClient();

    if (!endpoint) throw new Error("Missing App Notification subscription.");

    if (action === "unsubscribe") {
      const { error } = await supabase
        .from("app_notification_subscriptions")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("endpoint", endpoint);
      if (error) throw error;
      return NextResponse.json({ success: true, enabled: false });
    }

    if (!p256dh || !auth) throw new Error("Missing App Notification subscription keys.");

    const scope = String(body.scope || "pbcc").toLowerCase();
    if (scope !== "pbcc") {
      throw new Error("App Notifications are only available for PBCourtCommand.");
    }

    const recipient = await resolvePbccRecipient(supabase, body);

    const { error } = await supabase
      .from("app_notification_subscriptions")
      .upsert({
        endpoint,
        p256dh,
        auth,
        ...recipient,
        user_agent: String(req.headers.get("user-agent") || "").slice(0, 500),
        enabled: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });

    if (error) throw error;

    return NextResponse.json({ success: true, enabled: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Unable to update App Notifications." },
      { status: 400 }
    );
  }
}
