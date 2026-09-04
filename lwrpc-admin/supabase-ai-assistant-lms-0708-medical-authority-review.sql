-- LMS-0708 — focused Stage 3 continuation matcher correction.
-- Apply this migration after the deployed application contains the matching
-- JavaScript change. It updates only the existing protected RPC definition;
-- it does not touch document data, versions, chunks, embeddings, or grants.

begin;

do $$
declare
  function_definition text;
  old_activity_pattern constant text := 'matches?';
  corrected_activity_pattern constant text := 'match(?:es)?';
begin
  select pg_get_functiondef(
    'public.search_ai_official_chunks(extensions.vector,text,text,text,text,uuid,uuid,uuid,uuid,text,integer)'::regprocedure
  ) into function_definition;

  if position(corrected_activity_pattern in function_definition) > 0 then
    raise notice 'LMS-0708 continuation matcher is already installed.';
    return;
  end if;

  if position(old_activity_pattern in function_definition) = 0 then
    raise exception 'LMS-0708 expected the existing Stage 3 activity matcher, but it was not found. Stop and review the deployed function before changing it.';
  end if;

  execute replace(function_definition, old_activity_pattern, corrected_activity_pattern);
end;
$$;

commit;
