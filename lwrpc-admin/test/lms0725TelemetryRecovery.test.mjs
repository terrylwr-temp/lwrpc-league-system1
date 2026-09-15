import test from 'node:test';
import assert from 'node:assert/strict';
import {persistQuality,reconcileQuality} from '../app/lib/aiQualityPersistence.js';
import {observeQualityRequest} from '../app/lib/aiQualityCapture.js';
import fs from 'node:fs';
const id='77848361-efa8-400c-be6b-dbb8648039b2';
const payload=()=>({p_outcome:{id,origin:'player_interface',final_kind:'answer',request_started_at:'2026-09-08T19:19:00.000Z',completed_at:'2026-09-08T19:19:04.700Z',selected_evidence_count:1,diagnostic_snapshot:{candidateCount:32}},p_occurrence:null,p_route:null,p_feedback_id:null});
function harness(writes,reads=[]){
 let time=0,serial=0;const timers=new Map(),rows=new Map(),calls=[],logs=[],deferred=[];
 const setTimer=(fn,ms)=>{const n=++serial;timers.set(n,{at:time+ms,fn});return n;};
 const clearTimer=n=>timers.delete(n);
 const settle=(delay,fn)=>new Promise((resolve,reject)=>setTimer(()=>{try{resolve(fn());}catch(e){reject(e);}},delay));
 const db={rpc:(name,args)=>({abortSignal:signal=>{
  assert.equal(name,'capture_ai_quality');calls.push(args);const spec=writes[calls.length-1];assert.ok(spec,'unexpected retry');
  return settle(spec.delay,()=>{if(spec.commit){const old=rows.get(id);if(old)assert.deepEqual(old,args.p_outcome);else rows.set(id,structuredClone(args.p_outcome));}if(signal.aborted&&!spec.ignoreAbort)return {error:{message:'aborted'}};return {error:spec.error||null};});
 }}),from:table=>{
  assert.equal(table,'ai_request_outcomes');const query={select:()=>query,eq:()=>query,limit:()=>query,abortSignal:()=>{const spec=reads.shift()||{};return settle(spec.delay||0,()=>{if(spec.throw)throw Error('private network secret');if(spec.before)spec.before(rows);return {data:rows.has(id)?[structuredClone(rows.get(id))]:[],error:spec.error||null};});}};return query;
 }};
 const options={now:()=>time,setTimer,clearTimer,log:(event,stage,detail)=>logs.push({event,stage,...detail}),deferRecovery:fn=>deferred.push(fn)};
 async function drive(p){let done=false,value,error;p.then(v=>{done=true;value=v;},e=>{done=true;error=e;});
  for(let i=0;i<1000&&!done;i++){await new Promise(r=>setImmediate(r));if(done)break;const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];assert.ok(next,'promise has no scheduled continuation');timers.delete(next[0]);time=next[1].at;next[1].fn();}
  assert.ok(done,'bounded lifecycle must settle');if(error)throw error;return value;
 }
 return {db,options,drive,rows,calls,logs,deferred,get time(){return time;}};
}
for(const [name,writes,reads,expected,calls] of [
 ['450ms success',[{delay:450,commit:true}],[],true,1],
 ['deadline then found',[{delay:550,commit:true,ignoreAbort:true}],[{delay:100}],true,1],
 ['deadline absent then retry',[{delay:800,commit:false},{delay:40,commit:true}],[],true,2],
 ['late first commit races retry',[{delay:550,commit:true,ignoreAbort:true},{delay:80,commit:true}],[],true,2],
 ['reconciliation timeout',[{delay:800,commit:false}],[{delay:800}],false,1],
 ['reconciliation failure',[{delay:800,commit:false}],[{throw:true}],false,1],
 ['second deadline then found',[{delay:800,commit:false},{delay:550,commit:true,ignoreAbort:true}],[{}, {delay:100}],true,2],
 ['second deadline absent',[{delay:800,commit:false},{delay:800,commit:false}],[],false,2],
 ['mismatch never retries',[{delay:800,commit:false}],[{before:rows=>rows.set(id,{...payload().p_outcome,final_kind:'conflict'})}],false,1],
])test('0725 Q78 '+name,async()=>{
 const h=harness(writes,reads);let builds=0;const original=payload();
 const first=await h.drive(persistQuality(h.db,()=>{builds++;return original;},h.options));
 let result=first;
 if(h.deferred.length){assert.equal(h.time,500);assert.equal(first,false);assert.equal(h.logs[0].event,'capture_pending');assert.equal(h.logs[0].commit_status,'UNKNOWN');original.p_outcome.diagnostic_snapshot.candidateCount=999;result=await h.drive(h.deferred[0]());}
 assert.equal(result,expected);assert.equal(builds,1);assert.equal(h.calls.length,calls);
 assert.equal(h.logs.filter(l=>l.event!=='capture_pending').length,1);assert.equal(h.calls[0].p_outcome.diagnostic_snapshot.candidateCount,32);
 assert.ok(Object.isFrozen(h.calls[0].p_outcome.diagnostic_snapshot));if(calls===2)assert.equal(h.calls[0],h.calls[1]);
 assert.doesNotMatch(JSON.stringify(h.logs),/private network secret|request_started_at|candidateCount/);
 assert.ok(h.time<=2000);if(expected)assert.equal(h.rows.size,1);
});
test('0725 Q78 safe answer returns before recovery and no answer rerun',async()=>{
 const h=harness([{delay:800},{delay:30,commit:true}]);let generated=0;const result={kind:'answer',answer:'Registration opens September 7, 2026.',sources:[]};
 // Stable observer ID is supplied by the real observer; use a shape adapter for this fixture.
 const db={...h.db,rpc:(name,args)=>h.db.rpc(name,{...args,p_outcome:{...args.p_outcome,id}})};
 const execution=await h.drive(observeQualityRequest({supabase:db,run:async()=>{generated++;return {result,answer:{selectedEvidence:[]}};},persist:(s,b,o)=>persistQuality(s,b,{...h.options,...o,deferRecovery:h.options.deferRecovery})}));
 assert.equal(execution.result,result);assert.equal(h.time,500);assert.equal(generated,1);assert.equal(h.deferred.length,1);
 await h.drive(h.deferred[0]());assert.equal(generated,1);
});
test('0725 reconciliation cannot accept an older positive occurrence for missing negative review case',async()=>{
 const a={p_outcome:null,p_occurrence:{answer_id:id,occurrence_kind:'grounded_feedback',original_question:'Question',effective_question:'Question',assistant_version:'LMS-0725',output_text:null,source_snapshot:[],selection_snapshot:{},resolver_snapshot:{},model:'fixture'},p_feedback_id:'feedback'};
 let hasCase=false;const tables={ai_review_occurrences:[{...a.p_occurrence,group_id:'group'}],ai_answer_feedback_events:[{id:'feedback',answer_id:id}]};
 const db={from:table=>{const q={select:()=>q,eq:()=>q,limit:()=>q,abortSignal:async()=>({data:table==='ai_manager_review_cases'?(hasCase?[{id:'case'}]:[]):tables[table],error:null})};return q;}};
 assert.equal(await reconcileQuality(db,a,new AbortController().signal),'NOT_FOUND');hasCase=true;assert.equal(await reconcileQuality(db,a,new AbortController().signal),'FOUND');
});
test('0725 recovery scheduling failure is visible and never runs detached',async()=>{
 const h=harness([{delay:800}]);const value=await h.drive(persistQuality(h.db,payload,{...h.options,deferRecovery:()=>{throw Error('framework unavailable');}}));
 assert.equal(value,false);assert.equal(h.logs.length,1);assert.equal(h.logs[0].operation,'schedule_recovery');assert.equal(h.calls.length,1);
});
test('0725 recovery keeps origin and never introduces actor or effective member identifiers',async()=>{
 const h=harness([{delay:800},{delay:20,commit:true}]);const p=payload();p.p_outcome.origin='view_as';
 await h.drive(persistQuality(h.db,()=>p,h.options));await h.drive(h.deferred[0]());
 assert.ok(h.logs.every(x=>x.origin==='view_as'));assert.ok(h.calls.every(x=>x.p_outcome.origin==='view_as'));
 const view=fs.readFileSync(new URL('../app/api/view-as/read/route.js',import.meta.url),'utf8');assert.match(view,/persist:async\(\)=>\{\}/);assert.match(view,/call\('diagnostic'/);assert.doesNotMatch(view,/observeQualityRequest|deferRecovery/);
});
test('0725 recovery callback reentry cannot exceed one retry or terminal diagnostic',async()=>{
 const h=harness([{delay:800},{delay:20,commit:true}]);await h.drive(persistQuality(h.db,payload,h.options));
 const a=h.deferred[0](),b=h.deferred[0]();assert.equal(a,b);await h.drive(a);
 assert.equal(h.calls.length,2);assert.equal(h.logs.filter(x=>x.event==='capture_succeeded').length,1);
});
test('0725 all ordinary capture route callers register framework-owned recovery',()=>{
 for(const name of ['ask-lwr/route.js','ai-assistant/answer/route.js','ask-lwr/feedback/route.js']){
  const source=fs.readFileSync(new URL('../app/api/'+name,import.meta.url),'utf8');
  assert.match(source,/import \{ after, NextResponse \} from "next\/server"/);assert.match(source,/deferRecovery:\s*after/);
 }
});