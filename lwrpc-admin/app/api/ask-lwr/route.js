import { NextResponse } from "next/server";
import { generateOfficialAnswer } from "../../lib/aiAnswerGeneration";
import { retrieveOfficialEvidence } from "../../lib/aiRetrieval";
import { isUnsupportedOperationalQuestion, playerFallbackResult, toPlayerAnswerResult } from "../../lib/askLwrPlayerAnswer";
import { authorizeAdminRequest } from "../../lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const authorization = await authorizeAdminRequest(req, "player");
    if (authorization.error) return failure(authorization.status);
    const body = await req.json().catch(() => ({}));

    if (isUnsupportedOperationalQuestion(body.question)) {
      return NextResponse.json({ success: true, result: playerFallbackResult() });
    }

    // The client can suggest only soft retrieval context. The authenticated role
    // is set here and no client-supplied scope IDs are trusted or forwarded.
    const context = body?.context && typeof body.context === "object" ? body.context : {};
    const retrieval = await retrieveOfficialEvidence({
      supabase: authorization.supabase,
      body: {
        question: body.question,
        askAbout: "all",
        context: {
          currentPath: context.currentPath,
          featureModule: context.featureModule,
          userRole: authorization.role,
        },
      },
    });
    const answer = await generateOfficialAnswer({ retrieval, supabase: authorization.supabase });
    return NextResponse.json({ success: true, result: toPlayerAnswerResult(answer) });
  } catch (error) {
    console.error("Ask LWR player answer failed", { category: error?.name || "server_failure" });
    return failure(500);
  }
}

function failure(status) {
  const error = status === 401 ? "Please sign in to use Ask LWR Pickleball AI." : "Sorry, I couldn't complete that request right now. Please try again.";
  return NextResponse.json({ success: false, error }, { status });
}
