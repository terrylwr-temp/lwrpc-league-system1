-- Security Advisor hardening, batches 1 and 2.
-- Applied to production on 2026-07-16.  Run as a transaction on a matching database.

begin;

-- Keep RLS helper functions out of the Data API while preserving Captain
-- authority over only the teams to which they are assigned.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_user_is_lwrpc_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role in ('league_manager', 'commissioner')
  )
$$;

create or replace function private.current_user_can_manage_match_lineup(lineup_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_user_is_lwrpc_admin() or exists (
    select 1
    from public.user_roles ur
    join public.teams t on t.id = lineup_team_id
    where ur.user_id = (select auth.uid())
      and ur.role in ('captain', 'club_pro', 'league_manager', 'commissioner')
      and ur.member_id in (t.captain_member_id, t.co_captain_member_id,
                           t.co_captain_2_member_id, t.club_pro_member_id)
  )
$$;

create or replace function private.current_user_role()
returns text language sql stable security definer set search_path = '' as $$
  select ur.role
  from public.user_roles ur join public.members m on m.id = ur.member_id
  where lower(m.email) = lower((select auth.jwt() ->> 'email'))
  limit 1
$$;

revoke all on function private.current_user_is_lwrpc_admin() from public;
revoke all on function private.current_user_can_manage_match_lineup(uuid) from public;
revoke all on function private.current_user_role() from public;
grant execute on function private.current_user_is_lwrpc_admin() to authenticated;
grant execute on function private.current_user_can_manage_match_lineup(uuid) to authenticated;
grant execute on function private.current_user_role() to authenticated;

alter policy "League managers can manage division lines" on public.division_lines
  using ((select private.current_user_is_lwrpc_admin()))
  with check ((select private.current_user_is_lwrpc_admin()));
alter policy "match_lineups_insert_captains_and_managers" on public.match_lineups
  with check (private.current_user_can_manage_match_lineup(team_id));
alter policy "match_lineups_update_captains_and_managers" on public.match_lineups
  using (private.current_user_can_manage_match_lineup(team_id))
  with check (private.current_user_can_manage_match_lineup(team_id));
alter policy "match_lineups_delete_captains_and_managers" on public.match_lineups
  using (private.current_user_can_manage_match_lineup(team_id));
alter policy "League managers can manage members" on public.members
  using ((select private.current_user_role()) = any (array['league_manager', 'commissioner']))
  with check ((select private.current_user_role()) = any (array['league_manager', 'commissioner']));

revoke execute on function public.bulk_import_members(jsonb) from public, anon, authenticated;
revoke execute on function public.current_user_is_lwrpc_admin() from public, anon, authenticated;
revoke execute on function public.current_user_can_manage_match_lineup(uuid) from public, anon, authenticated;
revoke execute on function public.current_user_role() from public, anon, authenticated;

-- Administration-only configuration and import data.  Read policies remain
-- available wherever the prior policy allowed signed-in reads.
alter policy "Authenticated users can insert divisions" on public.divisions to authenticated with check ((select private.current_user_is_lwrpc_admin()));
alter policy "Authenticated users can update divisions" on public.divisions to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
alter policy "Authenticated users can delete divisions" on public.divisions to authenticated using ((select private.current_user_is_lwrpc_admin()));
alter policy "Authenticated users can insert leagues" on public.leagues to authenticated with check ((select private.current_user_is_lwrpc_admin()));
alter policy "Authenticated users can update leagues" on public.leagues to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
alter policy "Authenticated users can delete leagues" on public.leagues to authenticated using ((select private.current_user_is_lwrpc_admin()));
alter policy "Authenticated users can insert locations" on public.locations to authenticated with check ((select private.current_user_is_lwrpc_admin()));
alter policy "Authenticated users can update locations" on public.locations to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
alter policy "Authenticated users can delete locations" on public.locations to authenticated using ((select private.current_user_is_lwrpc_admin()));
alter policy "League managers can insert league blackout dates" on public.league_blackout_dates to authenticated with check ((select private.current_user_is_lwrpc_admin()));
alter policy "League managers can update league blackout dates" on public.league_blackout_dates to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
alter policy "League managers can delete league blackout dates" on public.league_blackout_dates to authenticated using ((select private.current_user_is_lwrpc_admin()));

alter policy "Authenticated users full access league schedule settings" on public.league_schedule_settings to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
create policy "Authenticated users can read league schedule settings" on public.league_schedule_settings for select to authenticated using (true);
alter policy "Authenticated users full access location court availability" on public.location_court_availability to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
create policy "Authenticated users can read location court availability" on public.location_court_availability for select to authenticated using (true);
alter policy "Authenticated users full access member import batches" on public.member_import_batches to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
alter policy "Authenticated users full access member import rows" on public.member_import_rows to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
alter policy "Authenticated users full access member season ratings" on public.member_season_ratings to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
create policy "Authenticated users can read member season ratings" on public.member_season_ratings for select to authenticated using (true);
alter policy "Authenticated users full access team standings" on public.team_standings to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
create policy "Authenticated users can read team standings" on public.team_standings for select to authenticated using (true);

commit;

-- Batch 3: scoped Captain/club-pro roster and scoring access.
begin;

create or replace function private.current_user_can_manage_team(target_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_user_is_lwrpc_admin() or exists (
    select 1 from public.user_roles ur join public.teams t on t.id = target_team_id
    where ur.user_id = (select auth.uid())
      and ur.role in ('captain', 'club_pro', 'league_manager', 'commissioner')
      and ur.member_id in (t.captain_member_id, t.co_captain_member_id,
                           t.co_captain_2_member_id, t.club_pro_member_id)
  )
$$;
create or replace function private.current_user_can_manage_match(target_match_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.matches m where m.id = target_match_id
      and (private.current_user_can_manage_team(m.home_team_id)
           or private.current_user_can_manage_team(m.away_team_id))
  )
$$;
create or replace function private.current_user_can_manage_match_line(target_match_line_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.match_lines ml where ml.id = target_match_line_id
      and private.current_user_can_manage_match(ml.match_id)
  )
$$;
create or replace function private.current_user_can_update_member(target_member_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_user_is_lwrpc_admin() or exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.member_id = target_member_id
  )
$$;
revoke all on function private.current_user_can_manage_team(uuid) from public;
revoke all on function private.current_user_can_manage_match(uuid) from public;
revoke all on function private.current_user_can_manage_match_line(uuid) from public;
revoke all on function private.current_user_can_update_member(uuid) from public;
grant execute on function private.current_user_can_manage_team(uuid) to authenticated;
grant execute on function private.current_user_can_manage_match(uuid) to authenticated;
grant execute on function private.current_user_can_manage_match_line(uuid) to authenticated;
grant execute on function private.current_user_can_update_member(uuid) to authenticated;

drop policy "Authenticated users full access matches" on public.matches;
create policy "Authenticated users can read matches" on public.matches for select to authenticated using (true);
create policy "League managers can insert matches" on public.matches for insert to authenticated with check ((select private.current_user_is_lwrpc_admin()));
create policy "Captains and managers can update own-team matches" on public.matches for update to authenticated using (private.current_user_can_manage_match(id)) with check (private.current_user_can_manage_match(id));
create policy "League managers can delete matches" on public.matches for delete to authenticated using ((select private.current_user_is_lwrpc_admin()));

drop policy "Authenticated users full access match_lines" on public.match_lines;
create policy "Authenticated users can read match lines" on public.match_lines for select to authenticated using (true);
create policy "League managers can insert match lines" on public.match_lines for insert to authenticated with check ((select private.current_user_is_lwrpc_admin()));
create policy "Captains and managers can update own-team match lines" on public.match_lines for update to authenticated using (private.current_user_can_manage_match(match_id)) with check (private.current_user_can_manage_match(match_id));
create policy "League managers can delete match lines" on public.match_lines for delete to authenticated using ((select private.current_user_is_lwrpc_admin()));

drop policy "Authenticated users full access line_games" on public.line_games;
create policy "Authenticated users can read line games" on public.line_games for select to authenticated using (true);
create policy "Captains and managers can insert own-team line games" on public.line_games for insert to authenticated with check (private.current_user_can_manage_match_line(match_line_id));
create policy "Captains and managers can update own-team line games" on public.line_games for update to authenticated using (private.current_user_can_manage_match_line(match_line_id)) with check (private.current_user_can_manage_match_line(match_line_id));
create policy "League managers can delete line games" on public.line_games for delete to authenticated using ((select private.current_user_is_lwrpc_admin()));

alter policy "Allow authenticated users to insert team byes" on public.team_byes with check (private.current_user_can_manage_team(team_id));
alter policy "Allow authenticated users to update team byes" on public.team_byes using (private.current_user_can_manage_team(team_id)) with check (private.current_user_can_manage_team(team_id));
alter policy "Allow authenticated users to delete team byes" on public.team_byes using (private.current_user_can_manage_team(team_id));
alter policy "Authenticated users can insert team members" on public.team_members with check (private.current_user_can_manage_team(team_id));
alter policy "Authenticated users can update team members" on public.team_members using (private.current_user_can_manage_team(team_id)) with check (private.current_user_can_manage_team(team_id));
alter policy "Authenticated users can delete team members" on public.team_members using (private.current_user_can_manage_team(team_id));
alter policy "Authenticated users can insert teams" on public.teams with check ((select private.current_user_is_lwrpc_admin()));
alter policy "Authenticated users can update teams" on public.teams using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
alter policy "Authenticated users can update members" on public.members using (private.current_user_can_update_member(id)) with check (private.current_user_can_update_member(id));

commit;
