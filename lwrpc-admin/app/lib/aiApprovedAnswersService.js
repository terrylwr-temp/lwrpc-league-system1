import {managedFormalPassages,validateManagedPassage} from './aiApprovedSourceBinding.js';
import {meaningfulDiscrepancy,APPROVED_SEMANTIC_MIN} from './aiApprovedAnswersSelection.js';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {ApprovedAnswerError,approvedId,validateApprovedDraft,approvedPublicRevision,safeAuthorityWarnings,APPROVED_EMBEDDING_MODEL,APPROVED_EMBEDDING_DIMENSIONS,clubPolicyDate} from './aiApprovedAnswersShared.js';
import {isUnsupportedOperationalQuestion} from './askLwrPlayerAnswer.js';
import {redactQualityText} from './aiQualitySnapshots.js';
import {createQueryEmbedding} from './aiRetrieval.js';

export const APPROVED_FIELDS='id,answer_id,revision_number,status,title,topic_key,canonical_question,approved_answer,league_scope,temporal_scope,season_id,effective_on,expires_on,related_chunk_id,related_rule_identity,related_passage,public_links,content_hash,authority_manifest_hash,created_at,updated_at,activated_at,retired_at,retirement_reason,row_version';
const STOP=new Set('what which when where how why can could do does is are the a an for to of in on at by we i my our it this that club lwr pickleball league please tell me about have has be with and or'.split(' '));
export function approvedIssueTerms(question){return [...new Set(String(question).toLowerCase().match(/[a-z0-9]+/g)||[])].filter(x=>x.length>2&&!STOP.has(x)).slice(0,12);}
export function approvedContentHash(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function checked(result){if(result.error)throw new ApprovedAnswerError('Approved Answers data is unavailable. Verify the LMS-0721 migration.',503);return result.data;}
function signingKey(){const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SERVICE_ROLE||process.env.SERVICE_ROLE_KEY;if(!key)throw new ApprovedAnswerError('Server configuration unavailable.',503);return key;}
function sign(text){return createHmac('sha256',signingKey()).update('lwr-approved-preflight-v1:').update(text).digest('base64url');}
function ticket(value){const text=Buffer.from(JSON.stringify(value)).toString('base64url');return `${text}.${sign(text)}`;}
function openTicket(value,user){
 if(typeof value!=='string'||value.length>4096)throw new ApprovedAnswerError('Refresh activation review.');
 const [body,sig,extra]=value.split('.'),expected=sign(body||'');
 if(extra||sig?.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new ApprovedAnswerError('Refresh activation review.');
 let claims;try{claims=JSON.parse(Buffer.from(body,'base64url').toString());}catch{throw new ApprovedAnswerError('Refresh activation review.');}
 if(claims.user!==user||claims.expires<=Date.now())throw new ApprovedAnswerError('Activation review expired.');return claims;
}
async function row(db,id){const r=checked(await db.from('ai_approved_answer_revisions').select(APPROVED_FIELDS).eq('id',approvedId(id)).maybeSingle());if(!r)throw new ApprovedAnswerError('Approved Answer unavailable.',404);return r;}
function staticQuestion(question){if(isUnsupportedOperationalQuestion(question)||redactQualityText(question,2400).redacted)throw new ApprovedAnswerError('This case contains protected/live or private information. Use AI/Retrieval Review; do not create static knowledge.');}
export function sourceReviewFindings(question,rows){
 const terms=approvedIssueTerms(question);
 return rows.flatMap(r=>managedFormalPassages({content:r.content,rule_number:r.rule_number,heading:r.heading}).map((p,index)=>{
  const proposition=p.passage.split(/\n(?=\s*(?:\d+(?:\.\d+)*\.?\s|[A-Z0-9]+\.))/)[0];
  const direct=terms.length>0&&terms.every(term=>new RegExp('\\b'+term+'(?:s|es)?\\b','i').test(proposition))&&/\b(?:must|shall|may|can|require|allowed|permitted|prohibited|deadline|website|contact)\b|https:\/\//i.test(proposition);
  return {chunkId:r.chunk_id,documentId:r.document_id,documentVersionId:r.document_version_id,title:r.document_title,type:r.document_type,pageNumber:r.page_number,
   selectionKey:r.chunk_id+':'+index,containerRuleNumber:r.rule_number||'',ruleNumber:p.ruleNumber,heading:p.heading,passage:p.passage,direct};
 }).sort((a,b)=>Number(b.direct)-Number(a.direct)));
}
export async function approvedSourceReview(db,question){
 staticQuestion(question);const terms=approvedIssueTerms(question);
 return sourceReviewFindings(question,terms.length?checked(await db.rpc('ai_approved_source_review',{p_terms:terms})):[]);
}
export async function approvedCase(db,caseId){
 const c=checked(await db.from('ai_manager_review_cases').select('id,group_id,status').eq('id',approvedId(caseId)).maybeSingle());
 if(!c||!['new','reviewing'].includes(c.status))throw new ApprovedAnswerError('Open an unresolved unanswered case first.');
 const g=checked(await db.from('ai_question_groups').select('id,family,canonical_question,merged_into_group_id').eq('id',c.group_id).maybeSingle());
 if(!g||g.family!=='unanswered'||g.merged_into_group_id)throw new ApprovedAnswerError('This is not a genuine unanswered group.');
 staticQuestion(g.canonical_question);
 const existing=checked(await db.from('ai_approved_answers').select('id').eq('source_review_case_id',c.id).maybeSingle());
 const sources=await approvedSourceReview(db,g.canonical_question);
 return {caseId:c.id,groupId:g.id,question:g.canonical_question,existingAnswerId:existing?.id||null,sources,blocked:Boolean(existing)||sources.some(s=>s.direct)};
}
export async function approvedList(db){
 const [rs,ss,os,ms]=await Promise.all([
  db.from('ai_approved_answer_revisions').select(APPROVED_FIELDS).order('updated_at',{ascending:false}).limit(300),
  db.from('seasons').select('id,name,start_date,end_date').order('start_date',{ascending:false}),
  db.from('ai_request_outcomes').select('id,completed_at,assistant_version,diagnostic_snapshot,origin').not('diagnostic_snapshot->authorityWarnings','is',null).order('completed_at',{ascending:false}).limit(100),
  db.rpc('ai_approved_authority_manifest'),
 ]);
 const revisions=checked(rs)||[];const active=new Map(revisions.filter(r=>r.status==='active').map(r=>[r.id,r]));
 const warnings=(checked(os)||[]).flatMap(o=>safeAuthorityWarnings(o.diagnostic_snapshot?.authorityWarnings).filter(w=>active.has(w.approvedRevisionId)).map(w=>({...w,outcomeId:o.id,observedAt:o.completed_at,version:o.assistant_version,origin:o.origin,currentStatus:'active'})));
 const manifest=checked(ms),today=clubPolicyDate();
 const listed=revisions.map(r=>({...r,eligibility:r.status!=='active'?null:r.authority_manifest_hash!==manifest?'Needs authority revalidation':r.effective_on>today?'Scheduled':r.expires_on&&r.expires_on<=today?'Expired':'Current scope/date checks apply'}));
 return {revisions:listed,seasons:checked(ss),warnings,warningWindow:'Most recent 100 warning-bearing outcomes; historical observations remain retained.'};
}
function auditPublicState(value){return Object.fromEntries(Object.entries(value||{}).filter(([k])=>['title','topic_key','canonical_question','approved_answer','league_scope','temporal_scope','effective_on','expires_on','status','revision_number','activated_at','retired_at','retirement_reason','public_links','related_chunk_id','related_rule_identity','related_passage'].includes(k)));}
export async function approvedDetail(db,id){
 const revision=await row(db,id);
 const actorRow=checked(await db.from('ai_approved_answer_revisions').select('activated_by_user_id').eq('id',id).single());
 let activatedBy=actorRow.activated_by_user_id?'Recorded manager':'Not recorded';
 if(actorRow.activated_by_user_id&&db.auth?.admin?.getUserById){
  const actor=await db.auth.admin.getUserById(actorRow.activated_by_user_id);
  if(actor.data?.user?.email){const names=await db.from('members').select('first_name,last_name').eq('email',actor.data.user.email.toLowerCase()).limit(1).maybeSingle();if(!names.error&&names.data)activatedBy=[names.data.first_name,names.data.last_name].filter(Boolean).join(' ')||activatedBy;}
 }
 const [a,rs,es]=await Promise.all([
  db.from('ai_approved_answers').select('id,source_review_case_id').eq('id',revision.answer_id).single(),
  db.from('ai_approved_answer_revisions').select(APPROVED_FIELDS).eq('answer_id',revision.answer_id).order('revision_number',{ascending:false}),
  db.from('ai_approved_answer_events').select('id,action,created_at,reason,revision_id,before_state,after_state').eq('answer_id',revision.answer_id).order('created_at',{ascending:false}).limit(100),
 ]);
 const item=checked(a);const linkedCase=item.source_review_case_id?checked(await db.from('ai_manager_review_cases').select('group_id,status').eq('id',item.source_review_case_id).maybeSingle()):null;
 return {revision,related:revision.related_chunk_id?await approvedBoundSource(db,revision):null,activatedBy,item,linkedCase,history:checked(rs),events:checked(es).map(e=>({...e,before_state:auditPublicState(e.before_state),after_state:auditPublicState(e.after_state)}))};
}
export async function approvedPreflight(db,id,user){
 const revision=await row(db,id);if(revision.status!=='draft')throw new ApprovedAnswerError('Only a Draft can be activated.');
 if(revision.related_chunk_id)await approvedBoundSource(db,revision,{current:true});
 const sources=await approvedSourceReview(db,revision.canonical_question);
 const manifest=checked(await db.rpc('ai_approved_authority_manifest'));
 const siblings=checked(await db.from('ai_approved_answer_revisions').select('id,answer_id,title,status,topic_key,league_scope,temporal_scope,season_id,effective_on,expires_on').in('status',['active','draft']).neq('answer_id',revision.answer_id));
 const overlaps=(siblings||[]).filter(s=>s.topic_key===revision.topic_key&&(s.league_scope==='all'||revision.league_scope==='all'||s.league_scope===revision.league_scope)
  &&(s.temporal_scope==='standing'||revision.temporal_scope==='standing'||s.season_id===revision.season_id)
  &&s.effective_on<(revision.expires_on||'9999-12-31')&&revision.effective_on<(s.expires_on||'9999-12-31'));
 const managedManifest=checked(await db.rpc('ai_approved_knowledge_manifest'));
 const blocked=sources.some(s=>s.direct)||overlaps.length>0;
 return {sources,overlaps,blocked,token:blocked?null:ticket({user,id,version:revision.row_version,hash:revision.content_hash,manifest,managedManifest,expires:Date.now()+600000})};
}
export async function approvedMutation(db,body,user,{embed=createQueryEmbedding}={}){
 const {action,id,operation}=body;approvedId(operation);approvedId(user);
 // Only explicit NULL on create denotes manager origin; missing/invalid IDs never bypass case checks.
 if(action!=='create'||id!==null)approvedId(id);
 if(!['create','save','edit','activate','retire'].includes(action))throw new ApprovedAnswerError('Invalid knowledge action.');
 const previous=checked(await db.from('ai_approved_answer_events').select('answer_id,revision_id,actor_user_id,action,before_state,after_state,reason').eq('operation_id',operation).eq('event_ordinal',0).maybeSingle());
 if(previous){
  const expectedAction={create:'created',save:'draft_edited',edit:'draft_edited',activate:'activated',retire:'retired'}[action];
  let same=previous.actor_user_id===user&&previous.action===expectedAction;
  if(action==='create'){
   const owner=checked(await db.from('ai_approved_answers').select('source_review_case_id').eq('id',previous.answer_id).single());
   same=same&&owner.source_review_case_id===id;
  }else same=same&&previous.before_state.id===id&&Number(previous.before_state.row_version)===Number(body.expected);
  if(action==='create'||action==='save')same=same&&previous.after_state.content_hash===approvedContentHash(validateApprovedDraft(body.draft))&&body.staticPolicyConfirmed===true;
  if(action==='retire')same=same&&previous.after_state.retirement_reason===String(body.reason||'').trim();
  if(action==='activate')same=same&&body.confirm===true;
  if(!same)throw new ApprovedAnswerError('This operation ID belongs to a different action. Refresh before continuing.',409);
  return {answerId:previous.answer_id,revisionId:previous.revision_id,replayed:true};
 }
 let payload={},expected=body.expected??null;
 if(action==='create'||action==='save'){
  payload=validateApprovedDraft(body.draft);staticQuestion(payload.canonical_question);
  if(/\b(?:my|your|our)\s+(?:current\s+)?(?:dupr|rating|team|roster|standing|opponent|community)\s+(?:is|are|equals)\b/i.test(payload.approved_answer)
    ||redactQualityText(payload.approved_answer,6000).redacted)throw new ApprovedAnswerError('Do not publish personal/live data or private information as static knowledge.');
  // Static policy only. A manager must explicitly attest; notes are never copied.
  if(body.staticPolicyConfirmed!==true)throw new ApprovedAnswerError('Confirm this is official static policy, not live player/team information.');
  if(action==='create'&&id!==null){const c=await approvedCase(db,id);if(c.blocked)throw new ApprovedAnswerError('Existing official evidence or a linked item requires review before duplicate creation.',409);}
  if(payload.related_chunk_id)await approvedBoundSource(db,payload,{current:true});
  payload.content_hash=approvedContentHash(payload);
  const candidates=await approvedSourceReview(db,payload.canonical_question);
  if(candidates.some(s=>s.direct))throw new ApprovedAnswerError('Existing official evidence directly answers this question. Use AI/Retrieval Review.',409);
  if(candidates.length){const distinction=String(body.overlapDistinction||'').trim();if(!distinction||distinction.length>1800)throw new ApprovedAnswerError('Record the missing-policy distinction from the related official evidence before saving.');payload.reason='Official source distinction: '+distinction;}
 }else if(action==='activate'){
  const claims=openTicket(body.token,user);const current=await row(db,id);
  if(body.confirm!==true||claims.id!==id||claims.version!==current.row_version||claims.hash!==current.content_hash)throw new ApprovedAnswerError('The Draft changed. Review activation again.',409);
  const checkedAgain=await approvedPreflight(db,id,user);if(checkedAgain.blocked)throw new ApprovedAnswerError('Existing authority or overlapping knowledge blocks activation.',409);
  if(checked(await db.rpc('ai_approved_authority_manifest'))!==claims.manifest)throw new ApprovedAnswerError('Official sources changed. Review activation again.',409);
  const representation=[current.title,current.canonical_question,current.approved_answer].join('\n');
  const embedding=await embed(representation);
  if(!Array.isArray(embedding.embedding)||embedding.embedding.length!==APPROVED_EMBEDDING_DIMENSIONS||embedding.embedding.some(n=>!Number.isFinite(n))||embedding.embedding.every(n=>n===0)||embedding.model!==APPROVED_EMBEDDING_MODEL)throw new ApprovedAnswerError('Embedding could not be validated. The answer remains Draft.',503);
  const similar=checked(await db.rpc('search_ai_approved_answers',{p_embedding:JSON.stringify(embedding.embedding),p_question:current.canonical_question}));
  const overlap=(similar||[]).find(x=>x.revision?.answer_id!==current.answer_id&&x.revision?.status==='active'&&x.semantic_score>=APPROVED_SEMANTIC_MIN
   &&(x.revision.league_scope==='all'||current.league_scope==='all'||x.revision.league_scope===current.league_scope)
   &&(x.revision.temporal_scope==='standing'||current.temporal_scope==='standing'||x.revision.season_id===current.season_id)
   &&x.revision.effective_on<(current.expires_on||'9999-12-31')&&current.effective_on<(x.revision.expires_on||'9999-12-31'));
  if(overlap){
   const sameQuestion=overlap.revision.canonical_question.normalize('NFKC').toLowerCase().trim()===current.canonical_question.normalize('NFKC').toLowerCase().trim();
   if(sameQuestion||meaningfulDiscrepancy(current,{content:overlap.revision.approved_answer}))throw new ApprovedAnswerError('Duplicate or conflicting Active Approved Answer blocks activation: '+overlap.revision.title,409);
   if(!String(body.overlapDistinction||'').trim()||String(body.overlapDistinction).length>1800)throw new ApprovedAnswerError('Similar Active Approved Answer: '+overlap.revision.title+'. Review it and record the distinct policy gap before retrying.',409);
  }
  expected=current.row_version;
  payload={reason:overlap?'Semantic overlap reviewed: '+String(body.overlapDistinction).trim():null,managed_manifest_hash:claims.managedManifest,content_hash:claims.hash,authority_manifest_hash:claims.manifest,preflight_expires_at:new Date(claims.expires).toISOString(),embedding:JSON.stringify(embedding.embedding),embedding_model:APPROVED_EMBEDDING_MODEL,related_rule_identity:current.related_rule_identity??null,related_passage:current.related_passage??null};
 }else if(action==='retire'){payload={reason:String(body.reason||'').trim()};if(!payload.reason||payload.reason.length>2000)throw new ApprovedAnswerError('Enter a retirement reason (maximum 2,000 characters).');}
 const result=await db.rpc('ai_approved_answer_action',{p_actor:user,p_operation:operation,p_action:action,p_id:id,p_expected:expected,p_body:payload});
 if(result.error){if(/approved_/.test(result.error.message||''))throw new ApprovedAnswerError('The action could not be completed: '+result.error.message.replace(/^.*?(approved_[a-z_]+).*$/,'$1')+'. Refresh and review.',409);throw new ApprovedAnswerError('Knowledge action failed; refresh before retrying.',503);}
 return result.data;
}
export async function approvedFormalSource(db,chunkId,{current=false}={}){
 const c=checked(await db.from('ai_document_chunks').select('id,document_version_id,content,page_number,rule_number,heading').eq('id',approvedId(chunkId)).maybeSingle());
 if(!c)throw new ApprovedAnswerError('Source unavailable.',404);
 const v=checked(await db.from('ai_document_versions').select('id,document_id,processing_status,document:ai_documents!ai_document_versions_document_id_fkey!inner(id,title)').eq('id',c.document_version_id).maybeSingle());
 if(!v||!['ready','superseded'].includes(v.processing_status)||(current&&v.processing_status!=='ready'))throw new ApprovedAnswerError('Source unavailable.',404);
 return {title:v.document.title,documentId:v.document_id,documentVersionId:v.id,chunkId:c.id,pageNumber:c.page_number,ruleNumber:c.rule_number,heading:c.heading,passage:c.content};
}
export async function publicApprovedRevision(db,id,hash){
 const r=await row(db,id);if(!r.activated_at||!['active','retired'].includes(r.status)||r.content_hash!==hash)throw new ApprovedAnswerError('This approved citation is unavailable.',404);
 return approvedPublicRevision(r);
}

// Revision-bound lookup: never substitute the currently active version for the retained chunk.
export async function approvedBoundSource(db,revision,{current=false}={}) {
 const source=await approvedFormalSource(db,revision.related_chunk_id,{current});
 const meta=checked(await db.from('ai_documents').select('id,active_version_id,status,document_type').eq('id',source.documentId).maybeSingle());
 if(!meta||meta.document_type==='usap_rulebook')throw new ApprovedAnswerError('Related LWR source unavailable.',409);
 if(current){
  const chunk=checked(await db.from('ai_document_chunks').select('is_searchable').eq('id',source.chunkId).maybeSingle());
  if(meta.status!=='active'||meta.active_version_id!==source.documentVersionId||!chunk?.is_searchable)throw new ApprovedAnswerError('Related source is no longer current. Select and review it again.',409);
 }
 let selected;try{selected=validateManagedPassage({content:source.passage,rule_number:source.ruleNumber,heading:source.heading},revision.related_passage,revision.related_rule_identity);}catch{throw new ApprovedAnswerError('Related passage binding changed or is invalid. Select and review the official provision again.',409);}
 return {...source,containerRuleNumber:source.ruleNumber,ruleNumber:selected.ruleNumber,heading:selected.heading,passage:selected.passage};
}
