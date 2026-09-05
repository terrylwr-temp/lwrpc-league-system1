-- LMS-0718 / 0.1.540. Function-only; review and apply before application deployment.
-- No Stage 7A table, capture function, default privilege or existing ACL changes.
begin;

create or replace function public.ai_review_case_action(
 p_case uuid, p_actor uuid, p_operation uuid, p_revision integer,
 p_action text, p_value text, p_note text, p_cutoff timestamptz
) returns jsonb language plpgsql security invoker
set search_path=pg_catalog,public set statement_timeout='3s' set lock_timeout='250ms' as $$
declare
 c public.ai_manager_review_cases; e public.ai_manager_review_events;
 before_value jsonb; after_value jsonb; event_action text; stamp timestamptz:=clock_timestamp();
begin
 if current_user not in ('service_role','postgres') then raise exception 'review_forbidden'; end if;
 if p_actor is null or p_operation is null or p_revision is null or p_revision<1
    or p_action is null or p_action not in ('status','category','priority','note','review')
    or (p_action in ('note','review') and p_value is not null)
    or length(coalesce(p_note,''))>4000 or length(coalesce(p_value,''))>80
 then raise exception 'review_invalid'; end if;
 -- One logical retry cannot target two cases concurrently.
 perform pg_advisory_xact_lock(hashtextextended('review-operation:'||p_operation::text,0));
 -- Match capture's group -> case order, including the audit insert's FK locks.
 -- Otherwise capture and review could each wait for the other's row lock.
 perform 1 from public.ai_question_groups where id=(select group_id from public.ai_manager_review_cases where id=p_case) for update;
 select * into c from public.ai_manager_review_cases where id=p_case for update;
 if not found then raise exception 'review_not_found'; end if;
 event_action:=case p_action when 'status' then 'status_changed' when 'category' then 'category_changed'
   when 'priority' then 'priority_changed' when 'note' then 'note_added' else 'review_completed' end;
 select * into e from public.ai_manager_review_events where operation_id=p_operation and event_ordinal=0;
 if found then
  if e.case_id is distinct from p_case or e.actor_user_id is distinct from p_actor or e.actor_kind<>'manager'
    or e.action<>event_action or (e.before_state->>'revision')::integer<>p_revision
    or e.note is distinct from nullif(trim(p_note),'')
    or (p_action='status' and e.after_state->>'status' is distinct from p_value)
    or (p_action='category' and e.after_state->>'action_category' is distinct from p_value)
    or (p_action='priority' and e.after_state->>'priority' is distinct from p_value)
    or (p_action in ('status','review') and (e.after_state->>'reviewed_through_at')::timestamptz is distinct from p_cutoff)
  then raise exception 'review_retry_mismatch'; end if;
  return jsonb_build_object('revision',e.after_state->'revision','replayed',true);
 end if;
 if c.revision<>p_revision then raise exception 'review_revision_conflict'; end if;
 if p_action in ('status','review') and (p_cutoff is null or p_cutoff>stamp or p_cutoff<c.created_at
    or p_cutoff<coalesce(c.reviewed_through_at,c.created_at)) then raise exception 'review_invalid_cutoff'; end if;
 if p_action in ('note','review') and p_value is not null then raise exception 'review_invalid'; end if;
 before_value:=jsonb_build_object('status',c.status,'action_category',c.action_category,'priority',c.priority,
   'revision',c.revision,'reviewed_through_at',c.reviewed_through_at,'closed_at',c.closed_at,
   'resolved_at',c.resolved_at,'resolution_summary',c.resolution_summary);
 if p_action='status' then
  if p_value is null or not ((c.status='new' and p_value in ('reviewing','resolved','dismissed'))
     or (c.status='reviewing' and p_value in ('new','resolved','dismissed'))
     or (c.status in ('resolved','dismissed') and p_value='reviewing')) then raise exception 'review_transition'; end if;
  if (p_value in ('new','resolved','dismissed') or c.status in ('resolved','dismissed'))
      and length(trim(coalesce(p_note,'')))=0 then raise exception 'review_reason_required'; end if;
  if p_value in ('resolved','dismissed') and length(trim(p_note))>2000 then raise exception 'review_summary_size'; end if;
  c.status:=p_value; c.closed_at:=case when p_value in ('resolved','dismissed') then stamp end;
  c.resolved_at:=case when p_value='resolved' then stamp end;
  c.resolution_summary:=case when p_value in ('resolved','dismissed') then trim(p_note) end;
 elsif p_action='category' then
  if p_value is null or p_value not in ('unclassified','lwr_rule_update','lwr_guide_update','dates_source_update',
    'ai_retrieval_selection','clarification_wording','usap_no_lwr_change','future_live_lms','not_a_problem','other')
    then raise exception 'review_category'; end if;
  if p_value='other' and length(trim(coalesce(p_note,'')))=0 then raise exception 'review_reason_required'; end if;
  c.action_category:=p_value;
 elsif p_action='priority' then
  if p_value is null or p_value not in ('normal','high') then raise exception 'review_priority'; end if;
  c.priority:=p_value;
 elsif p_action='note' and length(trim(coalesce(p_note,'')))=0 then raise exception 'review_reason_required';
 end if;
 if p_action in ('status','review') then
  c.reviewed_by:=p_actor; c.reviewed_at:=stamp; c.reviewed_through_at:=p_cutoff;
 end if;
 c.revision:=c.revision+1;
 update public.ai_manager_review_cases set status=c.status,action_category=c.action_category,priority=c.priority,
   closed_at=c.closed_at,resolved_at=c.resolved_at,resolution_summary=c.resolution_summary,
   reviewed_by=c.reviewed_by,reviewed_at=c.reviewed_at,reviewed_through_at=c.reviewed_through_at,
   revision=c.revision,updated_at=stamp where id=p_case;
 after_value:=jsonb_build_object('status',c.status,'action_category',c.action_category,'priority',c.priority,
   'revision',c.revision,'reviewed_through_at',c.reviewed_through_at,'closed_at',c.closed_at,
   'resolved_at',c.resolved_at,'resolution_summary',c.resolution_summary);
 insert into public.ai_manager_review_events(operation_id,group_id,case_id,actor_user_id,actor_kind,action,before_state,after_state,note)
 values(p_operation,c.group_id,c.id,p_actor,'manager',event_action,before_value,after_value,nullif(trim(p_note),''));
 return jsonb_build_object('revision',c.revision,'replayed',false);
end $$;

-- Latest state BEFORE filtering. Opposite votes at the same latest timestamp are ambiguous.
create or replace function public.ai_review_feedback_state(p_asof timestamptz)
returns table(answer_id uuid,latest_at timestamptz,helpful boolean,event_count bigint,question text,
 assistant_version text,source_family text,origin text,completed_at timestamptz,group_id uuid,case_id uuid,status text)
language sql stable security invoker set search_path=pg_catalog,public as $$
 with times as (
  select f.answer_id,max(f.created_at) latest_at,count(*) event_count
  from public.ai_answer_feedback_events f where f.created_at<=p_asof group by f.answer_id
 ), latest as (
  select t.answer_id,t.latest_at,t.event_count,
    case when count(distinct f.helpful)=1 then bool_and(f.helpful) end helpful,
    min(f.original_question) question,min(f.assistant_version) assistant_version
  from times t join public.ai_answer_feedback_events f on f.answer_id=t.answer_id and f.created_at=t.latest_at
  group by t.answer_id,t.latest_at,t.event_count
 ) select f.answer_id,f.latest_at,f.helpful,f.event_count,f.question,f.assistant_version,
    coalesce(o.source_family,r.source_family,'unknown'),coalesce(o.origin,r.origin,'legacy_unknown'),o.completed_at,r.group_id,c.id,c.status
 from latest f left join public.ai_request_outcomes o on o.id=f.answer_id
 left join public.ai_review_occurrences r on r.answer_id=f.answer_id
 left join public.ai_manager_review_cases c on c.group_id=r.group_id;
$$;

-- Lightweight group rows only: no answer, source or diagnostic payload projection.
create or replace function public.ai_review_group_rows(p_asof timestamptz)
returns table(id uuid,case_id uuid,title text,origin text,family text,status text,priority text,action_category text,
 revision integer,occurrences bigint,latest_activity timestamptz,assistant_version text,source_family text,
 negative boolean,new_activity boolean,sort_priority integer)
language sql stable security invoker set search_path=pg_catalog,public as $$
 with feedback as (select * from public.ai_review_feedback_state(p_asof))
 select g.id,c.id,g.title,g.origin,g.family,c.status,c.priority,c.action_category,c.revision,
   a.n,greatest(a.last_at,c.updated_at,a.feedback_at),a.version,a.source_family,a.negative,
   a.signal_at>coalesce(c.reviewed_through_at,'-infinity'::timestamptz),
   case when g.family='conflict' then 0 when c.priority='high' then 1 else 2 end
 from public.ai_question_groups g left join public.ai_manager_review_cases c on c.group_id=g.id
 cross join lateral (
   select count(*) n,max(r.recorded_at) last_at,max(f.latest_at) feedback_at,
    (array_agg(r.assistant_version order by r.recorded_at desc,r.id))[1] version,
    case when bool_or(r.source_family='mixed') or (bool_or(r.source_family='lwr') and bool_or(r.source_family='usap')) then 'mixed'
      when bool_or(r.source_family='lwr') then 'lwr' when bool_or(r.source_family='usap') then 'usap'
      when bool_or(r.source_family='unknown') then 'unknown' else 'none' end source_family,
    coalesce(bool_or(f.helpful=false),false) negative,
    greatest(max(r.recorded_at) filter(where r.occurrence_kind in ('insufficient_evidence','conflict')),
      (select max(v.created_at) from public.ai_answer_feedback_events v join public.ai_review_occurrences x on x.answer_id=v.answer_id
        where x.group_id=g.id and not v.helpful and v.created_at<=p_asof)) signal_at
   from public.ai_review_occurrences r left join feedback f on f.answer_id=r.answer_id
   where r.group_id=g.id and r.recorded_at<=p_asof
 ) a where a.n>0 and g.merged_into_group_id is null;
$$;

create or replace function public.ai_review_report(p_filters jsonb)
returns jsonb language plpgsql stable security invoker set search_path=pg_catalog,public set statement_timeout='5s' as $$
declare
 a timestamptz:=(p_filters->>'asof')::timestamptz; start_at timestamptz:=(p_filters->>'from')::timestamptz;
 end_at timestamptz:=(p_filters->>'to')::timestamptz; tab text:=p_filters->>'tab';
 lim integer:=(p_filters->>'limit')::integer; result jsonb; cards jsonb;
begin
 if current_user not in ('service_role','postgres') then raise exception 'review_forbidden'; end if;
 if a is null or start_at is null or end_at is null or start_at>=end_at or lim is null or lim not between 1 and 100
    or length(coalesce(p_filters->>'search',''))>200 then raise exception 'review_invalid'; end if;
 if tab='summary' then
  with votes as (select * from public.ai_review_feedback_state(a)), totals as (
   select count(*) filter(where o.final_kind='answer') grounded,
    count(*) filter(where o.feedback_eligible) eligible,
    count(*) filter(where o.feedback_eligible and v.answer_id is not null) voted,
    count(*) filter(where o.feedback_eligible and v.helpful=true) helpful,
    count(*) filter(where o.feedback_eligible and v.helpful=false) not_helpful,
    count(*) filter(where o.final_kind='insufficient_evidence') unanswered,
    count(*) filter(where o.final_kind='conflict') conflicts,
    count(*) filter(where o.final_kind='protected') protected,
    count(*) filter(where o.final_kind='clarification') clarification
   from public.ai_request_outcomes o left join votes v on v.answer_id=o.id
   where o.origin='player_interface' and o.completed_at>=start_at and o.completed_at<end_at and o.completed_at<=a
    and (coalesce(p_filters->>'version','')='' or o.assistant_version=p_filters->>'version')
    and (coalesce(p_filters->>'source','')='' or o.source_family=p_filters->>'source')
  ) select to_jsonb(t) || jsonb_build_object('open_cases',(select count(*) from public.ai_review_group_rows(a) g
    where g.origin='player_interface' and g.status in ('new','reviewing') and g.latest_activity>=start_at and g.latest_activity<end_at
      and (coalesce(p_filters->>'version','')='' or g.assistant_version=p_filters->>'version')
      and (coalesce(p_filters->>'source','')='' or g.source_family=p_filters->>'source'))) into cards from totals t;
  return cards;
 elsif tab='feedback' then
  select coalesce(jsonb_agg(to_jsonb(q) order by q.latest_at desc,q.answer_id),'[]') into result from (
   select f.* from public.ai_review_feedback_state(a) f
   where f.origin<>'manager_test' and f.latest_at>=start_at and f.latest_at<end_at
    and (coalesce(p_filters->>'search','')='' or position(lower(p_filters->>'search') in lower(f.question))>0)
    and (coalesce(p_filters->>'version','')='' or f.assistant_version=p_filters->>'version')
    and (coalesce(p_filters->>'source','')='' or f.source_family=p_filters->>'source')
    and (coalesce(p_filters->>'status','')='' or f.status=p_filters->>'status')
    and (coalesce(p_filters->>'type','')='' or (p_filters->>'type'='not_helpful' and f.helpful=false) or (p_filters->>'type'='helpful' and f.helpful=true))
    and (p_filters->>'cursor_id' is null or f.latest_at<(p_filters->>'cursor_at')::timestamptz
      or (f.latest_at=(p_filters->>'cursor_at')::timestamptz and f.answer_id>(p_filters->>'cursor_id')::uuid))
   order by f.latest_at desc,f.answer_id limit lim+1
  ) q;
 else
  if tab not in ('needs','unanswered','resolved') or tab is null then raise exception 'review_invalid'; end if;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.sort_priority,q.latest_activity desc,q.id),'[]') into result from (
   select g.* from public.ai_review_group_rows(a) g
   where g.origin='player_interface' and g.latest_activity>=start_at and g.latest_activity<end_at
    and ((tab='needs' and (g.status in ('new','reviewing') or (g.status in ('resolved','dismissed') and g.new_activity)))
      or (tab='unanswered' and g.family='unanswered') or (tab='resolved' and g.status in ('resolved','dismissed')))
    and (coalesce(p_filters->>'search','')='' or position(lower(p_filters->>'search') in lower(g.title))>0
      or exists(select 1 from public.ai_review_occurrences r where r.group_id=g.id and r.recorded_at<=a
        and (position(lower(p_filters->>'search') in lower(r.original_question))>0 or position(lower(p_filters->>'search') in lower(r.effective_question))>0)))
    and (coalesce(p_filters->>'version','')='' or g.assistant_version=p_filters->>'version')
    and (coalesce(p_filters->>'source','')='' or g.source_family=p_filters->>'source')
    and (coalesce(p_filters->>'status','')='' or g.status=p_filters->>'status')
    and (coalesce(p_filters->>'type','')='' or (p_filters->>'type'='not_helpful' and g.negative)
      or (p_filters->>'type'='unanswered' and g.family='unanswered') or (p_filters->>'type'='conflict' and g.family='conflict'))
    and (p_filters->>'cursor_id' is null or g.sort_priority>(p_filters->>'cursor_priority')::integer
      or (g.sort_priority=(p_filters->>'cursor_priority')::integer and (g.latest_activity<(p_filters->>'cursor_at')::timestamptz
        or (g.latest_activity=(p_filters->>'cursor_at')::timestamptz and g.id>(p_filters->>'cursor_id')::uuid))))
   order by g.sort_priority,g.latest_activity desc,g.id limit lim+1
  ) q;
 end if;
 return jsonb_build_object('rows',result);
end $$;

revoke all on function public.ai_review_case_action(uuid,uuid,uuid,integer,text,text,text,timestamptz),
 public.ai_review_feedback_state(timestamptz),public.ai_review_group_rows(timestamptz),public.ai_review_report(jsonb)
 from public,anon,authenticated,service_role;
grant execute on function public.ai_review_case_action(uuid,uuid,uuid,integer,text,text,text,timestamptz),
 public.ai_review_feedback_state(timestamptz),public.ai_review_group_rows(timestamptz),public.ai_review_report(jsonb) to service_role;
commit;
