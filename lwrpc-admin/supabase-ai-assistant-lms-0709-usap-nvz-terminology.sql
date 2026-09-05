-- LMS-0709 — bounded kitchen/NVZ terminology and applicability correction.
-- Apply after the LMS-0709 application deployment. This alters only the
-- existing Stage 3 retrieval RPC. It does not touch documents, versions,
-- chunks, embeddings, metadata, storage, or grants.

begin;

do $lms0709$
declare
  function_definition text;
  old_input constant text := $fragment$
      ) as continuation_intent,
      (
        ni.query_lower ~ '\m(?:when|deadline|due|latest|early)\M'
$fragment$;
  new_input constant text := $fragment$
      ) as continuation_intent,
      (
        (
          ni.query_lower ~ '\m(?:kitchen|nvz)\M'
          or ni.query_lower ~ '\mnon[ -]volley\s+zone\M'
        )
        and (
          ni.query_lower ~ '\m(?:volley|serve|court|fault|step|momentum|paddle|ball|play(?:ing)?)\M'
          or (
            ni.query_lower ~ '\m(?:non[ -]volley\s+zone|nvz)\M'
            and ni.query_lower ~ '\m(?:what|where|define|dimension|zone|line)\M'
          )
        )
      ) as nvz_terminology_intent,
      (
        ni.query_lower ~ '\m(?:when|deadline|due|latest|early)\M'
$fragment$;
  old_expansion constant text := $fragment$
    select i.*, case when i.continuation_intent then phraseto_tsquery('english', 'cannot complete') else null::tsquery end as continuation_ts_query
    from input i
$fragment$;
  new_expansion constant text := $fragment$
    select i.*,
      case when i.continuation_intent then phraseto_tsquery('english', 'cannot complete') else null::tsquery end as continuation_ts_query,
      case when i.nvz_terminology_intent then to_tsquery('english', 'nvz | (non & volley & zone)') else null::tsquery end as nvz_ts_query
    from input i
$fragment$;
  old_keyword constant text := $fragment$
    where e.search_vector @@ i.keyword_ts_query
    or (i.continuation_intent and e.search_vector @@ i.continuation_ts_query)
    order by greatest(ts_rank_cd(e.search_vector, i.keyword_ts_query), coalesce(ts_rank_cd(e.search_vector, i.continuation_ts_query), 0::real)) desc, e.chunk_id
$fragment$;
  new_keyword constant text := $fragment$
    where e.search_vector @@ i.keyword_ts_query
    or (i.continuation_intent and e.search_vector @@ i.continuation_ts_query)
    or (i.nvz_terminology_intent and e.search_vector @@ i.nvz_ts_query)
    order by greatest(
      ts_rank_cd(e.search_vector, i.keyword_ts_query),
      coalesce(ts_rank_cd(e.search_vector, i.continuation_ts_query), 0::real),
      coalesce(ts_rank_cd(e.search_vector, i.nvz_ts_query), 0::real)
    ) desc, e.chunk_id
$fragment$;
  old_terminology_tail constant text := $fragment$
      and e.searchable_text ~ '\mmatch\s+setup\M'
      and e.searchable_text ~ '\m(?:lineups?|rosters?|pairings?)\M'
  ),
  team_roster_candidates as (
$fragment$;
  new_terminology_tail constant text := $fragment$
      and e.searchable_text ~ '\mmatch\s+setup\M'
      and e.searchable_text ~ '\m(?:lineups?|rosters?|pairings?)\M'
  ),
  nvz_terminology_candidates as (
    select e.chunk_id
    from eligible e cross join retrieval_expansions i
    where i.nvz_terminology_intent
      and e.searchable_text ~ '\mnon(?:-\s*|\s+)volley\s+zone\M'
  ),
  team_roster_candidates as (
$fragment$;
  old_candidate_ids constant text := $fragment$
    union select chunk_id from intent_candidates
    union select chunk_id from terminology_candidates
    union select chunk_id from team_roster_candidates
$fragment$;
  new_candidate_ids constant text := $fragment$
    union select chunk_id from intent_candidates
    union select chunk_id from terminology_candidates
    union select chunk_id from nvz_terminology_candidates
    union select chunk_id from team_roster_candidates
$fragment$;
  old_score constant text := $fragment$
      least(1::double precision, greatest(ts_rank_cd(e.search_vector, i.keyword_ts_query), coalesce(ts_rank_cd(e.search_vector, i.continuation_ts_query), 0::real))::double precision * 2.5) as fts_keyword_score,
$fragment$;
  new_score constant text := $fragment$
      least(1::double precision, greatest(
        ts_rank_cd(e.search_vector, i.keyword_ts_query),
        coalesce(ts_rank_cd(e.search_vector, i.continuation_ts_query), 0::real),
        coalesce(ts_rank_cd(e.search_vector, i.nvz_ts_query), 0::real)
      )::double precision * 2.5) as fts_keyword_score,
$fragment$;
begin
  select pg_get_functiondef(
    'public.search_ai_official_chunks(extensions.vector,text,text,text,text,uuid,uuid,uuid,uuid,text,integer)'::regprocedure
  ) into function_definition;

  if position('nvz_terminology_intent' in function_definition) > 0 then
    raise notice 'LMS-0709 kitchen/NVZ terminology logic is already installed.';
    return;
  end if;
  if position('match(?:es)?' in function_definition) = 0 then
    raise exception 'LMS-0709 requires the LMS-0708 continuation matcher. Stop and review the deployed RPC before changing it.';
  end if;
  if position(old_input in function_definition) = 0
    or position(old_expansion in function_definition) = 0
    or position(old_keyword in function_definition) = 0
    or position(old_terminology_tail in function_definition) = 0
    or position(old_candidate_ids in function_definition) = 0
    or position(old_score in function_definition) = 0 then
    raise exception 'LMS-0709 expected the deployed Stage 3 structure but did not find it. Stop and review the RPC before changing it.';
  end if;

  function_definition := replace(function_definition, old_input, new_input);
  function_definition := replace(function_definition, old_expansion, new_expansion);
  function_definition := replace(function_definition, old_keyword, new_keyword);
  function_definition := replace(function_definition, old_terminology_tail, new_terminology_tail);
  function_definition := replace(function_definition, old_candidate_ids, new_candidate_ids);
  function_definition := replace(function_definition, old_score, new_score);
  execute function_definition;
end;
$lms0709$;

commit;