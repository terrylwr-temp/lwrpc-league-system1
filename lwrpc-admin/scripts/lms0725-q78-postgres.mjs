// Diagnostic experiment only. NOT a deployable repair. Synthetic, loopback PostgreSQL.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const bin=process.argv[2] || path.join(tmpdir(),'lms0723-pg17-runtime/pgsql/bin');
const dir=await mkdtemp(path.join(tmpdir(),'lms0725-q78-'));
const data=path.join(dir,'data'); const port='56178';
const env={...process.env}; for(const k of Object.keys(env))if(k.startsWith('PG'))delete env[k];
const run=(exe,args)=>{const r=spawnSync(path.join(bin,exe),args,{env,windowsHide:true,encoding:'utf8',stdio:exe==='pg_ctl.exe'?'ignore':'pipe'});if(r.status!==0)throw Error(`${exe}: ${r.stderr||r.stdout||r.error||r.status}`);return r.stdout;};
let started=false; const sessions=[];
import {id} from '../test/helpers/viewAsFixture.mjs';
class Session{
 constructor(){
  this.pending=null;this.buffer='';this.errors='';
  this.p=spawn(path.join(bin,'psql.exe'),['-X','-qAt','-h','127.0.0.1','-p',port,'-U','local_bootstrap','-d','postgres'],{env,windowsHide:true,stdio:'pipe'});
  this.p.stdout.on('data',b=>{this.buffer+=b; if(this.pending&&this.buffer.includes(this.pending.marker)){
   const {resolve,marker,timer}=this.pending;clearTimeout(timer);const out=this.buffer.slice(0,this.buffer.indexOf(marker)).trim();
   this.buffer=this.buffer.slice(this.buffer.indexOf(marker)+marker.length).trimStart();this.pending=null;resolve({out,error:this.errors});this.errors='';
  }});
  this.p.stderr.on('data',b=>this.errors+=b);
  this.p.on('error',e=>this.pending?.reject(e));sessions.push(this);
 }
 q(sql){assert.equal(this.pending,null);return new Promise((resolve,reject)=>{const marker=`DONE_${Math.random().toString(16).slice(2)}`;
  const timer=setTimeout(()=>reject(Error('isolated query timeout')),20000);
  this.pending={resolve,reject,marker,timer};this.p.stdin.write(`${sql}\n;\n\\echo ${marker}\n`);
 });}
 async ok(sql){const r=await this.q(sql);assert.ok(!/ERROR:|FATAL:/.test(r.error),r.error);return r.out;}
}


import {persistQuality,reconcileQuality} from '../app/lib/aiQualityPersistence.js';
import {qualityOutcome,qualityException,qualityFeedback} from '../app/lib/aiQualitySnapshots.js';
import {writeFile} from 'node:fs/promises';
const quote=v=>v==null?'null':`'${(typeof v==='object'?JSON.stringify(v):String(v)).replaceAll("'","''")}'`;
const call=a=>`select capture_ai_quality(${[a.p_outcome,a.p_occurrence,a.p_route,a.p_feedback_id].map(quote).join(',')});`;
try{
 run('initdb.exe',['-D',data,'-U','local_bootstrap','-A','trust','--no-locale','-E','UTF8']);
 run('pg_ctl.exe',['-D',data,'-l',path.join(dir,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);started=true;
 const admin=new Session();
 await admin.ok('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create table members(id uuid primary key);grant usage on schema public,auth to service_role;');
 for(const file of ['supabase-ai-assistant-lms-0712-stage6.sql','supabase-ai-assistant-lms-0716-stage7a.sql'])await admin.ok(await readFile(file,'utf8'));
 const first=new Session(),second=new Session(),reader=new Session();
 for(const s of [first,second,reader])await s.ok('set role service_role;');
 const execution={result:{kind:'answer'},answer:{model:'fixture',selectedEvidence:[]}};
 const args={p_outcome:qualityOutcome({id:id(800),origin:'player_interface',started:1000,completed:2000,execution}),p_occurrence:null,p_route:null,p_feedback_id:null};
 let writes=0,recovery,firstArgs;const logs=[];
 const db={rpc:(_name,a)=>({abortSignal:async()=>{writes++;if(writes===1){firstArgs=a;await first.ok('begin;'+call(a));return new Promise(()=>{});}assert.equal(a,firstArgs);await second.ok(call(a));return {error:null};}}),from:table=>{
  assert.equal(table,'ai_request_outcomes');let value;const q={select:()=>q,eq:(_key,v)=>{value=v;return q;},limit:()=>q,abortSignal:async()=>{
   const rows=JSON.parse(await reader.ok(`select coalesce(json_agg(x),'[]') from (select * from ai_request_outcomes where id=${quote(value)}) x;`));
   assert.equal(rows.length,0,'uncommitted first write invisible at reconciliation');
   await first.ok('commit;'); // first commit races the retry after the negative read
   return {data:rows,error:null};}};return q;
 }};
 assert.equal(await persistQuality(db,()=>args,{deferRecovery:fn=>{recovery=fn;},log:(event,stage,d)=>logs.push({event,stage,...d})}),false);
 assert.equal(logs[0].commit_status,'UNKNOWN');assert.equal(await recovery(),true);assert.equal(writes,2);
 assert.equal(await admin.ok(`select count(*) from ai_request_outcomes where id=${quote(id(800))};`),'1');
 assert.equal(logs.filter(x=>x.event==='capture_succeeded').length,1);
 const mismatch=await second.q(call({...args,p_outcome:{...args.p_outcome,total_ms:999}}));assert.match(mismatch.error,/quality_outcome_mismatch/);
 // A concurrent identical call waits on the actual per-answer advisory lock.
 const concurrent={...args,p_outcome:{...args.p_outcome,id:id(801)}};
 await first.ok('begin;'+call(concurrent));const waiting=second.ok(call(concurrent));await first.ok('commit;');await waiting;
 assert.equal(await admin.ok(`select count(*) from ai_request_outcomes where id=${quote(id(801))};`),'1');
 process.env.AI_QUALITY_HMAC_KEY='isolated-quality-fixture-key-at-least-32-bytes';
 const exceptionExecution={result:{kind:'insufficient_evidence',answer:'Fixture unanswered'},answer:{},conversationResolution:{rawQuestion:'Fixture question',effectiveQuestion:'Fixture question'}};
 const outcome=qualityOutcome({id:id(802),origin:'player_interface',started:1000,completed:2000,execution:exceptionExecution});
 const exception={p_outcome:outcome,...qualityException(outcome,exceptionExecution),p_feedback_id:null};
 await first.ok('begin;'+call(exception));const waitingException=second.ok(call(exception));await first.ok('commit;');await waitingException;
 assert.equal(await admin.ok(`select count(*) from ai_review_occurrences where answer_id=${quote(id(802))};`),'1');
 assert.equal(await admin.ok(`select count(*) from ai_manager_review_events where operation_id=${quote(id(802))};`),'1');
 // Existing feedback event is never inserted by capture retry; its observation
 // and source snapshot stay one logical occurrence despite concurrent replay.
 await admin.ok(`insert into auth.users values(${quote(id(901))});`);
 const feedbackId=id(803),answerId=id(804);
 await admin.ok(`insert into ai_answer_feedback_events(id,answer_id,auth_user_id,helpful,original_question,effective_question,generated_answer,source_snapshot,selection_snapshot,assistant_version,model) values(${quote(feedbackId)},${quote(answerId)},${quote(id(901))},false,'Fixture question','Fixture question','Fixture answer','[]','{}','LMS-0725','fixture');`);
 const feedbackOutcome=qualityOutcome({id:answerId,origin:'player_interface',started:1000,completed:2000,execution:{result:{kind:'answer',feedbackReceipt:'fixture'},answer:{model:'fixture'}}});
 await first.ok(call({p_outcome:feedbackOutcome,p_occurrence:null,p_route:null,p_feedback_id:null}));
 const feedback={p_outcome:null,...qualityFeedback({answerId,assistantVersion:'LMS-0725',originalQuestion:'Fixture question',effectiveQuestion:'Fixture question',answer:'Fixture answer',sources:[{documentId:id(910),documentVersionId:id(911),chunkId:id(912),documentTitle:'Fixture official source',pageNumber:1}],selectedEvidence:[{documentId:id(910),documentVersionId:id(911),chunkId:id(912)}],model:'fixture'}),p_feedback_id:feedbackId};
 await first.ok('begin;'+call(feedback));const waitingFeedback=second.ok(call(feedback));await first.ok('commit;');await waitingFeedback;
 assert.equal(await admin.ok(`select count(*) from ai_review_occurrences where answer_id=${quote(answerId)};`),'1');
 assert.equal(await admin.ok(`select count(*) from ai_manager_review_events where operation_id=${quote(feedbackId)};`),'1');
 assert.equal(await admin.ok(`select count(*) from ai_answer_feedback_events where answer_id=${quote(answerId)};`),'1');
 assert.equal(await admin.ok('select jsonb_array_length(source_snapshot) from ai_review_occurrences where answer_id='+quote(answerId)+';'),'1');
 const sqlRead={from:table=>{let columns='*';const filters=[];const q={select:v=>{columns=v;return q;},eq:(key,v)=>{filters.push(`${key}=${typeof v==='boolean'?v:quote(v)}`);return q;},limit:()=>q,abortSignal:async()=>({data:JSON.parse(await reader.ok(`select coalesce(json_agg(x),'[]') from (select ${columns} from ${table} where ${filters.join(' and ')} limit 1) x;`)),error:null})};return q;}};
 assert.equal(await reconcileQuality(sqlRead,args,new AbortController().signal),'FOUND');
 assert.equal(await reconcileQuality(sqlRead,exception,new AbortController().signal),'FOUND');
 assert.equal(await reconcileQuality(sqlRead,feedback,new AbortController().signal),'FOUND');
 const result={postgresVersion:await admin.ok('show server_version;'),loopbackOnly:true,productionAccess:false,modelCalls:0,deadlineReconcileLateCommitRetry:'PASS',concurrentOutcomeReplay:'PASS',mismatchRejected:'PASS',exceptionOccurrenceAndReviewEvent:'ONE',feedbackEventOccurrenceAndSourceObservation:'ONE',correlationReconciliation:'PASS',writeAttempts:writes,terminalSuccessEvents:1,sqlChangesRequired:false};
 await writeFile('../docs/lms-0725-q78-postgres-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{for(const s of sessions)s.p.kill();if(started)run('pg_ctl.exe',['-D',data,'-m','immediate','-w','stop']);}