
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';


import {PGlite} from '@electric-sql/pglite';
const migration=await readFile(new URL('../supabase/migrations/20260907110701_lms0723_live_intelligence.sql',import.meta.url),'utf8');
const correction=await readFile(new URL('../supabase/migrations/20260907131012_lms0723_server_session_validation.sql',import.meta.url),'utf8');
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key);
 create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
 create table members(id uuid primary key,first_name text,last_name text,email text,phone text,is_active_member boolean);
 create table user_roles(user_id uuid unique,member_id uuid,role text);
 create table seasons(id uuid primary key,name text,is_active boolean);
 create table leagues(id uuid primary key,season_id uuid,name text,is_active boolean);
 create table divisions(id uuid primary key,league_id uuid,name text,is_active boolean);
 create table teams(id uuid primary key,division_id uuid,name text,is_active boolean,captain_member_id uuid,co_captain_member_id uuid,co_captain_2_member_id uuid,club_pro_member_id uuid);
 create table team_members(team_id uuid,member_id uuid,is_active boolean);
 create table member_season_ratings(member_id uuid,season_id uuid,season_dupr_rating numeric,season_primetime_rating numeric,dupr_doubles_rating text);
 create table locations(id uuid primary key,name text);
 create table matches(id uuid primary key,home_team_id uuid,away_team_id uuid,location_id uuid,scheduled_date date,scheduled_time time,status text,is_published boolean);
 create table system_settings(setting_key text,setting_value text);

 grant usage on schema public to service_role;
 grant select on all tables in schema public to service_role;
 grant update(user_id) on user_roles to service_role;grant update(id) on members to service_role;
 grant update on teams,team_members,seasons,divisions,leagues to service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
 insert into seasons values('${id(20)}','Synthetic Current',true);
 insert into leagues values('${id(21)}','${id(20)}','Synthetic League',true);
 insert into divisions values('${id(22)}','${id(21)}','Synthetic Division',true);
 insert into teams values('${id(30)}','${id(22)}','Synthetic Team',true,'${id(2)}','${id(3)}','${id(4)}','${id(5)}'),('${id(31)}','${id(22)}','Other Team',true,null,null,null,null);
 insert into locations values('${id(40)}','Synthetic Courts');
 insert into system_settings values('timezone','America/New_York');
 insert into matches values('${id(50)}','${id(30)}','${id(31)}','${id(40)}',current_date+2,'12:00','scheduled',true);
 `);
 for(let n=1;n<=9;n++){
  await db.query('insert into members values($1,$2,$3,$4,$5,true)',[id(n),'Synthetic',`Person${n}`,`synthetic${n}@example.invalid`,'DO NOT READ']);
  await db.query('insert into user_roles values($1,$2,$3)',[id(100+n),id(n),['player','captain','captain','captain','club_pro','club_pro','league_manager','commissioner','player'][n-1]]);
  await db.query('insert into auth.sessions values($1,$2,null)',[id(200+n),id(100+n)]);
  await db.query('insert into member_season_ratings values($1,$2,3.72,4.1,\'NR\')',[id(n),id(20)]);
 }
 await db.exec(`insert into team_members values('${id(30)}','${id(1)}',true),('${id(31)}','${id(9)}',true);`);
 await db.exec(await readFile(new URL('../supabase-ai-assistant-lms-0712-stage6.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase-ai-assistant-lms-0716-stage7a.sql',import.meta.url),'utf8'));
 await db.exec(migration);
 await db.exec('create role supabase_auth_admin; alter table auth.sessions owner to supabase_auth_admin; alter table auth.sessions enable row level security; revoke usage on schema auth from ai_live_session_reader;');
 await db.exec(correction);
 return db;
}
async function call(db,n,query){
 await db.exec('set role service_role');
 try{return (await db.query('select ai_live_lookup($1,$2,$3) result',[id(100+n),id(500+n),query])).rows[0].result;}finally{await db.exec('reset role');}
}

// DIAGNOSIS ONLY: synthetic in-memory reproduction; no network or production data.
const db=await fixture();
let checks=0;
try {
 await db.exec(`
 alter table auth.users add email text, add email_confirmed_at timestamptz,
 add email_change text, add deleted_at timestamptz, add banned_until timestamptz, add is_anonymous boolean;
 alter table user_roles add id uuid default gen_random_uuid() primary key,
 add created_at timestamptz default now(), add updated_at timestamptz default now();
 insert into auth.users(id,email,email_confirmed_at)
 select user_id,'synthetic'||right(member_id::text,1)||'@example.invalid',now() from user_roles;
 update user_roles set member_id=null,role='commissioner' where user_id='${id(107)}';
 insert into user_roles(user_id,member_id,role) values(null,'${id(7)}','commissioner');
 delete from member_season_ratings where member_id='${id(7)}';
 insert into seasons values('${id(23)}','Synthetic Second Active',true);
 insert into member_season_ratings values('${id(7)}','${id(23)}',null,null,'NR');
 `);
 const doc=await readFile(new URL('../../docs/lms-0723-identity-repair-sql-proposal.md',import.meta.url),'utf8');
 const sql=doc.match(/```sql\n([\s\S]*?)\n```/)[1];
 await db.exec(sql);
 const repair=async(n,member=n)=> (await db.query('select identity_repair_private.reconcile($1,$2,$3,$4) result',
  [id(950),id(107),id(100+n),id(member)])).rows[0].result;
 assert.equal((await call(db,7,{intent:'SELF_RATING',rating:'season'})).status,'denied'); checks++;
 await db.exec('begin');
 assert.equal(await repair(7),'consolidate_identical_split'); checks++;
 assert.equal((await db.query('select count(*)::int n from user_roles where member_id=$1',[id(7)])).rows[0].n,1); checks++;
 assert.equal((await db.query('select role from user_roles where user_id=$1',[id(107)])).rows[0].role,'commissioner'); checks++;
 const choices=await call(db,7,{intent:'SELF_RATING',rating:'season'});
 assert.equal(choices.status,'ambiguous'); assert.equal(choices.choices.length,2); checks++;
 for(const season of [id(20),id(23)]){
  const result=await call(db,7,{intent:'SELF_RATING',rating:'season',season});
  assert.equal(result.status,'missing'); assert.equal(result.value,null); checks++;
 }
 assert.equal(await repair(7),'already_linked');
 assert.equal((await db.query('select count(*)::int n from identity_repair_private.events')).rows[0].n,1); checks++;
 assert.equal((await call(db,1,{intent:'PLAYER_CONTACT',name:'Synthetic Person9'})).status,'denied'); checks++;
 await db.exec('rollback');
 assert.equal((await call(db,7,{intent:'SELF_RATING',rating:'season'})).status,'denied');
 assert.equal((await db.query('select count(*)::int n from identity_repair_private.events')).rows[0].n,0); checks++;

 async function scenario(setup, fn){ await db.exec('begin'); try{ await db.exec(setup); await fn(); checks++; }finally{await db.exec('rollback');} }
 await scenario('',async()=>assert.equal(await repair(1),'already_linked'));
 await scenario(`update user_roles set user_id=null where member_id='${id(1)}';`,async()=>assert.equal(await repair(1),'link_member_row'));
 await scenario(`update user_roles set member_id=null where user_id='${id(101)}';`,async()=>assert.equal(await repair(1),'link_auth_row'));
 await scenario(`update auth.users set email='  SYNTHETIC7@EXAMPLE.INVALID  ' where id='${id(107)}';`,async()=>assert.equal(await repair(7),'consolidate_identical_split'));
 await scenario(`insert into members values('${id(70)}','Synthetic','Duplicate','synthetic7@example.invalid',null,true);`,async()=>await assert.rejects(repair(7),/nonunique_member_email/));
 await scenario(`update user_roles set user_id='${id(199)}' where member_id='${id(7)}';`,async()=>await assert.rejects(repair(7),/member_already_linked_elsewhere/));
 await scenario(`update user_roles set member_id='${id(70)}' where user_id='${id(107)}';`,async()=>await assert.rejects(repair(7),/auth_already_linked_elsewhere/));
 await scenario(`update user_roles set role='captain' where member_id='${id(7)}';`,async()=>await assert.rejects(repair(7),/split_role_conflict/));
 await scenario(`insert into user_roles(member_id,role) values('${id(7)}','captain');`,async()=>await assert.rejects(repair(7),/multiple_member_role_rows/));
 await scenario(`update auth.users set email=null where id='${id(107)}';`,async()=>await assert.rejects(repair(7),/auth_not_reconcilable/));
 await scenario(`update auth.users set email_confirmed_at=null where id='${id(107)}';`,async()=>await assert.rejects(repair(7),/auth_not_reconcilable/));
 await scenario(`update auth.users set email_change='changed@example.invalid' where id='${id(107)}';`,async()=>await assert.rejects(repair(7),/auth_not_reconcilable/));
 await scenario(`update members set is_active_member=false where id='${id(7)}';`,async()=>await assert.rejects(repair(7),/member_not_reconcilable/));
 await scenario(`delete from user_roles where member_id='${id(1)}';`,async()=>await assert.rejects(repair(1),/no_existing_role_authority/));
 await scenario(``,async()=>await assert.rejects(repair(7,70),/member_missing/));
 for(const role of ['anon','authenticated','service_role']){
  await db.exec(`set role ${role}`);
  await assert.rejects(repair(7),/permission/);
  await assert.rejects(db.query('select * from identity_repair_private.events'),/permission/);
  await db.exec('reset role'); checks++;
 }
 await scenario(`alter table identity_repair_private.events add constraint synthetic_audit_failure check(false);`,async()=>await assert.rejects(repair(7),/synthetic_audit_failure/));
 assert.equal((await db.query('select count(*)::int n from user_roles where member_id=$1 or user_id=$2',[id(7),id(107)])).rows[0].n,2); checks++;
 console.log(JSON.stringify({syntheticOnly:true,productionConnections:0,checksPassed:checks,
  before:'denied',after:'two-season clarification; missing for both seasons',role:'commissioner preserved',rollback:'verified',
  concurrency:'real multi-session lock timeout and contention remain implementation test gates'}));
} finally {await db.close();}

