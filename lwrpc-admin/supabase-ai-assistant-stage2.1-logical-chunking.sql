-- Stage 2.1: Non-searchable preview chunks (for example, a table of contents)
-- intentionally do not receive embeddings. Ready-version activation must only
-- require embeddings for chunks that participate in retrieval.
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
       and exists (
         select 1
           from public.ai_document_chunks c
          where c.document_version_id = v.id
            and c.is_searchable
       )
       and not exists (
         select 1
           from public.ai_document_chunks c
          where c.document_version_id = v.id
            and c.is_searchable
            and c.embedding is null
       )
  ) then
    raise exception 'Only a fully processed ready version with embeddings for searchable chunks can be activated.';
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
