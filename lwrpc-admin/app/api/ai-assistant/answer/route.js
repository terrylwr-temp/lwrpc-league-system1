import { conversationDiagnostics } from "../../../lib/aiConversationDiagnostics";
import { NextResponse } from "next/server";
import { answerGenerationDiagnostic, generateOfficialAnswer } from "../../../lib/aiAnswerGeneration";
import { retrieveOfficialEvidence } from "../../../lib/aiRetrieval";
import { createClarificationReceipt, createFollowUpReceipt } from "../../../lib/aiConversation";
import { resolveOfficialConversation, playerFallbackResult } from "../../../lib/askLwrPlayerAnswer";
import { authorizeAdminRequest } from "../../../lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const authorization = await authorizeAdminRequest(req, "league_manager");
    if (authorization.error) return failure(authorization.error, authorization.status);
    const body = await req.json().catch(() => ({}));
    const started = performance.now();
    const conversationResolution = resolveOfficialConversation({ question: body.question, userId: authorization.user.id, receipt: body.conversationReceipt });
    if (conversationResolution.kind !== "resolved") return NextResponse.json({
      success: true,
      result: managerClarificationResult(body, conversationResolution, conversationResolution.clarification?.category === "color_subject" ? createClarificationReceipt(authorization.user.id, conversationResolution.rawQuestion, conversationResolution.clarification.category) : null),
    });
    const retrieval = await retrieveOfficialEvidence({ supabase: authorization.supabase, body: { ...body, question: conversationResolution.effectiveQuestion } });
    retrieval.conversationResolution = conversationResolution;
    const [answer, documentsConsidered] = await Promise.all([
      generateOfficialAnswer({ retrieval, supabase: authorization.supabase }),
      eligibleDocuments(authorization.supabase),
    ]);
    return NextResponse.json({
      success: true,
      result: {
        retrieval: { ...retrieval, documentsConsidered, conversationResolution: conversationDiagnostics(conversationResolution, { stage3Invoked: true, answer }) },
        answer: { ...answer, metrics: { ...answer.metrics, retrievalMs: retrieval.metrics.totalMs, totalMs: Math.round(performance.now() - started) } },
        conversationReceipt: answer.evidenceSufficient ? createFollowUpReceipt(authorization.user.id, conversationResolution.effectiveQuestion) : null,
      },
    });
  } catch (error) {
    const diagnostic = answerGenerationDiagnostic(error);
    console.error("Ask LWR Pickleball AI answer generation failed", diagnostic);
    return failure(error.message || "Official-document answer generation failed.", diagnostic.category === "server_failure" ? 400 : 502, diagnostic);
  }
}

function managerClarificationResult(body, resolution, conversationReceipt) {
  const message = resolution.clarification?.message || playerFallbackResult("protected").answer;
  const request = { question: resolution.rawQuestion || String(body.question || ""), askAbout: body.askAbout || "all", context: body.context || {} };
  return {
    retrieval: {
      request, conversationResolution: conversationDiagnostics(resolution), candidates: [], suppliedEvidence: [], authorityReviewCandidates: [], intentEvidenceCandidates: [], documentsConsidered: [],
      evidence: { sufficient: false, threshold: .35, topScore: null, stage4Fallback: message },
      environment: { embeddingModel: "Not called", embeddingDimensions: 1536, evidenceThreshold: .35, retrievalLimit: 8, authorityReviewLimit: 12 }, metrics: { embeddingMs: 0, embeddingInputTokens: null, retrievalMs: 0, totalMs: 0 },
    },
    answer: { answer: message, evidenceSufficient: false, modelCallSkipped: true, model: null, selectedEvidence: [], sources: [], conflict: { requiresClarification: false }, diagnostic: { label: resolution.kind === "protected" ? "Personal/live-data question protected" : "Clarification requested" }, metrics: { retrievalMs: 0, sourceResolutionMs: 0, generationMs: 0, totalMs: 0, inputTokens: null, outputTokens: null, totalTokens: null, estimatedGenerationCostUsd: null } },
    conversationReceipt,
  };
}

async function eligibleDocuments(supabase) {
  const { data, error } = await supabase.from("ai_documents")
    .select("id, title, document_type, authority_rank, scope_kind, active_version:ai_document_versions!ai_documents_active_version_id_fkey!inner(id, version_label, processing_status)")
    .eq("status", "active").not("active_version_id", "is", null).eq("active_version.processing_status", "ready")
    .order("authority_rank").order("title");
  if (error) throw new Error(`Official-document catalog lookup failed: ${error.message}`);
  return (data || []).map((document) => ({ id: document.id, title: document.title, type: document.document_type, authorityRank: document.authority_rank, applicability: document.scope_kind, activeVersionId: document.active_version?.id || null, activeVersionLabel: document.active_version?.version_label || "" }));
}

function failure(error, status, diagnostic = null) { return NextResponse.json({ success: false, error, ...(diagnostic ? { diagnostic } : {}) }, { status }); }
