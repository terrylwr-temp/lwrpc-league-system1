-- Applied to production 2026-07-19.
-- Growth-safe indexes, server-side member paging, and atomic scoped resets.

begin;

create index if not exists leagues_season_id_idx on public.leagues (season_id);
create index if not exists divisions_league_id_idx on public.divisions (league_id);
create index if not exists teams_division_id_idx on public.teams (division_id);
create index if not exists team_members_member_id_team_id_idx on public.team_members (member_id, team_id);
create index if not exists user_roles_member_id_idx on public.user_roles (member_id);
create index if not exists matches_league_division_date_time_idx on public.matches (league_id, division_id, scheduled_date, scheduled_time);
create index if not exists matches_home_team_date_idx on public.matches (home_team_id, scheduled_date);
create index if not exists matches_away_team_date_idx on public.matches (away_team_id, scheduled_date);
create index if not exists team_byes_team_date_idx on public.team_byes (team_id, bye_date);
create index if not exists team_standings_division_team_idx on public.team_standings (division_id, team_id);
create index if not exists league_schedule_settings_league_division_idx on public.league_schedule_settings (league_id, division_id);
create index if not exists location_court_availability_specific_date_idx on public.location_court_availability (specific_date) where specific_date is not null;
create index if not exists league_blackout_dates_league_date_idx on public.league_blackout_dates (league_id, blackout_date);
create index if not exists member_import_rows_batch_id_idx on public.member_import_rows (batch_id);
create index if not exists division_lines_division_id_idx on public.division_lines (division_id);
create index if not exists league_blackout_dates_division_date_idx on public.league_blackout_dates (division_id, blackout_date);
create index if not exists league_schedule_settings_division_id_idx on public.league_schedule_settings (division_id);
create index if not exists location_court_availability_location_date_idx on public.location_court_availability (location_id, specific_date);
create index if not exists matches_division_date_time_idx on public.matches (division_id, scheduled_date, scheduled_time);
create index if not exists matches_location_date_time_idx on public.matches (location_id, scheduled_date, scheduled_time);
create index if not exists team_byes_division_date_idx on public.team_byes (division_id, bye_date);
create index if not exists team_byes_league_date_idx on public.team_byes (league_id, bye_date);
create index if not exists team_standings_team_id_idx on public.team_standings (team_id);
create index if not exists teams_captain_member_id_idx on public.teams (captain_member_id);
create index if not exists teams_co_captain_member_id_idx on public.teams (co_captain_member_id);
create index if not exists teams_co_captain_2_member_id_idx on public.teams (co_captain_2_member_id);
create index if not exists teams_home_location_id_idx on public.teams (home_location_id);
create index if not exists match_lines_home_player_1_id_idx on public.match_lines (home_player_1_id);
create index if not exists match_lines_home_player_2_id_idx on public.match_lines (home_player_2_id);
create index if not exists match_lines_away_player_1_id_idx on public.match_lines (away_player_1_id);
create index if not exists match_lines_away_player_2_id_idx on public.match_lines (away_player_2_id);
create index if not exists match_lineups_team_id_idx on public.match_lineups (team_id);
create index if not exists match_lineups_player_1_member_id_idx on public.match_lineups (player_1_member_id);
create index if not exists match_lineups_player_2_member_id_idx on public.match_lineups (player_2_member_id);

CREATE OR REPLACE FUNCTION public.admin_member_directory_page(p_search text DEFAULT ''::text, p_include_inactive boolean DEFAULT false, p_current_roster_only boolean DEFAULT false, p_sort_key text DEFAULT 'member'::text, p_sort_direction text DEFAULT 'asc'::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  with member_base as (
    select m.id, m.first_name, m.last_name, m.email, m.phone, m.club_location,
           m.dupr_id, m.is_active_member, m.created_at,
           coalesce(role_row.role, 'player') as role,
           coalesce(role_row.role_rank, 1) as role_rank
    from public.members m
    left join lateral (
      select ur.role,
             case ur.role when 'commissioner' then 5 when 'league_manager' then 4
               when 'club_pro' then 3 when 'captain' then 2 else 1 end as role_rank
      from public.user_roles ur
      where ur.member_id = m.id
      order by role_rank desc, ur.id
      limit 1
    ) role_row on true
    where (p_include_inactive or m.is_active_member is not false)
      and (not p_current_roster_only
        or exists (
          select 1 from public.team_members tm
          join public.teams roster_team on roster_team.id = tm.team_id
          where tm.member_id = m.id
            and tm.is_active is not false
            and roster_team.is_active is not false
        )
        or exists (
          select 1 from public.teams assigned_team
          where assigned_team.is_active is not false
            and (
              assigned_team.captain_member_id = m.id
              or assigned_team.co_captain_member_id = m.id
              or assigned_team.co_captain_2_member_id = m.id
              or assigned_team.club_pro_member_id = m.id
            )
        )
      )
  ),
  filtered as (
    select * from member_base mb
    where nullif(btrim(p_search), '') is null
       or concat_ws(' ', mb.first_name, mb.last_name, mb.last_name, mb.first_name,
                    mb.email, mb.phone, mb.club_location, mb.dupr_id, replace(mb.role, '_', ' '))
          ilike '%' || btrim(p_search) || '%'
  ),
  ordered as (
    select * from filtered f
    order by
      case when p_sort_direction <> 'desc' and p_sort_key = 'location' then lower(coalesce(f.club_location, '')) end asc,
      case when p_sort_direction = 'desc' and p_sort_key = 'location' then lower(coalesce(f.club_location, '')) end desc,
      case when p_sort_direction <> 'desc' and p_sort_key = 'phone' then coalesce(f.phone, '') end asc,
      case when p_sort_direction = 'desc' and p_sort_key = 'phone' then coalesce(f.phone, '') end desc,
      case when p_sort_direction <> 'desc' and p_sort_key = 'dupr_id' then coalesce(f.dupr_id, '') end asc,
      case when p_sort_direction = 'desc' and p_sort_key = 'dupr_id' then coalesce(f.dupr_id, '') end desc,
      case when p_sort_direction <> 'desc' and p_sort_key = 'status' then f.is_active_member end desc,
      case when p_sort_direction = 'desc' and p_sort_key = 'status' then f.is_active_member end asc,
      case when p_sort_direction <> 'desc' and p_sort_key = 'role' then f.role_rank end asc,
      case when p_sort_direction = 'desc' and p_sort_key = 'role' then f.role_rank end desc,
      case when p_sort_direction <> 'desc' and p_sort_key = 'member' then lower(coalesce(f.last_name, '')) end asc,
      case when p_sort_direction = 'desc' and p_sort_key = 'member' then lower(coalesce(f.last_name, '')) end desc,
      lower(coalesce(f.last_name, '')) asc, lower(coalesce(f.first_name, '')) asc, f.id asc
    offset greatest(coalesce(p_offset, 0), 0)
    limit least(greatest(coalesce(p_limit, 100), 1), 100)
  ),
  page_rows as (
    select jsonb_build_object(
      'id', o.id, 'first_name', o.first_name, 'last_name', o.last_name,
      'email', o.email, 'phone', o.phone, 'club_location', o.club_location,
      'dupr_id', o.dupr_id, 'is_active_member', o.is_active_member,
      'created_at', o.created_at,
      'user_roles', jsonb_build_array(jsonb_build_object('role', o.role)),
      'teams', coalesce(team_data.active_teams, '[]'::jsonb),
      'all_teams', coalesce(team_data.all_teams, '[]'::jsonb)
    ) as row_data
    from ordered o
    left join lateral (
      select
        coalesce(jsonb_agg(team_row.team_json order by team_row.team_name)
          filter (where team_row.is_active is not false), '[]'::jsonb) as active_teams,
        coalesce(jsonb_agg(team_row.team_json order by team_row.team_name), '[]'::jsonb) as all_teams
      from (
        select distinct on (t.id) t.id, t.name as team_name, t.is_active,
          jsonb_build_object(
            'id', t.id, 'name', t.name, 'is_active', t.is_active,
            'captain_member_id', t.captain_member_id,
            'co_captain_member_id', t.co_captain_member_id,
            'co_captain_2_member_id', t.co_captain_2_member_id,
            'club_pro_member_id', t.club_pro_member_id,
            'divisions', case when d.id is null then null else jsonb_build_object(
              'id', d.id, 'name', d.name,
              'leagues', case when l.id is null then null else jsonb_build_object(
                'id', l.id, 'name', l.name, 'season_id', l.season_id,
                'seasons', case when s.id is null then null else jsonb_build_object('id', s.id, 'name', s.name) end
              ) end
            ) end
          ) as team_json
        from public.teams t
        left join public.team_members tm on tm.team_id = t.id and tm.member_id = o.id
        left join public.divisions d on d.id = t.division_id
        left join public.leagues l on l.id = d.league_id
        left join public.seasons s on s.id = l.season_id
        where tm.member_id is not null or t.captain_member_id = o.id
           or t.co_captain_member_id = o.id or t.co_captain_2_member_id = o.id
           or t.club_pro_member_id = o.id
        order by t.id
      ) team_row
    ) team_data on true
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(row_data) from page_rows), '[]'::jsonb),
    'filtered_count', (select count(*) from filtered),
    'total_count', (select count(*) from public.members)
  );
$function$

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

  delete from public.matches;
  get diagnostics matches_deleted = row_count;

  delete from public.team_byes;
  get diagnostics team_byes_deleted = row_count;
  delete from public.team_standings;
  get diagnostics team_standings_deleted = row_count;
  delete from public.team_members;
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
$function$

CREATE OR REPLACE FUNCTION public.admin_reset_season(p_season_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  season_row public.seasons%rowtype;
  leagues_updated integer := 0;
  divisions_updated integer := 0;
  teams_updated integer := 0;
  standings_updated integer := 0;
  ratings_updated integer := 0;
  settings_updated integer := 0;
  court_rows_deleted integer := 0;
  blackout_rows_deleted integer := 0;
begin
  select * into season_row from public.seasons where id = p_season_id for update;
  if not found then raise exception 'Season not found.'; end if;

  update public.teams t set is_active = false, updated_at = now()
  where exists (
    select 1 from public.divisions d join public.leagues l on l.id = d.league_id
    where d.id = t.division_id and l.season_id = p_season_id
  );
  get diagnostics teams_updated = row_count;

  update public.divisions d set is_active = false, updated_at = now()
  where exists (select 1 from public.leagues l where l.id = d.league_id and l.season_id = p_season_id);
  get diagnostics divisions_updated = row_count;

  update public.leagues set is_active = false, updated_at = now() where season_id = p_season_id;
  get diagnostics leagues_updated = row_count;

  update public.team_standings ts
  set rank = null, matches_played = 0, match_wins = 0, match_losses = 0, match_ties = 0,
      line_wins = 0, line_losses = 0, line_ties = 0, game_wins = 0, game_losses = 0,
      points_for = 0, points_against = 0, point_differential = 0, standings_points = 0,
      home_wins = 0, home_losses = 0, away_wins = 0, away_losses = 0,
      recent_form = '', current_streak = '-', updated_at = now()
  where exists (
    select 1 from public.leagues l where l.id = ts.league_id and l.season_id = p_season_id
  ) or exists (
    select 1 from public.divisions d join public.leagues l on l.id = d.league_id
    where d.id = ts.division_id and l.season_id = p_season_id
  );
  get diagnostics standings_updated = row_count;

  update public.member_season_ratings
  set dupr_doubles_rating = null, season_dupr_rating = null,
      season_primetime_rating = null, updated_at = now()
  where season_id = p_season_id;
  get diagnostics ratings_updated = row_count;

  update public.league_schedule_settings lss
  set league_id = null, division_id = null, season_start_date = null,
      season_end_date = null, actual_schedule_weeks = null,
      schedule_status = 'draft', updated_at = now()
  where exists (
    select 1 from public.leagues l where l.id = lss.league_id and l.season_id = p_season_id
  ) or exists (
    select 1 from public.divisions d join public.leagues l on l.id = d.league_id
    where d.id = lss.division_id and l.season_id = p_season_id
  );
  get diagnostics settings_updated = row_count;

  if season_row.start_date is not null or season_row.end_date is not null then
    delete from public.location_court_availability lca
    where lca.specific_date is not null
      and (season_row.start_date is null or lca.specific_date >= season_row.start_date)
      and (season_row.end_date is null or lca.specific_date <= season_row.end_date);
    get diagnostics court_rows_deleted = row_count;

    delete from public.league_blackout_dates lbd
    where (season_row.start_date is null or lbd.blackout_date >= season_row.start_date)
      and (season_row.end_date is null or lbd.blackout_date <= season_row.end_date)
      and (
        exists (select 1 from public.leagues l where l.id = lbd.league_id and l.season_id = p_season_id)
        or exists (
          select 1 from public.divisions d join public.leagues l on l.id = d.league_id
          where d.id = lbd.division_id and l.season_id = p_season_id
        )
      );
    get diagnostics blackout_rows_deleted = row_count;
  end if;

  return jsonb_build_object(
    'season', jsonb_build_object('id', season_row.id, 'name', season_row.name,
      'start_date', season_row.start_date, 'end_date', season_row.end_date),
    'leagues', leagues_updated, 'divisions', divisions_updated, 'teams', teams_updated,
    'standings', standings_updated, 'ratings', ratings_updated,
    'scheduleSettings', settings_updated, 'courtAvailabilityDeleted', court_rows_deleted,
    'leagueBlackoutsDeleted', blackout_rows_deleted
  );
end;
$function$

revoke all on function public.admin_member_directory_page(text, boolean, boolean, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_member_directory_page(text, boolean, boolean, text, text, integer, integer) to service_role;
revoke all on function public.admin_master_reset_all() from public, anon, authenticated;
grant execute on function public.admin_master_reset_all() to service_role;
revoke all on function public.admin_reset_season(uuid) from public, anon, authenticated;
grant execute on function public.admin_reset_season(uuid) to service_role;

commit;
-- Cover every remaining foreign-key path reported by the Supabase performance advisor.
create index if not exists app_notification_subscriptions_round_robin_group_id_idx on public.app_notification_subscriptions (round_robin_group_id);
create index if not exists app_notification_subscriptions_round_robin_player_id_idx on public.app_notification_subscriptions (round_robin_player_id);
create index if not exists match_lines_division_line_id_idx on public.match_lines (division_line_id);
create index if not exists match_lines_verified_by_member_id_idx on public.match_lines (verified_by_member_id);
create index if not exists match_lines_winning_team_id_idx on public.match_lines (winning_team_id);
create index if not exists matches_schedule_setting_id_idx on public.matches (schedule_setting_id);
create index if not exists matches_score_entered_by_member_id_idx on public.matches (score_entered_by_member_id);
create index if not exists matches_score_verified_by_member_id_idx on public.matches (score_verified_by_member_id);
create index if not exists matches_winning_team_id_idx on public.matches (winning_team_id);
create index if not exists member_import_batches_imported_by_member_id_idx on public.member_import_batches (imported_by_member_id);
create index if not exists notification_template_history_saved_by_member_id_idx on public.notification_template_history (saved_by_member_id);
create index if not exists tournament_courts_current_match_id_idx on public.tournament_courts (current_match_id);
create index if not exists tournament_matches_away_team_id_idx on public.tournament_matches (away_team_id);
create index if not exists tournament_matches_court_id_idx on public.tournament_matches (court_id);
create index if not exists tournament_matches_division_id_idx on public.tournament_matches (division_id);
create index if not exists tournament_matches_home_team_id_idx on public.tournament_matches (home_team_id);
create index if not exists tournament_matches_winner_team_id_idx on public.tournament_matches (winner_team_id);
create index if not exists tournament_team_contacts_member_id_idx on public.tournament_team_contacts (member_id);
