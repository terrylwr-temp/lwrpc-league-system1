begin;
-- LMS-0722: prospective first-activation provenance only. No historical backfill.
alter table public.ai_document_versions add column if not exists activated_at timestamptz;
alter table public.ai_document_versions add column if not exists activated_by_member_id uuid references public.members(id) on delete set null;

create or replace function public.activate_ai_document_version(p_document_id uuid,p_version_id uuid,p_actor_member_id uuid)
returns void language plpgsql security invoker set search_path = pg_catalog as $$
declare previous_id uuid; previous_status text;
begin
  if p_actor_member_id is null or not exists (
    select 1 from public.members m join public.user_roles r on r.member_id=m.id
    where m.id=p_actor_member_id and r.role in ('league_manager','commissioner')
  ) then raise exception 'Authorized activation actor required.'; end if;
  select active_version_id,status into previous_id,previous_status from public.ai_documents where id=p_document_id for update;
  if not found then raise exception 'AI document was not found.'; end if;
  -- A retry is not a new activation, including an unrecorded historical activation.
  if previous_id=p_version_id and previous_status='active' then return; end if;
  perform 1 from public.ai_document_versions v where v.id=p_version_id and v.document_id=p_document_id and v.processing_status='ready' and v.chunk_count>0
    and exists(select 1 from public.ai_document_chunks c where c.document_version_id=v.id and c.is_searchable)
    and not exists(select 1 from public.ai_document_chunks c where c.document_version_id=v.id and c.is_searchable and c.embedding is null) for update;
  if not found then raise exception 'Only a fully processed ready version with embeddings for searchable chunks can be activated.'; end if;
  update public.ai_document_versions set activated_at=coalesce(activated_at,clock_timestamp()),activated_by_member_id=case when activated_at is null then p_actor_member_id else activated_by_member_id end where id=p_version_id;
  update public.ai_documents set active_version_id=p_version_id,status='active' where id=p_document_id;
  if previous_id is not null and previous_id<>p_version_id then
    update public.ai_document_versions set processing_status='superseded' where id=previous_id and processing_status='ready';
  end if;
end $$;
-- Remove the old actor-less bypass, and override inherited/default function grants.
drop function if exists public.activate_ai_document_version(uuid,uuid);
revoke all on function public.activate_ai_document_version(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.activate_ai_document_version(uuid,uuid,uuid) to service_role;

-- Fail closed if another trusted path tries to change the active pointer without provenance.
-- Existing active rows remain truthful Unknown until an actual new activation occurs.
create or replace function public.ai_require_activation_history() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
begin
  if new.status='active' and new.active_version_id is not null and
    (tg_op='INSERT' or old.active_version_id is distinct from new.active_version_id or old.status is distinct from 'active') then
    if not exists(select 1 from public.ai_document_versions v where v.id=new.active_version_id and v.document_id=new.id and v.activated_at is not null and v.activated_by_member_id is not null) then
      raise exception 'Activation history must be recorded atomically before activation.';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.ai_require_activation_history() from public,anon,authenticated,service_role;
drop trigger if exists ai_require_activation_history on public.ai_documents;
create trigger ai_require_activation_history before insert or update of active_version_id,status on public.ai_documents for each row execute function public.ai_require_activation_history();
-- No table ACL, RLS policy, project-wide default privilege, corpus or retrieval changes.
commit;
