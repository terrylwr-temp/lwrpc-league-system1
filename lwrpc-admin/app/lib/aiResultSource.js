export function documentSourceFamily(items) {
  const types = items.map(x=>x?.documentType || x?.sourceClassification).filter(Boolean);
  if (!types.length) return items.length ? "unknown" : "none";
  const usap=types.some(t=>/usap/i.test(t)), lwr=types.some(t=>!/usap/i.test(t));
  return usap && lwr ? "mixed" : usap ? "usap" : "lwr";
}
// Called only by trusted official-document execution paths, never from request data.
export function documentProvenance(answer) {
 const successful=answer?.evidenceSufficient===true&&!answer?.conflict?.requiresClarification;
 return {mode:successful?'DOCUMENT_ONLY':'NONE',sourceFamily:documentSourceFamily((Array.isArray(answer?.selectedEvidence)?answer.selectedEvidence:[]).slice(0,4)),documentEvidenceUsed:successful,lookupAttempted:false,liveConsulted:false,liveDataUsed:false,hybrid:false};
}
// Public processing metadata only. Never include protected input values here.
export function eligibilityProvenance(result,{lookupAttempted=false,liveConsulted=false}={}) {
 const documentEvidenceUsed=Boolean(result.sources?.length);
 const liveDataUsed=liveConsulted&&result.kind==='answer'&&result.eligibility?.level==='PARTIAL_PERSONAL_EVALUATION';
 const mode=documentEvidenceUsed?(liveDataUsed?'HYBRID_DOCUMENT_LIVE':'DOCUMENT_ONLY'):(liveDataUsed?'LIVE_ONLY':'NONE');
 return {intent:'ELIGIBILITY',mode,documentEvidenceUsed,lookupAttempted,liveConsulted,liveDataUsed,hybrid:mode==='HYBRID_DOCUMENT_LIVE',personalEvaluationResult:liveDataUsed?result.eligibility.outcome:null};
}
export function resultSourcePresentation(result) {
 const p=result.provenance;
 if(p){
  const label={DOCUMENT_ONLY:'OFFICIAL RULES',HYBRID_DOCUMENT_LIVE:'LIVE LMS + OFFICIAL RULES',LIVE_ONLY:'LIVE LMS DATA'}[p.mode];
  return label?{label,operation:p.intent,checkedAt:p.liveDataUsed?result.live?.checkedAt:null}:null;
 }
 return result.live?{label:'LIVE LMS DATA',operation:result.live.operation,checkedAt:result.live.checkedAt}:null;
}
export function resultSourceFamily(result) {
 const p=result.provenance;
 if(p?.sourceFamily)return p.sourceFamily;
 if(p)return p.liveDataUsed?'LIVE_LMS_DATA':p.documentEvidenceUsed?'lwr':'none';
 return result.live?'LIVE_LMS_DATA':'lwr';
}
export function viewAsSourceFamily(result){return resultSourceFamily(result)==='LIVE_LMS_DATA'?'LIVE_LMS_DATA':'document';}
