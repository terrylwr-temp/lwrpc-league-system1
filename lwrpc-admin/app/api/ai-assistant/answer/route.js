import { rejectViewAsMutation } from '../../../lib/viewAsBoundary.js';
import { conversationDiagnostics } from "../../../lib/aiConversationDiagnostics";
import { NextResponse } from "next/server";
import {approvedViewerHref} from "../../../lib/aiApprovedAnswerViewer.js";
import { answerGenerationDiagnostic, generateOfficialAnswer } from "../../../lib/aiAnswerGeneration";
import { retrieveOfficialEvidence } from "../../../lib/aiRetrieval";
import { clarificationFromRetrieval, createClarificationReceipt, createFollowUpReceipt } from "../../../lib/aiConversation";
import { resolveOfficialConversation, playerFallbackResult } from "../../../lib/askLwrPlayerAnswer";
import { authorizeAdminRequest } from "../../../lib/serverSupabase";
import { observeQualityRequest } from "../../../lib/aiQualityCapture";
import {liveAuthFailure,authenticateLive,needsLive,runLive} from '../../../lib/liveLmsService.js';

export const runtime = "nodejs";

export async function POST(req) {
  const viewAsDenied = rejectViewAsMutation(req);
  if (viewAsDenied) return viewAsDenied;
  try {
    const body = await req.json().catch(() => ({}));
    if(needsLive(body)) {
      const result=await runLive({body,principal:await authenticateLive(req),origin:'manager_test'});
      if(result)return NextResponse.json({success:true,result:{answer:{answer:result.answer,sources:[],evidenceSufficient:result.kind==='answer',model:'Not called',metrics:{inputTokens:0,outputTokens:0}},live:result.live,conversationReceipt:result.conversationReceipt,retrieval:{candidates:[],suppliedEvidence:[],authorityReviewCandidates:[],intentEvidenceCandidates:[],documentsConsidered:[],evidence:{sufficient:result.kind==='answer'},metrics:{embeddingMs:0,retrievalMs:0,totalMs:0}}}},{headers:{'Cache-Control':'private, no-store'}});
      body.conversationReceipt=null;
    }
    const authorization = await authorizeAdminRequest(req, "league_manager");
    if (authorization.error) return failure(authorization.error, authorization.status);
    const execution = await observeQualityRequest({ supabase: authorization.supabase, origin: "manager_test", run: (_id, trace) => runManagerAnswer(authorization, body, trace) });
    return NextResponse.json({ success: true, result: execution.response });
  } catch (error) {
    const authFailure=liveAuthFailure(error);
    if(authFailure)return NextResponse.json(authFailure.body,{status:authFailure.status,headers:authFailure.headers});
    const diagnostic = answerGenerationDiagnostic(error);
    console.error("Ask LWR Pickleball AI answer generation failed", diagnostic);
    return failure(error.message || "Official-document answer generation failed.", diagnostic.category === "server_failure" ? 400 : 502, diagnostic);
  }
}

async function runManagerAnswer(authorization, body, trace) {
    const started = performance.now();
    const conversationResolution = resolveOfficialConversation({ question: body.question, userId: authorization.user.id, receipt: body.conversationReceipt });
    if (conversationResolution.kind !== "resolved") return {
      conversationResolution, result: { kind: conversationResolution.kind },
      response: managerClarificationResult(body, conversationResolution, managerClarificationReceipt(authorization.user.id, conversationResolution)),
    };
    trace.stage3Invoked = true;
    const retrieval = await retrieveOfficialEvidence({ supabase: authorization.supabase, body: { ...body, question: conversationResolution.effectiveQuestion } });
    retrieval.conversationResolution = conversationResolution;
    const clarification = clarificationFromRetrieval(conversationResolution, retrieval);
    if (clarification) {
      const response = managerClarificationResult(body, clarification, managerClarificationReceipt(authorization.user.id, clarification));
      response.retrieval = { ...retrieval, conversationResolution: conversationDiagnostics(clarification, { stage3Invoked: true }) };
      return { retrieval, conversationResolution: clarification, result: { kind: "clarification" }, response };
    }
    const [answer, documentsConsidered] = await Promise.all([
      generateOfficialAnswer({ retrieval, supabase: authorization.supabase }),
      eligibleDocuments(authorization.supabase),
    ]);
    return {
      retrieval, answer, conversationResolution,
      result: { kind: answer.conflict?.requiresClarification ? "conflict" : answer.evidenceSufficient ? "answer" : "insufficient_evidence", answer: answer.answer },
      response: {
        retrieval: { ...retrieval, documentsConsidered, conversationResolution: conversationDiagnostics(conversationResolution, { stage3Invoked: true, answer }) },
        answer: { ...answer, sources:answer.sources.map(s=>s.sourceKind==="approved_answer"?{...s,officialDocumentUrl:approvedViewerHref(s,authorization.user.id)}:s), metrics: { ...answer.metrics, retrievalMs: retrieval.metrics.totalMs, totalMs: Math.round(performance.now() - started) } },
        conversationReceipt: answer.evidenceSufficient ? createFollowUpReceipt(authorization.user.id, conversationResolution.effectiveQuestion) : null,
      },
    };
}

function managerClarificationReceipt(userId, resolution) {
  return ["color_subject", "player_entry_object", "roster_league"].includes(resolution.clarification?.category)
    ? createClarificationReceipt(userId, resolution.clarificationQuestion || resolution.rawQuestion, resolution.clarification.category) : null;
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
