-- LMS AI Feedback Drill-Down & Question History. Local candidate only.
-- Read-only projection of retained records; no new capture, table, index, RLS,
-- business data, or existing function changes. Apply only with deployment approval.
begin;

create or replace function public.ai_review_interactions(p_filters jsonb)
returns jsonb language plpgsql stable security invoker
-- A generic plan misestimates the optional answer/date predicates and turns
-- retained-snapshot joins into quadratic loops. Keep this setting local to the
-- new reader: measured 5k outcomes / 1k feedback need a parameter-specific plan.
set search_path = pg_catalog, public set statement_timeout = '5s'
set plan_cache_mode = 'force_custom_plan' as $$
declare
  v_from timestamptz := (p_filters->>'from')::timestamptz;
  v_to timestamptz := (p_filters->>'to')::timestamptz;
  v_asof timestamptz := (p_filters->>'asof')::timestamptz;
  v_limit integer := (p_filters->>'limit')::integer;
  v_feedback text := coalesce(p_filters->>'feedback', 'all');
  v_origin text := coalesce(p_filters->>'origin', 'all');
  v_search text := lower(trim(coalesce(p_filters->>'search', '')));
  v_cursor_at timestamptz := (p_filters->>'cursor_at')::timestamptz;
  v_cursor_id uuid := (p_filters->>'cursor_id')::uuid;
  v_answer uuid := (p_filters->>'answer')::uuid;
  v_result jsonb;
begin
  if current_user not in ('service_role', 'postgres') then raise exception 'review_forbidden'; end if;
  if jsonb_typeof(p_filters) is distinct from 'object' or v_to is null or v_asof is null
     or (v_from is not null and v_from >= v_to) or v_limit is null or v_limit not in (25, 50)
     or v_feedback not in ('all', 'helpful', 'not_helpful', 'no_feedback', 'ambiguous')
     or v_origin not in ('all', 'player_interface', 'manager_test', 'legacy_unknown', 'view_as')
     or length(v_search) > 200 or ((v_cursor_at is null) <> (v_cursor_id is null)) then
    raise exception 'review_invalid';
  end if;

  with outcomes as materialized (
    select o.* from public.ai_request_outcomes o
    where o.recorded_at <= v_asof and o.completed_at <= v_asof
      and (v_answer is null or o.id = v_answer)
  ), occurrences as materialized (
    select r.* from public.ai_review_occurrences r
    where r.recorded_at <= v_asof and (v_answer is null or r.answer_id = v_answer)
  ), official_events as materialized (
    select f.* from public.ai_answer_feedback_events f
    where f.created_at <= v_asof and (v_answer is null or f.answer_id = v_answer)
  ), official_times as (
    select answer_id, min(created_at) first_at, max(created_at) latest_at
    from official_events group by answer_id
  ), official_votes as (
    -- Preserve ai_review_feedback_state semantics: opposing latest-time votes
    -- are ambiguous, never resolved by UUID ordering or treated as unvoted.
    select t.answer_id, t.first_at, t.latest_at,
      case when count(distinct f.helpful) = 1 then bool_and(f.helpful) end helpful
    from official_times t join official_events f
      on f.answer_id = t.answer_id and f.created_at = t.latest_at
    group by t.answer_id, t.first_at, t.latest_at
  ), official_snapshots as (
    select distinct on (answer_id) f.* from official_events f
    order by answer_id, created_at desc, id desc
  ), live_events as materialized (
    -- This contains feedback metadata only. Do not join live access_audit,
    -- targets, sessions or current LMS facts to reconstruct historical answers.
    select f.answer_id, f.id, f.at, f.helpful, f.origin, f.intent,
      f.result_code, f.relationship, f.assistant_version
    from ai_live_private.feedback f
    where f.at <= v_asof and (v_answer is null or f.answer_id = v_answer)
  ), live_votes as (
    select distinct on (answer_id) l.*, min(at) over (partition by answer_id) first_at
    from live_events l order by answer_id, at desc, id desc
  ), identities as (
    select id answer_id from outcomes union select answer_id from occurrences
    union select answer_id from official_votes union select answer_id from live_votes
  ), retained as (
    select i.answer_id,
      coalesce(o.completed_at, r.answer_completed_at, least(r.first_observed_at, f.first_at, l.first_at)) occurred_at,
      case when o.completed_at is not null or r.answer_completed_at is not null then 'completed' else 'first_recorded' end time_basis,
      coalesce(o.origin, r.origin, l.origin, 'legacy_unknown') origin,
      coalesce(o.final_kind, r.occurrence_kind, 'answer') result,
      coalesce(o.assistant_version, r.assistant_version, s.assistant_version, l.assistant_version) assistant_version,
      coalesce(o.source_family, r.source_family, case when l.answer_id is not null then 'LIVE_LMS_DATA' end, 'unknown') source_family,
      case when r.payload_purged_at is null then coalesce(r.original_question, s.original_question) end question,
      case when r.payload_purged_at is null then coalesce(r.effective_question, s.effective_question) end effective_question,
      case when r.payload_purged_at is null then coalesce(r.output_text,
        case when not coalesce(r.redaction_applied, false) then s.generated_answer end) end answer,
      case
        when o.source_family = 'LIVE_LMS_DATA' or (l.answer_id is not null and f.answer_id is null) then
          case when l.answer_id is null then 'no_feedback' when l.helpful then 'helpful' else 'not_helpful' end
        when f.answer_id is null then 'no_feedback'
        when f.helpful is null then 'ambiguous' when f.helpful then 'helpful' else 'not_helpful'
      end feedback,
      case when o.source_family = 'LIVE_LMS_DATA' or (l.answer_id is not null and f.answer_id is null)
        then l.at else f.latest_at end feedback_at,
      -- The ID was recorded with the feedback. Names are explicitly current
      -- member labels; no current role is misrepresented as a historical role.
      coalesce(nullif(trim(concat_ws(' ', m.first_name, m.last_name)), ''), nullif(trim(m.full_name), '')) user_name,
      case when coalesce(nullif(trim(concat_ws(' ', m.first_name, m.last_name)), ''), nullif(trim(m.full_name), '')) is not null
        then 'current_member_record' end user_name_basis,
      null::text user_role, o.total_ms, o.id is null legacy,
      coalesce(r.redaction_applied, false) redacted, r.payload_purged_at is not null payload_purged,
      jsonb_strip_nulls(jsonb_build_object(
        'liveIntent', coalesce(o.diagnostic_snapshot->'liveIntent', to_jsonb(l.intent)),
        'relationship', coalesce(o.diagnostic_snapshot->'relationship', to_jsonb(l.relationship)),
        'resultCode', coalesce(o.diagnostic_snapshot->'resultCode', to_jsonb(l.result_code)),
        'workflow', o.diagnostic_snapshot->'workflow', 'result', o.diagnostic_snapshot->'result', 'mode', o.diagnostic_snapshot->'mode',
        'documentEvidenceUsed', o.diagnostic_snapshot->'documentEvidenceUsed', 'lookupAttempted', o.diagnostic_snapshot->'lookupAttempted',
        'liveConsulted', o.diagnostic_snapshot->'liveConsulted', 'liveDataUsed', o.diagnostic_snapshot->'liveDataUsed',
        'hybrid', o.diagnostic_snapshot->'hybrid', 'personalEvaluationResult', o.diagnostic_snapshot->'personalEvaluationResult')) context,
      case when v_answer is not null then jsonb_build_object(
        'outcome', coalesce((select jsonb_object_agg(d.key, d.value) from jsonb_each(coalesce(o.diagnostic_snapshot, '{}'::jsonb)) d
          where d.key = any(array['policy', 'authorityWarnings', 'configurationVersion', 'candidateCount', 'evidenceThreshold',
            'retrievalLimit', 'authorityReviewLimit', 'embeddingModel', 'stage3Sufficient', 'equipmentProbeInvoked',
            'equipmentProbeRetrieved', 'liveIntent', 'resultCode', 'relationship', 'projectionVersion',
            'workflow', 'result', 'mode', 'documentEvidenceUsed', 'lookupAttempted', 'liveConsulted', 'liveDataUsed',
            'hybrid', 'personalEvaluationResult'])), '{}'::jsonb),
        'selection', case when r.payload_purged_at is not null or coalesce(r.redaction_applied, false) then '{}'::jsonb
          else coalesce(r.selection_snapshot, s.selection_snapshot, '{}'::jsonb) end,
        'resolver', case when r.payload_purged_at is not null then '{}'::jsonb else coalesce(r.resolver_snapshot, '{}'::jsonb) end,
        'sources', case when r.payload_purged_at is not null then '[]'::jsonb else coalesce(r.source_snapshot, s.source_snapshot, '[]'::jsonb) end
      ) end diagnostics
    from identities i left join outcomes o on o.id = i.answer_id
    left join occurrences r on r.answer_id = i.answer_id
    left join official_votes f on f.answer_id = i.answer_id
    left join official_snapshots s on s.answer_id = i.answer_id
    left join live_votes l on l.answer_id = i.answer_id
    left join public.members m on m.id = s.member_id
  ), filtered as materialized (
    select r.* from retained r
    where r.occurred_at < v_to and r.occurred_at <= v_asof
      and (v_from is null or r.occurred_at >= v_from)
      and (v_origin = 'all' or r.origin = v_origin)
      and (v_search = '' or position(v_search in lower(coalesce(r.question, ''))) > 0
        or position(v_search in lower(coalesce(r.answer, ''))) > 0
        or position(v_search in lower(coalesce(r.user_name, ''))) > 0)
  ), page as (
    select f.* from filtered f
    where (v_feedback = 'all' or f.feedback = v_feedback)
      and (v_cursor_at is null or (f.occurred_at, f.answer_id) < (v_cursor_at, v_cursor_id))
    order by f.occurred_at desc, f.answer_id desc limit v_limit + 1
  ), page_json as (
    select occurred_at, answer_id,
      (to_jsonb(p) - 'diagnostics' - 'question' - 'answer' - 'effective_question') || jsonb_build_object(
        'question', case when v_answer is null then left(p.question, 240) else p.question end,
        'answer', case when v_answer is null then left(p.answer, 320) else p.answer end,
        'effective_question', case when v_answer is null then left(p.effective_question, 240) else p.effective_question end,
        'has_question', p.question is not null, 'has_answer', p.answer is not null)
      || case when v_answer is not null then jsonb_build_object('diagnostics', p.diagnostics) else '{}'::jsonb end item
    from page p
  ) select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(item order by occurred_at desc, answer_id desc) from page_json), '[]'::jsonb),
    'summary', (select jsonb_build_object('total', count(*),
      'helpful', count(*) filter (where feedback = 'helpful'),
      'not_helpful', count(*) filter (where feedback = 'not_helpful'),
      'no_feedback', count(*) filter (where feedback = 'no_feedback'),
      'ambiguous', count(*) filter (where feedback = 'ambiguous')) from filtered)
  ) into v_result;
  return v_result;
end $$;

revoke all on function public.ai_review_interactions(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.ai_review_interactions(jsonb) to service_role;
comment on function public.ai_review_interactions(jsonb) is
  'Read-only retained AI interaction history. Server role authorization required. Missing private text is not reconstructed.';
commit;
