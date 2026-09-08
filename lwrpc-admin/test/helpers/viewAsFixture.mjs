import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
const migration=await readFile(new URL('../../supabase/migrations/20260907201448_lms0724_view_as.sql',import.meta.url),'utf8');
export const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export async function fixture(db=new PGlite()){
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
 create table team_standings(team_id uuid,rank int,standings_points numeric,match_wins int,match_losses int);
 create table matches(id uuid primary key,home_team_id uuid,away_team_id uuid,location_id uuid,scheduled_date date,scheduled_time time,status text,is_published boolean);
 create table system_settings(setting_key text,setting_value text);

 grant usage on schema public to service_role;
 grant select on all tables in schema public to service_role;
 grant update(user_id) on user_roles to service_role;grant update(id) on members to service_role;
 grant update on teams,team_members,seasons,divisions,leagues to service_role;
 alter default privileges grant all on tables to anon,authenticated,service_role;
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
 await db.exec('alter table teams add column home_location_id uuid;alter table locations add column club_pro_member_id uuid;alter table locations add column club_pro_2_member_id uuid;');
 await db.exec(migration);return db;
}


