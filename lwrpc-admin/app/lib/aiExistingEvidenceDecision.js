import {createHash} from 'node:crypto';
import {approvedCase,approvedBoundSource} from './aiApprovedAnswersService.js';
import {approvedId,ApprovedAnswerError} from './aiApprovedAnswersShared.js';
import {requireReviewRole,reviewToken,readReviewToken,reviewAction} from './aiReviewService.js';

const hash = text => createHash('sha256').update(text).digest('hex');
function checked(result){if(result.error)throw new ApprovedAnswerError('Review case unavailable.',503);return result.data;}
export async function existingEvidenceCase(auth,id){
 requireReviewRole(auth);
 const data=await approvedCase(auth.supabase,id);
 const c=checked(await auth.supabase.from('ai_manager_review_cases').select('id,revision,created_at,reviewed_through_at').eq('id',id).maybeSingle());
 if(!c)throw new ApprovedAnswerError('Review case unavailable.',404);
 return {...data,sources:data.sources.map(s=>({...s,passageHash:hash(s.passage)})),
  decisionToken:reviewToken({user:auth.user.id,caseId:id,revision:c.revision,cutoff:c.reviewed_through_at||c.created_at,questionHash:hash(data.question)})};
}

export async function confirmExistingEvidence(auth,body){
 requireReviewRole(auth);
 if(!body||Object.keys(body).some(k=>!['action','token','operation','evidence'].includes(k))||body.action!=='existing-evidence')throw new ApprovedAnswerError('Invalid evidence decision.');
 approvedId(body.operation);
 const claims=readReviewToken(body.token,auth.user.id);approvedId(claims.caseId);
 if(!Array.isArray(body.evidence)||body.evidence.length<1||body.evidence.length>2)throw new ApprovedAnswerError('Select one or two official passages.');
 const refs=body.evidence.map(r=>{
  if(!r||Object.keys(r).some(k=>!['chunkId','passageHash'].includes(k))||!/^[a-f0-9]{64}$/.test(r.passageHash||''))throw new ApprovedAnswerError('Invalid evidence reference.');
  return {chunkId:approvedId(r.chunkId),passageHash:r.passageHash};
 }).sort((a,b)=>a.chunkId.localeCompare(b.chunkId)||a.passageHash.localeCompare(b.passageHash));
 if(new Set(refs.map(r=>r.chunkId+':'+r.passageHash)).size!==refs.length)throw new ApprovedAnswerError('Select distinct passages.');
 const data=await approvedCase(auth.supabase,claims.caseId);
 if(hash(data.question)!==claims.questionHash)throw new ApprovedAnswerError('The question changed. Refresh the review.',409);
 const notes=[];
 for(const ref of refs){
  const candidate=data.sources.find(s=>s.chunkId===ref.chunkId&&hash(s.passage)===ref.passageHash);
  if(!candidate)throw new ApprovedAnswerError('The selected evidence changed. Refresh and review the source again.',409);
  const s=await approvedBoundSource(auth.supabase,{related_chunk_id:ref.chunkId,related_passage:candidate.passage,related_rule_identity:candidate.ruleNumber},{current:true});
  // Labels come only from revalidated official content; no browser note, passage prose or URL is stored.
  notes.push(`${s.title.slice(0,180)} — Rule ${s.ruleNumber||'not numbered'} — Page ${s.pageNumber??'not recorded'}\nDocument ${s.documentId}; version ${s.documentVersionId}; chunk ${s.chunkId}\nPassage SHA-256 ${hash(s.passage)}`);
 }
 const note='Manager confirmed: existing official evidence answers the question. AI/Retrieval Review required; resolution remains explicit.\n\n'+notes.join('\n\n');
 if(note.length>4000)throw new ApprovedAnswerError('Evidence decision exceeds the audit note limit.');
 const result=await reviewAction(auth.supabase,{token:body.token,operation:body.operation,action:'category',value:'ai_retrieval_selection',note},auth.user.id);
 return {...result,decisionRecorded:true,question:data.question,groupId:data.groupId};
}
