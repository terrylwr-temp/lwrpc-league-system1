// Bounded reference-only diagnostics, retained through existing quality/log retention.
import {questionIntent} from './aiRequestIntent.js';
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v||'')?v:null;
const reasons=new Set(['SELECTED','NOT_SELECTED','NO_RETRIEVAL_CANDIDATES','POLICY_COMPLETION_UNAVAILABLE','APPLICABILITY_REJECTED','SCOPE_REJECTED','SOURCE_REVALIDATION_FAILED','CONFLICT_BLOCKED','DEDUP_CONFLICT','NO_FINAL_EVIDENCE','NOT_VALIDATED','VALIDATED']);
const choice=(v,values)=>values.includes(v)?v:null;
const count=v=>Number.isFinite(v)?Math.min(10000,Math.max(0,Math.round(v))):0;
export function safePolicyDiagnostic(d){
 if(!d)return undefined;
 return {correlationId:uuid(d.correlationId),origin:choice(d.origin,["player_interface","manager_test","view_as"]),intent:choice(d.intent,['community_policy','policy_date','action_policy','procedure','scoring_applicability','scoring_mechanics','eligibility_reference_date','deadline']),object:choice(d.object,['community_participation','rating','roster','age_eligibility','league_date','score_entry','scoring']),scope:(d.scope||[]).filter(x=>['weekday','saturday','primetime'].includes(x)).slice(0,3),candidateCount:count(d.candidateCount),completionCount:count(d.completionCount),candidates:(d.candidates||[]).slice(0,8).map(c=>({chunkId:uuid(c.chunkId),versionId:uuid(c.versionId),reason:reasons.has(c.reason)?c.reason:'NOT_SELECTED'})),referencesTruncated:d.referencesTruncated===true,selectedCount:count(d.selectedCount),applicability:reasons.has(d.applicability)?d.applicability:'APPLICABILITY_REJECTED',validation:reasons.has(d.validation)?d.validation:'NOT_VALIDATED',finalCount:count(d.finalCount),zeroStage:choice(d.zeroStage,['selection','validation']),completion:choice(d.completion,['complete','unavailable','not_requested']),completionStage:choice(d.completionStage,['catalog','chunks']),completionReason:choice(d.completionReason,['DEADLINE','CATALOG_BOUND','CHUNK_BOUND','READ_FAILED']),completionMs:Math.min(60000,count(d.completionMs))};
}
export function policySelectionDiagnostic(retrieval,selected,reason){
 const intent=questionIntent(retrieval.request?.question);
 const candidates=[...new Map([...(selected||[]),...(retrieval.policyEvidence?.candidates||[]),...(retrieval.candidates||[])].map(c=>[c.chunkId,c])).values()];
 const selectedIds=new Set((selected||[]).map(c=>c.chunkId));
 retrieval.policyDiagnostic=safePolicyDiagnostic({...retrieval.policyContext,intent:intent.kind,object:intent.object,scope:intent.leagues,candidateCount:(retrieval.candidates||[]).length,completionCount:(retrieval.policyEvidence?.candidates||[]).length,candidates:candidates.map(c=>({chunkId:c.chunkId,versionId:c.documentVersionId,reason:selectedIds.has(c.chunkId)?'SELECTED':'NOT_SELECTED'})),referencesTruncated:candidates.length>8,selectedCount:selected?.length||0,applicability:reason,validation:'NOT_VALIDATED',finalCount:0,zeroStage:selected?.length?null:'selection',completion:retrieval.policyEvidence?.status||'not_requested',completionStage:retrieval.policyEvidence?.stage,completionReason:retrieval.policyEvidence?.reason,completionMs:retrieval.policyEvidence?.durationMs});
}
export function policyValidationDiagnostic(retrieval,count,reason){
 if(!retrieval.policyDiagnostic)return;
 Object.assign(retrieval.policyDiagnostic,{validation:reason,finalCount:count,zeroStage:count?null:'validation'});
 if(!count)console.info('ai_policy_evidence',{event:'policy_evidence_failed',time:new Date().toISOString(),...safePolicyDiagnostic(retrieval.policyDiagnostic)});
}