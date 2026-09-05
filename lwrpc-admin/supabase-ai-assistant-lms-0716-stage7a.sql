-- LMS-0716 / 0.1.538 Stage 7A. Additive; apply and verify BEFORE application deployment.
-- Does not alter accepted feedback history, documents, versions, chunks or retrieval.
begin;
create table if not exists public.ai_request_outcomes (
 id uuid primary key, request_started_at timestamptz not null, completed_at timestamptz not null,
 recorded_at timestamptz not null default now(),
 origin text not null check(origin in ('player_interface','manager_test')),
 final_kind text not null check(final_kind in ('answer','insufficient_evidence','conflict','clarification','protected','technical_error')),
 reason_code text check(length(reason_code)<=80), assistant_version text not null check(length(assistant_version)<=80),
 model text check(length(model)<=120), feedback_eligible boolean not null default false,
 source_family text not null default 'none' check(source_family in ('lwr','usap','mixed','none','unknown')),
 selected_evidence_count smallint not null default 0 check(selected_evidence_count between 0 and 4),
 stage3_invoked boolean not null, model_call_skipped boolean,
 guard_classification text check(length(guard_classification)<=80), resolver_classification text check(length(resolver_classification)<=120),
 diagnostic_snapshot jsonb not null default '{}' check(jsonb_typeof(diagnostic_snapshot)='object' and octet_length(diagnostic_snapshot::text)<=4096),
 total_ms integer check(total_ms>=0), input_tokens integer check(input_tokens>=0), output_tokens integer check(output_tokens>=0),
 telemetry_version smallint not null default 1 check(telemetry_version>0),
 check(completed_at>=request_started_at), check(not feedback_eligible or final_kind='answer'),
 check(final_kind<>'protected' or (not stage3_invoked and source_family='none' and selected_evidence_count=0))
);
create index if not exists ai_outcomes_completed_idx on public.ai_request_outcomes(completed_at desc,id);
create index if not exists ai_outcomes_origin_kind_idx on public.ai_request_outcomes(origin,final_kind,completed_at desc,id);
create index if not exists ai_outcomes_eligible_idx on public.ai_request_outcomes(origin,completed_at desc,id) where feedback_eligible;
create table if not exists public.ai_question_groups (
 id uuid primary key default gen_random_uuid(),
 origin text not null check(origin in ('player_interface','manager_test','legacy_unknown')),
 family text not null check(family in ('grounded_feedback','unanswered','conflict')),
 title text not null check(length(title) between 1 and 240), canonical_question text check(length(canonical_question)<=2400),
 topic text not null default 'unclassified' check(topic in ('unclassified','dupr','roster','match_setup','scoring','equipment','nvz','dates','other')),
 created_at timestamptz not null default now(), first_seen_at timestamptz not null, last_seen_at timestamptz not null,
 merged_into_group_id uuid references public.ai_question_groups(id) on delete restrict,
 revision integer not null default 1 check(revision>0), updated_at timestamptz not null default now(),
 check(first_seen_at<=last_seen_at), check(merged_into_group_id<>id)
);
create index if not exists ai_groups_origin_family_idx on public.ai_question_groups(origin,family,last_seen_at desc,id);
create index if not exists ai_groups_redirect_idx on public.ai_question_groups(merged_into_group_id) where merged_into_group_id is not null;
create table if not exists public.ai_review_occurrences (
 id uuid primary key default gen_random_uuid(), answer_id uuid not null unique,
 outcome_id uuid references public.ai_request_outcomes(id) on delete set null,
 group_id uuid not null references public.ai_question_groups(id) on delete restrict,
 first_feedback_event_id uuid references public.ai_answer_feedback_events(id) on delete set null,
 provenance text not null check(provenance in ('live_capture','feedback_capture','legacy_feedback')),
 origin text not null check(origin in ('player_interface','manager_test','legacy_unknown')),
 occurrence_kind text not null check(occurrence_kind in ('grounded_feedback','insufficient_evidence','conflict')),
 answer_completed_at timestamptz, first_observed_at timestamptz not null, recorded_at timestamptz not null default now(),
 original_question text not null check(length(original_question) between 1 and 1000),
 effective_question text not null check(length(effective_question) between 1 and 2400),
 output_text text check(length(output_text)<=6000),
 source_snapshot jsonb not null default '[]' check(jsonb_typeof(source_snapshot)='array' and jsonb_array_length(source_snapshot)<=4),
 selection_snapshot jsonb not null default '{}' check(jsonb_typeof(selection_snapshot)='object'),
 resolver_snapshot jsonb not null default '{}' check(jsonb_typeof(resolver_snapshot)='object'),
 assistant_version text not null check(length(assistant_version)<=80), model text check(length(model)<=120),
 source_family text not null default 'unknown' check(source_family in ('lwr','usap','mixed','none','unknown')),
 redaction_applied boolean not null default false, redaction_version smallint not null default 1 check(redaction_version>0),
 snapshot_version smallint not null default 1 check(snapshot_version>0), payload_purged_at timestamptz,
 check(outcome_id is null or outcome_id=answer_id),
 check(octet_length(jsonb_build_array(original_question,effective_question,output_text,source_snapshot,selection_snapshot,resolver_snapshot)::text)<=32768)
);
create unique index if not exists ai_occurrences_outcome_idx on public.ai_review_occurrences(outcome_id) where outcome_id is not null;
create index if not exists ai_occurrences_group_idx on public.ai_review_occurrences(group_id,first_observed_at desc,id);
create index if not exists ai_occurrences_kind_idx on public.ai_review_occurrences(origin,occurrence_kind,first_observed_at desc,id);
create index if not exists ai_occurrences_feedback_idx on public.ai_review_occurrences(first_feedback_event_id) where first_feedback_event_id is not null;
create table if not exists public.ai_question_fingerprint_routes (
 id uuid primary key default gen_random_uuid(), origin text not null check(origin in ('player_interface','manager_test','legacy_unknown')),
 family text not null check(family in ('grounded_feedback','unanswered','conflict')),
 normalizer_version smallint not null default 1 check(normalizer_version>0), key_version smallint not null default 1 check(key_version>0),
 fingerprint bytea not null check(octet_length(fingerprint)=32), collision_slot integer not null default 0 check(collision_slot>=0),
 -- Owner-approved correction: normalization/lowercasing can expand Unicode. Never truncate.
 normalized_question text not null check(octet_length(normalized_question) between 1 and 32768),
 group_id uuid not null references public.ai_question_groups(id) on delete restrict,
 assignment_kind text not null default 'automatic' check(assignment_kind in ('automatic','manager_routed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(origin,family,normalizer_version,key_version,fingerprint,collision_slot)
);
create index if not exists ai_fingerprint_group_idx on public.ai_question_fingerprint_routes(group_id);
create table if not exists public.ai_manager_review_cases (
 id uuid primary key default gen_random_uuid(), group_id uuid not null unique references public.ai_question_groups(id) on delete restrict,
 status text not null default 'new' check(status in ('new','reviewing','resolved','dismissed')),
 action_category text not null default 'unclassified' check(action_category in ('unclassified','lwr_rule_update','lwr_guide_update','dates_source_update','ai_retrieval_selection','clarification_wording','usap_no_lwr_change','future_live_lms','not_a_problem','other')),
 priority text not null default 'normal' check(priority in ('normal','high')),
 assigned_to uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(), reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz, reviewed_through_at timestamptz, resolved_at timestamptz, closed_at timestamptz,
 resolution_summary text check(length(resolution_summary)<=2000), revision integer not null default 1 check(revision>0),
 check((resolved_at is not null)=(status='resolved')),
 check((closed_at is not null)=(status in ('resolved','dismissed'))),
 check(status not in ('resolved','dismissed') or length(trim(coalesce(resolution_summary,'')))>0)
);
create index if not exists ai_cases_status_idx on public.ai_manager_review_cases(status,priority,updated_at desc,id);
create index if not exists ai_cases_category_idx on public.ai_manager_review_cases(action_category,status);
create index if not exists ai_cases_assigned_idx on public.ai_manager_review_cases(assigned_to,status) where assigned_to is not null;
create table if not exists public.ai_manager_review_events (
 id uuid primary key default gen_random_uuid(), operation_id uuid not null, event_ordinal smallint not null default 0 check(event_ordinal>=0),
 group_id uuid not null references public.ai_question_groups(id) on delete restrict,
 case_id uuid references public.ai_manager_review_cases(id) on delete restrict,
 occurrence_id uuid references public.ai_review_occurrences(id) on delete set null,
 actor_user_id uuid references auth.users(id) on delete set null,
 actor_kind text not null check(actor_kind in ('manager','system','retention')),
 action text not null check(action in ('case_created','status_changed','category_changed','priority_changed','assignment_changed','note_added','review_completed','group_merged','group_split','occurrence_moved','fingerprint_routed','retention_redacted')),
 before_state jsonb not null default '{}' check(jsonb_typeof(before_state)='object'),
 after_state jsonb not null default '{}' check(jsonb_typeof(after_state)='object'), note text check(length(note)<=4000),
 created_at timestamptz not null default now(), unique(operation_id,event_ordinal)
);
create index if not exists ai_review_events_case_idx on public.ai_manager_review_events(case_id,created_at,id);
create index if not exists ai_review_events_group_idx on public.ai_manager_review_events(group_id,created_at,id);

alter table public.ai_request_outcomes enable row level security;
alter table public.ai_review_occurrences enable row level security;
alter table public.ai_question_groups enable row level security;
alter table public.ai_question_fingerprint_routes enable row level security;
alter table public.ai_manager_review_cases enable row level security;
alter table public.ai_manager_review_events enable row level security;
-- Supabase defaults may grant service_role ALL. Narrow GRANTs alone do not remove them.
-- Reset only these six new tables, then establish the exact approved privilege state.
revoke all on public.ai_request_outcomes,public.ai_review_occurrences,public.ai_question_groups,public.ai_question_fingerprint_routes,public.ai_manager_review_cases,public.ai_manager_review_events from public,anon,authenticated,service_role;
grant select,insert on public.ai_request_outcomes,public.ai_manager_review_events to service_role;
grant select,insert,update on public.ai_review_occurrences,public.ai_question_groups,public.ai_question_fingerprint_routes,public.ai_manager_review_cases to service_role;
comment on table public.ai_request_outcomes is 'Stage 7A metadata only; no question, player identity, answer, receipt or conversation.';
comment on table public.ai_review_occurrences is 'Bounded exceptional/voted-answer detail. Legacy feedback may have no outcome parent.';
comment on column public.ai_question_fingerprint_routes.normalized_question is 'Full exact normalized text; 32768 UTF-8 bytes maximum, never truncated. Digest collisions use distinct slots.';
comment on table public.ai_manager_review_events is 'Append-only audit foundation; no manager mutation API in LMS-0716.';

-- The only Stage 7A write entry point. Invoker rights; never callable by browsers.
create or replace function public.capture_ai_quality(p_outcome jsonb default null, p_occurrence jsonb default null, p_route jsonb default null, p_feedback_id uuid default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public set statement_timeout='450ms' set lock_timeout='150ms' as $$
declare
 o public.ai_request_outcomes; old_o public.ai_request_outcomes;
 r public.ai_review_occurrences; old_r public.ai_review_occurrences;
 f public.ai_answer_feedback_events; c public.ai_manager_review_cases;
 aid uuid; gid uuid; cid uuid; family_value text; digest_value bytea; slot_value integer;
 negative boolean:=false; created_case boolean:=false; new_occurrence boolean:=false; op uuid;
begin
 if current_user not in ('service_role','postgres') then raise exception 'quality_forbidden'; end if;
 if p_outcome is null and p_occurrence is null then raise exception 'quality_empty'; end if;
 aid:=coalesce((p_outcome->>'id')::uuid,(p_occurrence->>'answer_id')::uuid);
 if aid is null then raise exception 'quality_identity'; end if;
 perform pg_advisory_xact_lock(hashtextextended('quality-answer:'||aid::text,0));
 if p_outcome is not null then
  o:=jsonb_populate_record(null::public.ai_request_outcomes,p_outcome); o.recorded_at:=now();
  select * into old_o from public.ai_request_outcomes where id=aid;
  if found then
   if (to_jsonb(old_o)-'recorded_at') is distinct from (to_jsonb(o)-'recorded_at') then raise exception 'quality_outcome_mismatch'; end if;
  else insert into public.ai_request_outcomes select (o).*; end if;
 end if;
 if p_occurrence is null then return jsonb_build_object('recorded',true); end if;
 r:=jsonb_populate_record(null::public.ai_review_occurrences,p_occurrence);
 if r.answer_id is distinct from aid then raise exception 'quality_identity'; end if;
 select * into o from public.ai_request_outcomes where id=aid;
 r.outcome_id:=o.id; r.answer_completed_at:=o.completed_at;
 if p_feedback_id is not null then
  select * into f from public.ai_answer_feedback_events where id=p_feedback_id and answer_id=aid;
  if not found or r.occurrence_kind<>'grounded_feedback' then raise exception 'quality_feedback_identity'; end if;
  if o.id is not null and (o.final_kind<>'answer' or not o.feedback_eligible) then raise exception 'quality_feedback_outcome'; end if;
  select * into f from public.ai_answer_feedback_events where answer_id=aid order by created_at,id limit 1;
  r.first_feedback_event_id:=f.id;
  r.first_observed_at:=coalesce(o.completed_at,f.created_at);
  r.origin:=coalesce(o.origin,case when f.assistant_version in ('LMS-0712','LMS-0713','LMS-0714','LMS-0715') then 'legacy_unknown' else 'player_interface' end);
  r.provenance:=case when r.origin='legacy_unknown' then 'legacy_feedback' else 'feedback_capture' end;
  select exists(select 1 from public.ai_answer_feedback_events where answer_id=aid and not helpful) into negative;
 else
  if o.id is null or o.final_kind not in ('insufficient_evidence','conflict') or r.occurrence_kind<>o.final_kind or r.origin<>o.origin then raise exception 'quality_occurrence_outcome'; end if;
  r.provenance:='live_capture'; r.first_feedback_event_id:=null; r.first_observed_at:=o.completed_at;
 end if;
 family_value:=case r.occurrence_kind when 'insufficient_evidence' then 'unanswered' else r.occurrence_kind end;
 select * into old_r from public.ai_review_occurrences where answer_id=aid;
 if found then
  if old_r.occurrence_kind<>r.occurrence_kind or old_r.original_question<>r.original_question or old_r.effective_question<>r.effective_question or old_r.assistant_version<>r.assistant_version
   or old_r.output_text is distinct from r.output_text or old_r.source_snapshot is distinct from r.source_snapshot
   or old_r.selection_snapshot is distinct from r.selection_snapshot or old_r.resolver_snapshot is distinct from r.resolver_snapshot
   or old_r.model is distinct from r.model then raise exception 'quality_occurrence_mismatch'; end if;
  gid:=old_r.group_id; r.id:=old_r.id;
 else
  if p_route is not null then
   if p_route->>'origin' is distinct from r.origin or p_route->>'family' is distinct from family_value then raise exception 'quality_route_scope'; end if;
   if octet_length(p_route->>'normalized_question') not between 1 and 32768 then raise exception 'quality_normalized_size'; end if;
   digest_value:=decode(p_route->>'fingerprint','hex');
   perform pg_advisory_xact_lock(hashtextextended('quality-route:'||r.origin||':'||family_value||':'||(p_route->>'normalizer_version')||':'||(p_route->>'key_version')||':'||(p_route->>'fingerprint'),0));
   select group_id into gid from public.ai_question_fingerprint_routes
    where origin=r.origin and family=family_value and normalizer_version=(p_route->>'normalizer_version')::smallint
     and key_version=(p_route->>'key_version')::smallint and fingerprint=digest_value
     and normalized_question collate "C" = (p_route->>'normalized_question') collate "C";
  end if;
  if gid is null then
   insert into public.ai_question_groups(origin,family,title,canonical_question,first_seen_at,last_seen_at)
    values(r.origin,family_value,left(r.effective_question,240),r.effective_question,r.first_observed_at,r.first_observed_at) returning id into gid;
   if p_route is not null then
    select coalesce(max(collision_slot)+1,0) into slot_value from public.ai_question_fingerprint_routes
     where origin=r.origin and family=family_value and normalizer_version=(p_route->>'normalizer_version')::smallint and key_version=(p_route->>'key_version')::smallint and fingerprint=digest_value;
    insert into public.ai_question_fingerprint_routes(origin,family,normalizer_version,key_version,fingerprint,collision_slot,normalized_question,group_id)
     values(r.origin,family_value,(p_route->>'normalizer_version')::smallint,(p_route->>'key_version')::smallint,digest_value,slot_value,p_route->>'normalized_question',gid);
   end if;
  end if;
  r.id:=gen_random_uuid(); r.group_id:=gid; r.recorded_at:=now();
  insert into public.ai_review_occurrences select (r).*;
  new_occurrence:=true;
  update public.ai_question_groups set first_seen_at=least(first_seen_at,r.first_observed_at),last_seen_at=greatest(last_seen_at,r.first_observed_at),revision=revision+1,updated_at=now() where id=gid;
 end if;
 -- Membership cannot be changed by this capture API; merge/split is reserved for 0717.
 perform 1 from public.ai_question_groups where id=gid for update;
 op:=coalesce(p_feedback_id,aid);
 if r.occurrence_kind in ('insufficient_evidence','conflict') or negative then
  insert into public.ai_manager_review_cases(group_id,priority) values(gid,case when r.occurrence_kind='conflict' then 'high' else 'normal' end)
   on conflict(group_id) do nothing returning id into cid;
  created_case:=cid is not null;
  if created_case then
   insert into public.ai_manager_review_events(operation_id,group_id,case_id,occurrence_id,actor_kind,action,after_state)
    values(op,gid,cid,r.id,'system','case_created',jsonb_build_object('status','new','priority',case when r.occurrence_kind='conflict' then 'high' else 'normal' end));
  else
   select * into c from public.ai_manager_review_cases where group_id=gid for update;
   if new_occurrence and r.occurrence_kind='conflict' and c.priority<>'high' then
    update public.ai_manager_review_cases set priority='high',revision=revision+1,updated_at=now() where id=c.id;
    insert into public.ai_manager_review_events(operation_id,event_ordinal,group_id,case_id,occurrence_id,actor_kind,action,before_state,after_state)
     values(op,1,gid,c.id,r.id,'system','priority_changed',jsonb_build_object('priority',c.priority),jsonb_build_object('priority','high'));
   end if;
  end if;
 end if;
 return jsonb_build_object('recorded',true);
end $$;
revoke all on function public.capture_ai_quality(jsonb,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.capture_ai_quality(jsonb,jsonb,jsonb,uuid) to service_role;
commit;
