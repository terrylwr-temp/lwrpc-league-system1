-- LMS-0723 / 0.1.545 approved server-auth correction. NOT applied to production.
begin;

-- Keep existing history; future function inserts omit session_id.

alter table ai_live_private.access_audit alter column session_id drop not null;

drop function if exists public.ai_live_lookup(uuid,uuid,uuid,jsonb) restrict;

drop function if exists public.ai_live_feedback(uuid,uuid,uuid,boolean,jsonb) restrict;

drop function if exists public.ai_live_review(uuid,uuid) restrict;

drop function if exists ai_live_private.lookup(uuid,uuid,uuid,jsonb) restrict;

create or replace function ai_live_private.lookup(p_actor uuid,p_request uuid,p_query jsonb)
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
 where u.user_id=p_actor and m.is_active_member is true and u.role in ('player','captain','club_pro','league_manager','commissioner') for share of u,m;
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
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,723));
 if (select count(*) from ai_live_private.attempts where actor=p_actor and at>v_start-interval '1 minute')>=10
 or (select count(*) from ai_live_private.attempts where actor=p_actor and at>v_start-interval '1 day')>=100
 or (v_intent='PLAYER_CONTACT' and ((select count(*) from ai_live_private.attempts where actor=p_actor and contact and at>v_start-interval '1 minute')>=5
 or (select count(*) from ai_live_private.attempts where actor=p_actor and contact and at>v_start-interval '1 day')>=30)) then return jsonb_build_object('status','rate_limited'); end if;
 insert into ai_live_private.attempts(actor,contact) values(p_actor,v_intent='PLAYER_CONTACT');
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
  insert into ai_live_private.access_audit(actor,target,request_id,intent,decision) values(p_actor,v_target,p_request,v_intent,case when nullif(v_value,'') is null then 'missing' else 'success' end);
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
  insert into ai_live_private.access_audit(actor,target,request_id,intent,decision) values(p_actor,v_target,p_request,v_intent,v_result->>'status');
 end if;
 return v_result||jsonb_build_object('resolutionMs',extract(epoch from(v_query_started-v_start))*1000,'queryMs',extract(epoch from(clock_timestamp()-v_query_started))*1000);
end $$;

create or replace function public.ai_live_lookup(p_actor uuid,p_request uuid,p_query jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 result:=ai_live_private.lookup(p_actor,p_request,p_query);
 if result->>'status' in ('denied','not_found','rate_limited') and p_query->>'intent' in ('PLAYER_CONTACT','PLAYER_RATING','SELF_TEAM','TEAM_ROSTER','NEXT_MATCH')
 and p_actor is not null then
  insert into ai_live_private.access_audit(actor,request_id,intent,decision) values(p_actor,p_request,p_query->>'intent',result->>'status');
 end if;
 return result;
end $$;

create or replace function public.ai_live_feedback(p_actor uuid,p_answer uuid,p_helpful boolean,p_metadata jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare prior ai_live_private.feedback; v_id uuid;
begin
 if p_actor is null or not exists(select 1 from public.user_roles u join public.members m on m.id=u.member_id where u.user_id=p_actor and m.is_active_member is true) then raise exception 'live authorization'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_answer::text,724));
 select * into prior from ai_live_private.feedback where answer_id=p_answer and actor=p_actor order by at desc,id desc limit 1;
 if prior.helpful is not distinct from p_helpful and prior.id is not null then return jsonb_build_object('changed',false,'helpful',prior.helpful,'feedbackId',prior.id); end if;
 insert into ai_live_private.feedback(answer_id,actor,intent,result_code,relationship,origin,helpful,assistant_version)
 values(p_answer,p_actor,p_metadata->>'intent',p_metadata->>'status',p_metadata->>'relationship',p_metadata->>'origin',p_helpful,'LMS-0723') returning id into v_id;
 return jsonb_build_object('changed',true,'helpful',p_helpful,'feedbackId',v_id);
end $$;

create or replace function public.ai_live_review(p_actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_actor is null or not exists(select 1 from public.user_roles u join public.members m on m.id=u.member_id where u.user_id=p_actor and m.is_active_member is true and u.role in('league_manager','commissioner')) then raise exception 'live authorization'; end if;
 -- Group by metadata namespace, never a name/question/target. Current vote per
 -- answer drives counts. Manager tests remain explicitly separated.
 select coalesce(jsonb_agg(x),'[]'::jsonb) into result from (
  select intent,result_code,relationship,origin,assistant_version,count(*) as answers,
   count(*) filter(where helpful) as helpful,count(*) filter(where not helpful) as not_helpful,max(at) as latest_at
  from (select distinct on(answer_id) answer_id,intent,result_code,relationship,origin,assistant_version,helpful,at from ai_live_private.feedback where at>statement_timestamp()-interval '90 days' order by answer_id,at desc,id desc) votes
  group by intent,result_code,relationship,origin,assistant_version order by max(at) desc limit 50
 ) x;
 return jsonb_build_object('groups',result);
end $$;

revoke all on function ai_live_private.lookup(uuid,uuid,jsonb) from public, anon, authenticated, service_role;

revoke all on function public.ai_live_lookup(uuid,uuid,jsonb) from public, anon, authenticated, service_role;

revoke all on function public.ai_live_feedback(uuid,uuid,boolean,jsonb) from public, anon, authenticated, service_role;

revoke all on function public.ai_live_review(uuid) from public, anon, authenticated, service_role;

grant execute on function ai_live_private.lookup(uuid,uuid,jsonb) to service_role;

grant execute on function public.ai_live_lookup(uuid,uuid,jsonb) to service_role;

grant execute on function public.ai_live_feedback(uuid,uuid,boolean,jsonb) to service_role;

grant execute on function public.ai_live_review(uuid) to service_role;

drop function if exists ai_live_private.session_valid(uuid,uuid) restrict;

do $cleanup$
begin
 if exists(select 1 from pg_roles where rolname='ai_live_session_reader') then
  revoke select(id,user_id,not_after) on auth.sessions from ai_live_session_reader;
  revoke all on schema ai_live_private from ai_live_session_reader;
  drop role ai_live_session_reader;
 end if;
end $cleanup$;

commit;
