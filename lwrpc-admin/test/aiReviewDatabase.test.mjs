import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {qualityOutcome,qualityException} from '../app/lib/aiQualitySnapshots.js';

test('0718 function-only migration and real PostgreSQL reporting/workflow',async t=>{
 const db=new PGlite();const actor=randomUUID();
 const files=async name=>readFile(new URL(`../${name}`,import.meta.url),'utf8');
 const migration=await files('supabase-ai-assistant-lms-0718-stage7b.sql');
 assert.ok(migration.indexOf('perform 1 from public.ai_question_groups')<migration.indexOf('select * into c from public.ai_manager_review_cases'));
 process.env.AI_QUALITY_HMAC_KEY='isolated-0718-test-key-with-32-characters';
 try {
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create table members(id uuid primary key);grant usage on schema public,auth to service_role;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;');
  await db.query('insert into auth.users values($1)',[actor]);
  await db.exec(await files('supabase-ai-assistant-lms-0712-stage6.sql'));
  await db.exec(await files('supabase-ai-assistant-lms-0716-stage7a.sql'));
  const tables=async()=>JSON.stringify((await db.query("select relname,relacl::text,relrowsecurity from pg_class where relname like 'ai_%' and relkind='r' order by relname")).rows);
  const before=await tables();await db.exec(migration);assert.equal(await tables(),before);
  const funcs=async()=>JSON.stringify((await db.query("select proname,proacl::text,proconfig from pg_proc where proname like 'ai_review_%' order by proname")).rows);
  const acl=await funcs();await db.exec(migration);assert.equal(await funcs(),acl);assert.equal(await tables(),before);
  const capture=async(question,kind='insufficient_evidence',origin='player_interface')=>{
   const execution={result:{kind,answer:'No applicable official evidence.',...(kind==='answer'?{feedbackReceipt:'fixture'}:{})},answer:{sources:[],selectedEvidence:[]},conversationResolution:{rawQuestion:question,effectiveQuestion:question,classification:'standalone'},retrieval:{candidates:[]}};
   const outcome=qualityOutcome({id:randomUUID(),origin,started:Date.now()-10,completed:Date.now(),execution});outcome.assistant_version='LMS-0717';
   const ex=qualityException(outcome,execution);
   await db.query('select capture_ai_quality($1,$2,$3,null)',[outcome,ex.p_occurrence,ex.p_route]);
   return outcome.id;
  };
  const answer=await capture('Grounded fixture','answer');await capture('Unvoted grounded','answer');
  const failure=await capture('what kind of ball are we using');await capture('what kind of ball are we using');
  await capture('Protected demand','protected');await capture('Clarification','clarification');await capture('Manager only','insufficient_evidence','manager_test');
  const conflict=await capture('Confirmed conflict','conflict');
  const vote=async(id,helpful,at,version='LMS-0717')=>db.query('insert into ai_answer_feedback_events(answer_id,auth_user_id,helpful,original_question,effective_question,generated_answer,assistant_version,created_at) values($1,$2,$3,$4,$4,$5,$6,$7)',[id,actor,helpful,'Grounded fixture','Fixture answer',version,at]);
  const now=Date.now();await vote(answer,true,new Date(now).toISOString());await vote(answer,false,new Date(now+1).toISOString());
  const legacy=randomUUID();await vote(legacy,true,new Date(now).toISOString(),'LMS-0714');
  const filters={tab:'summary',from:'2026-01-01T00:00:00Z',to:'2027-01-01T00:00:00Z',asof:'2026-12-31T00:00:00Z',limit:25};
  const report=async(f={})=>(await db.query('select ai_review_report($1) result',[{...filters,...f}])).rows[0].result;
  await t.test('metrics use latest state, eligibility, player denominator and legacy separation',async()=>{
   const s=await report();assert.equal(s.grounded,2);assert.equal(s.eligible,2);assert.equal(s.voted,1);assert.equal(s.helpful,0);assert.equal(s.not_helpful,1);assert.equal(s.unanswered,2);assert.equal(s.conflicts,1);assert.equal(s.protected,1);assert.equal(s.clarification,1);assert.equal(s.open_cases,2);
   const f=(await report({tab:'feedback'})).rows;assert.equal(f.length,2);assert.equal(f.find(r=>r.answer_id===answer).helpful,false);assert.equal(f.find(r=>r.answer_id===answer).event_count,2);assert.equal(f.find(r=>r.answer_id===legacy).completed_at,null);
  });
  await t.test('confirmed conflict priority, grouping, literal search, source and version filters',async()=>{
   const q=(await report({tab:'needs'})).rows;assert.equal(q[0].family,'conflict');assert.equal(q[1].occurrences,2);
   assert.equal((await report({tab:'unanswered'})).rows.length,1);
   assert.equal((await report({tab:'needs',search:'%'})).rows.length,0);
   assert.equal((await report({tab:'needs',version:'nonexistent'})).rows.length,0);
   assert.equal((await report({tab:'needs',source:'usap'})).rows.length,0);
   assert.equal((await report({tab:'needs',type:'conflict'})).rows.length,1);
  });
  await t.test('keyset pagination preserves priority/time/id without duplicates',async()=>{
   const first=(await report({tab:'needs',limit:1})).rows;assert.equal(first.length,2);const r=first[0];
   const second=(await report({tab:'needs',limit:1,cursor_priority:r.sort_priority,cursor_at:r.latest_activity,cursor_id:r.id})).rows;
   assert.equal(second.length,1);assert.notEqual(second[0].id,r.id);
  });
  let c=(await db.query('select c.* from ai_manager_review_cases c join ai_review_occurrences r on r.group_id=c.group_id where r.answer_id=$1',[failure])).rows[0];
  const caseId=c.id;let rev=c.revision;
  const mutate=async(action,value=null,note=null,operation=randomUUID(),revision=rev)=>{
   const cutoff=new Date().toISOString();const args=[caseId,actor,operation,revision,action,value,note,cutoff];
   const call=()=>db.query('select ai_review_case_action($1,$2,$3,$4,$5,$6,$7,$8) result',args);
   const res=(await call()).rows[0].result;rev=res.revision;return {res,call,args};
  };
  await db.exec('set role service_role');
  await t.test('New → Reviewing, exact retry and mismatched retry/stale revision',async()=>{
   const r=await mutate('status','reviewing');assert.equal(r.res.revision,2);assert.equal((await r.call()).rows[0].result.replayed,true);
   const bad=[...r.args];bad[6]='changed';await assert.rejects(db.query('select ai_review_case_action($1,$2,$3,$4,$5,$6,$7,$8)',bad),/retry_mismatch/);
   await assert.rejects(mutate('note',null,'stale',randomUUID(),1),/revision_conflict/);
  });
  await t.test('category, priority and append-only notes, invalid enums and Other reason',async()=>{
   await assert.rejects(mutate('category','other'),/reason_required/);await assert.rejects(mutate('category','invalid'),/review_category/);
   await assert.rejects(mutate('priority','urgent'),/review_priority/);await mutate('category','ai_retrieval_selection');await mutate('priority','high');await mutate('note',null,'Retested successfully with accepted LMS-0717.');
  });
  await t.test('historical defect Resolve preserves occurrence, Dismiss requires reopening',async()=>{
   await assert.rejects(mutate('status','resolved'),/reason_required/);await mutate('status','resolved','Accepted correction verified by manual retest.');
   await assert.rejects(mutate('status','dismissed','Not a problem'),/transition/);
   assert.equal((await db.query('select original_question from ai_review_occurrences where answer_id=$1',[failure])).rows[0].original_question,'what kind of ball are we using');
   await mutate('status','reviewing','Reopen for additional review');await mutate('status','dismissed','Dismissal reason');
   c=(await db.query('select * from ai_manager_review_cases where id=$1',[caseId])).rows[0];assert.equal(c.status,'dismissed');assert.equal(c.resolved_at,null);assert.ok(c.closed_at);
  });
  await t.test('new captured activity brings closed case to queue without silent reopen',async()=>{
   await capture('what kind of ball are we using');const rows=(await report({tab:'needs'})).rows;const row=rows.find(r=>r.case_id===caseId);assert.ok(row.new_activity);assert.equal(row.status,'dismissed');
  });
  await t.test('mark reviewed acknowledges cutoff; competing revisions permit one edit',async()=>{
   await mutate('review');const current=rev;
   const results=await Promise.allSettled([mutate('note',null,'First reviewer',randomUUID(),current),mutate('note',null,'Second reviewer',randomUUID(),current)]);
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
   assert.match(results.find(r=>r.status==='rejected').reason.message,/revision_conflict/);
   rev=(await db.query('select revision from ai_manager_review_cases where id=$1',[caseId])).rows[0].revision;
  });
  await t.test('service operations remain bounded, audit immutable and no deletes',async()=>{
   await assert.rejects(db.query('update ai_manager_review_events set note=note where false'),/permission denied/);
   await assert.rejects(db.query('delete from ai_manager_review_cases where false'),/permission denied/);
  });
  await db.exec('reset role');
  await t.test('audit insert failure rolls back case change',async()=>{
   const prior=(await db.query('select revision,priority from ai_manager_review_cases where id=$1',[caseId])).rows[0];
   await db.exec("create function reject_review_event() returns trigger language plpgsql as $$ begin raise exception 'forced audit failure'; end $$; create trigger reject_review before insert on ai_manager_review_events for each row execute function reject_review_event();");
   await assert.rejects(mutate('priority','normal'),/forced audit failure/);
   assert.deepEqual((await db.query('select revision,priority from ai_manager_review_cases where id=$1',[caseId])).rows[0],prior);
   await db.exec('drop trigger reject_review on ai_manager_review_events;drop function reject_review_event();');
  });
  await t.test('production-like default EXECUTE grants removed, replay unchanged, browser denial',async()=>{
   assert.equal(await funcs(),acl);assert.equal(await tables(),before);
   for(const role of ['anon','authenticated']){
    await db.exec(`set role ${role}`);
    await assert.rejects(report(),/permission denied/);
    await assert.rejects(mutate('priority','normal'),/permission denied/);
    await assert.rejects(db.query('select * from ai_review_occurrences'),/permission denied/);await db.exec('reset role');
   }
   await db.exec(migration);assert.equal(await funcs(),acl);assert.equal(await tables(),before);
  });
  await t.test('conflicting simultaneous latest votes stay ambiguous',async()=>{
   const tie=new Date(now+2).toISOString();await vote(answer,true,tie);await vote(answer,false,tie);
   assert.equal((await report({tab:'feedback'})).rows.find(r=>r.answer_id===answer).helpful,null);
   const s=await report();assert.equal(s.voted,1);assert.equal(s.helpful+s.not_helpful,0);
  });
  assert.ok(conflict);
 }finally{await db.close();}
});
