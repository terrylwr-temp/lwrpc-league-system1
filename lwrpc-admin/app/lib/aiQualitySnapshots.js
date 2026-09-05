import { APP_VERSION } from "./version.js";
import { qualityFingerprint } from "./aiQualityGrouping.js";

const short = (v,n) => [...String(v ?? "")].slice(0,n).join("");
const code = (v,n=120) => /^[a-zA-Z0-9_. /:-]+$/.test(String(v || "")) ? short(v,n) : null;
const uuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v)) ? v : null;
const integer = v => Number.isInteger(v) && v>=0 && v<=2147483647 ? v : null;
const array = v => Array.isArray(v) ? v : [];
export function redactQualityText(value, limit) {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g," ").trim();
  const sensitive = /https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:bearer|password|token|secret|api[_ -]?key)\b|\b(?:\+?\d[ ()-]*){9,}\b/i.test(text)
    || /\b(?:player|member|named)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b|\b[A-Z][a-z]+['’]s\b|\bis\s+[A-Z][a-z]+\s+(?:missing|absent|eligible)\b/.test(text);
  // Conservative whole-field omission avoids retaining a partial credential or identity.
  return { text: sensitive ? "[detail omitted for privacy]" : short(text,limit), redacted: sensitive || [...text].length>limit };
}
function safeLabel(v,n) { return redactQualityText(v,n).text; }
function source(s) { return { documentId:uuid(s?.documentId), documentVersionId:uuid(s?.documentVersionId), chunkId:uuid(s?.chunkId), documentTitle:safeLabel(s?.documentTitle,300), pageNumber:integer(s?.pageNumber), ruleNumber:safeLabel(s?.ruleNumber,120), sectionLabel:safeLabel(s?.sectionLabel,300), heading:safeLabel(s?.heading,300), citation:safeLabel(s?.citation,600) }; }
function evidence(s) { return { ...source(s), documentType:code(s?.documentType,80), sourceClassification:code(s?.sourceClassification,80), evidenceRole:safeLabel(s?.evidenceRole,160), evidenceSelectionReason:safeLabel(s?.evidenceSelectionReason,500), combinedScore:typeof s?.combinedScore==='number' && Number.isFinite(s.combinedScore) ? s.combinedScore : null }; }
function sourceFamily(items) {
  const types = items.map(x=>x?.documentType || x?.sourceClassification).filter(Boolean);
  if (!types.length) return items.length ? "unknown" : "none";
  const usap=types.some(t=>/usap/i.test(t)), lwr=types.some(t=>!/usap/i.test(t));
  return usap && lwr ? "mixed" : usap ? "usap" : "lwr";
}
function resolver(r) { return { classification:code(r?.classification), priorContextAvailable:Boolean(r?.priorContextAvailable), clarificationConsumed:Boolean(r?.clarificationConsumed), contextSuperseded:Boolean(r?.contextSuperseded), rawLiveDataGuard:r?.rawLiveDataGuard===true, effectiveLiveDataGuard:r?.effectiveLiveDataGuard===true }; }
export function qualityOutcome({ id, origin, started, completed, execution={}, stage3Invoked=false, technicalError=false }) {
  const { result={}, answer={}, retrieval, conversationResolution:r }=execution;
  const kind=technicalError ? "technical_error" : result.kind;
  if (!["answer","insufficient_evidence","conflict","clarification","protected","technical_error"].includes(kind)) throw new Error("quality_kind");
  const selected=array(answer.selectedEvidence).slice(0,4);
  const protectedIntent=kind==='protected';
  return {
    id, request_started_at:new Date(started).toISOString(), completed_at:new Date(completed).toISOString(), origin,
    final_kind:kind, reason_code:technicalError ? "technical_error" : kind==='insufficient_evidence' ? retrieval?.evidence?.sufficient ? 'stage4_no_applicable_evidence' : 'stage3_insufficient_evidence' : kind==='conflict' ? 'confirmed_final_conflict' : code(answer.diagnostic?.category,80), assistant_version:APP_VERSION,
    model:protectedIntent ? null : code(answer.model), feedback_eligible:origin==='player_interface' && kind==='answer' && Boolean(result.feedbackReceipt),
    source_family:protectedIntent ? 'none' : sourceFamily(selected), selected_evidence_count:protectedIntent ? 0 : selected.length,
    stage3_invoked:protectedIntent ? false : Boolean(stage3Invoked || retrieval), model_call_skipped:protectedIntent || kind==='clarification' && !answer.model ? true : typeof answer.modelCallSkipped==='boolean' ? answer.modelCallSkipped : null,
    guard_classification:protectedIntent ? r?.rawLiveDataGuard ? 'raw_live_data_guard' : r?.effectiveLiveDataGuard ? 'effective_live_data_guard' : 'protected' : null,
    resolver_classification:code(r?.classification),
    diagnostic_snapshot:protectedIntent ? {} : { configurationVersion:APP_VERSION, candidateCount:integer(array(retrieval?.candidates).length), evidenceThreshold:retrieval?.environment?.evidenceThreshold===.35 ? .35 : null, retrievalLimit:integer(retrieval?.environment?.retrievalLimit), authorityReviewLimit:integer(retrieval?.environment?.authorityReviewLimit), embeddingModel:code(retrieval?.environment?.embeddingModel), stage3Sufficient:retrieval?.evidence?.sufficient===true, equipmentProbeInvoked:Boolean(retrieval?.lwrMatchEquipmentProbe), equipmentProbeRetrieved:retrieval?.lwrMatchEquipmentProbe?.retrieved===true },
    total_ms:integer(Math.max(0,completed-started)), input_tokens:protectedIntent ? null : integer(answer.metrics?.inputTokens), output_tokens:protectedIntent ? null : integer(answer.metrics?.outputTokens), telemetry_version:1,
  };
}
function detail({id,kind,origin,originalQuestion,effectiveQuestion,output,answer={},retrieval,resolution,version=APP_VERSION,model,firstObserved,provenance='live_capture'}) {
  const original=redactQualityText(originalQuestion,1000), effective=redactQualityText(effectiveQuestion || originalQuestion,2400), response=redactQualityText(output,6000);
  const r={ id:null,answer_id:id,outcome_id:null,group_id:null,first_feedback_event_id:null,provenance,origin,occurrence_kind:kind,answer_completed_at:null,first_observed_at:firstObserved,recorded_at:null,
    original_question:original.text || '[question unavailable]',effective_question:effective.text || '[question unavailable]',output_text:kind==='grounded_feedback' ? null : response.text,
    source_snapshot:array(answer.sources).slice(0,4).map(source),selection_snapshot:{ selectedEvidence:array(answer.selectedEvidence).slice(0,4).map(evidence),candidates:array(retrieval?.candidates).slice(0,8).map(s=>({chunkId:uuid(s?.chunkId),documentId:uuid(s?.documentId),documentVersionId:uuid(s?.documentVersionId),combinedScore:Number.isFinite(s?.combinedScore)?s.combinedScore:null})) },
    resolver_snapshot:resolver(resolution),assistant_version:short(version,80),model:code(model ?? answer.model),source_family:sourceFamily(array(answer.selectedEvidence).slice(0,4)),redaction_applied:original.redacted||effective.redacted||response.redacted,redaction_version:1,snapshot_version:1,payload_purged_at:null };
  if (Buffer.byteLength(JSON.stringify([r.original_question,r.effective_question,r.output_text,r.source_snapshot,r.selection_snapshot,r.resolver_snapshot]))>30000) throw new Error('quality_snapshot_size');
  const family=kind==='insufficient_evidence'?'unanswered':kind;
  const route=original.redacted || effective.redacted || !effective.text ? null : { ...qualityFingerprint(r.effective_question,origin,family),origin,family };
  return {p_occurrence:r,p_route:route};
}
export function qualityException(outcome,execution) {
  if (!['insufficient_evidence','conflict'].includes(outcome.final_kind)) return {p_occurrence:null,p_route:null};
  const r=execution.conversationResolution;
  return detail({id:outcome.id,kind:outcome.final_kind,origin:outcome.origin,originalQuestion:r?.rawQuestion,effectiveQuestion:r?.effectiveQuestion,output:execution.result?.answer,answer:execution.answer,retrieval:execution.retrieval,resolution:r,firstObserved:outcome.completed_at});
}
export function qualityFeedback(claims) {
  const legacy=['LMS-0712','LMS-0713','LMS-0714','LMS-0715'].includes(claims.assistantVersion);
  return detail({id:claims.answerId,kind:'grounded_feedback',origin:legacy?'legacy_unknown':'player_interface',originalQuestion:claims.originalQuestion,effectiveQuestion:claims.effectiveQuestion,answer:{sources:claims.sources,selectedEvidence:claims.selectedEvidence},resolution:claims.retrieval?.resolver,version:claims.assistantVersion,model:claims.model,provenance:legacy?'legacy_feedback':'feedback_capture'});
}
