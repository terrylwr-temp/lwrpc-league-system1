import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {vector} from '@electric-sql/pglite-pgvector';
const migration=await readFile(new URL('../supabase/migrations/20260906152030_lms0721_approved_answers.sql',import.meta.url),'utf8');
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
 } finally {await db.close();}
});
