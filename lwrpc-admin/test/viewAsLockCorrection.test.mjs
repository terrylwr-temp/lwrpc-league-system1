import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,id} from './helpers/viewAsFixture.mjs';
export const correction=await readFile(new URL('../supabase/migrations/20260908011413_lms0724_view_as_authorization_locks.sql',import.meta.url),'utf8');
export const proof={id:id(770),actor:id(107),target:id(1),browser:'b'.repeat(64),code:'c'.repeat(64),context:'d'.repeat(64),binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()};
export async function rls(db){for(const table of ['members','user_roles','teams','team_members','seasons','leagues','divisions','member_season_ratings','locations','team_standings','matches','system_settings'])await db.exec('alter table public.'+table+' enable row level security');}
export async function call(db,op,input=proof){await db.exec('set role service_role');try{return(await db.query('select public.lms_view_as($1,$2) result',[op,input])).rows[0].result;}finally{await db.exec('reset role');}}
test('0724 production RLS reproduces denial; proof-bound lock correction restores SELF only',async()=>{const db=await fixture();try{
 await rls(db);await call(db,'start');assert.equal((await call(db,'exchange')).role,'player');
 const q={...proof,request:id(800),query:{intent:'SELF_RATING',rating:'season',subjectKind:'SELF'}};
 assert.equal((await call(db,'live',q)).status,'denied','original production failure reproduced');
 await db.exec(correction);
 const result=await call(db,'live',q);assert.equal(result.status,'success');assert.equal(result.value,'3.72');assert.equal(result.subject,id(1));assert.equal(result.relationship,'self');
 assert.equal((await call(db,'live',{...q,query:{intent:'PLAYER_CONTACT',name:'Synthetic Person9',subjectKind:'EXPLICIT_PERSON'}})).status,'denied');
 await db.exec(`update public.member_season_ratings set season_dupr_rating=null where member_id='${id(1)}'`);
 assert.equal((await call(db,'live',q)).status,'missing');
 assert.equal((await call(db,'resolve',{...proof,actor:id(108)})).denied,true);
 assert.equal((await call(db,'resolve',{...proof,target:id(9)})).denied,true);
 assert.equal((await call(db,'resolve',{...proof,context:'e'.repeat(64)})).denied,true);
 for(const role of ['anon','authenticated','service_role']){await db.exec('set role '+role);await assert.rejects(db.query("select view_as_private.lock_authorization($1,'identity')",[proof]),/permission/);await db.exec('reset role');}
 await db.exec('set role lms_view_as_executor');
 assert.equal((await db.query("select view_as_private.lock_authorization($1,'identity') ok",[{...proof,context:'e'.repeat(64)}])).rows[0].ok,false);
 for(const [table,col] of [['members','id'],['user_roles','member_id'],['teams','id'],['team_members','member_id'],['seasons','id'],['leagues','id'],['divisions','id']])await assert.rejects(db.exec(`update public.${table} set ${col}=${col}`),/permission/);
 await db.exec('reset role');
 await db.exec(correction);assert.equal((await call(db,'live',q)).status,'missing','replay retains effective behavior');
 await call(db,'end');assert.equal((await call(db,'live',q)).denied,true);
}finally{await db.close();}});

test('0724 corrected locks preserve team/captain scope and reject expiry/helper tampering',async()=>{const db=await fixture();try{
 await rls(db);await db.exec(correction);await call(db,'start');await call(db,'exchange');
 for(const intent of ['SELF_TEAM','TEAM_ROSTER','NEXT_MATCH'])assert.equal((await call(db,'live',{...proof,request:id(801),query:{intent,self:true,subjectKind:'SELF'}})).status,'success');
 const scoped={...proof,intent:'SELF_RATING'};await db.exec('set role lms_view_as_executor');
 for(const bad of [{...scoped,actor:id(108)},{...scoped,target:id(9)},{...scoped,browser:'e'.repeat(64)},{...scoped,context:'e'.repeat(64)},{id:proof.id}])assert.equal((await db.query("select view_as_private.lock_authorization($1,'identity') ok",[bad])).rows[0].ok,false);
 assert.equal((await db.query("select view_as_private.lock_authorization($1,'subject',$2) ok",[scoped,id(9)])).rows[0].ok,false);
 await db.exec('reset role');await db.exec(`update view_as_private.contexts set expires_at=clock_timestamp()-interval '1 second'`);
 assert.equal((await call(db,'resolve')).denied,true);
}finally{await db.close();}});

test('0724 corrected Captain contact remains team-scoped; location-only Club Pro grants no live contact',async()=>{const db=await fixture();try{
 await rls(db);await db.exec(correction);
 const captain={...proof,target:id(2)};await call(db,'start',captain);await call(db,'exchange',captain);
 const contact={...captain,request:id(811),query:{intent:'PLAYER_CONTACT',subjectKind:'EXPLICIT_PERSON',name:'Synthetic Person1'}};
 assert.equal((await call(db,'live',contact)).status,'success');
 assert.equal((await call(db,'live',{...contact,query:{...contact.query,name:'Synthetic Person9'}})).status,'not_found');
 await call(db,'end',captain);
 await db.exec(`update public.locations set club_pro_member_id='${id(6)}' where id='${id(40)}';update public.teams set home_location_id='${id(40)}' where id='${id(30)}';`);
 const pro={...proof,id:id(771),target:id(6),code:'e'.repeat(64),context:'f'.repeat(64)};
 await call(db,'start',pro);await call(db,'exchange',pro);
 assert.equal((await call(db,'snapshot',pro)).teams.length,1);
 assert.equal((await call(db,'live',{...pro,request:id(812),query:contact.query})).status,'not_found');
}finally{await db.close();}});

test('0724 correction refuses helper ACL drift and preserves policy/function footprint on replay',async()=>{const db=await fixture();try{
 await rls(db);const policies=(await db.query('select * from pg_policies order by schemaname,tablename,policyname')).rows;
 await db.exec(correction);assert.deepEqual((await db.query('select * from pg_policies order by schemaname,tablename,policyname')).rows,policies);
 const signature='view_as_private.lock_authorization(jsonb,text,uuid,uuid,uuid)';
 const metadata=(await db.query(`select prosecdef,proconfig,prorettype::regtype::text as result from pg_proc where oid='${signature}'::regprocedure`)).rows[0];
 assert.deepEqual(metadata,{prosecdef:true,proconfig:['search_path=""'],result:'boolean'});
 await db.exec(`grant execute on function ${signature} to authenticated`);
 await assert.rejects(db.exec(correction),/ACL drift/);await db.exec('rollback');
 await db.exec(`revoke execute on function ${signature} from authenticated`);await db.exec(correction);
}finally{await db.close();}});

test('0724 review-only rollback restores prior function and privilege state without data changes',async()=>{const db=await fixture();try{
 await rls(db);
 const state=async()=>(await db.query("select oid::regprocedure::text as signature,prosrc,proowner,prosecdef,proconfig,proacl from pg_proc where proname in('lookup','lms_view_as') order by oid")).rows;
 const before=await state();await db.exec(correction);
 const rollback=await readFile(new URL('../../docs/lms-0724-lock-correction-rollback.sql',import.meta.url),'utf8');await db.exec(rollback);
 assert.deepEqual(await state(),before);assert.equal((await db.query("select to_regprocedure('view_as_private.lock_authorization(jsonb,text,uuid,uuid,uuid)') helper")).rows[0].helper,null);
 assert.equal((await db.query('select count(*)::int n from public.members')).rows[0].n,9);
}finally{await db.close();}});
