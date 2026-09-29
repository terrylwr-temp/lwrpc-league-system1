-- Persistent, append-only Swap with Bye history; no existing business rows change.
create schema schedule_editor_private;
revoke all on schema schedule_editor_private from public, anon, authenticated, service_role;
grant usage on schema schedule_editor_private to service_role;
create table schedule_editor_private.bye_swap_audit (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action = 'SWAP_WITH_BYE'),
  actor_user_id uuid not null,
  match_id uuid not null, bye_id uuid not null,
  league_id uuid not null, division_id uuid not null,
  scheduled_date date not null, week_number integer,
  side text not null check (side in ('home', 'away')),
  removed_team_id uuid not null, incoming_team_id uuid not null, opponent_team_id uuid not null,
  changed_at timestamptz not null
);
revoke all on table schedule_editor_private.bye_swap_audit from public, anon, authenticated, service_role;
grant select, insert on table schedule_editor_private.bye_swap_audit to service_role;
alter table schedule_editor_private.bye_swap_audit enable row level security;
-- No client policies or sequences. UUID identities have no owned sequence.
-- IDs intentionally have no cascading foreign keys so history survives later deletions.
drop function public.schedule_editor_swap_with_bye(uuid,text,uuid,jsonb,jsonb);
create function public.schedule_editor_swap_with_bye(
  p_match_id uuid, p_side text, p_bye_id uuid,
  p_expected_match jsonb, p_expected_bye jsonb, p_actor_user_id uuid
) returns jsonb
language plpgsql security invoker
set search_path = ''
set lock_timeout = '3s'
as $function$
declare
  current_match public.matches%rowtype;
  expected_match public.matches%rowtype;
  current_bye public.team_byes%rowtype;
  expected_bye public.team_byes%rowtype;
  removed_id uuid;
  opponent_id uuid;
  changed_at timestamptz := clock_timestamp();
begin
  if p_actor_user_id is null then raise exception 'An authenticated acting user is required.'; end if;
  if p_side is null or p_side not in ('home', 'away') then
    raise exception 'Invalid team position.';
  end if;
  -- These locks also cover existing editor/generator writes, which do not use
  -- advisory locks. They are transaction-local, bounded, and do not block reads.
  lock table public.matches, public.team_byes in share row exclusive mode;
  lock table public.teams, public.divisions, public.match_lines,
    public.line_games, public.match_lineups in share mode;

  select * into current_match from public.matches where id = p_match_id;
  select * into current_bye from public.team_byes where id = p_bye_id;
  if current_match.id is null or current_bye.id is null then
    raise exception 'The match or bye no longer exists. Refresh the schedule.';
  end if;
  -- Require full snapshots; timestamps are compared as typed PostgreSQL values.
  if jsonb_typeof(p_expected_match) is distinct from 'object' or
     jsonb_typeof(p_expected_bye) is distinct from 'object' or
     (select array_agg(k order by k) from jsonb_object_keys(p_expected_match) k) is distinct from
     (select array_agg(k order by k) from jsonb_object_keys(to_jsonb(current_match)) k) or
     (select array_agg(k order by k) from jsonb_object_keys(p_expected_bye) k) is distinct from
     (select array_agg(k order by k) from jsonb_object_keys(to_jsonb(current_bye)) k) then
    raise exception 'The schedule snapshot is incomplete. Refresh the schedule.';
  end if;
  select * into expected_match from jsonb_populate_record(null::public.matches, p_expected_match);
  select * into expected_bye from jsonb_populate_record(null::public.team_byes, p_expected_bye);
  if current_match is distinct from expected_match or current_bye is distinct from expected_bye then
    raise exception 'The match or bye changed since it was loaded. Refresh the schedule.';
  end if;
  if current_match.status is null or current_match.status not in ('draft','scheduled') or
     current_match.scheduled_date is null or current_match.home_team_id is null or
     current_match.away_team_id is null or current_match.home_team_id = current_match.away_team_id or
     current_match.home_score is not null or current_match.away_score is not null or
     current_match.score_entered_at is not null or current_match.score_verified_at is not null or
     current_match.finalized_at is not null or current_match.winning_team_id is not null then
    raise exception 'Only unplayed draft or scheduled matches can be swapped with a bye.';
  end if;
  removed_id := case when p_side = 'home' then current_match.home_team_id else current_match.away_team_id end;
  opponent_id := case when p_side = 'home' then current_match.away_team_id else current_match.home_team_id end;
  if current_bye.league_id is distinct from current_match.league_id or
     current_bye.division_id is distinct from current_match.division_id or
     current_bye.bye_date is distinct from current_match.scheduled_date or
     current_bye.week_number is distinct from current_match.week_number or
     (current_bye.schedule_setting_id is not null and current_bye.schedule_setting_id is distinct from current_match.schedule_setting_id) or
     current_bye.team_id is null or current_bye.team_id in (removed_id, opponent_id) then
    raise exception 'Select a recorded bye from this division and date/week.';
  end if;
  if not exists(select 1 from public.divisions d where d.id=current_match.division_id and d.league_id=current_match.league_id and d.is_active is not false) or
     (select count(*) from public.teams t where t.id in (removed_id,opponent_id,current_bye.team_id) and t.division_id=current_match.division_id and t.is_active is not false) <> 3 then
    raise exception 'All teams must be active and belong to this division.';
  end if;
  if exists(select 1 from public.matches m where m.id <> current_match.id and m.status is distinct from 'cancelled' and
    (m.scheduled_date=current_match.scheduled_date or
     (current_match.week_number is not null and m.league_id=current_match.league_id and m.division_id=current_match.division_id and m.week_number=current_match.week_number)) and
    (m.home_team_id in (removed_id,opponent_id,current_bye.team_id) or m.away_team_id in (removed_id,opponent_id,current_bye.team_id))) then
    raise exception 'A team already has another match on this date or week. Refresh the schedule.';
  end if;
  if exists(select 1 from public.team_byes b where b.id <> current_bye.id and b.league_id=current_match.league_id and b.division_id=current_match.division_id and
    b.bye_date=current_match.scheduled_date and b.week_number is not distinct from current_match.week_number and
    b.team_id in (removed_id,opponent_id,current_bye.team_id)) then
    raise exception 'Conflicting bye records exist. Refresh the schedule.';
  end if;
  if exists(select 1 from public.match_lineups where match_id=current_match.id) or
     exists(select 1 from public.match_lines l where l.match_id=current_match.id and
       (l.home_player_1_id is not null or l.home_player_2_id is not null or l.away_player_1_id is not null or l.away_player_2_id is not null or l.winning_team_id is not null)) or
     exists(select 1 from public.line_games g join public.match_lines l on l.id=g.match_line_id where l.match_id=current_match.id and (g.home_score is not null or g.away_score is not null)) then
    raise exception 'This match already has lineups or scores. Resolve them before swapping teams.';
  end if;
  -- Only the selected side and its recorded bye ownership change. In particular,
  -- do not move the match to the incoming team's home location or regenerate it.
  update public.matches set
    home_team_id=case when p_side='home' then current_bye.team_id else home_team_id end,
    away_team_id=case when p_side='away' then current_bye.team_id else away_team_id end,
    updated_at=changed_at where id=current_match.id;
  update public.team_byes set team_id=removed_id, updated_at=changed_at where id=current_bye.id;
  insert into schedule_editor_private.bye_swap_audit(
    action, actor_user_id, match_id, bye_id, league_id, division_id, scheduled_date,
    week_number, side, removed_team_id, incoming_team_id, opponent_team_id, changed_at
  ) values (
    'SWAP_WITH_BYE', p_actor_user_id, current_match.id, current_bye.id,
    current_match.league_id, current_match.division_id, current_match.scheduled_date,
    current_match.week_number, p_side, removed_id, current_bye.team_id, opponent_id, changed_at
  );
  return jsonb_build_object('actorUserId',p_actor_user_id,'action','SWAP_WITH_BYE','matchId',current_match.id,
    'divisionId',current_match.division_id,'date',current_match.scheduled_date,'week',current_match.week_number,
    'removedTeamId',removed_id,'replacementTeamId',current_bye.team_id,'opponentTeamId',opponent_id,'changedAt',changed_at);
end;
$function$;
revoke all on function public.schedule_editor_swap_with_bye(uuid,text,uuid,jsonb,jsonb,uuid) from public, anon, authenticated, service_role;
grant execute on function public.schedule_editor_swap_with_bye(uuid,text,uuid,jsonb,jsonb,uuid) to service_role;
