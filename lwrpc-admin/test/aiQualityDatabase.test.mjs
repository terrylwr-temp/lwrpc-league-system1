import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {qualityOutcome,qualityException,qualityFeedback} from '../app/lib/aiQualitySnapshots.js';
process.env.AI_QUALITY_HMAC_KEY='isolated-pg-test-key-separate-32-characters';
const migration=await readFile(new URL('../supabase-ai-assistant-lms-0716-stage7a.sql',import.meta.url),'utf8');
function request(question='What ball are we using?',kind='insufficient_evidence'){
 const execution={result:{kind,answer:'No applicable official evidence.'},answer:{selectedEvidence:[],sources:[],modelCallSkipped:true},conversationResolution:{rawQuestion:question,effectiveQuestion:question,classification:'standalone'},retrieval:{candidates:[]}};
 const p_outcome=qualityOutcome({id:randomUUID(),origin:'player_interface',started:1000,completed:1100,execution});
 return {p_outcome,...qualityException(p_outcome,execution),p_feedback_id:null};
}
test('0716 real PostgreSQL migration, transactions, constraints and browser denial (isolated PGlite)',async t=>{
 const db=new PGlite();
 try{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create table public.members(id uuid primary key); grant usage on schema public,auth to service_role;');
 // Reproduce production's postgres-owned automatic table/function grants.
 await db.exec('alter default privileges in schema public grant all on tables to anon,authenticated,service_role; alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;');
 await db.exec(await readFile(new URL('../supabase-ai-assistant-lms-0712-stage6.sql',import.meta.url),'utf8'));
 const feedbackAcl=async()=>JSON.stringify((await db.query("select relacl::text,relrowsecurity from pg_class where oid='public.ai_answer_feedback_events'::regclass")).rows);
 const feedbackBefore=await feedbackAcl();
 await db.exec(migration);
 const permissionSnapshot=async()=>JSON.stringify((await db.query("select relname,relacl::text,relrowsecurity from pg_class where relname in ('ai_request_outcomes','ai_review_occurrences','ai_question_groups','ai_question_fingerprint_routes','ai_manager_review_cases','ai_manager_review_events') order by relname")).rows);
 const permissionsBeforeReplay=await permissionSnapshot();
 await db.exec(migration);
 assert.equal(await permissionSnapshot(),permissionsBeforeReplay);
 assert.equal(await feedbackAcl(),feedbackBefore);
 const capture=p=>db.query('select public.capture_ai_quality($1::jsonb,$2::jsonb,$3::jsonb,$4::uuid)',[p.p_outcome,p.p_occurrence,p.p_route,p.p_feedback_id]);
 const count=async(table,where='true',values=[])=>Number((await db.query(`select count(*) as n from public.${table} where ${where}`,values)).rows[0].n);
 await t.test('effective operations and replay under production-like default grants',async()=>{
  const names=['ai_request_outcomes','ai_review_occurrences','ai_question_groups','ai_question_fingerprint_routes','ai_manager_review_cases','ai_manager_review_events'];
  await db.exec('set role service_role');
  for(const name of names){
   const immutable=['ai_request_outcomes','ai_manager_review_events'].includes(name);
   for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']){
    const expected=['SELECT','INSERT'].includes(privilege)||privilege==='UPDATE'&&!immutable;
    assert.equal((await db.query('select has_table_privilege(current_user,$1,$2) as allowed',[name,privilege])).rows[0].allowed,expected,`${name} ${privilege}`);
   }
   await db.query(`select * from ${name} limit 1`);
   await db.query(`insert into ${name} select * from ${name} where false`);
   if(immutable)await assert.rejects(db.query(`update ${name} set id=id where false`),/permission denied/);
   else await db.query(`update ${name} set id=id where false`);
   await assert.rejects(db.query(`delete from ${name} where false`),/permission denied/);
  }
  await db.exec('reset role');
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`);
   for(const name of names)for(const query of [`select * from ${name}`,`insert into ${name} select * from ${name} where false`,`update ${name} set id=id where false`,`delete from ${name} where false`])await assert.rejects(db.query(query),/permission denied/);
   await assert.rejects(capture(request()),/permission denied/);await db.exec('reset role');
  }
  await db.exec(`grant all on ${names.join(',')} to service_role`);
  await db.exec(migration);
  assert.equal(await permissionSnapshot(),permissionsBeforeReplay);
  assert.equal(await feedbackAcl(),feedbackBefore);
 });
 await t.test('repeat capture one occurrence/group/case/audit; mismatched same ID rejected',async()=>{
  const p=request();await db.exec('set role service_role');await capture(p);await capture(p);await db.exec('reset role');
  assert.equal(await count('ai_review_occurrences','answer_id=$1',[p.p_outcome.id]),1);
  assert.equal(await count('ai_manager_review_events'),1);
  await assert.rejects(capture({...p,p_outcome:{...p.p_outcome,final_kind:'conflict'}}),/quality_outcome_mismatch/);
 });
 await t.test('forced digest collision retains exact full text, separate slots and groups',async()=>{
  const a=request('What are the legal ball specifications?'),b=request('What ball specifications are not legal?');
  a.p_route.fingerprint=b.p_route.fingerprint='00'.repeat(32);await capture(a);await capture(b);
  const rows=(await db.query("select collision_slot,normalized_question,group_id from ai_question_fingerprint_routes where fingerprint=decode($1,'hex') order by collision_slot",['00'.repeat(32)])).rows;
  assert.deepEqual(rows.map(r=>r.collision_slot),[0,1]);assert.notEqual(rows[0].group_id,rows[1].group_id);
  const c=request('What are the legal ball specifications?');c.p_route.fingerprint=a.p_route.fingerprint;await capture(c);
  assert.equal((await db.query('select group_id from ai_review_occurrences where answer_id=$1',[c.p_outcome.id])).rows[0].group_id,rows[0].group_id);
 });
 await t.test('final conflict creates high-priority case without feedback',async()=>{
  const p=request('Do these official provisions conflict?','conflict');await capture(p);
  const rows=(await db.query('select c.priority,c.status from ai_manager_review_cases c join ai_review_occurrences r on r.group_id=c.group_id where r.answer_id=$1',[p.p_outcome.id])).rows;
  assert.deepEqual(rows,[{priority:'high',status:'new'}]);
  await db.query("update ai_manager_review_cases set priority='normal' where group_id=(select group_id from ai_review_occurrences where answer_id=$1)",[p.p_outcome.id]);
  await capture(p);
  assert.equal((await db.query('select priority from ai_manager_review_cases where group_id=(select group_id from ai_review_occurrences where answer_id=$1)',[p.p_outcome.id])).rows[0].priority,'normal');
  const fresh=request('Do these official provisions conflict?','conflict');await capture(fresh);
  assert.equal((await db.query('select priority from ai_manager_review_cases where group_id=(select group_id from ai_review_occurrences where answer_id=$1)',[p.p_outcome.id])).rows[0].priority,'high');
 });
 await t.test('legacy feedback remains parentless, two transitions and one occurrence/case',async()=>{
  const answerId=randomUUID(),authId=randomUUID();let latest;
  const claims={answerId,assistantVersion:'LMS-0715',originalQuestion:'When does Match Setup need to be completed?',effectiveQuestion:'When does Match Setup need to be completed?',answer:'Fixture answer'};
  for(const helpful of [true,true,false,false]){
   if(latest===helpful)continue;
   const event=(await db.query('insert into ai_answer_feedback_events(answer_id,auth_user_id,helpful,original_question,effective_question,generated_answer,assistant_version) values($1,$2,$3,$4,$4,$5,$6) returning id',[answerId,authId,helpful,claims.originalQuestion,claims.answer,claims.assistantVersion])).rows[0];
   const p={p_outcome:null,...qualityFeedback(claims),p_feedback_id:event.id};await capture(p);await capture(p);latest=helpful;
  }
  assert.equal(await count('ai_answer_feedback_events','answer_id=$1',[answerId]),2);assert.equal(await count('ai_request_outcomes','id=$1',[answerId]),0);
  const row=(await db.query('select outcome_id,answer_completed_at,origin from ai_review_occurrences where answer_id=$1',[answerId])).rows[0];assert.deepEqual(row,{outcome_id:null,answer_completed_at:null,origin:'legacy_unknown'});
 });
 await t.test('Unicode expansion and exact 32KiB accepted, one-byte-over rolls back safely',async()=>{
  const p=request('İ'.repeat(1000));p.p_occurrence.effective_question='İ'.repeat(2400);p.p_route.normalized_question='i\u0307'.repeat(2400);await capture(p);
  const value=(await db.query('select normalized_question from ai_question_fingerprint_routes where normalized_question=$1',[p.p_route.normalized_question])).rows[0].normalized_question;assert.equal(value,p.p_route.normalized_question);
  const boundary=request('Boundary test?');boundary.p_route.normalized_question='é'.repeat(16384);await capture(boundary);
  const over=request('Beyond boundary test?');over.p_route.normalized_question='é'.repeat(16384)+'a';await assert.rejects(capture(over),/quality_normalized_size/);assert.equal(await count('ai_request_outcomes','id=$1',[over.p_outcome.id]),0);
  const gid=(await db.query('select id from ai_question_groups limit 1')).rows[0].id;
  await assert.rejects(db.query("insert into ai_question_fingerprint_routes(origin,family,fingerprint,normalized_question,group_id) values('player_interface','unanswered',decode($1,'hex'),$2,$3)",['ff'.repeat(32),'é'.repeat(16384)+'a',gid]),/check constraint/);
 });
 await t.test('RLS enabled, browser grants and RPC denied, audit update denied',async()=>{
  const names=['ai_request_outcomes','ai_review_occurrences','ai_question_groups','ai_question_fingerprint_routes','ai_manager_review_cases','ai_manager_review_events'];
  for(const name of names){assert.equal((await db.query('select relrowsecurity from pg_class where oid=$1::regclass',[name])).rows[0].relrowsecurity,true);}
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`);
   for(const name of names){
    await assert.rejects(db.query(`select * from ${name}`),/permission denied/);
    for(const privilege of ['INSERT','UPDATE','DELETE']) assert.equal((await db.query('select has_table_privilege(current_user,$1,$2) as allowed',[name,privilege])).rows[0].allowed,false);
   }
   await assert.rejects(capture(request()),/permission denied/);await db.exec('reset role');
  }
  assert.equal((await db.query("select has_table_privilege('service_role','ai_manager_review_events','UPDATE') as allowed")).rows[0].allowed,false);
 });
 await t.test('nullable parent reference preserves occurrence on outcome deletion',async()=>{const p=request('Retained review fixture?');await capture(p);await db.query('delete from ai_request_outcomes where id=$1',[p.p_outcome.id]);assert.equal((await db.query('select outcome_id from ai_review_occurrences where answer_id=$1',[p.p_outcome.id])).rows[0].outcome_id,null);});
 }finally{await db.close();}
});
