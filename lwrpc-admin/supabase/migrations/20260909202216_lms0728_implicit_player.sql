-- LMS-0728 / 0.1.550. Local candidate; production requires exact approval.
begin;
do $guard$ declare p pg_catalog.pg_proc;begin
 select * into p from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('view_as_private.member_role(uuid)');
 if not found or p.proowner<>'postgres'::regrole or p.prosecdef or p.proconfig is distinct from array['search_path=""']
 or p.proisstrict or p.proleakproof or pg_catalog.md5(p.prosrc) not in('0929cadc3946616a91615b2574401984','8ffcd39ccac0b130699a103caefedcd0') then raise exception 'LMS-0728 function drift: view_as_private.member_role(uuid)';end if;
 if exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a where a.grantee not in(p.proowner,'lms_view_as_executor'::regrole::oid) or a.is_grantable)
 or not pg_catalog.has_function_privilege('lms_view_as_executor',p.oid,'EXECUTE') then raise exception 'LMS-0728 ACL drift: view_as_private.member_role(uuid)';end if;
end $guard$;
do $guard$ declare p pg_catalog.pg_proc;begin
 select * into p from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)');
 if not found or p.proowner<>'postgres'::regrole or p.prosecdef or p.proconfig is distinct from array['search_path=""']
 or p.proisstrict or p.proleakproof or pg_catalog.md5(p.prosrc) not in('302293b776d734e1573238116c01ec4d','3d8ce5f61c83215561784840ff7ee551') then raise exception 'LMS-0728 function drift: view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)';end if;
 if exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a where a.grantee not in(p.proowner,'lms_view_as_executor'::regrole::oid) or a.is_grantable)
 or not pg_catalog.has_function_privilege('lms_view_as_executor',p.oid,'EXECUTE') then raise exception 'LMS-0728 ACL drift: view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)';end if;
end $guard$;
create or replace function view_as_private.member_role(p_member uuid) returns text
language sql stable security invoker set search_path='' as $$
 -- Member validity is independent of whether a baseline role is stored.
 select case when not exists(select 1 from public.user_roles u where u.member_id=m.id) then 'player'
 else (select (array_agg(u.role order by case u.role when 'commissioner' then 5 when 'league_manager' then 4 when 'club_pro' then 3 when 'captain' then 2 when 'player' then 1 else 0 end desc))[1]
       from public.user_roles u where u.member_id=m.id and u.role in('commissioner','league_manager','club_pro','captain','player')) end
 from public.members m where m.id=p_member and m.is_active_member is true
 and (select count(distinct u.user_id) from public.user_roles u where u.member_id=m.id)<=1
 and not exists(select 1 from public.user_roles a join public.user_roles b on a.user_id=b.user_id where a.member_id=m.id and b.member_id<>m.id)
$$;
create or replace function view_as_private.lookup(p_actor uuid,p_member uuid,p_context uuid,p_request uuid,p_query jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_member uuid; v_role text; v_intent text:=p_query->>'intent'; v_target uuid; v_team uuid;
 v_season uuid; v_name text; v_label text; v_rating text:=p_query->>'rating'; v_value text;
 v_teams uuid[]; v_population uuid[]; v_choices jsonb; v_context record; v_match record;
 v_count int; v_choice_offset int:=coalesce((p_query->>'choiceOffset')::int,0); v_offset int:=coalesce((p_query->>'offset')::int,0); v_relation text; v_tz text;
 v_person_lookup boolean; v_subject_kind text:=p_query->>'subjectKind';
 v_proof jsonb:=p_query->'_view_proof'; v_result jsonb; v_query_started timestamptz; v_start timestamptz:=clock_timestamp();
v_eligibility_snapshot jsonb;v_eligibility_inputs jsonb;
begin

 if p_query->>'intent'='ELIGIBILITY_SELF' then
  if p_query->>'subjectKind' is distinct from 'SELF' or p_query->>'rating' is null or p_query->>'rating' not in ('season','primetime')
   or exists(select 1 from pg_catalog.jsonb_object_keys(p_query) k where k not in ('intent','origin','rating','season','subjectKind','_view_proof')) then return jsonb_build_object('status','denied');end if;
  v_eligibility_snapshot:=view_as_private.lookup(p_actor,p_member,p_context,p_request,jsonb_set(jsonb_set(p_query,'{intent}','"SELF_RATING"'::jsonb),'{_view_proof,intent}','"SELF_RATING"'::jsonb));
  if v_eligibility_snapshot->>'status' not in ('success','missing') then return jsonb_build_object('status',v_eligibility_snapshot->>'status','choiceKind',v_eligibility_snapshot->>'choiceKind','choices',v_eligibility_snapshot->'choices');end if;
  if (v_eligibility_snapshot->>'subject')::uuid is distinct from p_member then return jsonb_build_object('status','denied');end if;
  select jsonb_build_object('sourceIsNr',case when upper(trim(r.dupr_doubles_rating))='NR' then true when trim(r.dupr_doubles_rating) ~ '^[0-9]+([.][0-9]+)?$' then false else null end,'rf',r.dupr_reliability_rating,'value',case when p_query->>'rating'='primetime' then r.season_primetime_rating else r.season_dupr_rating end) into v_eligibility_inputs from public.member_season_ratings r where r.member_id=(v_eligibility_snapshot->>'subject')::uuid and r.season_id=(v_eligibility_snapshot->>'seasonRef')::uuid;
  insert into view_as_private.audit_events(context_id,actor,effective_member,subject,event,capability,reason) values(p_context,p_actor,p_member,p_member,'SENSITIVE_READ','ELIGIBILITY_SELF',v_eligibility_snapshot->>'status');
  return jsonb_build_object('status',v_eligibility_snapshot->>'status','season',v_eligibility_snapshot->>'season','seasonRef',v_eligibility_snapshot->>'seasonRef','rating',p_query->>'rating')||coalesce(v_eligibility_inputs,jsonb_build_object('sourceIsNr',null,'rf',null,'value',null));
 end if;
 p_query:=p_query-'_view_proof';
 if v_proof is null or (v_proof->>'actor')::uuid is distinct from p_actor
 or (v_proof->>'id')::uuid is distinct from p_context
 or (v_proof->>'target')::uuid is distinct from p_member
 or not view_as_private.lock_authorization(v_proof,'identity') then return jsonb_build_object('status','denied');end if;
 if p_actor is null then return jsonb_build_object('status','denied'); end if;
 -- The preceding context proof/lock remains authoritative; never infer the actor as SELF.
 v_role:=view_as_private.member_role(p_member);
 if v_role is not null then v_member:=p_member; end if;
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
 if not view_as_private.lock_authorization(v_proof,'subject',v_target) then return jsonb_build_object('status','not_found'); end if;
 if v_intent in ('SELF_RATING','PLAYER_RATING','PLAYER_CONTACT') then select trim(first_name||' '||last_name) into v_label from public.members where id=v_target; end if;
 v_query_started:=clock_timestamp();
 if v_intent='PLAYER_CONTACT' then
  select email into v_value from public.members where id=v_target and id=any(v_population) and is_active_member is true;
  -- Audit insert failure rolls back and prevents email disclosure.
  insert into view_as_private.audit_events(context_id,actor,effective_member,subject,event,capability,reason) values(p_context,p_actor,p_member,v_target,'SENSITIVE_READ',v_intent,case when nullif(v_value,'') is null then 'missing' else 'success' end);
  return jsonb_build_object('status',case when nullif(v_value,'') is null then 'missing' else 'success' end,'intent',v_intent,'label',v_label,'value',v_value,'subject',v_target,'relationship',v_relation,'resolutionMs',extract(epoch from(v_query_started-v_start))*1000,'queryMs',extract(epoch from(clock_timestamp()-v_query_started))*1000);
 end if;
 if v_intent in ('SELF_RATING','PLAYER_RATING') then
  select coalesce(jsonb_agg(x),'[]'::jsonb) into v_choices from (select s.id as season,s.name as label from public.seasons s where s.is_active is true
   and (v_intent='SELF_RATING' or v_role in ('league_manager','commissioner') or exists(select 1 from public.team_members tm join public.teams t on t.id=tm.team_id join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id where tm.member_id=v_target and tm.is_active is true and t.id=any(v_teams) and l.season_id=s.id)) order by s.name,s.id limit 5) x;
  if jsonb_array_length(v_choices)=0 then return jsonb_build_object('status','no_season','relationship',v_relation); end if;
  if v_rating is null or v_rating='clarify' then
   select jsonb_agg(jsonb_build_object('season',s->>'season','rating',r.kind,'label',r.label||' — '||(s->>'label')) order by s->>'label',r.kind)
   into v_choices from jsonb_array_elements(v_choices) s cross join (values ('season','Season DUPR'),('primetime','PrimeTime Season DUPR')) r(kind,label);
   return jsonb_build_object('status','ambiguous','choiceKind','rating and season','subject',v_target,'choices',v_choices,'relationship',v_relation);
  end if;
  if v_rating not in ('season','primetime') then return jsonb_build_object('status','unsupported');end if;
  if p_query?'season' then v_season:=(p_query->>'season')::uuid;
   if not exists(select 1 from jsonb_array_elements(v_choices) x where (x->>'season')::uuid=v_season) then return jsonb_build_object('status','denied'); end if;
  elsif jsonb_array_length(v_choices)>1 then return jsonb_build_object('status','ambiguous','choiceKind','season','subject',v_target,'choices',v_choices,'relationship',v_relation);
  else v_season:=(v_choices->0->>'season')::uuid; end if;
  if not view_as_private.lock_authorization(v_proof,'season',v_target,null,v_season) then return jsonb_build_object('status','no_season','relationship',v_relation); end if;
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
   return jsonb_build_object('status','ambiguous','choiceKind','team','choices',case when jsonb_array_length(v_choices)>5 then v_choices-5 else coalesce(v_choices,'[]'::jsonb) end,'moreChoices',jsonb_array_length(v_choices)>5,'subject',case when v_person_lookup then v_target else null end,'relationship',v_relation);
  else v_team:=v_teams[1]; end if;
  if not view_as_private.lock_authorization(v_proof,'team',v_target,v_team) then return jsonb_build_object('status','denied');end if;
  select t.name as team,d.name as division,l.name as league,s.name as season into v_context from public.teams t join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id
   where t.id=v_team and t.is_active is true and d.is_active is true and l.is_active is true and s.is_active is true
   and (v_role in ('league_manager','commissioner') or (v_role in ('captain','club_pro') and v_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id))
   or exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.member_id=v_member and tm.is_active is true));
  if not found then return jsonb_build_object('status','denied'); end if;
  if not view_as_private.lock_authorization(v_proof,'membership',v_member,v_team) and v_role not in ('league_manager','commissioner') and not exists(select 1 from public.teams t where t.id=v_team and v_role in ('captain','club_pro') and v_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id)) then return jsonb_build_object('status','denied'); end if;
  if v_person_lookup then
   if not view_as_private.lock_authorization(v_proof,'membership',v_target,v_team) then return jsonb_build_object('status','not_found'); end if;
  end if;
  v_result:=to_jsonb(v_context)||jsonb_build_object('status','success','intent',v_intent,'teamRef',v_team,'subject',case when v_person_lookup then v_target else null end,'relationship',v_relation);
  if v_intent='TEAM_ROSTER' then
   if p_query->>'projection'='count' then
    select count(*) into v_count from public.team_members tm join public.members m on m.id=tm.member_id where tm.team_id=v_team and tm.is_active is true and m.is_active_member is true;
    v_result:=v_result||jsonb_build_object('count',v_count);
   else
   select coalesce(jsonb_agg(x),'[]'::jsonb) into v_choices from (select trim(m.first_name||' '||m.last_name) as label from public.team_members tm join public.members m on m.id=tm.member_id where tm.team_id=v_team and tm.is_active is true and m.is_active_member is true order by m.last_name,m.first_name,m.id offset v_offset limit 26) x;
   v_result:=v_result||jsonb_build_object('players',case when jsonb_array_length(v_choices)>25 then v_choices-25 else v_choices end,'more',jsonb_array_length(v_choices)>25,'offset',v_offset);
   end if;
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
commit;
