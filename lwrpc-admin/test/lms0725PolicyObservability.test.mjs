import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {questionIntent} from '../app/lib/aiRequestIntent.js';
import {liveIntent} from '../app/lib/liveLmsIntent.js';
import {selectPolicyEvidence,completePolicyEvidence} from '../app/lib/aiPolicyEvidence.js';
import {qualityOutcome} from '../app/lib/aiQualitySnapshots.js';
import {persistQuality} from '../app/lib/aiQualityCapture.js';
const snapshot=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-league-dates-current-evidence.json',import.meta.url)));
const candidates=snapshot.evidence.map(c=>({chunkId:c.id,documentId:c.document.id,documentVersionId:c.document_version_id,documentTitle:c.document.title,documentType:c.document.document_type,documentAuthorityRank:c.document.authority_rank,content:c.content,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,pageNumber:c.page_number,chunkOrdinal:c.chunk_ordinal}));
const family=['When is my Season DUPR established?','When is Season DUPR established?','When is my Season DUPR set?','When is my Season DUPR locked?','When does my Season DUPR lock?','Can my Season DUPR change during the season?','Does my Season DUPR stay the same all season?','How long does my Season DUPR remain in effect?','Can my rating be reset during the season?','How is my Season DUPR determined?','When is my PrimeTime Season DUPR established?','When is my season rating updated?'];
for(const question of family)test('0725 policy operation: '+question,()=>{
 assert.equal(liveIntent(question),null);assert.equal(questionIntent(question).object,'rating');
 const retrieval={request:{question},candidates,policyEvidence:{status:'complete',candidates}};
 const selected=selectPolicyEvidence(retrieval);assert.ok(selected.some(c=>c.chunkId==='d51e615b-a4f2-460f-8a81-da9abfbd46af'));
 for(const c of selected)for(const x of c.excerptItems)assert.equal(candidates.find(s=>s.chunkId===x.chunkId).content.slice(x.start,x.end),x.text);
 const payload=qualityOutcome({id:randomUUID(),origin:'player_interface',started:1,completed:2,execution:{retrieval,result:{kind:'insufficient_evidence'}}});
 assert.ok(Buffer.byteLength(JSON.stringify(payload.diagnostic_snapshot))<4096);assert.doesNotMatch(JSON.stringify(payload.diagnostic_snapshot),/player's|Season DUPR Rating is established/);
});
for(const [q,rating] of [['What is my Season DUPR?','season'],['What is my PrimeTime Season DUPR?','primetime'],['What is my current official DUPR?','unsupported']])test('0725 value contrast '+rating,()=>{assert.equal(liveIntent(q).rating,rating);});
test('0725 completion failure and dedup conflict remain empty with safe reasons',async()=>{
 const r={request:{question:family[0]},candidates};
 const query={select(){return this;},eq(){return this;},limit(){return this;},abortSignal(){return Promise.resolve({error:{message:'private token'}});}};
 await completePolicyEvidence({from:()=>query},r);assert.deepEqual(selectPolicyEvidence(r),[]);assert.equal(r.policyDiagnostic.applicability,'POLICY_COMPLETION_UNAVAILABLE');assert.equal(r.policyDiagnostic.completionStage,'catalog');assert.doesNotMatch(JSON.stringify(r.policyDiagnostic),/private token/);
 r.policyEvidence={status:'complete',candidates:[candidates[0],{...candidates[0],content:'different'}]};assert.deepEqual(selectPolicyEvidence(r),[]);assert.equal(r.policyDiagnostic.applicability,'DEDUP_CONFLICT');
});
test('0725 duration selects separately documented reset qualification',()=>{
 const base=candidates.find(c=>c.chunkId==='d51e615b-a4f2-460f-8a81-da9abfbd46af');
 const reset={...base,chunkId:randomUUID(),chunkOrdinal:100,content:'4.1.2. Season DUPR ratings may be reset at midseason for qualifying longer seasons.'};
 const selected=selectPolicyEvidence({request:{question:family[5]},policyEvidence:{status:'complete',candidates:[base,reset]}});
 assert.ok(selected.some(c=>c.excerptItems.some(x=>x.text===reset.content)));
});
for(const [fault,expected] of [['build','BUILD_FAILED'],['rpc','DATABASE_ERROR'],['timeout','DEADLINE']])test('0725 bounded telemetry reason '+fault,async()=>{
 const id=randomUUID(),logs=[];
 const db={rpc:()=>({abortSignal:()=>fault==='timeout'?new Promise(()=>{}):Promise.resolve({error:{code:'23514',message:'private email secret'}})})};
 const result=await persistQuality(db,()=>{if(fault==='build')throw Error('private token');return {p_outcome:{id,origin:'player_interface',final_kind:'answer',selected_evidence_count:4}};},{budgetMs:10,correlationId:id,origin:'player_interface',log:(...a)=>logs.push(a)});
 assert.equal(result,false);assert.equal(logs.length,1);assert.equal(logs[0][2].reason,expected);assert.equal(logs[0][2].correlation_id,id);assert.doesNotMatch(JSON.stringify(logs),/private|email|secret|token/);
});
test('0725 diagnostic snapshot fits existing PostgreSQL and replay remains idempotent',async()=>{
 const {PGlite}=await import('@electric-sql/pglite');const db=new PGlite();
 try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create table public.members(id uuid primary key); grant usage on schema public,auth to service_role;');
  for(const name of ['supabase-ai-assistant-lms-0712-stage6.sql','supabase-ai-assistant-lms-0716-stage7a.sql'])await db.exec(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
  const r={request:{question:family[0]},candidates,policyEvidence:{status:'complete',candidates}};selectPolicyEvidence(r);
  const p=qualityOutcome({id:randomUUID(),origin:'player_interface',started:1,completed:2,execution:{retrieval:r,result:{kind:'answer'}}});
  for(let i=0;i<2;i++)await db.query('select capture_ai_quality($1::jsonb,null,null,null)',[p]);
  assert.equal((await db.query('select count(*)::int as n from ai_request_outcomes')).rows[0].n,1);
  assert.ok((await db.query('select octet_length(diagnostic_snapshot::text) as n from ai_request_outcomes')).rows[0].n<4096);
 }finally{await db.close();}
});
test('0725 no evidence or failed source validation never invokes model',async()=>{
 process.env.OPENAI_API_KEY='offline-test-only';const {generateOfficialAnswer}=await import('../app/lib/aiAnswerGeneration.js');
 const make=status=>({request:{question:family[0]},candidates,suppliedEvidence:candidates,authorityReviewCandidates:candidates,policyEvidence:{status,candidates:status==='complete'?candidates:[]},evidence:{sufficient:true},metrics:{}});
 let calls=0;const fetchImpl=async()=>{calls++;throw Error('must not call');};
 const unavailable=make('unavailable');const answer=await generateOfficialAnswer({retrieval:unavailable,supabase:{},fetchImpl});assert.equal(answer.modelCallSkipped,true);assert.equal(unavailable.policyDiagnostic.zeroStage,'selection');
 const invalid=make('complete');const error=Error('fixture private source failure');
 await assert.rejects(generateOfficialAnswer({retrieval:invalid,supabase:{},fetchImpl,resolveSources:async()=>{throw error;}}),e=>e===error);
 assert.equal(calls,0);assert.equal(invalid.policyDiagnostic.zeroStage,'validation');assert.equal(invalid.policyDiagnostic.validation,'SOURCE_REVALIDATION_FAILED');
});
test('0725 private injected diagnostics are sanitized; View-As stays separate',async()=>{
 const {safePolicyDiagnostic}=await import('../app/lib/aiPolicyDiagnostics.js');
 const d=safePolicyDiagnostic({origin:'view_as',correlationId:randomUUID(),intent:'private secret',scope:['player@example.com','primetime'],candidates:[{chunkId:'private',versionId:'secret',reason:'token'}],completionReason:'private',passage:'secret'});
 assert.equal(d.origin,'view_as');assert.deepEqual(d.scope,['primetime']);assert.doesNotMatch(JSON.stringify(d),/private|secret|token|example.com/);
});
test('0725 View-As policy clears Live clarification without a lookup or provider call',async()=>{
 process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-policy-test';const {runLive}=await import('../app/lib/liveLmsService.js');
 const principal={user:{id:'synthetic-target'},receiptBinding:'view_as:synthetic-target',supabase:{}};
 const first=await runLive({body:{question:'What is my Season DUPR?'},principal,origin:'view_as',lookup:async()=>({data:{status:'ambiguous',choiceKind:'season',choices:[{season:'fall',rating:'season',label:'2026 Fall'}]}}),persist:async()=>{}});
 for(const question of family){const result=await runLive({body:{question,conversationReceipt:first.conversationReceipt,role:'commissioner',memberId:'forged'},principal,origin:'view_as',lookup:async()=>assert.fail('Policy must not query Live data'),persist:async()=>assert.fail('No Live capture for document policy')});assert.equal(result,null);}
});