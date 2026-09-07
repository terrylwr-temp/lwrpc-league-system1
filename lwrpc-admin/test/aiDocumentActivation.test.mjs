import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {activationDisplay,withActivationNames} from '../app/lib/aiDocumentActivation.js';
const migration=await readFile(new URL('../supabase/migrations/20260907001910_lms0722_document_activation_history.sql',import.meta.url),'utf8');
const doc='10000000-0000-4000-8000-000000000001',actor='20000000-0000-4000-8000-000000000001';
const ids=[1,2,3,4].map(n=>`30000000-0000-4000-8000-00000000000${n}`);
test('0722 activation transaction, effective ACLs, replay, rollback and superseded history',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls; grant usage on schema public to service_role;
 create table members(id uuid primary key);create table user_roles(member_id uuid references members,role text);
 create table ai_documents(id uuid primary key,status text,active_version_id uuid);
 create table ai_document_versions(id uuid primary key,document_id uuid references ai_documents,processing_status text,chunk_count integer);
 create table ai_document_chunks(id serial primary key,document_version_id uuid references ai_document_versions,is_searchable boolean,embedding text);
 alter table ai_documents enable row level security;alter table ai_document_versions enable row level security;alter table ai_document_chunks enable row level security;
 grant all on ai_documents,ai_document_versions,ai_document_chunks to service_role;grant select on members,user_roles to service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
 insert into members values('${actor}');insert into user_roles values('${actor}','league_manager');
 insert into ai_documents values('${doc}','active','${ids[0]}');
 insert into ai_document_versions select x,'${doc}','ready',1 from unnest(array[${ids.map(x=>`'${x}'::uuid`).join(',')}]) x;
 insert into ai_document_chunks(document_version_id,is_searchable,embedding) select id,true,'test-vector' from ai_document_versions;
 create function activate_ai_document_version(uuid,uuid) returns void language sql as 'select';`);
 const acl=async()=>JSON.stringify((await db.query("select relname,relacl::text,relrowsecurity from pg_class where relname in ('ai_documents','ai_document_versions','ai_document_chunks') order by relname")).rows);
 const before=await acl();await db.exec(migration);assert.equal(await acl(),before);
 const funcs=async()=>(await db.query("select proname,proacl::text,prosecdef,proconfig from pg_proc where proname in ('activate_ai_document_version','ai_require_activation_history') order by proname")).rows;
 const state=await funcs();await db.exec(migration);assert.deepEqual(await funcs(),state);assert.equal(await acl(),before);
 const perms=(await db.query("select has_function_privilege('service_role','activate_ai_document_version(uuid,uuid,uuid)','EXECUTE') service,has_function_privilege('anon','activate_ai_document_version(uuid,uuid,uuid)','EXECUTE') anon,has_function_privilege('authenticated','activate_ai_document_version(uuid,uuid,uuid)','EXECUTE') authenticated,to_regprocedure('activate_ai_document_version(uuid,uuid)') old")).rows[0];
 assert.deepEqual(perms,{service:true,anon:false,authenticated:false,old:null});
 const activate=async id=>db.exec(`set role service_role;select activate_ai_document_version('${doc}','${id}','${actor}');reset role;`);
 await activate(ids[0]);assert.equal((await db.query('select activated_at from ai_document_versions where id=$1',[ids[0]])).rows[0].activated_at,null,'historical retry must not backfill');
 await assert.rejects(db.exec(`set role service_role;update ai_documents set active_version_id='${ids[1]}' where id='${doc}'`),/history/);await db.exec('reset role');
 await activate(ids[1]);const first=(await db.query('select activated_at,activated_by_member_id from ai_document_versions where id=$1',[ids[1]])).rows[0];assert.ok(first.activated_at);assert.equal(first.activated_by_member_id,actor);
 await activate(ids[1]);assert.deepEqual((await db.query('select activated_at,activated_by_member_id from ai_document_versions where id=$1',[ids[1]])).rows[0],first);
 await db.exec(`create function reject_test_activation() returns trigger language plpgsql as $$begin if new.active_version_id='${ids[2]}' then raise exception 'synthetic rollback';end if;return new;end$$;create trigger reject_test_activation before update on ai_documents for each row execute function reject_test_activation();`);
 await assert.rejects(activate(ids[2]),/synthetic rollback/);await db.exec('reset role');assert.equal((await db.query('select activated_at from ai_document_versions where id=$1',[ids[2]])).rows[0].activated_at,null);
 await db.exec('drop trigger reject_test_activation on ai_documents');await activate(ids[2]);assert.deepEqual((await db.query('select activated_at,activated_by_member_id from ai_document_versions where id=$1',[ids[1]])).rows[0],first);assert.equal((await db.query('select processing_status from ai_document_versions where id=$1',[ids[1]])).rows[0].processing_status,'superseded');
 for(const role of ['anon','authenticated']){await assert.rejects(db.exec(`set role ${role};select activate_ai_document_version('${doc}','${ids[3]}','${actor}')`),/permission/);await db.exec('reset role');await assert.rejects(db.exec(`set role ${role};select * from ai_document_versions`),/permission/);await db.exec('reset role');}
 await assert.rejects(db.exec(`set role service_role;select activate_ai_document_version('${doc}','${ids[3]}',null)`),/actor/);await db.exec('reset role');
 await db.exec(`delete from user_roles;delete from members where id='${actor}'`);const deleted=(await db.query('select activated_at,activated_by_member_id from ai_document_versions where id=$1',[ids[1]])).rows[0];assert.deepEqual(deleted.activated_at,first.activated_at);assert.equal(deleted.activated_by_member_id,null);
 }finally{await db.close();}
});
test('0722 activation display is local, historical Unknown is truthful, actor IDs stripped',async()=>{
 assert.deepEqual(activationDisplay({created_at:new Date().toISOString(),processed_at:new Date().toISOString(),activated_by_name:'Not evidence'}),{time:'Unknown',actor:'Unknown'});
 const safe=await withActivationNames({from:()=>({select:()=>({in:async()=>({data:[{id:actor,first_name:'Synthetic',last_name:'Manager'}]})})})},[{activated_at:'2026-09-07T00:30:00Z',activated_by_member_id:actor}]);
 assert.equal(safe[0].activated_by_name,'Synthetic Manager');assert.ok(!JSON.stringify(safe).includes(actor));assert.notEqual(activationDisplay(safe[0]).time,'Unknown');
 const page=await readFile(new URL('../app/ai-assistant/page.js',import.meta.url),'utf8');assert.match(page,/Activated:.*activationDisplay\(version\)/);assert.match(page,/Activated by:/);
});
