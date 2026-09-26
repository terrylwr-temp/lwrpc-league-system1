# Future Supabase table migrations: explicit Data API access

Use this pattern for **new** tables. Existing migrations and standalone `lwrpc-admin/supabase-*.sql` files (including `supabase-tournament-schema.sql`) are historical artifacts, not templates; do not rewrite them to adopt this style. Supabase's October 30 change removes automatic Data API grants for newly created `public` tables in existing projects. A table privilege and an RLS policy are separate requirements: a client operation needs both. Never copy broad default grants or use `GRANT ALL` on a new application table.

Before writing SQL, review each role independently. `[]` means no access. `service_role` is for trusted server code only; it is not a default grant. Review serial/identity sequences separately. Prefer a non-exposed schema if only internal code needs a table.

| Example | `anon` | `authenticated` | `service_role` |
| --- | --- | --- | --- |
| Authenticated notes | none | `SELECT`, `INSERT`, `UPDATE` | none |
| Published notices | `SELECT` | `SELECT`, `INSERT`, `UPDATE` | none |
| Public-schema server job | none | none | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| Private-schema internal job | none | none | `SELECT`, `INSERT` |

These are examples, not recommended grants for unrelated tables. Replace each matrix with the actual data flow before applying a migration.

## 1. Authenticated-only table with a serial sequence

```sql
create table public.member_notes (
  id bigserial primary key,
  owner_user_id uuid not null references auth.users(id),
  note text not null
);

revoke all on table public.member_notes from public, anon, authenticated, service_role;
grant select, insert, update on table public.member_notes to authenticated;
alter table public.member_notes enable row level security;

create policy "Read own notes" on public.member_notes
  for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "Insert own notes" on public.member_notes
  for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy "Update own notes" on public.member_notes
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

revoke all on sequence public.member_notes_id_seq from public, anon, authenticated, service_role;
grant usage on sequence public.member_notes_id_seq to authenticated;
```

`anon` and `service_role` deliberately receive no table or sequence privileges. The owner check is based on the authenticated session, not an unverified browser-supplied identity. Review whether the real workflow needs `DELETE` before adding it.

## 2. Public read, authenticated write

```sql
create table public.club_notices (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references auth.users(id),
  body text not null,
  published boolean not null default false
);

revoke all on table public.club_notices from public, anon, authenticated, service_role;
grant select on table public.club_notices to anon;
grant select, insert, update on table public.club_notices to authenticated;
alter table public.club_notices enable row level security;

create policy "Anonymous read published notices" on public.club_notices
  for select to anon using (published);
create policy "Authenticated read permitted notices" on public.club_notices
  for select to authenticated
  using (published or author_user_id = (select auth.uid()));
create policy "Authors create notices" on public.club_notices
  for insert to authenticated
  with check (author_user_id = (select auth.uid()));
create policy "Authors update notices" on public.club_notices
  for update to authenticated
  using (author_user_id = (select auth.uid()))
  with check (author_user_id = (select auth.uid()));
```

This example has no owned sequence. For an actual notice workflow, review who is allowed to publish; the sample author policy may be too permissive for publishing. Do not use it without adapting that rule.

## 3. Server-only table in `public` when public placement is required

```sql
create table public.server_job_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt jsonb not null
);

revoke all on table public.server_job_receipts from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.server_job_receipts to service_role;
alter table public.server_job_receipts enable row level security;
-- No client RLS policies: neither anon nor authenticated has table access.
-- service_role bypasses RLS only in trusted server code; never put its key in a browser.
```

## 4. Preferred internal table in a non-exposed schema

```sql
create schema if not exists job_private;
revoke all on schema job_private from public, anon, authenticated, service_role;
grant usage on schema job_private to service_role;

create table job_private.run_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt jsonb not null
);
revoke all on table job_private.run_receipts from public, anon, authenticated, service_role;
grant select, insert on table job_private.run_receipts to service_role;
alter table job_private.run_receipts enable row level security;
-- No Data API client policies. Keep job_private out of PostgREST exposed schemas.
```

Review the actual execution identity for server code; a server-side SQL function may need a different role or a narrowly controlled `SECURITY DEFINER` helper. The private schema example is outside the `public`-table gate but still requires security review.

## Automated contract for each future `public` table

Add `lwrpc-admin/test/migration-grant-contracts/<migration filename>.json` alongside the SQL migration. The gate discovers it automatically. `setupSql` creates only dependencies needed to replay that migration in isolated PGlite; it must not grant the target table privileges. Declare every new public table, all three API roles, RLS, policy names/commands/roles, and owned sequences. An empty array/object is an explicit none decision.

```json
{
  "setupSql": "create schema auth; create table auth.users (id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;",
  "tables": {
    "member_notes": {
      "grants": {
        "anon": [],
        "authenticated": ["SELECT", "INSERT", "UPDATE"],
        "service_role": []
      },
      "rls": true,
      "policies": [
        { "name": "Read own notes", "command": "SELECT", "roles": ["authenticated"], "using": "REPLACE_WITH_pg_policies.qual", "check": null },
        { "name": "Insert own notes", "command": "INSERT", "roles": ["authenticated"], "using": null, "check": "REPLACE_WITH_pg_policies.with_check" },
        { "name": "Update own notes", "command": "UPDATE", "roles": ["authenticated"], "using": "REPLACE_WITH_pg_policies.qual", "check": "REPLACE_WITH_pg_policies.with_check" }
      ],
      "sequences": {
        "member_notes_id_seq": {
          "anon": [],
          "authenticated": ["USAGE"],
          "service_role": []
        }
      }
    }
  }
}
```

Replace the predicate placeholders with the exact `qual` and `with_check` text returned by `pg_policies` in an isolated replay. Use `null` only when that clause is absent. The gate's assertion diff shows the actual canonical expression if it differs. For a policy that intentionally uses `true`, the catalog expression is simply `"true"`.

The gate creates API roles with no old automatic table or sequence grants, runs the migration, and compares actual catalog ACLs, RLS, policies (including predicates), and owned sequences to this contract. It also requires source-level `REVOKE ALL` from `PUBLIC` and all three roles, so a migration cannot pass merely because the isolated database starts with safe defaults. `GRANT ALL` fails. Historical migrations are excluded by an exact filename/table allowlist; adding a new table to an old file still requires a contract.
