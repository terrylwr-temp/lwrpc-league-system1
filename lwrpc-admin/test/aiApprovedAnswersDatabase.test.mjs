import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {vector} from '@electric-sql/pglite-pgvector';
const migration=await readFile(new URL('../supabase/migrations/20260906152030_lms0721_approved_answers.sql',import.meta.url),'utf8');
const correction=await readFile(new URL('../supabase/migrations/20260906172546_lms0721_manager_originated_approved_answers.sql',import.meta.url),'utf8');
const binding=await readFile(new URL('../supabase/migrations/20260906180112_lms0721_related_source_passage_binding.sql',import.meta.url),'utf8');

test('0721 isolated PostgreSQL lifecycle, effective ACLs and immutable revision history',async t=>{
 const db=new PGlite({extensions:{vector}});
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema extensions;create extension vector with schema extensions;create schema auth;
   create table auth.users(id uuid primary key,email text);create table members(id uuid primary key,email text,is_active_member boolean);
   create table user_roles(member_id uuid references members(id),role text);
   create table seasons(id uuid primary key,name text,start_date date,end_date date);
   create table ai_documents(id uuid primary key,title text,document_type text,authority_rank integer,active_version_id uuid,status text,updated_at timestamptz default now());
   create table ai_document_versions(id uuid primary key,processing_status text,updated_at timestamptz default now());
   create table ai_document_chunks(id uuid primary key,content text,page_number integer,rule_number text,heading text,document_version_id uuid,is_searchable boolean,updated_at timestamptz default now());
   grant usage on schema public,auth,extensions to service_role;
   grant select on ai_documents,ai_document_versions,ai_document_chunks,seasons to service_role;
   alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
   alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  await db.exec(await readFile(new URL('../supabase-ai-assistant-lms-0712-stage6.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase-ai-assistant-lms-0716-stage7a.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase-ai-assistant-lms-0718-stage7b.sql',import.meta.url),'utf8'));
  const oldFunctions=(await db.query("select proname,proacl::text from pg_proc where proname in ('capture_ai_quality','ai_review_case_action') order by proname")).rows;
  const originalAcl=(await db.query("select relacl::text from pg_class where oid='ai_answer_feedback_events'::regclass")).rows;
  await db.exec(migration);
  assert.deepEqual((await db.query("select proname,proacl::text from pg_proc where proname in ('capture_ai_quality','ai_review_case_action') order by proname")).rows,oldFunctions);
  const tables=['ai_approved_answers','ai_approved_answer_revisions','ai_approved_answer_events'];
  const acl=async()=>JSON.stringify((await db.query("select relname,relacl::text,relrowsecurity from pg_class where relname=any($1) order by relname",[tables])).rows);
  const before=await acl();await db.exec(migration);assert.equal(await acl(),before);
  const unaffectedFunctions=async()=>(await db.query("select proname,pg_get_functiondef(oid),proacl::text from pg_proc where pronamespace='public'::regnamespace and proname<>'ai_approved_answer_action' order by oid")).rows;
  const oldDefinitions=await unaffectedFunctions();await db.exec(correction);assert.equal(await acl(),before);assert.deepEqual(await unaffectedFunctions(),oldDefinitions);
  const correctedFunction=(await db.query("select pg_get_functiondef(oid),proacl::text,proconfig from pg_proc where proname='ai_approved_answer_action'")).rows;
  await db.exec(correction);assert.equal(await acl(),before);assert.deepEqual((await db.query("select pg_get_functiondef(oid),proacl::text,proconfig from pg_proc where proname='ai_approved_answer_action'")).rows,correctedFunction);
  await db.exec(binding);assert.equal(await acl(),before);assert.deepEqual(await unaffectedFunctions(),oldDefinitions);
  const boundFunction=(await db.query("select pg_get_functiondef(oid),proacl::text,proconfig from pg_proc where proname='ai_approved_answer_action'")).rows;
  await db.exec(binding);assert.equal(await acl(),before);assert.deepEqual((await db.query("select pg_get_functiondef(oid),proacl::text,proconfig from pg_proc where proname='ai_approved_answer_action'")).rows,boundFunction);
  assert.ok(correctedFunction[0].proconfig.includes('search_path=pg_catalog'));
  assert.equal((await db.query("select is_nullable from information_schema.columns where table_name='ai_approved_answers' and column_name='source_review_case_id'")).rows[0].is_nullable,'YES');
  const rpcAcl=(await db.query("select proname,has_function_privilege('anon',oid,'EXECUTE') as anon,has_function_privilege('authenticated',oid,'EXECUTE') as authenticated,has_function_privilege('service_role',oid,'EXECUTE') as service from pg_proc where proname in ('ai_approved_authority_manifest','ai_approved_knowledge_manifest','ai_approved_answer_action','search_ai_approved_answers','ai_approved_source_review')")).rows;
  assert.equal(rpcAcl.length,5);for(const f of rpcAcl){assert.equal(f.anon,false);assert.equal(f.authenticated,false);assert.equal(f.service,true);}
  assert.ok((await db.query("select relrowsecurity from pg_class where relname=any($1)",[tables])).rows.every(r=>r.relrowsecurity));
  assert.deepEqual((await db.query("select relacl::text from pg_class where oid='ai_answer_feedback_events'::regclass")).rows,originalAcl);
  for(const role of ['anon','authenticated','service_role']){
   await db.exec(`set role ${role}`);
   for(const table of tables){
    if(role==='service_role')await db.query(`select * from ${table} limit 0`);
    else await assert.rejects(db.query(`select * from ${table} limit 0`),/permission denied/);
    for(const sql of [`insert into ${table}(id) select id from ${table} where false`,`update ${table} set id=id where false`,`delete from ${table} where false`,`truncate ${table}`])await assert.rejects(db.query(sql),/permission denied/);
   }
   await db.exec('reset role');
  }
  const actor=randomUUID(),member=randomUUID(),group=randomUUID(),caseId=randomUUID();
  await db.query("insert into auth.users values($1,'synthetic-manager@example.invalid')",[actor]);await db.query("insert into members values($1,'synthetic-manager@example.invalid',true)",[member]);
  await db.query("insert into user_roles values($1,'league_manager')",[member]);
  await db.query("insert into ai_question_groups(id,origin,family,title,canonical_question,first_seen_at,last_seen_at) values($1,'manager_test','unanswered','Synthetic policy','Synthetic policy?',now(),now())",[group]);
  await db.query('insert into ai_manager_review_cases(id,group_id) values($1,$2)',[caseId,group]);
  const body={title:'Synthetic policy',topic_key:'synthetic',canonical_question:'What is the synthetic policy?',approved_answer:'Synthetic administrative steps require confirmation.',league_scope:'all',temporal_scope:'standing',season_id:null,effective_on:'2026-01-01',expires_on:null,related_chunk_id:null,public_links:[],content_hash:'a'.repeat(64)};
  const call=(action,id,expected,payload={},operation=randomUUID(),user=actor)=>db.query('select ai_approved_answer_action($1,$2,$3,$4,$5,$6) as result',[user,operation,action,id,expected,payload]);
  await db.exec('set role service_role');
  await assert.rejects(call('create',caseId,null,body,randomUUID(),randomUUID()),/approved_forbidden/);
  const operation=randomUUID();const created=(await call('create',caseId,null,body,operation)).rows[0].result;
  assert.equal((await call('create',caseId,null,body,operation)).rows[0].result.replayed,true);
  const rev=created.revisionId;
  await assert.rejects(call('activate',rev,1,{}),/approved_activation_state/);
  let row=(await db.query('select * from ai_approved_answer_revisions where id=$1',[rev])).rows[0];assert.equal(row.status,'draft');assert.equal(row.embedding,null);
  const manifest=(await db.query('select ai_approved_authority_manifest() as hash')).rows[0].hash;
  const activation={managed_manifest_hash:(await db.query('select ai_approved_knowledge_manifest() as hash')).rows[0].hash,content_hash:body.content_hash,authority_manifest_hash:manifest,preflight_expires_at:new Date(Date.now()+60000).toISOString(),embedding:JSON.stringify([1,...Array(1535).fill(0)]),embedding_model:'text-embedding-3-small'};
  const search=()=>db.query('select revision from search_ai_approved_answers($1,$2)',[activation.embedding,body.canonical_question]);
  assert.equal((await search()).rows.length,0);
  await assert.rejects(call('activate',rev,1,{...activation,embedding:JSON.stringify(Array(1536).fill(0))}),/approved_embedding_invalid/);
  await call('activate',rev,1,activation);
  assert.equal((await search()).rows[0].revision.id,rev);
  await assert.rejects(call('save',rev,2,{...body,approved_answer:'overwrite'}),/approved_published_immutable/);
  const edit=(await call('edit',rev,2)).rows[0].result;
  assert.notEqual(edit.revisionId,rev);
  assert.equal((await db.query('select status from ai_approved_answer_revisions where id=$1',[rev])).rows[0].status,'active');
  activation.managed_manifest_hash=(await db.query('select ai_approved_knowledge_manifest() as hash')).rows[0].hash;
  await call('activate',edit.revisionId,1,activation);
  const history=(await db.query('select id,status,approved_answer,activated_at,retired_at from ai_approved_answer_revisions order by revision_number')).rows;
  assert.deepEqual(history.map(r=>r.status),['retired','active']);assert.ok(history[0].activated_at);assert.ok(history[0].retired_at);assert.equal(history[0].approved_answer,body.approved_answer);
  await call('retire',edit.revisionId,2,{reason:'Synthetic validation completed'});
  assert.equal((await search()).rows.length,0);
  assert.equal(Number((await db.query("select count(*) as n from ai_approved_answer_revisions where status='active'")).rows[0].n),0);
  assert.equal((await db.query('select status from ai_manager_review_cases where id=$1',[caseId])).rows[0].status,'new');
  await db.exec('reset role');
  for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(call('retire',rev,1,{reason:'bad'}),/permission denied/);await db.exec('reset role');}
  await t.test('audit exists for every lifecycle transition',async()=>{const actions=(await db.query('select action from ai_approved_answer_events order by created_at,event_ordinal')).rows.map(r=>r.action);for(const a of ['created','linked_to_case','activated','draft_edited','replaced','retired'])assert.ok(actions.includes(a),a);});

  await t.test('existing evidence category decision atomically audits, retries once and preserves occurrence/group/open state',async()=>{
   const g=randomUUID(),caseKey=randomUUID(),answerKey=randomUUID(),op=randomUUID();
   await db.query("insert into ai_question_groups(id,origin,family,title,canonical_question,first_seen_at,last_seen_at) values($1,'player_interface','unanswered','Synthetic Saturday review','Synthetic mixed-only players?',now(),now())",[g]);
   await db.query('insert into ai_manager_review_cases(id,group_id) values($1,$2)',[caseKey,g]);
   await db.query("insert into ai_review_occurrences(answer_id,group_id,provenance,origin,occurrence_kind,first_observed_at,original_question,effective_question,output_text,assistant_version) values($1,$2,'live_capture','player_interface','insufficient_evidence',now(),'Synthetic mixed-only players?','Synthetic mixed-only players?','No applicable evidence.','LMS-0721')",[answerKey,g]);
   // Preserve a populated unanswered occurrence, not merely an empty table.
   const snapshot=async()=>(await db.query("select coalesce(jsonb_agg(to_jsonb(o)),'[]') as data from ai_review_occurrences o")).rows[0].data;
   const beforeOccurrence=await snapshot();
   const beforeManaged=(await db.query('select count(*) as n from ai_approved_answers')).rows[0].n;
   const note='Manager confirmed: existing official evidence answers the question. Rule 6.2.2; synthetic reference '+answerKey;
   const decide=()=>db.query("select ai_review_case_action($1,$2,$3,1,'category','ai_retrieval_selection',$4,null) as result",[caseKey,actor,op,note]);
   await db.exec('set role service_role');await decide();assert.equal((await decide()).rows[0].result.replayed,true);await db.exec('reset role');
   const changed=(await db.query('select status,action_category,group_id from ai_manager_review_cases where id=$1',[caseKey])).rows[0];assert.equal(changed.status,'new');assert.equal(changed.action_category,'ai_retrieval_selection');assert.equal(changed.group_id,g);
   const audit=(await db.query('select actor_user_id,created_at,note,action from ai_manager_review_events where operation_id=$1',[op])).rows;assert.equal(audit.length,1);assert.equal(audit[0].actor_user_id,actor);assert.ok(audit[0].created_at);assert.equal(audit[0].note,note);assert.equal(audit[0].action,'category_changed');
   assert.deepEqual(await snapshot(),beforeOccurrence);assert.equal((await db.query('select count(*) as n from ai_approved_answers')).rows[0].n,beforeManaged);
  });

  await t.test('passage binding survives save, activation, replacement and history; invalid binding fails',async()=>{
   const doc=randomUUID(),version=randomUUID(),chunk=randomUUID();
   const passage='5.11. Rescheduling & Score Submission Deadlines: If both coaches agree, games may be rescheduled.';
   await db.query("insert into ai_documents(id,title,document_type,authority_rank,active_version_id,status) values($1,'Synthetic rules','league_rules',1,$2,'active')",[doc,version]);
   await db.query("insert into ai_document_versions(id,processing_status) values($1,'ready')",[version]);
   await db.query("insert into ai_document_chunks(id,content,page_number,rule_number,heading,document_version_id,is_searchable) values($1,$2,5,'5.10','Video Recording',$3,true)",[chunk,'5.10. Video Recording: Approval is required.\n'+passage,version]);
   const bound={...body,topic_key:'synthetic-binding',related_chunk_id:chunk,related_passage:passage,related_rule_identity:'5.11'};
   await db.exec('set role service_role');
   await assert.rejects(call('create',null,null,{...bound,related_rule_identity:'5.10'}),/approved_related_binding_invalid/);
   await assert.rejects(call('create',null,null,{...bound,related_passage:'invented'}),/approved_related_binding_invalid/);
   const item=(await call('create',null,null,bound)).rows[0].result;
   await call('save',item.revisionId,1,bound);
   let saved=(await db.query('select * from ai_approved_answer_revisions where id=$1',[item.revisionId])).rows[0];
   assert.equal(saved.related_passage,passage);assert.equal(saved.related_rule_identity,'5.11');
   const activate=async(id,expected,extra={})=>call('activate',id,expected,{...activation,related_passage:passage,related_rule_identity:'5.11',authority_manifest_hash:(await db.query('select ai_approved_authority_manifest() as hash')).rows[0].hash,managed_manifest_hash:(await db.query('select ai_approved_knowledge_manifest() as hash')).rows[0].hash,...extra});
   await assert.rejects(activate(item.revisionId,2,{related_rule_identity:'5.10'}),/approved_related_binding_changed/);
   await activate(item.revisionId,2);
   const next=(await call('edit',item.revisionId,3)).rows[0].result;
   assert.equal((await db.query('select related_passage from ai_approved_answer_revisions where id=$1',[next.revisionId])).rows[0].related_passage,passage);
   await activate(next.revisionId,1);
   await call('retire',next.revisionId,2,{reason:'Synthetic binding complete'});
   await db.exec('reset role');
   await db.query('update ai_documents set active_version_id=$1 where id=$2',[randomUUID(),doc]);
   const history=(await db.query('select related_chunk_id,related_rule_identity,related_passage,status from ai_approved_answer_revisions where answer_id=$1',[item.answerId])).rows;
   assert.equal(history.length,2);assert.ok(history.every(r=>r.related_passage===passage&&r.related_rule_identity==='5.11'&&r.related_chunk_id===chunk&&r.status==='retired'));
   await db.exec(binding);assert.equal(await acl(),before);
  });

  await t.test('manager origin: nullable uniqueness, roles, retry safety and lifecycle without Stage 7 writes',async()=>{
   const qualityTables=['ai_question_groups','ai_manager_review_cases','ai_review_occurrences','ai_answer_feedback_events','ai_request_outcomes'];
   const snapshot=async()=>Promise.all(qualityTables.map(async table=>(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') as value from ${table} t`)).rows[0].value));
   const oldQuality=await snapshot();
   for(const role of ['player','captain','club_pro']){
    await db.query('update user_roles set role=$1 where member_id=$2',[role,member]);
    await db.exec('set role service_role');await assert.rejects(call('create',null,null,body),/approved_forbidden/);await db.exec('reset role');
   }
   await db.query("update user_roles set role='commissioner' where member_id=$1",[member]);
   await db.exec('set role service_role');
   const op=randomUUID();const pair=await Promise.all([call('create',null,null,body,op),call('create',null,null,body,op)]);
   const direct=pair[0].rows[0].result;assert.equal(pair[1].rows[0].result.revisionId,direct.revisionId);assert.equal(pair[1].rows[0].result.replayed,true);
   await assert.rejects(call('create',null,null,{...body,title:'Changed'},op),/approved_operation_mismatch/);
   await assert.rejects(call('create',caseId,null,body,op),/approved_operation_mismatch/);
   const second=(await call('create',null,null,{...body,topic_key:'synthetic-second'})).rows[0].result;
   assert.notEqual(second.answerId,direct.answerId);
   const directItems=(await db.query('select source_review_case_id from ai_approved_answers where id=any($1)',[[direct.answerId,second.answerId]])).rows;
   assert.equal(directItems.length,2);assert.ok(directItems.every(r=>r.source_review_case_id===null));
   await assert.rejects(call('create',caseId,null,body),/approved_case_already_linked/);
   await assert.rejects(call('create',randomUUID(),null,body),/approved_case_not_missing_knowledge/);
   assert.equal((await search()).rows.length,0);
   const freshActivation=async()=>({...activation,managed_manifest_hash:(await db.query('select ai_approved_knowledge_manifest() as hash')).rows[0].hash});
   await call('activate',direct.revisionId,1,await freshActivation());
   const edited=(await call('edit',direct.revisionId,2)).rows[0].result;
   assert.equal((await search()).rows[0].revision.id,direct.revisionId);
   await call('activate',edited.revisionId,1,await freshActivation());
   const previous=(await db.query('select status,activated_at,activated_by_user_id,approved_answer from ai_approved_answer_revisions where id=$1',[direct.revisionId])).rows[0];
   assert.equal(previous.status,'retired');assert.ok(previous.activated_at);assert.equal(previous.activated_by_user_id,actor);assert.equal(previous.approved_answer,body.approved_answer);
   await call('retire',edited.revisionId,2,{reason:'Synthetic local lifecycle complete'});
   assert.equal((await search()).rows.length,0);
   const events=(await db.query('select action,actor_user_id,created_at from ai_approved_answer_events where answer_id=$1',[direct.answerId])).rows;
   assert.deepEqual(events.map(e=>e.action).sort(),['created','activated','draft_edited','replaced','activated','retired'].sort());
   assert.ok(events.every(e=>e.actor_user_id===actor&&e.created_at));
   await db.exec('reset role');
   await assert.rejects(db.query('insert into ai_approved_answers(source_review_case_id) values($1)',[caseId]),/unique constraint/);
   await assert.rejects(db.query('insert into ai_approved_answers(source_review_case_id) values($1)',[randomUUID()]),/foreign key constraint/);
   const saved=(await db.query('select jsonb_agg(to_jsonb(a) order by id) as value from ai_approved_answers a')).rows;
   await db.exec(correction);assert.deepEqual((await db.query('select jsonb_agg(to_jsonb(a) order by id) as value from ai_approved_answers a')).rows,saved);
   assert.equal(await acl(),before);assert.deepEqual(await snapshot(),oldQuality);
   // Explicit case disposition still uses the existing audited path, never activation.
   await db.exec('set role service_role');
   const caseRow=(await db.query('select revision from ai_manager_review_cases where id=$1',[caseId])).rows[0];
   await db.query("select ai_review_case_action($3,$1,$2,$4,'status','resolved','Synthetic retest completed',now())",[actor,randomUUID(),caseId,caseRow.revision]);
   assert.equal((await db.query('select status from ai_manager_review_cases where id=$1',[caseId])).rows[0].status,'resolved');
   await assert.rejects(call('create',caseId,null,body),/approved_case_not_missing_knowledge/);
   await db.exec('reset role');
  });
 } finally {await db.close();}
});
