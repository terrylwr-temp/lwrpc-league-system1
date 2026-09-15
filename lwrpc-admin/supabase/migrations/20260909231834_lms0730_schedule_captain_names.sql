-- LMS-0730 / 0.1.552. Local candidate only; requires separate production approval.
begin;
do $guard$ begin
 if not exists(select 1 from pg_roles where rolname='lms_view_as_reader' and not rolsuper and not rolinherit and not rolcreaterole and not rolcreatedb and not rolcanlogin and not rolreplication and not rolbypassrls) then raise exception 'LMS-0730 reader drift';end if;
 if exists(select 1 from pg_auth_members where member='lms_view_as_reader'::regrole or roleid='lms_view_as_reader'::regrole and member<>'postgres'::regrole) then raise exception 'LMS-0730 membership drift';end if;
 if has_schema_privilege('anon','lms_read_private','USAGE') or has_schema_privilege('authenticated','lms_read_private','USAGE') or has_schema_privilege('lms_view_as_reader','lms_read_private','CREATE') then raise exception 'LMS-0730 schema drift';end if;
 if not exists(select 1 from pg_proc where oid='view_as_private.page_read(jsonb,text,jsonb)'::regprocedure and proowner='lms_view_as_reader'::regrole and prosecdef and proconfig=array['search_path=""']) then raise exception 'LMS-0730 wrapper drift';end if;
 if has_schema_privilege('lms_view_as_reader','view_as_private','CREATE') or not has_function_privilege('lms_view_as_executor','view_as_private.page_read(jsonb,text,jsonb)','EXECUTE') then raise exception 'LMS-0730 wrapper privilege drift';end if;
end $guard$;
-- BEGIN SOURCE GUARDS
do $check$ declare p pg_proc;begin select * into p from pg_proc where oid=to_regprocedure('view_as_private.page_read(jsonb,text,jsonb)');if found then
 if p.proowner<>'lms_view_as_reader'::regrole or p.prosecdef is distinct from true or p.proconfig is distinct from array['search_path=""'] or md5(p.prosrc) not in('7d3b56341d43c2c0e77064988aba14a7','dd863d21b369c899fd713573ef3f05db') then raise exception 'LMS-0730 function drift';end if;
 if exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee not in('lms_view_as_reader'::regrole,'lms_view_as_executor'::regrole) or a.is_grantable) then raise exception 'LMS-0730 ACL drift';end if;
 end if;end $check$;
do $check$ declare p pg_proc;begin select * into p from pg_proc where oid=to_regprocedure('lms_read_private.schedule_captains(jsonb,jsonb)');if found then
 if p.proowner<>'lms_view_as_reader'::regrole or p.prosecdef is distinct from false or p.proconfig is distinct from array['search_path=""'] or md5(p.prosrc) not in('984bacdc3a1397f30f585b5f782983d9') then raise exception 'LMS-0730 function drift';end if;
 if exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee not in('lms_view_as_reader'::regrole) or a.is_grantable) then raise exception 'LMS-0730 ACL drift';end if;
 end if;end $check$;
-- END SOURCE GUARDS
grant lms_view_as_reader to postgres with admin false, inherit false, set true;
grant create on schema lms_read_private to lms_view_as_reader;
grant create on schema view_as_private to lms_view_as_reader;
set local role lms_view_as_reader;
create or replace function lms_read_private.schedule_captains(p_viewer jsonb,p_args jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $fn$
declare division uuid; result jsonb;
begin
 if p_args is null or jsonb_typeof(p_args)<>'object' or not(p_args?'divisionId') or exists(select 1 from jsonb_object_keys(p_args) k where k<>'divisionId')
 or coalesce(p_args->>'divisionId','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
 then raise exception 'Invalid schedule name scope';end if;
 division:=(p_args->>'divisionId')::uuid;
 -- Same active division selector, or an existing target-linked initial schedule.
 if not exists(select 1 from public.divisions d join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id
 where d.id=division and ((d.is_active is not false and l.is_active is not false and s.is_active is not false)
 or exists(select 1 from public.teams t where t.division_id=d.id and t.id in(select value::uuid from jsonb_array_elements_text(p_viewer->'teams')))))
 then raise exception 'Schedule scope denied';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,
 'captain',(select jsonb_build_object('id',m.id,'first_name',m.first_name,'last_name',m.last_name,'full_name',m.full_name) from public.members m where m.id=t.captain_member_id),
 'co_captain_1',(select jsonb_build_object('id',m.id,'first_name',m.first_name,'last_name',m.last_name,'full_name',m.full_name) from public.members m where m.id=t.co_captain_member_id),
 'co_captain_2',(select jsonb_build_object('id',m.id,'first_name',m.first_name,'last_name',m.last_name,'full_name',m.full_name) from public.members m where m.id=t.co_captain_2_member_id)) order by t.id),'[]'::jsonb)
 into result from public.teams t where t.division_id=division and t.is_active is true;
 return jsonb_build_object('teams',result);
end $fn$;
revoke all on function lms_read_private.schedule_captains(jsonb,jsonb) from public,anon,authenticated,service_role,lms_view_as_executor;
create or replace function view_as_private.page_read(p_proof jsonb,p_contract text,p_args jsonb) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare v jsonb; result jsonb;
begin
 if p_contract='schedule_captains' then
  v:=lms_read_private.lock_viewer(p_proof,'dashboard','{}');
  result:=lms_read_private.schedule_captains(v,p_args);
  perform lms_read_private.lock_viewer(p_proof,'dashboard','{}');
  return result;
 end if;
 v:=lms_read_private.lock_viewer(p_proof,p_contract,p_args);
 result:=lms_read_private.competition(v,p_contract,p_args)||lms_read_private.people(v,p_contract,p_args);
 perform lms_read_private.lock_viewer(p_proof,p_contract,p_args);
 return jsonb_build_object('viewer',v,'tables',result);
end $fn$;
reset role;
revoke create on schema lms_read_private from lms_view_as_reader;
revoke create on schema view_as_private from lms_view_as_reader;
revoke lms_view_as_reader from postgres granted by postgres;
commit;
