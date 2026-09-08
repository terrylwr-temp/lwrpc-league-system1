-- LMS-0724: isolated read-only context. Local validation only; not applied.
begin;
create schema if not exists view_as_private;
revoke all on schema view_as_private from public,anon,authenticated,service_role;
create table if not exists view_as_private.contexts (
 id uuid primary key, actor uuid not null, target uuid not null,
 binding text not null, browser text not null check(browser ~ '^[a-f0-9]{64}$'),
 code text unique check(code ~ '^[a-f0-9]{64}$'), context text unique check(context ~ '^[a-f0-9]{64}$'),
 credential text, created_at timestamptz not null default clock_timestamp(),
 exchange_by timestamptz not null default clock_timestamp()+interval '60 seconds',
 expires_at timestamptz not null, started_at timestamptz, ended_at timestamptz, end_reason text,
 check(expires_at <= created_at+interval '30 minutes')
);
create index if not exists view_as_actor_created on view_as_private.contexts(actor,created_at);
create table if not exists view_as_private.audit_events (
 id bigint generated always as identity primary key, context_id uuid not null references view_as_private.contexts(id),
 actor uuid not null, effective_member uuid not null, subject uuid,
 event text not null, at timestamptz not null default clock_timestamp(), reason text,
 actor_role text, effective_role text, capability text
);
create table if not exists view_as_private.diagnostic_outcomes (
 id uuid primary key, context_id uuid not null references view_as_private.contexts(id),
 at timestamptz not null default clock_timestamp(), family text not null, kind text not null,
 intent text, result_code text, total_ms integer check(total_ms>=0),
 interaction_mode text not null default 'view_as' check(interaction_mode='view_as')
);
create table if not exists view_as_private.attempts(actor uuid not null,at timestamptz not null default clock_timestamp(),contact boolean not null);
alter table view_as_private.contexts enable row level security;
alter table view_as_private.audit_events enable row level security;
alter table view_as_private.diagnostic_outcomes enable row level security;
alter table view_as_private.attempts enable row level security;
revoke all on all tables in schema view_as_private from public,anon,authenticated,service_role;
revoke all on all sequences in schema view_as_private from public,anon,authenticated,service_role;

create or replace function view_as_private.member_role(p_member uuid) returns text
language sql stable security invoker set search_path='' as $$
 select (array_agg(u.role order by case u.role when 'commissioner' then 5 when 'league_manager' then 4 when 'club_pro' then 3 when 'captain' then 2 when 'player' then 1 else 0 end desc))[1]
 from public.user_roles u join public.members m on m.id=u.member_id and m.is_active_member is true
 where u.member_id=p_member and u.role in('commissioner','league_manager','club_pro','captain','player')
 having count(distinct u.user_id)<=1 and not exists(select 1 from public.user_roles a join public.user_roles b on a.user_id=b.user_id where a.member_id=p_member and b.member_id<>p_member)
$$;
create or replace function view_as_private.actor_member(p_actor uuid) returns uuid
language sql stable security invoker set search_path='' as $$
 select (array_agg(distinct u.member_id))[1] from public.user_roles u join public.members m on m.id=u.member_id and m.is_active_member is true
 where u.user_id=p_actor having count(distinct u.member_id)=1
$$;
create or replace function view_as_private.end_context(p_id uuid,p_reason text) returns void
language plpgsql security invoker set search_path='' as $$
declare c view_as_private.contexts;
begin
 update view_as_private.contexts set ended_at=clock_timestamp(),end_reason=p_reason,credential=null,code=null,context=null
 where id=p_id and ended_at is null returning * into c;
 if found and c.started_at is not null then insert into view_as_private.audit_events(context_id,actor,effective_member,event,reason)
 values(c.id,c.actor,c.target,'VIEW_AS_ENDED',p_reason); end if;
end $$;

create or replace function view_as_private.lookup(p_actor uuid,p_member uuid,p_context uuid,p_request uuid,p_query jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_member uuid; v_role text; v_intent text:=p_query->>'intent'; v_target uuid; v_team uuid;
 v_season uuid; v_name text; v_label text; v_rating text:=p_query->>'rating'; v_value text;
 v_teams uuid[]; v_population uuid[]; v_choices jsonb; v_context record; v_match record;
 v_count int; v_choice_offset int:=coalesce((p_query->>'choiceOffset')::int,0); v_offset int:=coalesce((p_query->>'offset')::int,0); v_relation text; v_tz text;
 v_person_lookup boolean; v_subject_kind text:=p_query->>'subjectKind';
 v_result jsonb; v_query_started timestamptz; v_start timestamptz:=clock_timestamp();
begin
 if p_actor is null then return jsonb_build_object('status','denied'); end if;
 select u.member_id,u.role into v_member,v_role from public.user_roles u join public.members m on m.id=u.member_id
 where u.member_id=p_member and m.is_active_member is true and u.role in ('player','captain','club_pro','league_manager','commissioner') order by case u.role when 'commissioner' then 5 when 'league_manager' then 4 when 'club_pro' then 3 when 'captain' then 2 else 1 end desc limit 1 for share of u,m;
 if p_query->>'origin'='manager_test' and v_role not in ('league_manager','commissioner') then return jsonb_build_object('status','denied'); end if;
 if v_member is null then return jsonb_build_object('status','denied'); end if;
 if v_intent not in ('SELF_RATING','PLAYER_RATING','PLAYER_CONTACT','SELF_TEAM','TEAM_ROSTER','NEXT_MATCH') then return jsonb_build_object('status','unsupported'); end if;
 if v_choice_offset<0 or v_choice_offset>5000 or v_offset<0 or v_offset>5000 or octet_length(p_query::text)>4096 then return jsonb_build_object('status','unsupported'); end if;
 -- Subject classification is server-generated. Explicit/referential requests
 -- cannot recover by defaulting to the requester when identity is absent.
 if v_subject_kind is not null and v_subject_kind not in ('SELF','EXPLICIT_PERSON','FOLLOWUP_REFERENT','NONE') then return jsonb_build_object('status','unsupported'); end if;
 if p_query?'subject' and coalesce(p_query->>'subject','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return jsonb_build_object('status','denied'); end if;
 if (v_subject_kind='EXPLICIT_PERSON' and not(p_query?'name' or p_query?'subject'))
 or (v_subject_kind='FOLLOWUP_REFERENT' and not(p_query?'subject'))
 or (p_query?'name' and p_query?'subject')
 or ((v_subject_kind='SELF' or p_query->>'self'='true' or v_intent='SELF_RATING') and (p_query?'name' or (p_query?'subject' and (p_query->>'subject')::uuid<>v_member)))
 or (v_intent='SELF_RATING' and v_subject_kind in ('EXPLICIT_PERSON','FOLLOWUP_REFERENT')) then return jsonb_build_object('status','denied'); end if;
 v_person_lookup:=v_intent in ('PLAYER_RATING','PLAYER_CONTACT') or p_query?'name'
   or v_subject_kind in ('EXPLICIT_PERSON','FOLLOWUP_REFERENT')
   or (p_query?'subject' and (p_query->>'subject')::uuid is distinct from v_member);
 -- Serialize budgets and feedback independently of hosting instances.
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,724));
 if (select count(*) from view_as_private.attempts where actor=p_actor and at>v_start-interval '1 minute')>=10
 or (select count(*) from view_as_private.attempts where actor=p_actor and at>v_start-interval '1 day')>=100
 or (v_intent='PLAYER_CONTACT' and ((select count(*) from view_as_private.attempts where actor=p_actor and contact and at>v_start-interval '1 minute')>=5
 or (select count(*) from view_as_private.attempts where actor=p_actor and contact and at>v_start-interval '1 day')>=30)) then return jsonb_build_object('status','rate_limited'); end if;
 insert into view_as_private.attempts(actor,contact) values(p_actor,v_intent='PLAYER_CONTACT');
 -- Active state comes from LMS flags, not today's date or browser claims.
 select coalesce(array_agg(t.id),'{}'::uuid[]) into v_teams from public.teams t
 join public.divisions d on d.id=t.division_id and d.is_active is true
 join public.leagues l on l.id=d.league_id and l.is_active is true
 join public.seasons s on s.id=l.season_id and s.is_active is true
 where t.is_active is true and (v_role in ('league_manager','commissioner')
 or (v_role in ('captain','club_pro') and v_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id))
 or (v_intent in ('SELF_TEAM','TEAM_ROSTER','NEXT_MATCH') and exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.member_id=v_member and tm.is_active is true)));
 if p_query?'teamName' then select coalesce(array_agg(t.id),'{}'::uuid[]) into v_teams from public.teams t where t.id=any(v_teams) and lower(trim(t.name))=lower(trim(p_query->>'teamName')); end if;
 v_relation:=case when v_role in ('league_manager','commissioner') then 'manager' when v_intent='SELF_RATING' then 'self' else 'team' end;
 if v_person_lookup then
  if v_role='player' then return jsonb_build_object('status','denied'); end if;
  -- Only IDs/names are available during resolution. No contact/rating lookup yet.
  select coalesce(array_agg(m.id),'{}'::uuid[]) into v_population from public.members m
  where m.is_active_member is true and (v_role in ('league_manager','commissioner') or exists(
   select 1 from public.team_members tm join public.teams t on t.id=tm.team_id
   where tm.member_id=m.id and tm.is_active is true and tm.team_id=any(v_teams)
   and v_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id)));
  if p_query?'subject' then v_target:=(p_query->>'subject')::uuid;
   if not(v_target=any(v_population)) then return jsonb_build_object('status','not_found'); end if;
  else
   v_name:=lower(regexp_replace(trim(p_query->>'name'),'\s+',' ','g'));
   if v_name is null or length(v_name)<3 or v_name ~ '[%_@]' then return jsonb_build_object('status','not_found'); end if;
   select count(*),min(m.id::text)::uuid into v_count,v_target from public.members m where m.id=any(v_population) and lower(trim(m.first_name||' '||m.last_name))=v_name;
   if v_count<>1 then
    select coalesce(jsonb_agg(x),'[]'::jsonb) into v_choices from (
     select m.id as subject,trim(m.first_name||' '||m.last_name) as label from public.members m where m.id=any(v_population)
     and lower(trim(m.first_name||' '||m.last_name)) like '%'||v_name||'%' order by m.first_name,m.last_name,m.id limit 5
    ) x;
    if jsonb_array_length(v_choices)=0 then return jsonb_build_object('status','not_found'); end if;
    if (select count(distinct x->>'label') from jsonb_array_elements(v_choices) x)<jsonb_array_length(v_choices) then return jsonb_build_object('status','ambiguous','choices','[]'::jsonb,'relationship',v_relation); end if;
    return jsonb_build_object('status','ambiguous','choices',v_choices,'relationship',v_relation);
   end if;
  end if;
 else v_target:=v_member; v_relation:=case when v_intent='SELF_RATING' or v_role='player' then 'self' else v_relation end;
 end if;
 -- Lock and recheck the resolved subject and the granting relationships before
 -- the field query. Removal during name resolution cannot leave a stale grant.
 perform 1 from public.members where id=v_target and is_active_member is true for share;
 if not found then return jsonb_build_object('status','not_found'); end if;
 if v_target<>v_member and v_role not in ('league_manager','commissioner') then
  perform 1 from public.team_members tm join public.teams t on t.id=tm.team_id
   join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id
   where tm.member_id=v_target and tm.is_active is true and t.is_active is true and d.is_active is true and l.is_active is true and s.is_active is true
   and v_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id)
   for share of tm,t,d,l,s;
  if not found then return jsonb_build_object('status','not_found'); end if;
 end if;
 if v_intent in ('SELF_RATING','PLAYER_RATING','PLAYER_CONTACT') then select trim(first_name||' '||last_name) into v_label from public.members where id=v_target; end if;
 v_query_started:=clock_timestamp();
 if v_intent='PLAYER_CONTACT' then
  select email into v_value from public.members where id=v_target and id=any(v_population) and is_active_member is true;
  -- Audit insert failure rolls back and prevents email disclosure.
  insert into view_as_private.audit_events(context_id,actor,effective_member,subject,event,capability,reason) values(p_context,p_actor,p_member,v_target,'SENSITIVE_READ',v_intent,case when nullif(v_value,'') is null then 'missing' else 'success' end);
  return jsonb_build_object('status',case when nullif(v_value,'') is null then 'missing' else 'success' end,'intent',v_intent,'label',v_label,'value',v_value,'subject',v_target,'relationship',v_relation,'resolutionMs',extract(epoch from(v_query_started-v_start))*1000,'queryMs',extract(epoch from(clock_timestamp()-v_query_started))*1000);
 end if;
 if v_intent in ('SELF_RATING','PLAYER_RATING') then
  if v_rating not in ('season','primetime') or v_rating is null then return jsonb_build_object('status','rating_clarification','subject',v_target,'relationship',v_relation); end if;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into v_choices from (select s.id as season,s.name as label from public.seasons s where s.is_active is true
   and (v_intent='SELF_RATING' or v_role in ('league_manager','commissioner') or exists(select 1 from public.team_members tm join public.teams t on t.id=tm.team_id join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id where tm.member_id=v_target and tm.is_active is true and t.id=any(v_teams) and l.season_id=s.id)) order by s.name,s.id limit 5) x;
  if jsonb_array_length(v_choices)=0 then return jsonb_build_object('status','no_season','relationship',v_relation); end if;
  if p_query?'season' then v_season:=(p_query->>'season')::uuid;
   if not exists(select 1 from jsonb_array_elements(v_choices) x where (x->>'season')::uuid=v_season) then return jsonb_build_object('status','denied'); end if;
  elsif jsonb_array_length(v_choices)>1 then return jsonb_build_object('status','ambiguous','subject',v_target,'choices',v_choices,'relationship',v_relation);
  else v_season:=(v_choices->0->>'season')::uuid; end if;
  perform 1 from public.seasons where id=v_season and is_active is true for share;
  if not found then return jsonb_build_object('status','no_season','relationship',v_relation); end if;
  -- Separate branches enforce field projection; never select a rating row wholesale.
  if v_rating='primetime' then select season_primetime_rating::text into v_value from public.member_season_ratings where member_id=v_target and season_id=v_season;
  else select season_dupr_rating::text into v_value from public.member_season_ratings where member_id=v_target and season_id=v_season; end if;
  v_result:=jsonb_build_object('status',case when v_value is null then 'missing' else 'success' end,'intent',v_intent,'label',v_label,'value',v_value,'rating',v_rating,'season',(select name from public.seasons where id=v_season),'subject',v_target,'seasonRef',v_season,'relationship',v_relation);
 else
  if v_person_lookup then select coalesce(array_agg(t),'{}'::uuid[]) into v_teams from unnest(v_teams) t where exists(select 1 from public.team_members tm where tm.team_id=t and tm.member_id=v_target and tm.is_active is true); end if;
  if p_query->>'self'='true' and v_intent='SELF_TEAM' then select coalesce(array_agg(t),'{}'::uuid[]) into v_teams from unnest(v_teams) t where exists(select 1 from public.team_members tm where tm.team_id=t and tm.member_id=v_member and tm.is_active is true) or exists(select 1 from public.teams z where z.id=t and v_member in(z.captain_member_id,z.co_captain_member_id,z.co_captain_2_member_id,z.club_pro_member_id)); end if;
  if cardinality(v_teams)=0 then return jsonb_build_object('status','no_team','relationship',v_relation); end if;
  if p_query?'team' then v_team:=(p_query->>'team')::uuid;
   if not(v_team=any(v_teams)) then return jsonb_build_object('status','denied'); end if;
  elsif cardinality(v_teams)>1 then
   select jsonb_agg(x) into v_choices from (select t.id as team,t.name||' — '||d.name||', '||l.name||', '||s.name as label from public.teams t join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id where t.id=any(v_teams) order by t.name,t.id offset v_choice_offset limit 6) x;
   return jsonb_build_object('status','ambiguous','choices',case when jsonb_array_length(v_choices)>5 then v_choices-5 else coalesce(v_choices,'[]'::jsonb) end,'moreChoices',jsonb_array_length(v_choices)>5,'subject',case when v_person_lookup then v_target else null end,'relationship',v_relation);
  else v_team:=v_teams[1]; end if;
  select t.name as team,d.name as division,l.name as league,s.name as season into v_context from public.teams t join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id
   where t.id=v_team and t.is_active is true and d.is_active is true and l.is_active is true and s.is_active is true
   and (v_role in ('league_manager','commissioner') or (v_role in ('captain','club_pro') and v_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id))
   or exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.member_id=v_member and tm.is_active is true)) for share of t,d,l,s;
  if not found then return jsonb_build_object('status','denied'); end if;
  perform 1 from public.team_members where team_id=v_team and member_id=v_member and is_active is true for share;
  if not found and v_role not in ('league_manager','commissioner') and not exists(select 1 from public.teams t where t.id=v_team and v_role in ('captain','club_pro') and v_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id)) then return jsonb_build_object('status','denied'); end if;
  if v_person_lookup then
   perform 1 from public.team_members where team_id=v_team and member_id=v_target and is_active is true for share;
   if not found then return jsonb_build_object('status','not_found'); end if;
  end if;
  v_result:=to_jsonb(v_context)||jsonb_build_object('status','success','intent',v_intent,'teamRef',v_team,'subject',case when v_person_lookup then v_target else null end,'relationship',v_relation);
  if v_intent='TEAM_ROSTER' then
   select coalesce(jsonb_agg(x),'[]'::jsonb) into v_choices from (select trim(m.first_name||' '||m.last_name) as label from public.team_members tm join public.members m on m.id=tm.member_id where tm.team_id=v_team and tm.is_active is true and m.is_active_member is true order by m.last_name,m.first_name,m.id offset v_offset limit 26) x;
   v_result:=v_result||jsonb_build_object('players',case when jsonb_array_length(v_choices)>25 then v_choices-25 else v_choices end,'more',jsonb_array_length(v_choices)>25,'offset',v_offset);
  elsif v_intent='NEXT_MATCH' then
   select coalesce((select setting_value from public.system_settings where setting_key='timezone'),'America/New_York') into v_tz;
   select m.scheduled_date as date,m.scheduled_time as time,opp.name as opponent,loc.name as location into v_match from public.matches m
   join public.teams opp on opp.id=case when m.home_team_id=v_team then m.away_team_id else m.home_team_id end
   left join public.locations loc on loc.id=m.location_id
   where v_team in(m.home_team_id,m.away_team_id) and m.is_published is true and lower(coalesce(m.status,'')) not in('completed','cancelled','canceled','bye')
   and m.scheduled_date is not null and (m.scheduled_date+coalesce(m.scheduled_time,time '23:59:59')) at time zone v_tz>=v_start
   order by m.scheduled_date,m.scheduled_time nulls last,m.id limit 1;
   if not found then return jsonb_build_object('status','no_match','teamRef',v_team,'subject',case when v_person_lookup then v_target else null end,'relationship',v_relation); end if;
   select count(*) into v_count from public.matches m where v_team in(m.home_team_id,m.away_team_id) and m.is_published is true and lower(coalesce(m.status,'')) not in('completed','cancelled','canceled','bye') and m.scheduled_date=v_match.date and m.scheduled_time is not distinct from v_match.time;
   if v_count>1 then return jsonb_build_object('status','ambiguous','choices','[]'::jsonb,'relationship',v_relation); end if;
   v_result:=v_result||to_jsonb(v_match)||jsonb_build_object('timezone',v_tz);
  end if;
 end if;
 if v_intent='PLAYER_RATING' or v_target<>v_member then
  insert into view_as_private.audit_events(context_id,actor,effective_member,subject,event,capability,reason) values(p_context,p_actor,p_member,v_target,'SENSITIVE_READ',v_intent,v_result->>'status');
 end if;
 return v_result||jsonb_build_object('resolutionMs',extract(epoch from(v_query_started-v_start))*1000,'queryMs',extract(epoch from(clock_timestamp()-v_query_started))*1000);
end $$;

create or replace function view_as_private.snapshot(p_target uuid,p_role text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare permitted uuid[]; result jsonb;
begin
 select coalesce(array_agg(t.id),'{}'::uuid[]) into permitted from public.teams t
 join public.divisions d on d.id=t.division_id and d.is_active
 join public.leagues l on l.id=d.league_id and l.is_active join public.seasons s on s.id=l.season_id and s.is_active
 where t.is_active and (p_role in('commissioner','league_manager')
 or exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.member_id=p_target and tm.is_active)
 or (p_role in('captain','club_pro') and (p_target in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id)
 or exists(select 1 from public.locations loc where loc.id=t.home_location_id and p_target in(loc.club_pro_member_id,loc.club_pro_2_member_id)))));
 select jsonb_build_object('teams',coalesce((select jsonb_agg(x) from(
 select t.id,t.name,d.name as division,l.name as league,s.name as season from public.teams t
 join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id where t.id=any(permitted) order by t.name,t.id limit 100) x),'[]'::jsonb),
 'rosters',coalesce((select jsonb_agg(x) from(select tm.team_id,concat_ws(' ',m.first_name,m.last_name) as name from public.team_members tm join public.members m on m.id=tm.member_id and m.is_active_member where tm.team_id=any(permitted) and tm.is_active order by tm.team_id,m.last_name,m.first_name,m.id limit 500) x),'[]'::jsonb),
 'matches',coalesce((select jsonb_agg(x) from(select m.id,m.scheduled_date,m.scheduled_time,m.status,h.name as home_team,a.name as away_team,loc.name as location from public.matches m join public.teams h on h.id=m.home_team_id join public.teams a on a.id=m.away_team_id left join public.locations loc on loc.id=m.location_id where (m.home_team_id=any(permitted) or m.away_team_id=any(permitted)) and m.is_published order by m.scheduled_date desc,m.scheduled_time,m.id limit 100)x),'[]'::jsonb),
 'standings',coalesce((select jsonb_agg(x) from(select t.name as team,d.name as division,ts.rank,ts.standings_points,ts.match_wins,ts.match_losses from public.team_standings ts join public.teams t on t.id=ts.team_id join public.divisions d on d.id=t.division_id where t.division_id in(select division_id from public.teams where id=any(permitted)) and t.is_active order by d.name,ts.rank,t.name limit 200)x),'[]'::jsonb),
 'limited',jsonb_build_object('teams',100,'rosters',500,'matches',100,'standings',200)) into result;
 return result;
end $$;


revoke all on all functions in schema view_as_private from public,anon,authenticated,service_role;

do $$begin if not exists(select 1 from pg_roles where rolname='lms_view_as_executor') then create role lms_view_as_executor nologin noinherit;end if;
 if exists(select 1 from pg_roles where rolname='lms_view_as_executor' and (rolcanlogin or rolsuper or rolbypassrls or rolinherit))
 or exists(select 1 from pg_auth_members where roleid=(select oid from pg_roles where rolname='lms_view_as_executor') and (member<>(select oid from pg_roles where rolname=current_user) or inherit_option)) then raise exception 'Unexpected View As executor role state';end if;end$$;
-- Only the migration owner may SET ROLE for ownership/maintenance; never a runtime login.
grant lms_view_as_executor to current_user with inherit false, set true;
grant usage on schema view_as_private,public to lms_view_as_executor;
grant create on schema public to lms_view_as_executor;
grant select,insert,update on view_as_private.contexts to lms_view_as_executor;
grant select,insert on view_as_private.audit_events,view_as_private.diagnostic_outcomes,view_as_private.attempts to lms_view_as_executor;
grant usage on all sequences in schema view_as_private to lms_view_as_executor;
grant select(id,first_name,last_name,email,is_active_member),update(id) on public.members to lms_view_as_executor;
grant select(user_id,member_id,role),update(member_id) on public.user_roles to lms_view_as_executor;
grant select(id,name,is_active),update(id) on public.seasons to lms_view_as_executor;
grant select(id,name,is_active,season_id),update(id) on public.leagues to lms_view_as_executor;
grant select(id,name,is_active,league_id),update(id) on public.divisions to lms_view_as_executor;
grant select(id,name,is_active,division_id,home_location_id,captain_member_id,co_captain_member_id,co_captain_2_member_id,club_pro_member_id),update(id) on public.teams to lms_view_as_executor;
grant select(team_id,member_id,is_active),update(member_id) on public.team_members to lms_view_as_executor;
grant select(member_id,season_id,season_dupr_rating,season_primetime_rating) on public.member_season_ratings to lms_view_as_executor;
grant select(id,name,club_pro_member_id,club_pro_2_member_id) on public.locations to lms_view_as_executor;
grant select(id,home_team_id,away_team_id,location_id,scheduled_date,scheduled_time,status,is_published) on public.matches to lms_view_as_executor;
grant select(team_id,rank,standings_points,match_wins,match_losses) on public.team_standings to lms_view_as_executor;
grant select(setting_key,setting_value) on public.system_settings to lms_view_as_executor;
grant execute on all functions in schema view_as_private to lms_view_as_executor;
-- RLS policies are restricted to the dedicated non-login executor; no browser policy changes.
drop policy if exists view_as_executor_context on view_as_private.contexts;
create policy view_as_executor_context on view_as_private.contexts to lms_view_as_executor using(true) with check(true);
drop policy if exists view_as_executor_audit on view_as_private.audit_events;
create policy view_as_executor_audit on view_as_private.audit_events to lms_view_as_executor using(true) with check(true);
drop policy if exists view_as_executor_diagnostic on view_as_private.diagnostic_outcomes;
create policy view_as_executor_diagnostic on view_as_private.diagnostic_outcomes to lms_view_as_executor using(true) with check(true);
drop policy if exists view_as_executor_attempts on view_as_private.attempts;
create policy view_as_executor_attempts on view_as_private.attempts to lms_view_as_executor using(true) with check(true);
drop policy if exists view_as_executor_read on public.members;
create policy view_as_executor_read on public.members for select to lms_view_as_executor using(true);
drop policy if exists view_as_executor_read on public.user_roles;
create policy view_as_executor_read on public.user_roles for select to lms_view_as_executor using(true);
drop policy if exists view_as_executor_read on public.seasons;
create policy view_as_executor_read on public.seasons for select to lms_view_as_executor using(true);
drop policy if exists view_as_executor_read on public.leagues;
create policy view_as_executor_read on public.leagues for select to lms_view_as_executor using(true);
drop policy if exists view_as_executor_read on public.divisions;
create policy view_as_executor_read on public.divisions for select to lms_view_as_executor using(true);
drop policy if exists view_as_executor_read on public.teams;
create policy view_as_executor_read on public.teams for select to lms_view_as_executor using(true);
drop policy if exists view_as_executor_read on public.team_members;
create policy view_as_executor_read on public.team_members for select to lms_view_as_executor using(true);
drop policy if exists view_as_executor_read on public.member_season_ratings;
create policy view_as_executor_read on public.member_season_ratings for select to lms_view_as_executor using(true);
drop policy if exists view_as_executor_read on public.locations;
create policy view_as_executor_read on public.locations for select to lms_view_as_executor using(true);
drop policy if exists view_as_executor_read on public.matches;
create policy view_as_executor_read on public.matches for select to lms_view_as_executor using(true);
drop policy if exists view_as_executor_read on public.team_standings;
create policy view_as_executor_read on public.team_standings for select to lms_view_as_executor using(true);
drop policy if exists view_as_executor_read on public.system_settings;
create policy view_as_executor_read on public.system_settings for select to lms_view_as_executor using(true);
-- The dispatcher keeps its dedicated owner. Replay validates, never replaces it.
do $view_as_definition$
declare expected_source text := $view_as_source$
declare c view_as_private.contexts; actor_member uuid; actor_role text; target_role text; target uuid;
 result jsonb; actor_name text; target_name text;
begin
 if octet_length(p_input::text)>32000 then return jsonb_build_object('denied',true);end if;
 if p_op='can_start' then return jsonb_build_object('allowed',coalesce(view_as_private.member_role(view_as_private.actor_member((p_input->>'actor')::uuid)) in('commissioner','league_manager'),false));end if;
 if p_op='preflight' then
  actor_role:=view_as_private.member_role(view_as_private.actor_member((p_input->>'actor')::uuid));
  target:=(p_input->>'target')::uuid;target_role:=view_as_private.member_role(target);
  if actor_role is null or actor_role not in('commissioner','league_manager') or target_role is null then return jsonb_build_object('allowed',false);end if;
  select concat_ws(' ',first_name,last_name) into target_name from public.members where id=target;
  return jsonb_build_object('allowed',true,'name',target_name);
 end if;
 if p_op='start' then
  actor_member:=view_as_private.actor_member((p_input->>'actor')::uuid);
  actor_role:=view_as_private.member_role(actor_member);target:=(p_input->>'target')::uuid;
  target_role:=view_as_private.member_role(target);
  if actor_role is null or actor_role not in('commissioner','league_manager') or target_role is null then
   return jsonb_build_object('denied',true,'message','This member does not yet have enough LMS account information to simulate their signed-in experience.'); end if;
  perform pg_advisory_xact_lock(hashtextextended(p_input->>'actor',724));
  if (select count(*) from view_as_private.contexts where actor=(p_input->>'actor')::uuid and created_at>clock_timestamp()-interval '1 minute')>=5
    or (select count(*) from view_as_private.contexts where actor=(p_input->>'actor')::uuid and created_at>clock_timestamp()-interval '1 hour')>=30
    then return jsonb_build_object('denied',true);end if;
  if (p_input->>'expires')::timestamptz<=clock_timestamp() or length(p_input->>'credential')>25000 then return jsonb_build_object('denied',true);end if;
  insert into view_as_private.contexts(id,actor,target,binding,browser,code,credential,expires_at)
  values((p_input->>'id')::uuid,(p_input->>'actor')::uuid,target,p_input->>'binding',p_input->>'browser',p_input->>'code',p_input->>'credential',least((p_input->>'expires')::timestamptz,clock_timestamp()+interval '30 minutes')) returning * into c;
  return jsonb_build_object('expires',c.expires_at);
 end if;
 if p_op='load_handoff' then select * into c from view_as_private.contexts where code=p_input->>'code' and browser=p_input->>'browser' and started_at is null for update;
 elsif p_op='load' then select * into c from view_as_private.contexts where context=p_input->>'context' and browser=p_input->>'browser' and started_at is not null for update;
 else select * into c from view_as_private.contexts where id=(p_input->>'id')::uuid and actor=(p_input->>'actor')::uuid and browser=p_input->>'browser' for update;
 end if;
 if c.id is null or c.ended_at is not null then return jsonb_build_object('denied',true);end if;
 if c.expires_at<=clock_timestamp() then perform view_as_private.end_context(c.id,'expiration');return jsonb_build_object('denied',true,'message','View As User session expired.');end if;
 perform 1 from public.user_roles u join public.members m on m.id=u.member_id where u.user_id=c.actor or u.member_id=c.target for share of u,m;
 actor_member:=view_as_private.actor_member(c.actor);actor_role:=view_as_private.member_role(actor_member);target_role:=view_as_private.member_role(c.target);
 if actor_role is null or actor_role not in('commissioner','league_manager') or target_role is null then
  perform view_as_private.end_context(c.id,case when target_role is null then 'target_invalidation' else 'authorization_loss' end);
  return jsonb_build_object('denied',true);end if;
 if p_op in('load','load_handoff') then
  if p_op='load_handoff' and c.exchange_by<=clock_timestamp() then perform view_as_private.end_context(c.id,'handoff_expiration');return jsonb_build_object('denied',true);end if;
  return jsonb_build_object('id',c.id,'actor',c.actor,'binding',c.binding,'credential',c.credential);
 end if;
 if p_op='exchange' then
  if c.code is distinct from p_input->>'code' or c.started_at is not null or c.exchange_by<=clock_timestamp() then return jsonb_build_object('denied',true);end if;
  update view_as_private.contexts set code=null,context=p_input->>'context',started_at=clock_timestamp() where id=c.id returning * into c;
  insert into view_as_private.audit_events(context_id,actor,effective_member,event,actor_role,effective_role)
  values(c.id,c.actor,c.target,'VIEW_AS_STARTED',actor_role,target_role);
 elsif c.context is distinct from p_input->>'context' or c.started_at is null then return jsonb_build_object('denied',true);
 end if;
 if p_op='end' then perform view_as_private.end_context(c.id,'explicit_exit');return jsonb_build_object('ended',true);end if;
 if p_op='reserve_document' then
  perform pg_advisory_xact_lock(hashtextextended(c.actor::text,724));
  if (select count(*) from view_as_private.attempts where actor=c.actor and at>clock_timestamp()-interval '1 minute')>=10
   or (select count(*) from view_as_private.attempts where actor=c.actor and at>clock_timestamp()-interval '1 day')>=100 then return jsonb_build_object('rate_limited',true);end if;
  insert into view_as_private.attempts(actor,contact) values(c.actor,false);return jsonb_build_object('allowed',true);
 end if;
 if p_op='snapshot' then return view_as_private.snapshot(c.target,target_role);end if;
 if p_op='live' then
  result:=view_as_private.lookup(c.actor,c.target,c.id,(p_input->>'request')::uuid,p_input->'query');
  if result->>'status' in('denied','not_found','rate_limited') then
   insert into view_as_private.audit_events(context_id,actor,effective_member,event,capability,reason) values(c.id,c.actor,c.target,'READ_DENIED',p_input->'query'->>'intent',result->>'status');
  end if;
  return result;
 end if;
 if p_op='diagnostic' then
  if p_input->>'family' not in('document','LIVE_LMS_DATA') or p_input->>'kind' not in('answer','clarification','protected','insufficient_evidence','conflict','technical_error') then return jsonb_build_object('denied',true);end if;
  insert into view_as_private.diagnostic_outcomes(id,context_id,family,kind,total_ms) values((p_input->>'request')::uuid,c.id,p_input->>'family',p_input->>'kind',least(greatest((p_input->>'total_ms')::int,0),600000));
  return jsonb_build_object('recorded',true);
 end if;
 if p_op not in('resolve','exchange') then return jsonb_build_object('denied',true);end if;
 select concat_ws(' ',first_name,last_name) into actor_name from public.members where id=actor_member;
 select concat_ws(' ',first_name,last_name) into target_name from public.members where id=c.target;
 return jsonb_build_object('mode','VIEW_AS_READ_ONLY','readOnly',true,'actorName',actor_name,'actorRole',actor_role,
 'targetName',target_name,'role',target_role,'roles',(select jsonb_agg(distinct role) from public.user_roles where member_id=c.target),
 'hasAuth',(select exists(select 1 from public.user_roles where member_id=c.target and user_id is not null)),
 'expires',c.expires_at,'returnPath','/members/'||c.target::text);
end $view_as_source$;
 existing pg_catalog.pg_proc; expected_owner oid;
begin
 select oid into expected_owner from pg_catalog.pg_roles where rolname='lms_view_as_executor';
 select * into existing from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('public.lms_view_as(text,jsonb)');
 if existing.oid is null then
  execute pg_catalog.format('create function public.lms_view_as(p_op text,p_input jsonb) returns jsonb language plpgsql security definer set search_path='''' as %L',expected_source);
  revoke all on function public.lms_view_as(text,jsonb) from public,anon,authenticated,service_role;
  grant execute on function public.lms_view_as(text,jsonb) to service_role;
  alter function public.lms_view_as(text,jsonb) owner to lms_view_as_executor;
 else
  if existing.proowner is distinct from expected_owner
   or existing.prosrc is distinct from expected_source
   or existing.prosecdef is distinct from true
   or existing.provolatile <> 'v' or existing.proparallel <> 'u'
   or existing.proisstrict or existing.proleakproof or existing.proretset
   or existing.prokind <> 'f' or existing.prorettype <> 'jsonb'::regtype
   or existing.prolang <> (select oid from pg_catalog.pg_language where lanname='plpgsql')
   or existing.proconfig is distinct from array['search_path=""']::text[]
   or existing.proargnames is distinct from array['p_op','p_input']::text[]
   or existing.pronargdefaults <> 0
   or exists(select 1 from pg_catalog.aclexplode(coalesce(existing.proacl,pg_catalog.acldefault('f',existing.proowner))) a
     where a.grantee not in(expected_owner,(select oid from pg_catalog.pg_roles where rolname='service_role'))
       or a.privilege_type <> 'EXECUTE' or a.is_grantable)
   or not exists(select 1 from pg_catalog.aclexplode(existing.proacl) a where a.grantee=(select oid from pg_catalog.pg_roles where rolname='service_role') and a.privilege_type='EXECUTE' and not a.is_grantable)
  then raise exception 'LMS-0724 dispatcher definition/owner/security drift: public.lms_view_as(text,jsonb)';end if;
 end if;
end $view_as_definition$;

revoke create on schema public from lms_view_as_executor;


-- Separate bounded retention function. No operational/Auth rows are touched.
create or replace function public.lms_view_as_maintenance() returns void
language plpgsql security definer set search_path='' as $$
declare c record;
begin
 for c in select id from view_as_private.contexts where ended_at is null and (expires_at<=clock_timestamp() or started_at is null and exchange_by<=clock_timestamp()) order by expires_at limit 1000 for update skip locked loop
  perform view_as_private.end_context(c.id,'expiration');
 end loop;
 delete from view_as_private.attempts where at<clock_timestamp()-interval '1 day';
 delete from view_as_private.diagnostic_outcomes where at<clock_timestamp()-interval '30 days';
 delete from view_as_private.audit_events where at<clock_timestamp()-interval '90 days';
 delete from view_as_private.contexts expired where ended_at<clock_timestamp()-interval '90 days' and not exists(select 1 from view_as_private.audit_events a where a.context_id=expired.id) and not exists(select 1 from view_as_private.diagnostic_outcomes d where d.context_id=expired.id);
end $$;
revoke all on function public.lms_view_as_maintenance() from public,anon,authenticated,service_role;
grant execute on function public.lms_view_as_maintenance() to service_role;

commit;

