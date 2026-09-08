import {rejectViewAsMutation} from '../../../lib/viewAsBoundary.js';
import { NextResponse } from "next/server";
import { appNotificationsConfigured, publicVapidKey } from "../../../lib/appNotifications";

export const runtime = "nodejs";

export async function GET(request) {
  const denied=rejectViewAsMutation(request);if(denied)return denied;
  return NextResponse.json({
    success: true,
    configured: appNotificationsConfigured(),
    publicKey: publicVapidKey(),
  });
}
