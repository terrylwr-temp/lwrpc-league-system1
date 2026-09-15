import { readFile } from 'node:fs/promises';
import { fixture, id } from './viewAsFixture.mjs';
import { configurations } from '../../scripts/lms0726/policy-seeds.mjs';
export { id };
export const phase1 = await readFile(new URL('../../supabase/migrations/20260909002847_lms0726_security_foundation_additive.sql', import.meta.url), 'utf8');
export async function foundationDatabase(db) {
  db = await fixture(db);
  await db.exec(`
    alter table members add column dupr_id text,add column waiver_status text,add column location_id uuid;
    alter table member_season_ratings add column dupr_reliability_rating numeric;
    alter table leagues add column only_home_community_players boolean;
    alter table divisions add column min_dupr numeric,add column max_dupr numeric,add column team_dupr_max numeric,add column rating_type text,add column number_of_lines int,add column secondary_number_of_lines int,add column primary_team_type text,add column secondary_team_type text;
    create table ai_documents(id uuid primary key,title text,status text,active_version_id uuid);
    create table ai_document_versions(id uuid primary key,version_label text);
    alter table leagues add column rosters_locked boolean default false;
    alter table matches add column division_id uuid;
    update matches set division_id=(select id from divisions limit 1);
    alter table team_members add column id uuid default gen_random_uuid() primary key;
    alter table team_members add unique(team_id,member_id);
    create table match_lineups(id uuid primary key default gen_random_uuid(),match_id uuid,team_id uuid,line_number int,player_1_member_id uuid,player_2_member_id uuid,updated_at timestamptz,unique(match_id,team_id,line_number));
    create table match_lines(id uuid primary key default gen_random_uuid(),match_id uuid,home_player_1_id uuid,home_player_2_id uuid,away_player_1_id uuid,away_player_2_id uuid);
    create table line_games(id uuid primary key default gen_random_uuid(),match_line_id uuid,game_status text);
    do $rls$ declare t text;begin
      foreach t in array array['members','user_roles','teams','divisions','leagues','team_members','matches','match_lineups','match_lines'] loop
        execute format('alter table public.%I enable row level security',t);
      end loop;
    end $rls$;
    update team_members set id='${id(700)}' where team_id='${id(30)}';
  `);
  // Reviewed nonmember configuration IDs only; every member/session stays synthetic.
  for (const row of configurations) {
    await db.query('insert into seasons(id,name,is_active) values($1,$2,true) on conflict(id) do nothing',[row.season_id,row.season]);
    await db.query('insert into leagues(id,season_id,name,is_active,only_home_community_players) values($1,$2,$3,true,$4) on conflict(id) do nothing',[row.league_id,row.season_id,row.league,row.only_home_community_players]);
    await db.query('insert into divisions(id,league_id,name,is_active,min_dupr,max_dupr,team_dupr_max,rating_type) values($1,$2,$3,true,$4,$5,$6,$7)',[row.division_id,row.league_id,row.division,row.min_dupr,row.max_dupr,row.team_dupr_max,row.rating_type]);
  }
  await db.exec(phase1);
  return db;
}


