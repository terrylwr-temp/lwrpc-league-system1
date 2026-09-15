-- Existing incompatible security state is drift, not a request to silently repair it.
do $private_preflight$ declare object_name text;begin
 foreach object_name in array array['lms_read_private','lms_write_private'] loop
  if exists(select 1 from pg_catalog.pg_namespace where nspname=object_name and nspowner<>'postgres'::regrole) then raise exception 'LMS0726 schema owner drift: %',object_name;end if;
 end loop;
 foreach object_name in array array['policy_bindings','operation_receipts','notification_outbox'] loop
  if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='lms_write_private' and c.relname=object_name and (c.relowner<>'postgres'::regrole or not c.relrowsecurity or c.relkind<>'r')) then raise exception 'LMS0726 table security drift: %',object_name;end if;
 end loop;
end $private_preflight$;
create schema if not exists lms_read_private authorization postgres;
create schema if not exists lms_write_private authorization postgres;
revoke all on schema lms_read_private,lms_write_private from public,anon,authenticated;
grant usage on schema public,lms_write_private to lms_roster_writer,lms_lineup_writer,lms_eligibility_reader,lms_notification_worker;
grant usage on schema lms_read_private to lms_page_reader;

create table if not exists lms_write_private.policy_bindings (
 season_id uuid not null references public.seasons(id), league_id uuid not null references public.leagues(id),
 division_id uuid not null references public.divisions(id), condition_code text not null,
 stage text not null check(stage in('ADMISSION','LINEUP','SEASON','MATCH')),
 rules_version text not null,source_ref text not null,
 source_kind text not null check(source_kind in('EXISTING_COLUMN','DERIVED','UNAVAILABLE')),
 comparison text not null,parameters jsonb not null default '{}',config_hash text not null,
 status text not null check(status in('VERIFIED','UNMAPPED','CONFLICT')),
 reviewed_at timestamptz,reviewed_by uuid,
 primary key(season_id,league_id,division_id,condition_code,stage)
);
create table if not exists lms_write_private.operation_receipts (
 id uuid primary key,actor_user_id uuid not null,request_id uuid not null,operation text not null,
 resource_id uuid not null,subject_id uuid,request_hash text not null,outcome jsonb not null,
 created_at timestamptz not null default transaction_timestamp(),unique(actor_user_id,request_id)
);
create table if not exists lms_write_private.notification_outbox (
 id uuid primary key,operation_id uuid not null references lms_write_private.operation_receipts(id),
 event_type text not null,channel text not null check(channel in('email','sms')),recipient_key text not null,
 payload jsonb not null,payload_hash text not null,
 state text not null check(state in('PENDING','CLAIMED','SENT','FAILED','SKIPPED','AMBIGUOUS')),
 first_attempt_at timestamptz,claimed_at timestamptz,attempts integer not null default 0 check(attempts>=0),
 provider_message_id text,error_code text,created_at timestamptz not null default transaction_timestamp(),
 unique(operation_id,event_type,channel,recipient_key)
);
alter table lms_write_private.policy_bindings enable row level security;
alter table lms_write_private.operation_receipts enable row level security;
alter table lms_write_private.notification_outbox enable row level security;
revoke all on table lms_write_private.policy_bindings,lms_write_private.operation_receipts,lms_write_private.notification_outbox from public,anon,authenticated,service_role,lms_view_as_executor,lms_page_reader,lms_roster_writer,lms_lineup_writer,lms_eligibility_reader,lms_normal_executor,lms_notification_worker;


