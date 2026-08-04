-- Run once in the Supabase SQL Editor to repair Master Reset All.
-- The explicit WHERE predicates satisfy the database safe-update guard.

CREATE OR REPLACE FUNCTION public.admin_master_reset_all()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
declare
  matches_deleted integer := 0;
  match_lines_deleted integer := 0;
  line_games_deleted integer := 0;
  match_lineups_deleted integer := 0;
  team_byes_deleted integer := 0;
  team_standings_deleted integer := 0;
  team_members_deleted integer := 0;
  teams_updated integer := 0;
  roles_updated integer := 0;
begin
  select count(*) into line_games_deleted from public.line_games;
  select count(*) into match_lines_deleted from public.match_lines;
  select count(*) into match_lineups_deleted from public.match_lineups;

  delete from public.matches where true;
  get diagnostics matches_deleted = row_count;

  delete from public.team_byes where true;
  get diagnostics team_byes_deleted = row_count;
  delete from public.team_standings where true;
  get diagnostics team_standings_deleted = row_count;
  delete from public.team_members where true;
  get diagnostics team_members_deleted = row_count;

  update public.teams
  set captain_member_id = null, co_captain_member_id = null,
      co_captain_2_member_id = null, updated_at = now()
  where captain_member_id is not null or co_captain_member_id is not null
     or co_captain_2_member_id is not null;
  get diagnostics teams_updated = row_count;

  update public.user_roles set role = 'player', updated_at = now()
  where role = 'captain';
  get diagnostics roles_updated = row_count;

  return jsonb_build_object(
    'matches', matches_deleted, 'match_lines', match_lines_deleted,
    'line_games', line_games_deleted, 'match_lineups', match_lineups_deleted,
    'team_byes', team_byes_deleted, 'team_standings', team_standings_deleted,
    'team_members', team_members_deleted, 'teams_updated', teams_updated,
    'captain_roles_updated', roles_updated
  );
end;
$function$;

revoke all on function public.admin_master_reset_all() from public, anon, authenticated;
grant execute on function public.admin_master_reset_all() to service_role;
