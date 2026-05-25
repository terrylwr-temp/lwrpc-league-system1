-- Team-level Club Pro support.
-- Run this in the Supabase SQL Editor before deploying the related app update.

alter table public.teams
  add column if not exists club_pro_member_id uuid;

alter table public.teams
  drop constraint if exists teams_club_pro_member_id_fkey;

alter table public.teams
  add constraint teams_club_pro_member_id_fkey
  foreign key (club_pro_member_id)
  references public.members(id)
  on delete set null;

create index if not exists teams_club_pro_member_id_idx
  on public.teams(club_pro_member_id);

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

grant execute on function public.current_user_can_manage_match_lineup(uuid) to authenticated;
grant execute on function public.current_user_is_lwrpc_admin() to authenticated;
