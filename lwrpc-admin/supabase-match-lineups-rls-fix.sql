-- RLS fix for Captain Dashboard Match Setup lineups.
-- Run this whole file in the Supabase SQL Editor.

alter table public.match_lineups enable row level security;

create or replace function public.current_user_is_lwrpc_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('league_manager', 'commissioner')
  )
$function$;

create or replace function public.current_user_can_manage_match_lineup(lineup_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select public.current_user_is_lwrpc_admin()
    or exists (
      select 1
      from public.user_roles ur
      join public.teams t on t.id = lineup_team_id
      where ur.user_id = auth.uid()
        and ur.role in ('captain', 'club_pro', 'league_manager', 'commissioner')
        and ur.member_id in (
          t.captain_member_id,
          t.co_captain_member_id,
          t.co_captain_2_member_id,
          t.club_pro_member_id
        )
    )
$function$;

grant execute on function public.current_user_is_lwrpc_admin() to authenticated;
grant execute on function public.current_user_can_manage_match_lineup(uuid) to authenticated;

drop policy if exists "match_lineups_select_authenticated" on public.match_lineups;
create policy "match_lineups_select_authenticated"
  on public.match_lineups
  for select
  to authenticated
  using (true);

drop policy if exists "match_lineups_insert_captains_and_managers" on public.match_lineups;
create policy "match_lineups_insert_captains_and_managers"
  on public.match_lineups
  for insert
  to authenticated
  with check (public.current_user_can_manage_match_lineup(team_id));

drop policy if exists "match_lineups_update_captains_and_managers" on public.match_lineups;
create policy "match_lineups_update_captains_and_managers"
  on public.match_lineups
  for update
  to authenticated
  using (public.current_user_can_manage_match_lineup(team_id))
  with check (public.current_user_can_manage_match_lineup(team_id));

drop policy if exists "match_lineups_delete_captains_and_managers" on public.match_lineups;
create policy "match_lineups_delete_captains_and_managers"
  on public.match_lineups
  for delete
  to authenticated
  using (public.current_user_can_manage_match_lineup(team_id));
