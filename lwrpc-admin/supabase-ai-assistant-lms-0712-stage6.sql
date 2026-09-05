-- Ask LWR Pickleball Club AI — LMS-0712 Stage 6 feedback events
-- Apply after deploying the LMS-0712 server route. This script does not alter
-- AI documents, document versions, chunks, embeddings, or retrieval functions.

create table if not exists public.ai_answer_feedback_events (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null,
  auth_user_id uuid not null,
  member_id uuid references public.members(id) on delete set null,
  helpful boolean not null,
  original_question text not null check (length(trim(original_question)) between 1 and 1000),
  effective_question text not null check (length(trim(effective_question)) between 1 and 1000),
  generated_answer text not null check (length(trim(generated_answer)) between 1 and 6000),
  source_snapshot jsonb not null default '[]'::jsonb,
  selection_snapshot jsonb not null default '{}'::jsonb,
  assistant_version text not null,
  model text not null default '',
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists ai_answer_feedback_events_answer_user_created_idx
  on public.ai_answer_feedback_events (answer_id, auth_user_id, created_at desc);

alter table public.ai_answer_feedback_events enable row level security;
revoke all on table public.ai_answer_feedback_events from public, anon, authenticated;
grant all on table public.ai_answer_feedback_events to service_role;

comment on table public.ai_answer_feedback_events is
  'Append-only player feedback for grounded Ask LWR answers. Source snapshots exclude raw chunks, embeddings, signed URLs, credentials, and full conversation history.';
