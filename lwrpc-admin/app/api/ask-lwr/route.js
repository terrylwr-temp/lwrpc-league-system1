import { NextResponse } from "next/server";
import { generateOfficialAnswer } from "../../lib/aiAnswerGeneration";
import { retrieveOfficialEvidence } from "../../lib/aiRetrieval";
import { runPlayerOfficialAnswer } from "../../lib/askLwrPlayerAnswer";
import { authorizeAdminRequest } from "../../lib/serverSupabase";
import { observeQualityRequest } from "../../lib/aiQualityCapture";
import {authenticateLive,needsLive,runLive} from '../../lib/liveLmsService.js';

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    if(needsLive(body)) {
      const result=await runLive({body,principal:await authenticateLive(req)});
      if(result)return NextResponse.json({success:true,result},{headers:{'Cache-Control':'private, no-store'}});
      body.conversationReceipt=null;
    }
    const authorization = await authorizeAdminRequest(req, "player");
    if (authorization.error) return failure(authorization.status);

    const { result } = await observeQualityRequest({ supabase: authorization.supabase, run: (answerId, trace) => runPlayerOfficialAnswer({
      body, role: authorization.role, userId: authorization.user.id, memberId: authorization.memberRows?.[0]?.id || null, supabase: authorization.supabase,
      answerId, retrieveOfficialEvidence: args => { trace.stage3Invoked = true; return retrieveOfficialEvidence(args); }, generateOfficialAnswer,
    }) });
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
