import {questionIntent,isDocumentIntent} from './aiRequestIntent.js';
import {choiceMatch,liveResolvedQuestion} from './aiClarificationChoices.js';
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

export async function runLive({body,principal,origin='player_interface',lookup,persist=persistQuality,clock=Date.now,deferRecovery}) {
 const started=clock(),answerId=randomUUID();let previous=null;
 if(isLiveReceipt(body.conversationReceipt)&&isDocumentIntent(questionIntent(body.question)))return null;
 if(isLiveReceipt(body.conversationReceipt)) {try{previous=openLive(body.conversationReceipt,'context',principal);}catch{return {kind:'clarification',answer:'The live context expired. Please ask the full question again.',sources:[],conversationReceipt:null};}}
 const option=previous?choiceMatch(body.question,previous.choices):null;
 if(previous&&!option&&!liveIntent(body.question)&&!/^(?:next|more)(?: players| page)?[?.!]*$/i.test(String(body.question||'').trim())&&!/^(?:season dupr|primetime(?: season)?(?: dupr)?|prime time(?: season)?(?: dupr)?|current dupr)[?.!]*$/i.test(String(body.question||'').trim())) {
  if(String(body.question||'').trim().split(/\s+/).length>4&&!/^choice:/.test(body.question))return null;
  return {kind:'clarification',answer:'Please ask the full question again or choose a current option.',sources:[],conversationReceipt:null};
 }
 let query=option?{...previous.query,...Object.fromEntries(['subject','team','season','rating'].filter(k=>option[k]).map(k=>[k,option[k]])),continueContext:true}:liveIntent(body.question,previous);
 // A new independent document question clears the live reference and stays RAG.
 if(!query)return null;
 if(String(body.question||'').length>1000)query={intent:'UNSUPPORTED'};
 if(query.useSubject)query=previous?.subject?{...query,subject:previous.subject}:{intent:'UNSUPPORTED'};
 if(previous && query.continueContext && query.intent===previous.intent && !query.name && !query.teamName) {
  for(const k of ['subject','team','season'])if(previous[k]&&!query[k])query[k]=previous[k];
 }
 if(query.choice){const selected=previous?.choices?.[query.choice-1];if(!selected)query={intent:'UNSUPPORTED'};else query={...query,...selected};}
 if(query.nextPage)query.offset=previous?.offset+25 || 25;
 if(query.nextChoices)query.choiceOffset=(previous?.choiceOffset||0)+5;
 // Construct exact parameters: browser role/team/member/context IDs are ignored.
 const args={intent:query.intent,origin};for(const k of ['name','teamName','rating','subject','subjectKind','team','season','seasonName','scopeName','offset','choiceOffset','self','projection'])if(query[k]!==undefined)args[k]=query[k];
 let data;
 try{
  if(query.rating==='unsupported'||!LIVE_CAPABILITIES.includes(query.intent))data={status:'unsupported'};
  else {const response=await (lookup || ((q)=>principal.supabase.rpc('ai_live_lookup',{p_actor:principal.user.id,p_request:answerId,p_query:q}).abortSignal(AbortSignal.timeout(5000))))(args);if(response.error)throw new Error('live_lookup');data=response.data;}
 }catch{data={status:'technical_error'};}
 const completed=clock(),status=data?.status||'technical_error';data={...data,status,intent:query.intent,self:query.intent==='SELF_RATING'||query.subjectKind==='SELF',projection:query.projection};
 const relation=['self','team','manager'].includes(data.relationship)?data.relationship:'unresolved';
 const kind=status==='ambiguous'||status==='rating_clarification'?'clarification':status==='technical_error'?'technical_error':['denied','unsupported','rate_limited','not_found'].includes(status)?'protected':'answer';
 const metadata={intent:LIVE_CAPABILITIES.includes(query.intent)?query.intent:'UNSUPPORTED',status,relationship:relation,origin};
 const choices=(data.choices||[]).slice(0,10).map(c=>({...c,key:randomUUID()}));
 let receipt=null;
 if(!['protected','technical_error'].includes(kind)){
  const context={intent:query.intent,displayQuestion:query.continueContext?previous?.displayQuestion:String(body.question||'').slice(0,1000),query:{intent:query.intent,subjectKind:query.subjectKind,...(query.rating?{rating:query.rating}:{}),...(query.self!==undefined?{self:query.self}:{}),...(query.teamName?{teamName:query.teamName}:{}),...(query.seasonName?{seasonName:query.seasonName}:{}),...(query.scopeName?{scopeName:query.scopeName}:{}),...(query.projection?{projection:query.projection}:{})},subject:data.subject||query.subject,team:data.teamRef||query.team,season:data.seasonRef||query.season,offset:data.offset||0,choiceOffset:query.choiceOffset||0,moreChoices:Boolean(data.moreChoices),
   choices:choices.map(c=>Object.fromEntries(['subject','team','season','rating','label','key'].filter(k=>c[k]).map(k=>[k,c[k]])))};
  receipt=sealLive('context',principal,context);
 }
 const result={kind,resolvedQuestion:liveResolvedQuestion(query,data)||(query.continueContext?previous?.displayQuestion:null),answer:query.rating==='unsupported'?'Current official DUPR is not currently available through this Live LMS lookup.':liveMessage(data,query),sources:[],conversationReceipt:receipt,live:{label:'LIVE LMS DATA',operation:query.intent.replaceAll('_',' '),checkedAt:new Date(completed).toISOString()},
  ...(origin!=='view_as'&&kind==='answer'&&LIVE_CAPABILITIES.includes(query.intent)?{feedbackReceipt:sealLive('feedback',principal,{answerId,...metadata})}:{})};
 if(choices.length)result.clarification={kind:data.choiceKind||'context',options:choices.map(c=>({key:'choice:'+c.key,label:c.label})),hasMore:Boolean(data.moreChoices)};
 result.live.timing={authMs:Math.round(principal.authMs||0),lookupMs:completed-started,personResolutionMs:data.resolutionMs??null,databaseQueryMs:data.queryMs??null,formattingMs:Math.max(0,clock()-completed),totalMs:Math.round((principal.authMs||0)+clock()-started)};
 if(data.moreChoices)result.clarification={...result.clarification,hasMore:true};
 if(data.more)result.clarification={kind:'roster_page',options:[{key:'next',label:'Show more players'}]};
 // Explicit allowlist: no execution object, question, names, target IDs or facts.
 try { await persist(principal.supabase,()=>({p_outcome:{id:answerId,request_started_at:new Date(started).toISOString(),completed_at:new Date(completed).toISOString(),origin,final_kind:kind,reason_code:status,assistant_version:APP_VERSION,model:null,feedback_eligible:Boolean(result.feedbackReceipt),source_family:'LIVE_LMS_DATA',selected_evidence_count:0,stage3_invoked:false,model_call_skipped:true,guard_classification:kind==='protected'?'live_boundary':null,resolver_classification:'live_deterministic',diagnostic_snapshot:{liveIntent:metadata.intent,resultCode:status,relationship:relation,projectionVersion:1},total_ms:completed-started,input_tokens:0,output_tokens:0,telemetry_version:2},p_occurrence:null,p_route:null,p_feedback_id:null}),{correlationId:answerId,origin,deferRecovery}); } catch { /* Quality capture is fail-open; no protected payload logging. */ }
 return result;
}

export async function liveFeedback(body,principal) {
 if(typeof body.helpful!=='boolean')throw new Error('live_feedback');
 const {answerId,...metadata}=openLive(body.receipt,'feedback',principal);
 const {data,error}=await principal.supabase.rpc('ai_live_feedback',{p_actor:principal.user.id,p_answer:answerId,p_helpful:body.helpful,p_metadata:metadata});
 if(error)throw new Error('live_feedback');return data;
}
