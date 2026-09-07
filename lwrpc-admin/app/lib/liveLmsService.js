import {randomUUID} from 'node:crypto';
import {createAdminSupabase,authenticateRequestIdentity,LiveAuthenticationError} from './serverSupabase.js';
import {liveIntent,liveMessage,LIVE_CAPABILITIES} from './liveLmsIntent.js';
import {isLiveReceipt,openLive,sealLive} from './liveLmsReceipts.js';
import {persistQuality} from './aiQualityCapture.js';
import {APP_VERSION} from './version.js';

export async function authenticateLive(request) {
 const identity=await authenticateRequestIdentity(request);
 return {...identity,supabase:createAdminSupabase()};
}
export function liveAuthFailure(error) {
 if(!(error instanceof LiveAuthenticationError))return null;
 return {status:error.status,body:{success:false,error:error.status===401?'Please sign in to use Ask LWR Pickleball Club AI.':'Authentication is temporarily unavailable. Please try again.'},headers:{'Cache-Control':'private, no-store'}};
}
export function needsLive(body) {return Boolean(liveIntent(body?.question)) || isLiveReceipt(body?.conversationReceipt);}

export async function runLive({body,principal,origin='player_interface',lookup,persist=persistQuality,clock=Date.now}) {
 const started=clock(),answerId=randomUUID();let previous=null;
 if(isLiveReceipt(body.conversationReceipt)&&!liveIntent(body.question)&&!/^(?:(?:option )?[1-5]|(?:next|more)(?: players| page)?|(?:primetime |prime time |current )?(?:season )?dupr)[?.!]*$/i.test(String(body.question||'').trim()))return null;
 if(isLiveReceipt(body.conversationReceipt)) {try{previous=openLive(body.conversationReceipt,'context',principal);}catch{return {kind:'clarification',answer:'The live context expired. Please name the player or team again.',sources:[],conversationReceipt:null};}}
 let query=liveIntent(body.question,previous);
 // A new independent document question clears the live reference and stays RAG.
 if(!query)return null;
 if(String(body.question||'').length>1000)query={intent:'UNSUPPORTED'};
 if(query.useSubject)query=previous?.subject?{...query,subject:previous.subject}:{intent:'UNSUPPORTED'};
 if(previous && query.continueContext && query.intent===previous.intent && !query.name && !query.teamName) {
  for(const k of ['subject','team','season'])if(previous[k])query[k]=previous[k];
 }
 if(query.choice){const selected=previous?.choices?.[query.choice-1];if(!selected)query={intent:'UNSUPPORTED'};else query={...query,...selected};}
 if(query.nextPage)query.offset=previous?.offset+25 || 25;
 if(query.nextChoices)query.choiceOffset=(previous?.choiceOffset||0)+5;
 // Construct exact parameters: browser role/team/member/context IDs are ignored.
 const args={intent:query.intent,origin};for(const k of ['name','teamName','rating','subject','subjectKind','team','season','offset','choiceOffset','self'])if(query[k]!==undefined)args[k]=query[k];
 let data;
 try{
  if(query.rating==='unsupported'||!LIVE_CAPABILITIES.includes(query.intent))data={status:'unsupported'};
  else {const response=await (lookup || ((q)=>principal.supabase.rpc('ai_live_lookup',{p_actor:principal.user.id,p_request:answerId,p_query:q}).abortSignal(AbortSignal.timeout(5000))))(args);if(response.error)throw new Error('live_lookup');data=response.data;}
 }catch{data={status:'technical_error'};}
 const completed=clock(),status=data?.status||'technical_error';data={...data,status,intent:query.intent};
 const relation=['self','team','manager'].includes(data.relationship)?data.relationship:'unresolved';
 const kind=status==='ambiguous'||status==='rating_clarification'?'clarification':status==='technical_error'?'technical_error':['denied','unsupported','rate_limited','not_found'].includes(status)?'protected':'answer';
 const metadata={intent:LIVE_CAPABILITIES.includes(query.intent)?query.intent:'UNSUPPORTED',status,relationship:relation,origin};
 let receipt=null;
 if(!['protected','technical_error'].includes(kind)){
  const context={intent:query.intent,query:{intent:query.intent,subjectKind:query.subjectKind,...(query.rating?{rating:query.rating}:{}),...(query.self?{self:true}:{})},subject:data.subject||query.subject,team:data.teamRef||query.team,season:data.seasonRef||query.season,offset:data.offset||0,choiceOffset:query.choiceOffset||0,moreChoices:Boolean(data.moreChoices),
   choices:(data.choices||[]).map(c=>Object.fromEntries(['subject','team','season'].filter(k=>c[k]).map(k=>[k,c[k]])))};
  receipt=sealLive('context',principal,context);
 }
 const result={kind,answer:liveMessage(data),sources:[],conversationReceipt:receipt,live:{label:'LIVE LMS DATA',operation:query.intent.replaceAll('_',' '),checkedAt:new Date(completed).toISOString()},
  ...(kind==='answer'&&LIVE_CAPABILITIES.includes(query.intent)?{feedbackReceipt:sealLive('feedback',principal,{answerId,...metadata})}:{})};
 if(status==='ambiguous')result.answer+=data.choices?.length?'\n'+data.choices.map((c,i)=>`${i+1}. ${c.label}`).join('\n'):' Please check the authorized schedule or roster to distinguish the matching records.';
 result.live.timing={authMs:Math.round(principal.authMs||0),lookupMs:completed-started,personResolutionMs:data.resolutionMs??null,databaseQueryMs:data.queryMs??null,formattingMs:Math.max(0,clock()-completed),totalMs:Math.round((principal.authMs||0)+clock()-started)};
 if(data.moreChoices)result.answer+='\nReply “next page” for more authorized teams.';
 // Explicit allowlist: no execution object, question, names, target IDs or facts.
 try { await persist(principal.supabase,()=>({p_outcome:{id:answerId,request_started_at:new Date(started).toISOString(),completed_at:new Date(completed).toISOString(),origin,final_kind:kind,reason_code:status,assistant_version:APP_VERSION,model:null,feedback_eligible:Boolean(result.feedbackReceipt),source_family:'LIVE_LMS_DATA',selected_evidence_count:0,stage3_invoked:false,model_call_skipped:true,guard_classification:kind==='protected'?'live_boundary':null,resolver_classification:'live_deterministic',diagnostic_snapshot:{liveIntent:metadata.intent,resultCode:status,relationship:relation,projectionVersion:1},total_ms:completed-started,input_tokens:0,output_tokens:0,telemetry_version:2},p_occurrence:null,p_route:null,p_feedback_id:null})); } catch { /* Quality capture is fail-open; no protected payload logging. */ }
 return result;
}

export async function liveFeedback(body,principal) {
 if(typeof body.helpful!=='boolean')throw new Error('live_feedback');
 const {answerId,...metadata}=openLive(body.receipt,'feedback',principal);
 const {data,error}=await principal.supabase.rpc('ai_live_feedback',{p_actor:principal.user.id,p_answer:answerId,p_helpful:body.helpful,p_metadata:metadata});
 if(error)throw new Error('live_feedback');return data;
}
