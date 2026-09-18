create table public.scheduling_special_requests (
  id uuid primary key default gen_random_uuid(),
  location_id uuid,
  member_id uuid,
  request_date date not null,
  division_id uuid,
  team_id uuid,
  request_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid,
  constraint scheduling_special_requests_location_id_fkey
    foreign key (location_id) references public.locations(id) on delete set null,
  constraint scheduling_special_requests_member_id_fkey
    foreign key (member_id) references public.members(id) on delete set null,
  constraint scheduling_special_requests_division_id_fkey
    foreign key (division_id) references public.divisions(id) on delete set null,
  constraint scheduling_special_requests_team_id_fkey
    foreign key (team_id) references public.teams(id) on delete set null,
  constraint scheduling_special_requests_created_by_user_id_fkey
    foreign key (created_by_user_id) references auth.users(id) on delete set null,
  constraint scheduling_special_requests_request_text_check
    check (length(btrim(request_text)) between 1 and 5000)
);

comment on table public.scheduling_special_requests is
  'Administrative tracking only. These records do not alter or constrain schedule generation.';
comment on column public.scheduling_special_requests.request_date is
  'Date the request applies to, which may differ from the record creation date.';

create index scheduling_special_requests_request_date_idx
  on public.scheduling_special_requests (request_date, id);
create index scheduling_special_requests_location_date_idx
  on public.scheduling_special_requests (location_id, request_date);
create index scheduling_special_requests_member_date_idx
  on public.scheduling_special_requests (member_id, request_date);
create index scheduling_special_requests_division_date_idx
  on public.scheduling_special_requests (division_id, request_date);
create index scheduling_special_requests_team_date_idx
  on public.scheduling_special_requests (team_id, request_date);
create index scheduling_special_requests_created_by_idx
  on public.scheduling_special_requests (created_by_user_id);

create function private.scheduling_special_requests_prepare()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.team_id is not null
     and new.division_id is not null
     and not exists (
       select 1
       from public.teams t
       where t.id = new.team_id
         and t.division_id = new.division_id
     ) then
    raise exception 'Selected team does not belong to the selected division.';
  end if;

  new.request_text := btrim(new.request_text);
  new.updated_at := now();

  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.created_by_user_id := auth.uid();
  else
    new.created_at := old.created_at;
    new.created_by_user_id := old.created_by_user_id;
  end if;

  return new;
end;
$function$;

revoke all on function private.scheduling_special_requests_prepare() from public, anon, authenticated, service_role;

create trigger scheduling_special_requests_prepare
before insert or update on public.scheduling_special_requests
for each row execute function private.scheduling_special_requests_prepare();

alter table public.scheduling_special_requests enable row level security;

revoke all on table public.scheduling_special_requests from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.scheduling_special_requests to authenticated;
grant all on table public.scheduling_special_requests to service_role;

create policy "League managers can read scheduling special requests"
on public.scheduling_special_requests
for select
to authenticated
using ((select private.current_user_is_lwrpc_admin()));

create policy "League managers can insert scheduling special requests"
on public.scheduling_special_requests
for insert
to authenticated
with check ((select private.current_user_is_lwrpc_admin()));

create policy "League managers can update scheduling special requests"
on public.scheduling_special_requests
for update
to authenticated
using ((select private.current_user_is_lwrpc_admin()))
with check ((select private.current_user_is_lwrpc_admin()));

create policy "League managers can delete scheduling special requests"
on public.scheduling_special_requests
for delete
to authenticated
using ((select private.current_user_is_lwrpc_admin()));
