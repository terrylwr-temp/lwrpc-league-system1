import {isDeepStrictEqual} from 'node:util';
import {APP_VERSION} from './version.js';

export const QUALITY_CAPTURE_BUDGET_MS=500;
export const QUALITY_RECOVERY_BUDGET_MS=1500;
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v||'')?v:null;
const duration=n=>Math.min(60000,Math.max(0,Math.round(n)));
const health=(event,stage,detail)=>console.info('ai_quality_capture',{event,stage,assistant_version:APP_VERSION,time:new Date().toISOString(),...detail});
const occurrenceFields=['answer_id','occurrence_kind','original_question','effective_question','assistant_version','output_text','source_snapshot','selection_snapshot','resolver_snapshot','model'];
function freeze(value){if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;}
function same(actual,expected,fields=Object.keys(expected)){
 return fields.every(k=>{
  if(k==='recorded_at')return true;
  const a=actual[k]??null,b=expected[k]??null;
  if(k.endsWith('_at')&&a!==null&&b!==null)return Date.parse(a)===Date.parse(b);
  return isDeepStrictEqual(a,b);
 });
}
function reason(error,operation){
 if(error?.message==='quality_timeout')return 'DEADLINE';
 if(error?.message==='reconciliation_unknown')return 'RECONCILIATION_UNKNOWN';
 if(error?.message==='recovery_schedule_failed')return 'RECOVERY_SCHEDULE_FAILED';
 const known=['quality_kind','quality_snapshot_size','quality_normalized_size','quality_outcome_mismatch','quality_occurrence_mismatch','quality_identity','quality_forbidden','quality_empty'];
 if(known.includes(error?.message))return error.message;
 return operation==='build'?'BUILD_FAILED':safeCode(error)?'DATABASE_ERROR':'RPC_FAILED';
}
function safeCode(error){return ['23514','23505','23502','23503','22P02','22001','42501','57014','55P03','40001','40P01','08000','08006','PGRST116','PGRST301'].includes(error?.code)?error.code:null;}

// Read only transaction postconditions. No user identity or raw payload is logged.
export async function reconcileQuality(db,args,signal){
 const id=uuid(args.p_outcome?.id||args.p_occurrence?.answer_id);
 if(!id)return 'UNKNOWN';
 const row=async(table,key,value,columns='*')=>{
  const r=await db.from(table).select(columns).eq(key,value).limit(1).abortSignal(signal);
  if(r.error)throw r.error;
  return r.data?.[0]||null;
 };
 if(args.p_outcome){
  const o=await row('ai_request_outcomes','id',id);
  if(!o)return 'NOT_FOUND';
  if(!same(o,args.p_outcome))return 'MISMATCH';
 }
 if(args.p_occurrence){
  const occurrence=await row('ai_review_occurrences','answer_id',id);
  if(!occurrence)return 'NOT_FOUND';
  if(!same(occurrence,args.p_occurrence,occurrenceFields))return 'MISMATCH';
  // An earlier positive-feedback occurrence alone does not acknowledge a later
  // negative feedback's review-case side effect. Check that postcondition too.
  if(args.p_feedback_id){
   const feedback=await row('ai_answer_feedback_events','id',args.p_feedback_id,'id,answer_id');
   if(!feedback||feedback.answer_id!==id)return 'MISMATCH';
   const negative=await db.from('ai_answer_feedback_events').select('id').eq('answer_id',id).eq('helpful',false).limit(1).abortSignal(signal);
   if(negative.error)throw negative.error;
   if(negative.data?.length&&!(await row('ai_manager_review_cases','group_id',occurrence.group_id,'id')))return 'NOT_FOUND';
  }
 }
 return args.p_outcome||args.p_occurrence?'FOUND':'UNKNOWN';
}

export async function persistQuality(db,build,{budgetMs=QUALITY_CAPTURE_BUDGET_MS,log=health,correlationId=null,origin=null,deferRecovery,now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}={}){
 const started=now();let args,attempt=0,operation='build',terminal=false;
 const timings={build_ms:0,invocation_start_ms:null,rpc_ms:0,acknowledgement_ms:null,deadline_ms:null,reconciliation_ms:0,retry_ms:0,total_ms:0};
 let payloadBytes=0;
 const emit=(event,commitStatus,error=null,stage='persistence')=>{
  const o=args?.p_outcome;
  try{log(event,stage,{operation,correlation_id:uuid(o?.id||args?.p_occurrence?.answer_id||correlationId),origin:['player_interface','manager_test','view_as','legacy_unknown'].includes(o?.origin||args?.p_occurrence?.origin||origin)?o?.origin||args?.p_occurrence?.origin||origin:null,result_shape:['answer','insufficient_evidence','conflict','clarification','protected','technical_error'].includes(o?.final_kind)?o.final_kind:(args?.p_occurrence?'feedback':'unknown'),evidence_count:Number.isInteger(o?.selected_evidence_count)?o.selected_evidence_count:null,reason:error?reason(error,operation):'RECORDED',sqlstate:safeCode(error),attempt,duration_ms:duration(now()-started),commit_status:commitStatus,payload_bytes:payloadBytes,metadata_count:Object.keys(o?.diagnostic_snapshot||{}).length,reference_count:o?.diagnostic_snapshot?.policy?.candidates?.length||0,timings:{...timings,total_ms:duration(now()-started)}});}catch{/* Independent logger cannot break answer delivery. */}
 };
 const finish=(ok,status,error=null)=>{if(!terminal){terminal=true;emit(ok?'capture_succeeded':'capture_failed',status,error);}return ok;};
 const bounded=async(work,ms)=>{
  const controller=new AbortController();let timer;
  try{return await Promise.race([Promise.resolve().then(()=>work(controller.signal)),new Promise((_,reject)=>{timer=setTimer(()=>{reject(new Error('quality_timeout'));controller.abort();},Math.max(0,ms));})]);}
  finally{clearTimer(timer);controller.abort();}
 };
 try{const serialized=JSON.stringify(build());payloadBytes=Buffer.byteLength(serialized);args=freeze(JSON.parse(serialized));timings.build_ms=duration(now()-started);}
 catch(error){return finish(false,'NOT_SENT',error);}
 if(now()-started>=budgetMs)return finish(false,'NOT_SENT',new Error('quality_timeout'));
 const write=async ms=>{
  operation='capture_ai_quality';attempt++;const at=now();
  if(attempt===1)timings.invocation_start_ms=duration(at-started);
  try{await bounded(async signal=>{const r=await db.rpc('capture_ai_quality',args).abortSignal(signal);if(r.error)throw r.error;},ms);timings.acknowledgement_ms=duration(now()-started);}
  finally{timings[attempt===1?'rpc_ms':'retry_ms']=duration(now()-at);}
 };
 try{await write(budgetMs-(now()-started));return finish(true,'FOUND');}
 catch(error){
  if(error.message!=='quality_timeout')return finish(false,'UNKNOWN',error);
  timings.deadline_ms=duration(now()-started);
  if(typeof deferRecovery!=='function')return finish(false,'UNKNOWN',error);
  // Ownership is transferred to the route's Next.js after() lifecycle, never an
  // untracked promise. First deadline is pending, not a terminal failure.
  const recoverOnce=async()=>{
   const end=now()+QUALITY_RECOVERY_BUDGET_MS;
   const reconcile=async()=>{
    operation='reconcile_ai_quality';const at=now();
    try{return await bounded(signal=>reconcileQuality(db,args,signal),Math.min(500,Math.max(0,end-now())));}
    finally{timings.reconciliation_ms+=duration(now()-at);}
   };
   try{
    let status=await reconcile();
    if(status==='FOUND')return finish(true,status);
    if(status!=='NOT_FOUND')return finish(false,status,new Error(status==='MISMATCH'?'quality_outcome_mismatch':'reconciliation_unknown'));
    if(now()>=end)return finish(false,'NOT_FOUND',new Error('quality_timeout'));
    try{await write(Math.min(500,end-now()));return finish(true,'FOUND');}
    catch(retryError){
     if(retryError.message!=='quality_timeout')return finish(false,'UNKNOWN',retryError);
     status=await reconcile();
     return finish(status==='FOUND',status,status==='FOUND'?null:retryError);
    }
   }catch(reconcileError){return finish(false,'UNKNOWN',reconcileError);}
  };
  let recoveryPromise;
  const recover=()=>recoveryPromise??=(recoverOnce());
  try{deferRecovery(recover);emit('capture_pending','UNKNOWN',error);return false;}
  catch{operation='schedule_recovery';return finish(false,'UNKNOWN',new Error('recovery_schedule_failed'));}
 }
}