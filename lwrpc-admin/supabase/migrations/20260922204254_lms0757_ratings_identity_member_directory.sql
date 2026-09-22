-- LMS-0757: resolve one CSV upload row to at most one LMS member and make
-- Current Rosters and duplicate-ID review precise. No business rows change.
begin;

do $migration$
declare
  plan_oid oid;
  plan_source text;
  plan_definition text;
  old_candidates text := $old$
  select coalesce(jsonb_agg(coalesce(m,'{}')||jsonb_build_object('incoming',u,'uploadMatches',(select count(*) from jsonb_array_elements(p_upload) z where z->>'duprId'=u->>'duprId')) order by u->>'line'),'[]') into candidates
  from jsonb_array_elements(p_upload) u left join jsonb_array_elements(ctx->'members') m on m->>'duprId'=u->>'duprId';$old$;
  new_candidates text := $new$
  with upload_rows as (
    select u.value incoming,u.ordinal,
           upper(btrim(u.value->>'duprId')) key,
           count(*) over(partition by upper(btrim(u.value->>'duprId'))) upload_matches
    from jsonb_array_elements(p_upload) with ordinality u(value,ordinal)
  ), member_matches as (
    select m.value->>'duprId' key,
           count(*) filter(where m.value->>'active'='true') active_count,
           count(*) filter(where m.value->>'active' is distinct from 'true') inactive_count,
           (jsonb_agg(m.value order by m.value->>'memberId') filter(where m.value->>'active'='true'))->0 active_member,
           (jsonb_agg(m.value order by m.value->>'memberId') filter(where m.value->>'active' is distinct from 'true'))->0 inactive_member
    from jsonb_array_elements(ctx->'members') m(value)
    where nullif(m.value->>'duprId','') is not null
    group by m.value->>'duprId'
  )
  select coalesce(jsonb_agg(coalesce(
    case when mm.active_count=1 then mm.active_member
         when mm.active_count=0 and mm.inactive_count=1 then mm.inactive_member
         else null end,'{}'::jsonb
  )||jsonb_build_object(
    'incoming',u.incoming,
    'uploadMatches',u.upload_matches,
    'uploadIdentityAmbiguous',coalesce(mm.active_count>1 or (mm.active_count=0 and mm.inactive_count>1),false)
  ) order by u.ordinal),'[]'::jsonb) into candidates
  from upload_rows u left join member_matches mm on mm.key=u.key;$new$;
  old_identity text := $old$  if row->>'memberId' is null then reason:='DUPR ID not found';$old$;
  new_identity text := $new$  if p_operation='upload' and (coalesce(row->'incoming'->>'duprId','')='' or (row->>'uploadMatches')::int<>1 or row->>'uploadIdentityAmbiguous'='true') then action:='REVIEW';reason:='Ambiguous DUPR identity';
  elsif row->>'memberId' is null then reason:='DUPR ID not found';$new$;
  old_unique text := $old$elsif row->>'unique' is distinct from 'true' or (p_operation='upload' and (coalesce(row->'incoming'->>'duprId','')='' or (row->>'uploadMatches')::int<>1)) then action:='REVIEW';reason:='Ambiguous DUPR identity';$old$;
  new_unique text := $new$elsif p_operation='transfer' and row->>'unique' is distinct from 'true' then action:='REVIEW';reason:='Ambiguous DUPR identity';$new$;
begin
  select p.oid,replace(p.prosrc,chr(13),'') into plan_oid,plan_source from pg_proc p
  where p.oid=to_regprocedure('ratings_workflow_private.plan(uuid,uuid,text,jsonb)');
  if plan_oid is null then raise exception 'ratings workflow planner missing'; end if;
  if position(new_candidates in plan_source)=0 then
    if position(old_candidates in plan_source)=0 or position(old_identity in plan_source)=0
       or position(old_unique in plan_source)=0 then
      raise exception 'ratings workflow planner differs from reviewed Production definition';
    end if;
    plan_definition:=replace(pg_get_functiondef(plan_oid),chr(13),'');
    plan_definition:=replace(plan_definition,old_candidates,new_candidates);
    plan_definition:=replace(plan_definition,old_identity,new_identity);
    plan_definition:=replace(plan_definition,old_unique,new_unique);
    execute plan_definition;
  elsif position(new_identity in plan_source)=0 or position(new_unique in plan_source)=0 then
    raise exception 'ratings workflow planner is in a mixed state';
  end if;
end
$migration$;

do $migration$
declare
  old_oid oid;
  new_oid oid;
  old_source text;
  new_source text;
  definition text;
  old_leadership text := $old$
        or exists (
          select 1 from public.teams assigned_team
          where assigned_team.is_active is not false
            and (
              assigned_team.captain_member_id = m.id
              or assigned_team.co_captain_member_id = m.id
              or assigned_team.co_captain_2_member_id = m.id
              or assigned_team.club_pro_member_id = m.id
            )
        )$old$;
  old_active text := 'where (p_include_inactive or m.is_active_member is not false)';
  new_active text := 'where (p_include_inactive or p_duplicate_dupr_only or m.is_active_member is not false)';
  old_roster text := 'and (not p_current_roster_only';
  new_roster text := $new$and (not p_duplicate_dupr_only or upper(btrim(m.dupr_id)) in (
        select upper(btrim(duplicate.dupr_id)) from public.members duplicate
        where nullif(btrim(duplicate.dupr_id),'') is not null
        group by upper(btrim(duplicate.dupr_id)) having count(*)>1
      ))
      and (not p_current_roster_only$new$;
begin
  old_oid:=to_regprocedure('public.admin_member_directory_page(text,boolean,boolean,text,text,integer,integer)');
  new_oid:=to_regprocedure('public.admin_member_directory_page(text,boolean,boolean,text,text,integer,integer,boolean)');
  if old_oid is not null then
    select replace(p.prosrc,chr(13),'') into old_source from pg_proc p where p.oid=old_oid;
    if position(old_leadership in old_source)=0 or position(old_active in old_source)=0
       or position(old_roster in old_source)=0 then
      raise exception 'member directory differs from reviewed Production definition';
    end if;
    if new_oid is not null then raise exception 'member directory has ambiguous signatures'; end if;
    definition:=replace(pg_get_functiondef(old_oid),chr(13),'');
    definition:=replace(definition,
      'p_limit integer DEFAULT 100)',
      'p_limit integer DEFAULT 100, p_duplicate_dupr_only boolean DEFAULT false)');
    definition:=replace(definition,old_active,new_active);
    definition:=replace(definition,old_roster,new_roster);
    definition:=replace(definition,old_leadership,'');
    execute definition;
    drop function public.admin_member_directory_page(text,boolean,boolean,text,text,integer,integer);
    revoke all on function public.admin_member_directory_page(text,boolean,boolean,text,text,integer,integer,boolean) from public,anon,authenticated;
    grant execute on function public.admin_member_directory_page(text,boolean,boolean,text,text,integer,integer,boolean) to service_role;
  elsif new_oid is null then
    raise exception 'member directory function missing';
  else
    select replace(p.prosrc,chr(13),'') into new_source from pg_proc p where p.oid=new_oid;
    if position(new_active in new_source)=0 or position(new_roster in new_source)=0
       or position(old_leadership in new_source)>0 then
      raise exception 'member directory is not in the reviewed state';
    end if;
  end if;
end
$migration$;

commit;
