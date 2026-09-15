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
$function$;
