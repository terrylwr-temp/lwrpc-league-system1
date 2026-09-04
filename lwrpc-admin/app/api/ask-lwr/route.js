import { NextResponse } from "next/server";
import { generateOfficialAnswer } from "../../lib/aiAnswerGeneration";
import { retrieveOfficialEvidence } from "../../lib/aiRetrieval";
import { runPlayerOfficialAnswer } from "../../lib/askLwrPlayerAnswer";
import { authorizeAdminRequest } from "../../lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const authorization = await authorizeAdminRequest(req, "player");
    if (authorization.error) return failure(authorization.status);
    const body = await req.json().catch(() => ({}));

    const { result } = await runPlayerOfficialAnswer({
      body, role: authorization.role, userId: authorization.user.id, supabase: authorization.supabase,
      retrieveOfficialEvidence, generateOfficialAnswer,
    });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Ask LWR player answer failed", { category: error?.name || "server_failure" });
    return failure(500);
  }
}

function failure(status) {
  const error = status === 401 ? "Please sign in to use Ask LWR Pickleball Club AI." : "Sorry, I couldn't complete that request right now. Please try again.";
  return NextResponse.json({ success: false, error }, { status });
}
