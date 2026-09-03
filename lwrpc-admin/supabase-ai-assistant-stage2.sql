-- Ask LWR Pickleball AI — Stage 2
-- Apply after supabase-ai-assistant-stage1.sql.
--
-- Reprocessing creates a new immutable version which may reference the same
-- original Storage object. Removing the object-path uniqueness constraint is
-- what lets the old active version remain searchable while that new version
-- is extracted and embedded.

alter table public.ai_document_versions
  drop constraint if exists ai_document_versions_storage_bucket_storage_path_key;

create index if not exists ai_document_versions_storage_object_idx
  on public.ai_document_versions (storage_bucket, storage_path);

-- Service-role routes are the only callers. SECURITY INVOKER keeps this
-- function from bypassing RLS if its access model changes in the future.
create or replace function public.activate_ai_document_version(
  p_document_id uuid,
  p_version_id uuid
)
returns void
language plpgsql
security invoker
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
     set active_version_id = p_version_id,
         status = 'active'
   where id = p_document_id;

  if v_previous_version_id is not null and v_previous_version_id <> p_version_id then
    update public.ai_document_versions
       set processing_status = 'superseded'
     where id = v_previous_version_id
       and processing_status = 'ready';
  end if;
end;
$$;

revoke all on function public.activate_ai_document_version(uuid, uuid) from public, anon, authenticated;
grant execute on function public.activate_ai_document_version(uuid, uuid) to service_role;

