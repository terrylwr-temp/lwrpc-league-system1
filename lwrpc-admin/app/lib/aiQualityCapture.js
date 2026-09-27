import { randomUUID } from "node:crypto";
import { APP_VERSION } from "./version.js";
import { qualityOutcome, qualityException, qualityFeedback } from "./aiQualitySnapshots.js";

import {persistQuality} from './aiQualityPersistence.js';
export {persistQuality,QUALITY_CAPTURE_BUDGET_MS} from './aiQualityPersistence.js';
function health(event,stage){console.info('ai_quality_capture',{event,stage,assistant_version:APP_VERSION});}
export async function observeQualityRequest({supabase,origin='player_interface',run,clock=Date.now,persist=persistQuality,deferRecovery,complete}) {
  const id=randomUUID(), started=clock(), trace={stage3Invoked:false};
  let execution;
  try {execution=await run(id,trace);} catch(error) {
    await safePersist(()=>persist(supabase,()=>({p_outcome:qualityOutcome({id,origin,started,completed:clock(),stage3Invoked:trace.stage3Invoked,technicalError:true}),p_occurrence:null,p_route:null,p_feedback_id:null}),{correlationId:id,origin,deferRecovery}));
    throw error;
  }
  const completed=clock();
  const outcome=qualityOutcome({id,origin,started,completed,execution,stage3Invoked:trace.stage3Invoked});
  const exception=qualityException(outcome,execution);
  if (complete && ['answer','insufficient_evidence'].includes(outcome.final_kind)) {
    // A reviewable answer must not be returned if its snapshot cannot be saved.
    await complete({outcome,exception,execution,id,started,completed,origin});
  } else {
    await safePersist(()=>persist(supabase,()=>({p_outcome:outcome,...exception,p_feedback_id:null}),{correlationId:id,origin,deferRecovery}));
  }
  return execution;
}
async function safePersist(write) {try {await write();} catch {try {health('capture_failed','observer');} catch {}}}
export async function captureQualityFeedback(supabase,claims,feedbackId,{deferRecovery}={}) {
  await safePersist(()=>persistQuality(supabase,()=>({p_outcome:null,...qualityFeedback(claims),p_feedback_id:feedbackId}),{deferRecovery}));
}
