-- Keep the existing RPC contract while removing its privileged body from the
-- exposed public schema. This migration changes function/schema metadata only.
begin;

do $$
begin
  if to_regnamespace('ratings_roster_policy_private') is not null then
    raise exception 'Roster policy private schema already exists; review before applying';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'season_ratings_roster_policy'
      and p.pronargs = 0
      and p.prorettype = 'pg_catalog.jsonb'::pg_catalog.regtype
      and p.prosecdef
      and pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
      and p.proconfig @> array['search_path=""']::text[]
      and position('ai_live_private.resolve_identity(auth.uid())' in p.prosrc) > 0
      and position('ratings_workflow_private.policy()' in p.prosrc) > 0
  ) then
    raise exception 'Roster policy implementation differs from the reviewed baseline';
  end if;
end;
$$;

create schema ratings_roster_policy_private authorization postgres;
revoke all on schema ratings_roster_policy_private from public, anon, authenticated, service_role;
grant usage on schema ratings_roster_policy_private to authenticated;

-- Moving the original function retains its reviewed authorization body, owner,
-- return type, and empty search_path. Establish its ACL explicitly afterward.
alter function public.season_ratings_roster_policy()
  set schema ratings_roster_policy_private;
revoke all on function ratings_roster_policy_private.season_ratings_roster_policy()
  from public, anon, authenticated, service_role;
grant execute on function ratings_roster_policy_private.season_ratings_roster_policy()
  to authenticated;

create function public.season_ratings_roster_policy()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select ratings_roster_policy_private.season_ratings_roster_policy();
$$;
revoke all on function public.season_ratings_roster_policy()
  from public, anon, authenticated, service_role;
grant execute on function public.season_ratings_roster_policy()
  to authenticated;

notify pgrst, 'reload schema';
commit;
