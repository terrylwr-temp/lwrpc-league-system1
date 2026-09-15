-- Restore accepted pair helper only; dispatcher and existing audit records are retained.
begin;
do $gate$
begin
 if not exists(select 1 from pg_proc where oid='ai_live_private.eligibility_pair(uuid,uuid,jsonb)'::regprocedure
   and not prosecdef and proconfig @> array['search_path=""']
   and md5(regexp_replace(prosrc,'\s+',' ','g')) in ('040cd8372a24b91ac6ab07d40947dc75','ed8f36ce002a1c051a9157e2a4242763'))
 then raise exception 'Accepted pair function drift';end if;
end $gate$;

create or replace function ai_live_private.eligibility_pair(p_actor uuid,p_request uuid,p_query jsonb)

returns jsonb language plpgsql security invoker set search_path='' as $pair$

declare

 identity jsonb; actor_member uuid; actor_role text; target uuid; subjects uuid[]:='{}';

 subject jsonb; name_text text; choices jsonb; slot integer:=0; matches integer;

 version_id uuid; division_id uuid; v_season uuid; rating_kind text; division_config jsonb; snapshot jsonb; fingerprint text;

 phase text:=coalesce(p_query->>'phase','resolve'); outcome text; item jsonb;

begin

 if p_actor is null or p_request is null or jsonb_typeof(p_query) is distinct from 'object'

 or p_query->>'intent' is distinct from 'ELIGIBILITY_PAIR' or octet_length(p_query::text)>4096

 or coalesce(p_query->>'origin','') not in ('player_interface','manager_test')

 or phase not in ('resolve','read','audit')

 or exists(select 1 from jsonb_object_keys(p_query) k where k not in ('intent','origin','phase','subjects','division','rulesVersion','fingerprint','outcome','basis','team'))

 or jsonb_typeof(p_query->'subjects') is distinct from 'array' or jsonb_array_length(p_query->'subjects')<>2

 then return jsonb_build_object('status','denied'); end if;

 identity:=ai_live_private.resolve_identity(p_actor); actor_member:=(identity->>'memberId')::uuid;actor_role:=identity->>'role';

 if actor_member is null or coalesce(actor_role,'') not in ('commissioner','league_manager','captain','club_pro') or (p_query->>'origin'='manager_test' and actor_role not in ('commissioner','league_manager')) then

  insert into ai_live_private.access_audit(actor,request_id,intent,decision,pair_context) values(p_actor,p_request,'ELIGIBILITY_PAIR','denied',jsonb_build_object('effectiveMember',actor_member));

  return jsonb_build_object('status','denied');

 end if;

 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,723));

 if (select count(*) from ai_live_private.attempts where actor=p_actor and at>clock_timestamp()-interval '1 minute')>=10

 or (select count(*) from ai_live_private.attempts where actor=p_actor and at>clock_timestamp()-interval '1 day')>=100

 then return jsonb_build_object('status','rate_limited'); end if;

 insert into ai_live_private.attempts(actor,contact) values(p_actor,false);

 for subject in select value from jsonb_array_elements(p_query->'subjects') loop

  if jsonb_typeof(subject) is distinct from 'object' or coalesce(subject->>'kind','') not in ('SELF','NAME')

   or exists(select 1 from jsonb_object_keys(subject) k where k not in ('kind','name','id'))

   or (subject->>'kind'='SELF' and (subject?'name' or subject?'id')) then return jsonb_build_object('status','denied');end if;

  if subject->>'kind'='SELF' then target:=actor_member;

  else

   name_text:=lower(regexp_replace(btrim(subject->>'name'),'\s+',' ','g'));

   if name_text is null or length(name_text)<3 or length(name_text)>100 or name_text ~ '[%_@]' then return jsonb_build_object('status','not_found','slot',slot);end if;

   -- Authorize each population independently; a selected A never grants access to B.

   with population as (

    select m.id,btrim(m.first_name||' '||m.last_name) label from public.members m

    where m.is_active_member is true and (actor_role in ('commissioner','league_manager') or m.id=actor_member or exists(

     select 1 from public.team_members tm join public.teams t on t.id=tm.team_id

     join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id

     where tm.member_id=m.id and tm.is_active is true and t.is_active is true and d.is_active is true and l.is_active is true and s.is_active is true

     and actor_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id)))

   ), exact as (select * from population where lower(label)=name_text),

   matched as (select * from population where lower(label) like '%'||name_text||'%' and (not(subject?'id') or id=(subject->>'id')::uuid))

   select case when subject?'id' then (select count(*) from matched) else (select count(*) from exact) end,

    case when subject?'id' then (select min(id::text)::uuid from matched) else (select min(id::text)::uuid from exact) end,

    (select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select * from matched order by label,id limit 5)x)

   into matches,target,choices;

   if matches<>1 then

    if subject?'id' or jsonb_array_length(choices)=0 then return jsonb_build_object('status','not_found','slot',slot);end if;

    if (select count(distinct x->>'label') from jsonb_array_elements(choices)x)<>jsonb_array_length(choices) then choices:='[]';end if;

    return jsonb_build_object('status','ambiguous','slot',slot,'choices',choices);

   end if;

  end if;

  perform 1 from public.members where id=target and is_active_member is true for share;

  if not found then return jsonb_build_object('status','not_found','slot',slot);end if;

  if actor_role not in ('commissioner','league_manager') and target<>actor_member then

   perform 1 from public.team_members tm join public.teams t on t.id=tm.team_id

    join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id

    where tm.member_id=target and tm.is_active is true and t.is_active is true and d.is_active is true and l.is_active is true and s.is_active is true

    and actor_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id)

    for share of tm,t,d,l,s;

   if not found then return jsonb_build_object('status','denied');end if;

  end if;

  subjects:=array_append(subjects,target);slot:=slot+1;

 end loop;

 if subjects[1]=subjects[2] then return jsonb_build_object('status','same_player');end if;

 if phase='resolve' then

  select jsonb_agg(jsonb_build_object('id',m.id,'label',btrim(m.first_name||' '||m.last_name)) order by array_position(subjects,m.id)) into snapshot from public.members m where m.id=any(subjects);

  -- Page team context is only a hint until its hierarchy and access are verified here.

  division_id:=null;

  if p_query?'team' then

   select d.id into division_id from public.teams t join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id

   where t.id=(p_query->>'team')::uuid and t.is_active is true and d.is_active is true and l.is_active is true and s.is_active is true

   and (actor_role in ('commissioner','league_manager') or actor_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id));

   if division_id is null then return jsonb_build_object('status','denied');end if;

  end if;

  insert into ai_live_private.access_audit(actor,target,request_id,intent,decision,pair_context) select p_actor,s,p_request,'ELIGIBILITY_PAIR','success',jsonb_build_object('phase','resolve','effectiveMember',actor_member) from unnest(subjects)s;

  return jsonb_build_object('status','resolved','players',snapshot,'division',division_id);

 end if;

 select d.id,l.season_id,case d.rating_type when 'dupr' then 'season' when 'primetime' then 'primetime' else null end into division_id,v_season,rating_kind

 from public.divisions d join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id

 where d.id=(p_query->>'division')::uuid and d.is_active is true and l.is_active is true and s.is_active is true;

 select jsonb_build_object('min',d.min_dupr,'max',d.max_dupr,'pair',d.team_dupr_max,'rating',rating_kind) into division_config from public.divisions d where d.id=division_id;

 if division_id is null or rating_kind is null then return jsonb_build_object('status','context_missing');end if;

 select count(*),min(d.active_version_id::text)::uuid into matches,version_id from public.ai_documents d join public.ai_document_versions v on v.id=d.active_version_id

 where d.status='active' and d.document_type='league_rules' and v.processing_status='ready';

 if matches<>1 or version_id is distinct from (p_query->>'rulesVersion')::uuid then return jsonb_build_object('status','stale_rules');end if;

 -- Non-managers may read only season facts for which the existing relationship grants access.

 if actor_role not in ('commissioner','league_manager') and exists(select 1 from unnest(subjects)x where x<>actor_member and not exists(

  select 1 from public.team_members tm join public.teams t on t.id=tm.team_id join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id

  where tm.member_id=x and tm.is_active is true and t.is_active is true and d.is_active is true and l.is_active is true and s.is_active is true and s.id=v_season

  and actor_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id))) then return jsonb_build_object('status','denied');end if;

 select jsonb_agg(jsonb_build_object('id',m.id,'label',btrim(m.first_name||' '||m.last_name),

 'value',case rating_kind when 'primetime' then r.season_primetime_rating else r.season_dupr_rating end,

 'rf',r.dupr_reliability_rating,'sourceIsNr',case when upper(btrim(r.dupr_doubles_rating))='NR' then true when btrim(r.dupr_doubles_rating) ~ '^[0-9]+([.][0-9]+)?$' then false else null end,

 'placements',(select coalesce(jsonb_agg(x.division_id order by x.division_id),'[]') from (

 select distinct d.id division_id from public.team_members tm join public.teams t on t.id=tm.team_id join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id

 where tm.member_id=m.id and tm.is_active is true and t.is_active is true and d.is_active is true and l.is_active is true and l.season_id=v_season)x)) order by m.id)

 into snapshot from public.members m left join public.member_season_ratings r on r.member_id=m.id and r.season_id=v_season where m.id=any(subjects);

 if jsonb_array_length(snapshot)<>2 then return jsonb_build_object('status','missing');end if;

 fingerprint:=md5(jsonb_build_object('players',snapshot,'division',division_id,'season',v_season,'version',version_id,'configuration',division_config)::text);

 if phase='audit' then

  outcome:=p_query->>'outcome';

  if p_query->>'fingerprint' is distinct from fingerprint then return jsonb_build_object('status','stale_facts');end if;

  if outcome is null or outcome not in ('RATING_PAIR_ELIGIBLE','NOT_ELIGIBLE','CANNOT_DETERMINE') or jsonb_typeof(p_query->'basis') is distinct from 'array' or jsonb_array_length(p_query->'basis')>16

   or exists(select 1 from jsonb_array_elements_text(p_query->'basis')x where x !~ '^[0-9]+([.][0-9]+)*$') then return jsonb_build_object('status','denied');end if;

 else outcome:='FACTS_READ';end if;

 insert into ai_live_private.access_audit(actor,target,request_id,intent,decision,pair_context)

 select p_actor,s,p_request,'ELIGIBILITY_PAIR','success',jsonb_build_object('phase',phase,'effectiveMember',actor_member,'subjects',(select jsonb_agg(x order by x) from unnest(subjects)x),'division',division_id,'season',v_season,'rulesVersion',version_id,'basis',coalesce(p_query->'basis','[]'),'result',outcome) from unnest(subjects)s;

 if phase='audit' then return jsonb_build_object('status','audited');end if;

 return jsonb_build_object('status','success','players',snapshot,'fingerprint',fingerprint,'season',v_season,'division',division_id,'rating',rating_kind,'rulesVersion',version_id,'configuration',division_config);

exception when invalid_text_representation or numeric_value_out_of_range then return jsonb_build_object('status','denied');

end $pair$;
revoke all on function ai_live_private.eligibility_pair(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function ai_live_private.eligibility_pair(uuid,uuid,jsonb) to service_role;
commit;
