import { randomUUID } from "node:crypto";
import { APP_VERSION } from "./version.js";
import { qualityOutcome, qualityException, qualityFeedback } from "./aiQualitySnapshots.js";

export const QUALITY_CAPTURE_BUDGET_MS=500;
function health(event,stage) {
  // Existing hosting logs are the independent operational channel; never log input/errors.
  console.info('ai_quality_capture', {event,stage,assistant_version:APP_VERSION,time:new Date().toISOString()});
}
export async function persistQuality(supabase, build, {budgetMs=QUALITY_CAPTURE_BUDGET_MS, log=health}={}) {
  const controller=new AbortController();
  let timer;
  try {
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('quality_timeout'));},budgetMs);});
    const write=(async()=>{
      const args=build();
      const result=await supabase.rpc('capture_ai_quality',args).abortSignal(controller.signal);
      if(result.error) throw new Error('quality_persistence');
    })();
    await Promise.race([write,timeout]);
    try {log('capture_succeeded','persistence');} catch {}
    return true;
  } catch {
    controller.abort();
    try {log('capture_failed','persistence');} catch {}
    return false;
  } finally {clearTimeout(timer);}
}
export async function observeQualityRequest({supabase,origin='player_interface',run,clock=Date.now,persist=persistQuality}) {
  const id=randomUUID(), started=clock(), trace={stage3Invoked:false};
  let execution;
  try {execution=await run(id,trace);} catch(error) {
    await safePersist(()=>persist(supabase,()=>({p_outcome:qualityOutcome({id,origin,started,completed:clock(),stage3Invoked:trace.stage3Invoked,technicalError:true}),p_occurrence:null,p_route:null,p_feedback_id:null})));
    throw error;
  }
  const completed=clock();
  await safePersist(()=>persist(supabase,()=>{
    const outcome=qualityOutcome({id,origin,started,completed,execution,stage3Invoked:trace.stage3Invoked});
    return {p_outcome:outcome,...qualityException(outcome,execution),p_feedback_id:null};
  }));
  return execution;
}
async function safePersist(write) {try {await write();} catch {try {health('capture_failed','observer');} catch {}}}
export async function captureQualityFeedback(supabase,claims,feedbackId) {
  await safePersist(()=>persistQuality(supabase,()=>({p_outcome:null,...qualityFeedback(claims),p_feedback_id:feedbackId})));
}
