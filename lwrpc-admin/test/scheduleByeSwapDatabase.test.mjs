import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const migration=await readFile(new URL('../supabase/migrations/20260928213736_schedule_editor_swap_with_bye.sql',import.meta.url),'utf8');
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('atomic Swap with Bye database contracts',async t=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table divisions(id uuid primary key,league_id uuid,is_active boolean,default_game_format text);
 create table teams(id uuid primary key,division_id uuid,is_active boolean,home_location_id uuid);
 create table matches(id uuid primary key,league_id uuid,division_id uuid,home_team_id uuid,away_team_id uuid,location_id uuid,scheduled_date date,scheduled_time time,week_number int,status text,home_score int,away_score int,notes text,created_at timestamptz,updated_at timestamptz,published_at timestamptz,is_published boolean,schedule_setting_id uuid,winning_team_id uuid,score_status text,score_entered_by_member_id uuid,score_entered_at timestamptz,score_verified_by_member_id uuid,score_verified_at timestamptz,score_disputed boolean,score_dispute_notes text,finalized_at timestamptz,score_exported_at timestamptz,result_type text,result_notes text);
 create table team_byes(id uuid primary key,league_id uuid,division_id uuid,team_id uuid,week_number int,bye_date date,created_at timestamptz,updated_at timestamptz,schedule_setting_id uuid);
 create table match_lines(id uuid primary key,match_id uuid,home_player_1_id uuid,home_player_2_id uuid,away_player_1_id uuid,away_player_2_id uuid,winning_team_id uuid);
 create table line_games(id uuid primary key,match_line_id uuid,home_score int,away_score int);
 create table match_lineups(id uuid primary key,match_id uuid);
 grant select,update on matches,team_byes to service_role;grant select,update on teams,divisions,match_lines,line_games,match_lineups to service_role;`);
 await db.exec(migration);
 async function seed(){
  await db.exec(`delete from match_lineups;delete from line_games;delete from match_lines;delete from team_byes;delete from matches;delete from teams;delete from divisions;
  insert into divisions values('${id(30)}','${id(20)}',true,'best_of_3'),('${id(31)}','${id(20)}',true,'best_of_3');
  insert into teams select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'${id(30)}',true,'${id(50)}' from generate_series(1,7)n;
  insert into matches(id,league_id,division_id,home_team_id,away_team_id,location_id,scheduled_date,scheduled_time,week_number,status,notes,created_at,updated_at,is_published,schedule_setting_id) values('${id(10)}','${id(20)}','${id(30)}','${id(1)}','${id(2)}','${id(50)}','2026-10-20','18:30',2,'scheduled','Preserve note','2026-09-01','2026-09-01',true,'${id(40)}');
  insert into team_byes(id,league_id,division_id,team_id,week_number,bye_date,created_at,updated_at,schedule_setting_id) values('${id(103)}','${id(20)}','${id(30)}','${id(3)}',2,'2026-10-20','2026-09-01','2026-09-01','${id(40)}');`);
 }
 const row=async(table,n)=>(await db.query(`select to_jsonb(r) row from ${table} r where id=$1`,[id(n)])).rows[0]?.row;
 const snapshot=async()=>({match:await row('matches',10),bye:await row('team_byes',103)});
 const swap=async({match,bye},side='home')=>(await db.query('select public.schedule_editor_swap_with_bye($1,$2,$3,$4::jsonb,$5::jsonb) result',[match.id,side,bye.id,JSON.stringify(match),JSON.stringify(bye)])).rows[0].result;
 for(const side of ['home','away'])await t.test(`${side} inherits exact position; removed team receives bye and every other stored field stays unchanged`,async()=>{
  await seed();const old=await snapshot();const result=await swap(old,side);const next=await snapshot();
  assert.equal(next.match[side+'_team_id'],id(3));assert.equal(next.bye.team_id,old.match[side+'_team_id']);assert.equal(result.opponentTeamId,old.match[(side==='home'?'away':'home')+'_team_id']);
  for(const key of Object.keys(old.match))if(![side+'_team_id','updated_at'].includes(key))assert.deepEqual(next.match[key],old.match[key],key);
  for(const key of Object.keys(old.bye))if(!['team_id','updated_at'].includes(key))assert.deepEqual(next.bye[key],old.bye[key],key);
  assert.equal((await db.query('select default_game_format from divisions where id=$1',[id(30)])).rows[0].default_game_format,'best_of_3');
 });
 await t.test('no anonymous/authenticated RPC access; security invoker with service-only execute',async()=>{
  const acl=(await db.query(`select has_function_privilege('anon','public.schedule_editor_swap_with_bye(uuid,text,uuid,jsonb,jsonb)','EXECUTE') anon,has_function_privilege('authenticated','public.schedule_editor_swap_with_bye(uuid,text,uuid,jsonb,jsonb)','EXECUTE') authenticated,has_function_privilege('service_role','public.schedule_editor_swap_with_bye(uuid,text,uuid,jsonb,jsonb)','EXECUTE') service,prosecdef from pg_proc where proname='schedule_editor_swap_with_bye'`)).rows[0];assert.deepEqual(acl,{anon:false,authenticated:false,service:true,prosecdef:false});
  await seed();const old=await snapshot();await db.exec('set role service_role');try{await swap(old);}finally{await db.exec('reset role');}
 });
 for(const [name,sql] of [
  ['foreign division',`update teams set division_id='${id(31)}' where id='${id(3)}'`],
  ['inactive team',`update teams set is_active=false where id='${id(3)}'`],
  ['inactive original',`update teams set is_active=false where id='${id(1)}'`],
  ['inactive division',`update divisions set is_active=false where id='${id(30)}'`],
  ['wrong date',`update team_byes set bye_date='2026-10-21'`],
  ['wrong week',`update team_byes set week_number=3`],
  ['other copied setting',`update team_byes set schedule_setting_id='${id(41)}'`],
  ['already playing same week different date',`insert into matches(id,league_id,division_id,home_team_id,away_team_id,scheduled_date,week_number,status) values('${id(11)}','${id(20)}','${id(30)}','${id(3)}','${id(4)}','2026-10-21',2,'draft')`],
  ['already playing same date different week',`insert into matches(id,league_id,division_id,home_team_id,away_team_id,scheduled_date,week_number,status) values('${id(11)}','${id(20)}','${id(30)}','${id(3)}','${id(4)}','2026-10-20',3,'draft')`],
  ['original duplicate match',`insert into matches(id,league_id,division_id,home_team_id,away_team_id,scheduled_date,week_number,status) values('${id(11)}','${id(20)}','${id(30)}','${id(1)}','${id(4)}','2026-10-20',2,'draft')`],
  ['duplicate bye',`insert into team_byes select '${id(104)}',league_id,division_id,team_id,week_number,bye_date,created_at,updated_at,schedule_setting_id from team_byes`],
  ['completed verified lock',`update matches set status='completed',score_status='verified'`],
  ['existing lineup',`insert into match_lineups values('${id(200)}','${id(10)}')`],
  ['entered player',`insert into match_lines(id,match_id,home_player_1_id) values('${id(200)}','${id(10)}','${id(999)}')`],
  ['entered game score',`insert into match_lines(id,match_id) values('${id(200)}','${id(10)}');insert into line_games values('${id(201)}','${id(200)}',0,null)`],
 ])await t.test(`server rejects ${name} without partial changes`,async()=>{
  await seed();await db.exec(sql);const old=await snapshot();await assert.rejects(swap(old));assert.deepEqual(await snapshot(),old);
 });
 await t.test('stale snapshots detect changed match, changed bye, deletion and incomplete expected data',async()=>{
  for(const sql of [`update matches set notes='Changed without timestamp'`,`update team_byes set team_id='${id(4)}'`,`delete from matches`,`delete from team_byes`]){await seed();const old=await snapshot();await db.exec(sql);const actual=await snapshot();await assert.rejects(swap(old));assert.deepEqual(await snapshot(),actual);}
  await seed();const old=await snapshot();delete old.match.notes;await assert.rejects(swap(old),/incomplete/);
 });
 await t.test('legacy byes, missing week and cancelled conflicts follow recorded schedule data',async()=>{
  await seed();await db.exec(`update team_byes set schedule_setting_id=null,week_number=null;update matches set week_number=null;insert into matches(id,home_team_id,away_team_id,scheduled_date,status) values('${id(11)}','${id(3)}','${id(4)}','2026-10-20','cancelled')`);await swap(await snapshot());assert.equal((await snapshot()).bye.team_id,id(1));
 });
 await t.test('two conflicting submissions consume a bye once; replay is stale',async()=>{
  await seed();const old=await snapshot();const attempts=await Promise.allSettled([swap(old),swap(old,'away')]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);assert.equal(attempts.filter(r=>r.status==='rejected').length,1);await assert.rejects(swap(old));
 });
 await t.test('a bye update failure rolls back the match update atomically',async()=>{
  await seed();const old=await snapshot();await db.exec(`create function fail_bye() returns trigger language plpgsql as $$begin raise exception 'test injected bye failure';end;$$;create trigger fail_bye before update on team_byes for each row execute function fail_bye()`);await assert.rejects(swap(old),/injected/);assert.deepEqual(await snapshot(),old);await db.exec('drop trigger fail_bye on team_byes;drop function fail_bye()');
 });
 }finally{await db.close();}
});
