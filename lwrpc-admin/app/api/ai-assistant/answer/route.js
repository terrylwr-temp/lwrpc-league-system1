import { NextResponse } from "next/server";
import { answerGenerationDiagnostic, generateOfficialAnswer } from "../../../lib/aiAnswerGeneration";
import { retrieveOfficialEvidence } from "../../../lib/aiRetrieval";
import { authorizeAdminRequest } from "../../../lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const authorization = await authorizeAdminRequest(req, "league_manager");
    if (authorization.error) return failure(authorization.error, authorization.status);
    const body = await req.json().catch(() => ({}));
    const started = performance.now();
    const retrieval = await retrieveOfficialEvidence({ supabase: authorization.supabase, body });
    const [answer, documentsConsidered] = await Promise.all([
      generateOfficialAnswer({ retrieval, supabase: authorization.supabase }),
      eligibleDocuments(authorization.supabase),
    ]);
    return NextResponse.json({
      success: true,
      result: {
        retrieval: { ...retrieval, documentsConsidered },
        answer: { ...answer, metrics: { ...answer.metrics, retrievalMs: retrieval.metrics.totalMs, totalMs: Math.round(performance.now() - started) } },
      },
    });
  } catch (error) {
    const diagnostic = answerGenerationDiagnostic(error);
    console.error("Ask LWR Pickleball AI answer generation failed", diagnostic);
    return failure(error.message || "Official-document answer generation failed.", diagnostic.category === "server_failure" ? 400 : 502, diagnostic);
  }
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
