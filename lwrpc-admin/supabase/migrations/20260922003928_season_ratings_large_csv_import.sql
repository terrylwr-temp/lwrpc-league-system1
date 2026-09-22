-- Reconcile the ratings workflow planner with the reviewed production capacity.
-- This migration changes only the bounded upload count and function timeout.
begin;

do $migration$
declare
  function_oid oid;
  function_source text;
  function_definition text;
  function_config text[];
begin
  select p.oid, p.prosrc, p.proconfig
    into function_oid, function_source, function_config
  from pg_proc p
  where p.oid = to_regprocedure('ratings_workflow_private.plan(uuid,uuid,text,jsonb)');

  if function_oid is null then
    raise exception 'ratings workflow plan function is missing';
  end if;

  if position('jsonb_array_length(p_upload)>1000' in function_source) > 0 then
    if position('jsonb_array_length(p_upload)>5000' in function_source) > 0 then
      raise exception 'ratings workflow plan contains mixed upload bounds';
    end if;
    function_definition := pg_get_functiondef(function_oid);
    function_definition := replace(
      function_definition,
      'jsonb_array_length(p_upload)>1000',
      'jsonb_array_length(p_upload)>5000'
    );
    execute function_definition;
  elsif position('jsonb_array_length(p_upload)>5000' in function_source) = 0 then
    raise exception 'ratings workflow plan upload bound is not a reviewed state';
  end if;

  alter function ratings_workflow_private.plan(uuid, uuid, text, jsonb)
    set statement_timeout = '20s';

  select p.prosrc, p.proconfig
    into function_source, function_config
  from pg_proc p
  where p.oid = to_regprocedure('ratings_workflow_private.plan(uuid,uuid,text,jsonb)');

  if position('jsonb_array_length(p_upload)>5000' in function_source) = 0
     or position('jsonb_array_length(p_upload)>1000' in function_source) > 0 then
    raise exception 'ratings workflow plan upload bound reconciliation failed';
  end if;
  if not ('statement_timeout=20s' = any(coalesce(function_config, array[]::text[]))) then
    raise exception 'ratings workflow plan timeout reconciliation failed';
  end if;
end
$migration$;

commit;
