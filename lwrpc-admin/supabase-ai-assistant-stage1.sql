-- Ask LWR Pickleball AI — Stage 1
--
-- Preflight before applying this script in Supabase:
--   select extname, extversion from pg_extension where extname = 'vector';
--
-- This script does not move, rename, delete, or otherwise change existing
-- dashboard and league PDFs in the `documents` bucket. Existing PDFs can be
-- cataloged later with source_kind = 'existing_storage'. New managed PDFs use
-- the private `ai-official-documents` bucket, created separately in Storage.

create extension if not exists vector with schema extensions;

create table if not exists public.ai_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  document_type text not null check (document_type in (
    'league_rules',
    'league_supplement',
    'captain_guide',
    'player_guide',
    'lms_guide',
    'other'
  )),
  authority_rank smallint not null check (authority_rank between 1 and 99),
  status text not null default 'inactive' check (status in ('active', 'inactive', 'archived')),
  scope_kind text not null default 'all' check (scope_kind in ('all', 'lms_help', 'league', 'division')),
  league_id uuid references public.leagues(id) on delete set null,
  division_id uuid references public.divisions(id) on delete set null,
  season_id uuid references public.seasons(id) on delete set null,
  active_version_id uuid,
  created_by_member_id uuid references public.members(id) on delete set null,
  updated_by_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope_kind in ('all', 'lms_help') and league_id is null and division_id is null)
    or (scope_kind = 'league' and league_id is not null and division_id is null)
    or (scope_kind = 'division' and division_id is not null)
  )
);

create table if not exists public.ai_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.ai_documents(id) on delete cascade,
  version_label text not null,
  source_kind text not null check (source_kind in ('existing_storage', 'managed_storage')),
  storage_bucket text not null,
  storage_path text not null,
  original_filename text not null,
  checksum_sha256 text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  page_count integer check (page_count is null or page_count >= 0),
  processing_status text not null default 'queued' check (processing_status in ('queued', 'processing', 'ready', 'failed', 'superseded')),
  processing_error text,
  processing_warnings jsonb not null default '[]'::jsonb,
  processed_at timestamptz,
  processed_by_member_id uuid references public.members(id) on delete set null,
  chunk_count integer not null default 0 check (chunk_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, version_label),
  unique (storage_bucket, storage_path)
);

alter table public.ai_documents
  add constraint ai_documents_active_version_id_fkey
  foreign key (active_version_id)
  references public.ai_document_versions(id)
  on delete set null;

create table if not exists public.ai_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.ai_document_versions(id) on delete cascade,
  chunk_ordinal integer not null check (chunk_ordinal > 0),
  page_number integer check (page_number is null or page_number > 0),
  section_label text,
  rule_number text,
  heading text,
  content text not null check (length(trim(content)) > 0),
  search_vector tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored,
  embedding extensions.vector(1536),
  embedding_model text,
  is_searchable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_version_id, chunk_ordinal)
);

comment on table public.ai_documents is
  'Official LWR document catalog for Ask LWR Pickleball AI. Existing LMS PDFs remain in place and can be indexed by reference.';
comment on table public.ai_document_versions is
  'Versioned source PDF metadata. A replacement is not searchable until it is ready and atomically promoted.';
comment on table public.ai_document_chunks is
  'Server-only extracted document text and embeddings. is_searchable supports excluding an individual bad chunk.';

create index if not exists ai_documents_active_scope_idx
  on public.ai_documents (scope_kind, league_id, division_id, season_id)
  where status = 'active';
create index if not exists ai_documents_active_version_idx
  on public.ai_documents (active_version_id)
  where active_version_id is not null;
create index if not exists ai_document_versions_document_status_idx
  on public.ai_document_versions (document_id, processing_status, created_at desc);
create index if not exists ai_document_chunks_version_searchable_idx
  on public.ai_document_chunks (document_version_id, is_searchable, chunk_ordinal);
create index if not exists ai_document_chunks_search_vector_idx
  on public.ai_document_chunks using gin (search_vector);
create index if not exists ai_document_chunks_embedding_hnsw_idx
  on public.ai_document_chunks using hnsw (embedding extensions.vector_cosine_ops)
  where is_searchable and embedding is not null;

create or replace function public.ai_assistant_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_documents_set_updated_at on public.ai_documents;
create trigger ai_documents_set_updated_at
before update on public.ai_documents
for each row execute function public.ai_assistant_set_updated_at();

drop trigger if exists ai_document_versions_set_updated_at on public.ai_document_versions;
create trigger ai_document_versions_set_updated_at
before update on public.ai_document_versions
for each row execute function public.ai_assistant_set_updated_at();

drop trigger if exists ai_document_chunks_set_updated_at on public.ai_document_chunks;
create trigger ai_document_chunks_set_updated_at
before update on public.ai_document_chunks
for each row execute function public.ai_assistant_set_updated_at();

create or replace function public.activate_ai_document_version(
  p_document_id uuid,
  p_version_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_previous_version_id uuid;
begin
  select active_version_id
    into v_previous_version_id
    from public.ai_documents
   where id = p_document_id
   for update;

  if not found then
    raise exception 'AI document % was not found.', p_document_id;
  end if;

  if not exists (
    select 1
      from public.ai_document_versions v
     where v.id = p_version_id
       and v.document_id = p_document_id
       and v.processing_status = 'ready'
       and v.chunk_count > 0
       and not exists (
         select 1
           from public.ai_document_chunks c
          where c.document_version_id = v.id
            and c.embedding is null
       )
  ) then
    raise exception 'Only a fully processed ready version with embeddings can be activated.';
  end if;

  update public.ai_documents
     set active_version_id = p_version_id
   where id = p_document_id;

  if v_previous_version_id is not null and v_previous_version_id <> p_version_id then
    update public.ai_document_versions
       set processing_status = 'superseded'
     where id = v_previous_version_id
       and processing_status = 'ready';
  end if;
end;
$$;

alter table public.ai_documents enable row level security;
alter table public.ai_document_versions enable row level security;
alter table public.ai_document_chunks enable row level security;

-- Intentional zero direct-access policy: all reads and writes go through
-- protected Next.js server routes using the service role. This keeps chunks,
-- embeddings, document processing errors, and unpublished versions private.
revoke all on table public.ai_documents from anon, authenticated;
revoke all on table public.ai_document_versions from anon, authenticated;
revoke all on table public.ai_document_chunks from anon, authenticated;
revoke all on function public.activate_ai_document_version(uuid, uuid) from public, anon, authenticated;
grant execute on function public.activate_ai_document_version(uuid, uuid) to service_role;

