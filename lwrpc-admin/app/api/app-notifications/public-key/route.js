import { NextResponse } from "next/server";
import { appNotificationsConfigured, publicVapidKey } from "../../../lib/appNotifications";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    success: true,
    configured: appNotificationsConfigured(),
    publicKey: publicVapidKey(),
  });
}
