-- LMS-0724 / 0.1.546: bounded authorization-row locks. LOCAL REVIEW ONLY.
-- Original migration is immutable. No data DML, public RLS policy changes or Auth access.
begin;
do $guard$ declare p pg_catalog.pg_proc; sig text; allowed oid[];begin
 select * into p from pg_catalog.pg_proc where oid='public.lms_view_as(text,jsonb)'::regprocedure;
 if pg_catalog.md5(p.prosrc) not in('b4d2b0a12d404aa15272146fa06d63dc','77ef613cac6db4df5e6849a686be0c26') or p.proowner<>'lms_view_as_executor'::regrole or not p.prosecdef or p.proconfig is distinct from array['search_path=""'] then raise exception 'View-As dispatcher drift';end if;
 select * into p from pg_catalog.pg_proc where oid='view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)'::regprocedure;
 if pg_catalog.md5(p.prosrc) not in('fd40f555e91de25b98344553b6a5ced3','47f7e2646aeeef5b25a842041412766b') or p.proowner<>current_user::regrole or p.prosecdef or p.proconfig is distinct from array['search_path=""'] then raise exception 'View-As lookup drift';end if;
 select * into p from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('view_as_private.lock_authorization(jsonb,text,uuid,uuid,uuid)');
 if found and (p.proowner<>current_user::regrole or not p.prosecdef or pg_catalog.md5(p.prosrc)<>'c19defb7b0f82ddd659dc38061ab4ef7' or p.proconfig is distinct from array['search_path=""']) then raise exception 'View-As lock helper collision/drift';end if;
 foreach sig in array array['public.lms_view_as(text,jsonb)','view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)','view_as_private.lock_authorization(jsonb,text,uuid,uuid,uuid)'] loop
  select * into p from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure(sig);
  if found then
   allowed:=array[p.proowner,case when sig='public.lms_view_as(text,jsonb)' then 'service_role'::regrole::oid else 'lms_view_as_executor'::regrole::oid end];
   if exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a where not(a.grantee=any(allowed)) or a.is_grantable) then raise exception 'View-As function ACL drift: %',sig;end if;
  end if;
 end loop;
end $guard$;
-- Source fragment for the reviewed corrective migration; never run separately.
create or replace function view_as_private.lock_authorization(
 p_proof jsonb, p_kind text, p_subject uuid default null, p_team uuid default null, p_season uuid default null
) returns boolean language plpgsql security definer set search_path='' as $$
declare c record; a uuid; r text; t uuid; intent text;
begin
 if p_proof is null or octet_length(p_proof::text)>4096
 or p_kind not in('identity','subject','season','team','membership') then return false;end if;
 -- Both handoff and established requests must possess the browser-bound proof.
 -- No arbitrary context ID or caller-supplied actor/target is sufficient.
 select x.id,x.actor,x.target,x.started_at,x.expires_at into c from view_as_private.contexts x
 where x.browser=p_proof->>'browser'
 and ((x.started_at is null and x.code=p_proof->>'code' and x.exchange_by>clock_timestamp())
   or (x.started_at is not null and x.context=p_proof->>'context'))
 and (not(p_proof?'id') or x.id=(p_proof->>'id')::uuid)
 and (not(p_proof?'actor') or x.actor=(p_proof->>'actor')::uuid)
 and (not(p_proof?'target') or x.target=(p_proof->>'target')::uuid)
 and x.ended_at is null and x.expires_at>clock_timestamp()
 for update;
 if not found then return false;end if;
 a:=view_as_private.actor_member(c.actor);r:=view_as_private.member_role(c.target);
 if a is null or coalesce(view_as_private.member_role(a) not in('commissioner','league_manager'),true) or r is null then return false;end if;
 -- Lock only the context's actor/target authorization records. No facts returned.
 perform 1 from public.members m where m.id in(a,c.target) order by m.id for share;
 perform 1 from public.user_roles u where u.member_id in(a,c.target) order by u.member_id,u.role for share;
 if a is distinct from view_as_private.actor_member(c.actor)
 or coalesce(view_as_private.member_role(a) not in('commissioner','league_manager'),true)
 or r is distinct from view_as_private.member_role(c.target)
 or c.expires_at<=clock_timestamp() then return false;end if;
 if p_kind='identity' then return true;end if;
 if c.started_at is null then return false;end if;
 intent:=p_proof->>'intent';
 if intent is null or intent not in('SELF_RATING','PLAYER_RATING','PLAYER_CONTACT','SELF_TEAM','TEAM_ROSTER','NEXT_MATCH') then return false;end if;
 t:=coalesce(p_subject,c.target);
 if p_kind='subject' then
  if t<>c.target then
   if r='player' or intent='SELF_RATING' then return false;end if;
   if r not in('commissioner','league_manager') then
    -- The exact subject must belong to a team granted to the EFFECTIVE user.
    -- Lock the granting membership and its active hierarchy, then recheck.
    perform 1 from public.team_members tm join public.teams z on z.id=tm.team_id
     join public.divisions d on d.id=z.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id
     where tm.member_id=t and tm.is_active and z.is_active and d.is_active and l.is_active and s.is_active
     and c.target in(z.captain_member_id,z.co_captain_member_id,z.co_captain_2_member_id,z.club_pro_member_id)
     order by z.id for share of tm,z,d,l,s;
    if not found then return false;end if;
   end if;
  end if;
  perform 1 from public.members where id=t and is_active_member for share;
  return found and c.expires_at>clock_timestamp();
 elsif p_kind='season' then
  if p_season is null or intent not in('SELF_RATING','PLAYER_RATING') then return false;end if;
  if t<>c.target and (r='player' or intent='SELF_RATING') then return false;end if;
  if intent<>'SELF_RATING' and r not in('commissioner','league_manager') then
   perform 1 from public.team_members tm join public.teams z on z.id=tm.team_id
    join public.divisions d on d.id=z.division_id join public.leagues l on l.id=d.league_id
    where tm.member_id=t and tm.is_active and z.is_active and d.is_active and l.is_active and l.season_id=p_season
    and c.target in(z.captain_member_id,z.co_captain_member_id,z.co_captain_2_member_id,z.club_pro_member_id)
    order by z.id for share of tm,z,d,l;
   if not found then return false;end if;
  end if;
  perform 1 from public.seasons where id=p_season and is_active for share;
  return found and c.expires_at>clock_timestamp();
 elsif p_kind in('team','membership') then
  if p_team is null or intent not in('SELF_TEAM','TEAM_ROSTER','NEXT_MATCH') then return false;end if;
  if t<>c.target and r='player' then return false;end if;
  perform 1 from public.teams z join public.divisions d on d.id=z.division_id
   join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id
   where z.id=p_team and z.is_active and d.is_active and l.is_active and s.is_active
   and (r in('commissioner','league_manager') or (r in('captain','club_pro') and c.target in(z.captain_member_id,z.co_captain_member_id,z.co_captain_2_member_id,z.club_pro_member_id))
     or exists(select 1 from public.team_members tm where tm.team_id=z.id and tm.member_id=c.target and tm.is_active))
   for share of z,d,l,s;
  if not found then return false;end if;
  if p_kind='membership' then
   perform 1 from public.team_members where team_id=p_team and member_id=t and is_active for share;
   return found and c.expires_at>clock_timestamp();
  end if;
  -- A player roster membership used as the grant cannot disappear mid-read.
  if r='player' then
   perform 1 from public.team_members where team_id=p_team and member_id=c.target and is_active for share;
   if not found then return false;end if;
  end if;
  return c.expires_at>clock_timestamp();
 end if;
 return false;
end $$;
revoke all on function view_as_private.lock_authorization(jsonb,text,uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function view_as_private.lock_authorization(jsonb,text,uuid,uuid,uuid) to lms_view_as_executor;

create or replace function view_as_private.lookup(p_actor uuid,p_member uuid,p_context uuid,p_request uuid,p_query jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_member uuid; v_role text; v_intent text:=p_query->>'intent'; v_target uuid; v_team uuid;
 v_season uuid; v_name text; v_label text; v_rating text:=p_query->>'rating'; v_value text;
 v_teams uuid[]; v_population uuid[]; v_choices jsonb; v_context record; v_match record;
 v_count int; v_choice_offset int:=coalesce((p_query->>'choiceOffset')::int,0); v_offset int:=coalesce((p_query->>'offset')::int,0); v_relation text; v_tz text;
 v_person_lookup boolean; v_subject_kind text:=p_query->>'subjectKind';
 v_proof jsonb:=p_query->'_view_proof'; v_result jsonb; v_query_started timestamptz; v_start timestamptz:=clock_timestamp();
begin
 p_query:=p_query-'_view_proof';
 if v_proof is null or (v_proof->>'actor')::uuid is distinct from p_actor
 or (v_proof->>'id')::uuid is distinct from p_context
 or (v_proof->>'target')::uuid is distinct from p_member
 or not view_as_private.lock_authorization(v_proof,'identity') then return jsonb_build_object('status','denied');end if;
 if p_actor is null then return jsonb_build_object('status','denied'); end if;
 select u.member_id,u.role into v_member,v_role from public.user_roles u join public.members m on m.id=u.member_id
 where u.member_id=p_member and m.is_active_member is true and u.role in ('player','captain','club_pro','league_manager','commissioner') order by case u.role when 'commissioner' then 5 when 'league_manager' then 4 when 'club_pro' then 3 when 'captain' then 2 else 1 end desc limit 1;
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
  if v_rating not in ('season','primetime') or v_rating is null then return jsonb_build_object('status','rating_clarification','subject',v_target,'relationship',v_relation); end if;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into v_choices from (select s.id as season,s.name as label from public.seasons s where s.is_active is true
   and (v_intent='SELF_RATING' or v_role in ('league_manager','commissioner') or exists(select 1 from public.team_members tm join public.teams t on t.id=tm.team_id join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id where tm.member_id=v_target and tm.is_active is true and t.id=any(v_teams) and l.season_id=s.id)) order by s.name,s.id limit 5) x;
  if jsonb_array_length(v_choices)=0 then return jsonb_build_object('status','no_season','relationship',v_relation); end if;
  if p_query?'season' then v_season:=(p_query->>'season')::uuid;
   if not exists(select 1 from jsonb_array_elements(v_choices) x where (x->>'season')::uuid=v_season) then return jsonb_build_object('status','denied'); end if;
  elsif jsonb_array_length(v_choices)>1 then return jsonb_build_object('status','ambiguous','subject',v_target,'choices',v_choices,'relationship',v_relation);
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
   return jsonb_build_object('status','ambiguous','choices',case when jsonb_array_length(v_choices)>5 then v_choices-5 else coalesce(v_choices,'[]'::jsonb) end,'moreChoices',jsonb_array_length(v_choices)>5,'subject',case when v_person_lookup then v_target else null end,'relationship',v_relation);
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
-- Retain original invoker/owner/ACL; no public helper or signature added.
grant create on schema public to lms_view_as_executor;
select pg_catalog.set_config('lms0724.migration_operator',current_user,true);
set local role lms_view_as_executor;
create or replace function public.lms_view_as(p_op text,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $corrected$
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
 if not view_as_private.lock_authorization(p_input,'identity') then return jsonb_build_object('denied',true);end if;
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
  result:=view_as_private.lookup(c.actor,c.target,c.id,(p_input->>'request')::uuid,(p_input->'query')||jsonb_build_object('_view_proof',(p_input-'query')||jsonb_build_object('target',c.target,'intent',p_input->'query'->>'intent')));
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
end $corrected$;
select pg_catalog.set_config('role',pg_catalog.current_setting('lms0724.migration_operator'),true);
revoke create on schema public from lms_view_as_executor;
-- Locking moved behind context proof; remove every former operational UPDATE grant.
revoke update(id) on public.members,public.seasons,public.leagues,public.divisions,public.teams from lms_view_as_executor;
revoke update(member_id) on public.user_roles,public.team_members from lms_view_as_executor;
commit;
