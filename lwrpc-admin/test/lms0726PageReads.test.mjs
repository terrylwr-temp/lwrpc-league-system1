import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pageFixture,id} from './helpers/viewAsPageFixture.mjs';
const migration=await readFile(new URL('../supabase/migrations/20260909014356_lms0726_view_as_real_ui_reads.sql',import.meta.url),'utf8');
test('0726 scoped page reads clean apply and replay',async()=>{const db=await pageFixture();try{await db.exec(migration);await db.exec(migration);await db.exec(migration);const funcs=await db.query("select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='lms_read_private' or n.nspname='view_as_private' and proname='page_read'");assert.equal(funcs.rows.length,4);for(const role of ['anon','authenticated','service_role']){const access=await db.query(`select has_function_privilege('${role}','view_as_private.page_read(jsonb,text,jsonb)','execute') allowed`);assert.equal(access.rows[0].allowed,false);}}finally{await db.close();}});
async function call(db,op,input){await db.exec('set role service_role');try{return (await db.query('select public.lms_view_as($1,$2) result',[op,input])).rows[0].result;}finally{await db.exec('reset role');}}
test('0726 dashboard projection uses effective identity, no raw RF or unrelated contacts, proof/expiry denial',async()=>{
 const db=await pageFixture();try{await db.exec(migration);await db.exec(`update user_roles set user_id=null where member_id='${id(1)}';update locations set club_pro_2_member_id='${id(6)}' where id='${id(40)}';insert into locations(id,name) values('${id(41)}','Unrelated court');update teams set home_location_id='${id(41)}' where id='${id(31)}';insert into user_roles(user_id,member_id,role) values(null,'${id(2)}','player');`);
 for(const n of [1,2,3,4,5,6,7,8]){
  const proof={id:id(770+n),actor:id(107),target:id(n),browser:String(n).repeat(64),code:'c'.repeat(64),context:'d'.repeat(64),binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()};
  await db.exec(`update view_as_private.contexts set created_at=clock_timestamp()-interval '2 minutes'`);await call(db,'start',proof);const exchanged=await call(db,'exchange',proof);if(n===1)assert.equal(exchanged.hasAuth,false);if(n===2)assert.deepEqual([...exchanged.roles].sort(),['captain','player']);
  const result=await call(db,'page_read',{...proof,contract:'dashboard',args:{}});
  assert.ok(result.viewer, 'target '+n+': '+JSON.stringify(result));assert.equal(result.viewer.memberId,id(n));if(n===6)assert.ok(result.viewer.managed.includes(id(30)));if(n===5)assert.ok(!result.viewer.managed.includes(id(31)));assert.equal(result.tables.members.find(r=>r.id===id(n)).email,`synthetic${n}@example.invalid`);
  assert.ok(!JSON.stringify(result).includes('dupr_reliability_rating'));
  if(n===2){await db.exec(`update teams set is_active=false where id='${id(30)}';update seasons set is_active=false where id='${id(20)}';`);const history=await call(db,'page_read',{...proof,contract:'dashboard',args:{}});assert.ok(history.viewer.managed.includes(id(30)));assert.equal(history.tables.teams.find(t=>t.id===id(30)).captain_member_id,id(2));await db.exec('update teams set is_active=true;update seasons set is_active=true;');}
  assert.ok(!result.tables.members.some(r=>r.id===id(9)&&r.email));
  assert.ok(!result.tables.member_season_ratings.some(r=>r.member_id===id(9)));
  assert.equal((await call(db,'page_read',{...proof,context:'e'.repeat(64),contract:'dashboard',args:{}})).denied,true);
  await assert.rejects(call(db,'page_read',{...proof,contract:'dashboard',args:{target:id(9)}}),/Invalid View-As read contract/);
  await call(db,'end',proof);assert.equal((await call(db,'page_read',{...proof,contract:'dashboard',args:{}})).denied,true);
 }
 }finally{await db.close();}
});
test('0726 additive migration preserves normal ACLs/business rows, rejects drift and recovers missing scoped function',async()=>{const db=await pageFixture();try{
 const tables=(await db.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map(r=>r.tablename);
 const business=async()=>{const rows={};for(const t of tables)rows[t]=(await db.query(`select row_to_json(r) data from public.${t} r`)).rows;return rows;};
 const privileges=async()=>(await db.query("select r.rolname,t.tablename,p.op,has_table_privilege(r.rolname,format('public.%I',t.tablename),p.op) allowed from pg_roles r cross join pg_tables t cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE')) p(op) where r.rolname in('anon','authenticated','service_role') and t.schemaname='public' order by 1,2,3")).rows;
 const before=await business(),acl=await privileges();await db.exec(migration);assert.deepEqual(await business(),before);assert.deepEqual(await privileges(),acl);
 await db.exec('set role lms_view_as_reader');for(const table of ['members','teams','team_members','matches'])await assert.rejects(db.exec(`delete from public.${table} where false`),/permission/);await assert.rejects(db.exec('select dupr_reliability_rating from public.member_season_ratings'),/permission/);await db.exec('reset role');
 await db.exec('grant select(dupr_reliability_rating) on member_season_ratings to lms_view_as_reader');await assert.rejects(db.exec(migration),/column privilege drift/);await db.exec('rollback');await db.exec('revoke select(dupr_reliability_rating) on member_season_ratings from lms_view_as_reader');
 await db.exec('grant execute on function view_as_private.page_read(jsonb,text,jsonb) to authenticated');await assert.rejects(db.exec(migration),/ACL drift/);await db.exec('rollback');await db.exec('revoke execute on function view_as_private.page_read(jsonb,text,jsonb) from authenticated');await db.exec(migration);
 await db.exec('drop function lms_read_private.people(jsonb,text,jsonb)');await db.exec(migration);assert.deepEqual(await business(),before);assert.deepEqual(await privileges(),acl);
 }finally{await db.close();}});
