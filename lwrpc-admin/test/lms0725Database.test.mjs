import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {fixture,id} from './helpers/viewAsFixture.mjs';
const read=name=>readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
const migration=await read('20260908114532_lms0725_clarification_choices.sql');
test('0725 isolated migration replay, authorized combined choices, missing/denial/count and View-As target isolation',async()=>{
 const db=await fixture();try{
 await db.exec(await readFile(new URL('../supabase-ai-assistant-lms-0712-stage6.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase-ai-assistant-lms-0716-stage7a.sql',import.meta.url),'utf8'));
 await db.exec(await read('20260907110701_lms0723_live_intelligence.sql'));
 await db.exec('revoke usage on schema auth from ai_live_session_reader');
 await db.exec(await read('20260907131012_lms0723_server_session_validation.sql'));
 await db.exec(await read('20260908011413_lms0724_view_as_authorization_locks.sql'));
 const meta=()=>db.query("select oid::regprocedure::text signature,proowner,prosecdef,proacl,proconfig from pg_proc where proname in ('lookup','lms_view_as') order by oid");const before=(await meta()).rows;
 await db.exec(migration);await db.exec(migration);assert.deepEqual((await meta()).rows,before);
 const lookup=async(actor,q)=>{await db.exec('set role service_role');try{return(await db.query('select public.ai_live_lookup($1,$2,$3) result',[actor,id(900),q])).rows[0].result;}finally{await db.exec('reset role');}};
 const menu=await lookup(id(101),{intent:'SELF_RATING',subjectKind:'SELF',rating:'clarify'});assert.equal(menu.status,'ambiguous');assert.equal(menu.choices.length,2);assert.deepEqual(new Set(menu.choices.map(c=>c.rating)),new Set(['season','primetime']));assert.ok(menu.choices.every(c=>c.season===id(20)));
 const value=await lookup(id(101),{intent:'SELF_RATING',subjectKind:'SELF',rating:'season',season:id(20)});assert.equal(value.value,'3.72');
 await db.exec(`update member_season_ratings set season_dupr_rating=null where member_id='${id(1)}'`);
 assert.equal((await lookup(id(101),{intent:'SELF_RATING',rating:'season'})).status,'missing');
 assert.equal((await lookup(id(101),{intent:'PLAYER_CONTACT',name:'Synthetic Person9',subjectKind:'EXPLICIT_PERSON'})).status,'denied');
 assert.equal((await lookup(id(101),{intent:'TEAM_ROSTER',subjectKind:'SELF',projection:'count'})).count,1);
 for(const table of ['members','user_roles','teams','team_members','seasons','leagues','divisions','member_season_ratings','locations','team_standings','matches','system_settings'])await db.exec('alter table public.'+table+' enable row level security');
 const proof={id:id(770),actor:id(108),target:id(1),browser:'b'.repeat(64),code:'c'.repeat(64),context:'d'.repeat(64),binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()};
 const call=async(op,extra={})=>{await db.exec('set role service_role');try{return(await db.query('select public.lms_view_as($1,$2) result',[op,{...proof,...extra}])).rows[0].result;}finally{await db.exec('reset role');}};
 await call('start');await call('exchange');
 const v=await call('live',{request:id(901),query:{intent:'SELF_RATING',rating:'clarify',subjectKind:'SELF'}});assert.equal(v.subject,id(1));assert.equal(v.choices.length,2);
 assert.equal((await call('live',{request:id(902),query:{intent:'TEAM_ROSTER',projection:'count',subjectKind:'SELF'}})).count,1);
 assert.equal((await call('live',{request:id(903),query:{intent:'PLAYER_CONTACT',name:'Synthetic Person9',subjectKind:'EXPLICIT_PERSON'}})).status,'denied');
 await db.exec(`update seasons set is_active=false where id='${id(20)}'`);
 assert.equal((await call('live',{request:id(904),query:{intent:'SELF_RATING',rating:'season',season:id(20),subjectKind:'SELF'}})).status,'no_season');
 await call('end');assert.equal((await call('live',{request:id(905),query:{intent:'SELF_RATING',rating:'season'}})).denied,true);
 await db.exec(await readFile(new URL('../../docs/lms-0725-rollback.sql',import.meta.url),'utf8'));
 assert.deepEqual((await meta()).rows,before);
 assert.equal((await lookup(id(101),{intent:'SELF_RATING',rating:'clarify'})).status,'rating_clarification');
 }finally{await db.close();}
});
