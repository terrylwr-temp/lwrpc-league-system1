-- Performance Advisor RLS optimizations applied to production on 2026-07-16.
-- Caches auth values per statement and removes overlapping permissive policies.

begin;

alter policy "League managers can insert score sheet templates" on public.score_sheet_templates with check (exists (select 1 from public.members m join public.user_roles ur on ur.member_id = m.id where lower(m.email) = lower((select auth.jwt()) ->> 'email') and ur.role = any (array['league_manager', 'commissioner'])));
alter policy "League managers can update score sheet templates" on public.score_sheet_templates using (exists (select 1 from public.members m join public.user_roles ur on ur.member_id = m.id where lower(m.email) = lower((select auth.jwt()) ->> 'email') and ur.role = any (array['league_manager', 'commissioner']))) with check (exists (select 1 from public.members m join public.user_roles ur on ur.member_id = m.id where lower(m.email) = lower((select auth.jwt()) ->> 'email') and ur.role = any (array['league_manager', 'commissioner'])));
alter policy "League managers can delete score sheet templates" on public.score_sheet_templates using (exists (select 1 from public.members m join public.user_roles ur on ur.member_id = m.id where lower(m.email) = lower((select auth.jwt()) ->> 'email') and ur.role = any (array['league_manager', 'commissioner'])));
alter policy "League managers can insert system settings" on public.system_settings with check (exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = any (array['league_manager', 'commissioner'])));
alter policy "League managers can update system settings" on public.system_settings using (exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = any (array['league_manager', 'commissioner']))) with check (exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = any (array['league_manager', 'commissioner'])));

alter policy "League managers can read tournament team contacts" on public.tournament_team_contacts to authenticated using ((select private.current_user_is_lwrpc_admin()));
alter policy "League managers can read tournament logs" on public.tournament_activity_log to authenticated using ((select private.current_user_is_lwrpc_admin()));
alter policy "League managers can read round robin players" on public.round_robin_players to authenticated using ((select private.current_user_is_lwrpc_admin()));
alter policy "League managers can read round robin session players" on public.round_robin_session_players to authenticated using ((select private.current_user_is_lwrpc_admin()));
alter policy "League managers can read round robin logs" on public.round_robin_activity_log to authenticated using ((select private.current_user_is_lwrpc_admin()));
alter policy "League managers can read round robin player groups" on public.round_robin_player_groups to authenticated using ((select private.current_user_is_lwrpc_admin()));
alter policy "League managers can read round robin player group members" on public.round_robin_player_group_members to authenticated using ((select private.current_user_is_lwrpc_admin()));

drop policy "League managers can read round robin groups" on public.round_robin_groups;
drop policy "Public round robin groups are readable" on public.round_robin_groups;
create policy "Public round robin groups are readable" on public.round_robin_groups for select to public using (public_status = 'public' or exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = any (array['league_manager', 'commissioner'])));

-- The following manager ALL policies had a redundant SELECT component.
drop policy "League managers can manage division lines" on public.division_lines;
create policy "League managers can insert division lines" on public.division_lines for insert to authenticated with check ((select private.current_user_is_lwrpc_admin()));
create policy "League managers can update division lines" on public.division_lines for update to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
create policy "League managers can delete division lines" on public.division_lines for delete to authenticated using ((select private.current_user_is_lwrpc_admin()));

drop policy "Authenticated users full access league schedule settings" on public.league_schedule_settings;
create policy "League managers can insert league schedule settings" on public.league_schedule_settings for insert to authenticated with check ((select private.current_user_is_lwrpc_admin()));
create policy "League managers can update league schedule settings" on public.league_schedule_settings for update to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
create policy "League managers can delete league schedule settings" on public.league_schedule_settings for delete to authenticated using ((select private.current_user_is_lwrpc_admin()));
drop policy "Authenticated users full access location court availability" on public.location_court_availability;
create policy "League managers can insert location court availability" on public.location_court_availability for insert to authenticated with check ((select private.current_user_is_lwrpc_admin()));
create policy "League managers can update location court availability" on public.location_court_availability for update to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
create policy "League managers can delete location court availability" on public.location_court_availability for delete to authenticated using ((select private.current_user_is_lwrpc_admin()));
drop policy "Authenticated users full access member season ratings" on public.member_season_ratings;
create policy "League managers can insert member season ratings" on public.member_season_ratings for insert to authenticated with check ((select private.current_user_is_lwrpc_admin()));
create policy "League managers can update member season ratings" on public.member_season_ratings for update to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
create policy "League managers can delete member season ratings" on public.member_season_ratings for delete to authenticated using ((select private.current_user_is_lwrpc_admin()));
drop policy "Authenticated users full access team standings" on public.team_standings;
create policy "League managers can insert team standings" on public.team_standings for insert to authenticated with check ((select private.current_user_is_lwrpc_admin()));
create policy "League managers can update team standings" on public.team_standings for update to authenticated using ((select private.current_user_is_lwrpc_admin())) with check ((select private.current_user_is_lwrpc_admin()));
create policy "League managers can delete team standings" on public.team_standings for delete to authenticated using ((select private.current_user_is_lwrpc_admin()));

drop policy "Authenticated users can update members" on public.members;
drop policy "League managers can manage members" on public.members;
create policy "Users and managers can update members" on public.members for update to authenticated using (private.current_user_can_update_member(id) or ((select private.current_user_role()) = any (array['league_manager', 'commissioner']))) with check (private.current_user_can_update_member(id) or ((select private.current_user_role()) = any (array['league_manager', 'commissioner'])));
create policy "League managers can insert members" on public.members for insert to authenticated with check (((select private.current_user_role()) = any (array['league_manager', 'commissioner'])));
create policy "League managers can delete members" on public.members for delete to authenticated using (((select private.current_user_role()) = any (array['league_manager', 'commissioner'])));

drop policy "Admins can manage seasons" on public.seasons;
create policy "Admins can insert seasons" on public.seasons for insert to authenticated with check ((select private.current_user_is_admin()));
create policy "Admins can update seasons" on public.seasons for update to authenticated using ((select private.current_user_is_admin())) with check ((select private.current_user_is_admin()));
create policy "Admins can delete seasons" on public.seasons for delete to authenticated using ((select private.current_user_is_admin()));

drop policy "Authenticated users can read their own role" on public.user_roles;
drop policy "Users can read own role" on public.user_roles;
drop policy "Commissioners can manage roles" on public.user_roles;
create policy "Commissioners can insert roles" on public.user_roles for insert to authenticated with check ((select private.current_user_is_commissioner()));
create policy "Commissioners can update roles" on public.user_roles for update to authenticated using ((select private.current_user_is_commissioner())) with check ((select private.current_user_is_commissioner()));
create policy "Commissioners can delete roles" on public.user_roles for delete to authenticated using ((select private.current_user_is_commissioner()));

commit;
