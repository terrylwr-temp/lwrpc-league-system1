import { NextResponse } from "next/server";
import { feedbackTransition, readFeedbackReceipt } from "../../../lib/aiConversation";
import { authorizeAdminRequest } from "../../../lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const authorization = await authorizeAdminRequest(req, "player");
    if (authorization.error) return failure(authorization.status);
    const body = await req.json().catch(() => ({}));
    if (typeof body?.helpful !== "boolean") return failure(400);
    const claims = readFeedbackReceipt(body.receipt, authorization.user.id);
    const { data: existing, error: existingError } = await authorization.supabase
      .from("ai_answer_feedback_events")
      .select("id, helpful, created_at")
      .eq("answer_id", claims.answerId)
      .eq("auth_user_id", authorization.user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (existingError) throw existingError;
    const latest = existing?.[0] || null;
    if (!feedbackTransition(latest?.helpful, body.helpful)) return NextResponse.json({ success: true, result: { helpful: latest.helpful, changed: false, feedbackId: latest.id } });
    const event = {
      answer_id: claims.answerId, auth_user_id: authorization.user.id, member_id: claims.memberId || authorization.memberRows?.[0]?.id || null,
      helpful: body.helpful, original_question: claims.originalQuestion, effective_question: claims.effectiveQuestion, generated_answer: claims.answer,
      source_snapshot: claims.sources || [], selection_snapshot: { selectedEvidence: claims.selectedEvidence || [], retrieval: claims.retrieval || {} },
      assistant_version: claims.assistantVersion || "", model: claims.model || "", comment: null,
    };
    const { data: inserted, error: insertError } = await authorization.supabase.from("ai_answer_feedback_events").insert(event).select("id, helpful, created_at").single();
    if (insertError) throw insertError;
    return NextResponse.json({ success: true, result: { helpful: inserted.helpful, changed: true, feedbackId: inserted.id } });
  } catch (error) {
    console.error("Ask LWR feedback failed", { category: error?.name || "server_failure" });
    return failure(400);
  }
}

function failure(status) {
  const error = status === 401 ? "Please sign in to provide feedback." : "Sorry, I couldn't save that feedback right now.";
  return NextResponse.json({ success: false, error }, { status });
}
