import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../lib/serverSupabase";

export const runtime = "nodejs";
export async function GET(req) {
  const authorization = await authorizeAdminRequest(req, "league_manager");
  if (authorization.error) return NextResponse.json({ success: false, error: "Manager access required." }, { status: authorization.status });
  try {
    const { data, error } = await authorization.supabase.from("ai_request_outcomes").select("recorded_at").order("recorded_at", { ascending: false }).limit(1).abortSignal(AbortSignal.timeout(1000));
    if (error) throw new Error("unavailable");
    // A database success cannot establish independent hosting-log health.
    return NextResponse.json({ success: true, result: { status: "unknown", lastRecordedAt: data?.[0]?.recorded_at || null, independentSignal: "operator_log_verification_required" } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: true, result: { status: "degraded", lastRecordedAt: null, independentSignal: "operator_log_verification_required" } }, { headers: { "Cache-Control": "private, no-store" } });
  }
}
