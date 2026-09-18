import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(
  new URL("../supabase/migrations/20260918150701_scheduling_special_requests.sql", import.meta.url),
  "utf8"
);

const ids = {
  manager: "10000000-0000-4000-8000-000000000001",
  commissioner: "10000000-0000-4000-8000-000000000002",
  player: "10000000-0000-4000-8000-000000000003",
  member: "20000000-0000-4000-8000-000000000001",
  location: "30000000-0000-4000-8000-000000000001",
  division: "40000000-0000-4000-8000-000000000001",
  otherDivision: "40000000-0000-4000-8000-000000000002",
  team: "50000000-0000-4000-8000-000000000001",
};

async function setAuthenticatedUser(db, userId) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [userId]);
  await db.exec("set role authenticated");
}

test("Special Requests migration provides isolated CRUD, relationships, RLS, and safe deletion", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create schema private;
      revoke all on schema private from public;
      grant usage on schema public, auth to anon, authenticated, service_role;
      grant usage on schema private to authenticated;

      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;

      create table public.user_roles (user_id uuid not null, role text not null);
      create table public.locations (id uuid primary key, name text not null);
      create table public.members (id uuid primary key, full_name text);
      create table public.divisions (id uuid primary key, name text not null);
      create table public.teams (
        id uuid primary key,
        division_id uuid references public.divisions(id),
        name text not null
      );
      grant select on public.locations, public.members, public.divisions, public.teams to authenticated;

      create function private.current_user_is_lwrpc_admin()
      returns boolean
      language sql
      stable
      security definer
      set search_path = ''
      as $$
        select exists (
          select 1
          from public.user_roles ur
          where ur.user_id = (select auth.uid())
            and ur.role in ('league_manager', 'commissioner')
        )
      $$;
      revoke all on function private.current_user_is_lwrpc_admin() from public;
      grant execute on function private.current_user_is_lwrpc_admin() to authenticated;
    `);
    await db.exec(migration);

    const metadata = (await db.query(`
      select c.relrowsecurity, c.relforcerowsecurity
      from pg_class c
      where c.oid = 'public.scheduling_special_requests'::regclass
    `)).rows[0];
    assert.equal(metadata.relrowsecurity, true);
    assert.equal(metadata.relforcerowsecurity, false);
    assert.equal((await db.query("select count(*)::int n from pg_policies where schemaname='public' and tablename='scheduling_special_requests'")).rows[0].n, 4);
    assert.equal((await db.query("select count(*)::int n from pg_indexes where schemaname='public' and tablename='scheduling_special_requests'")).rows[0].n, 7);
    assert.equal((await db.query("select has_table_privilege('anon','scheduling_special_requests','SELECT') allowed")).rows[0].allowed, false);
    assert.equal((await db.query("select has_table_privilege('authenticated','scheduling_special_requests','SELECT,INSERT,UPDATE,DELETE') allowed")).rows[0].allowed, true);
    assert.equal((await db.query("select has_table_privilege('service_role','scheduling_special_requests','SELECT,INSERT,UPDATE,DELETE') allowed")).rows[0].allowed, true);
    assert.equal((await db.query("select has_function_privilege('authenticated','private.scheduling_special_requests_prepare()','EXECUTE') allowed")).rows[0].allowed, false);

    await db.query("insert into auth.users(id) values($1),($2),($3)", [ids.manager, ids.commissioner, ids.player]);
    await db.query("insert into user_roles(user_id,role) values($1,'league_manager'),($2,'commissioner'),($3,'player')", [ids.manager, ids.commissioner, ids.player]);
    await db.query("insert into locations(id,name) values($1,'Community Courts')", [ids.location]);
    await db.query("insert into members(id,full_name) values($1,'Sample Member')", [ids.member]);
    await db.query("insert into divisions(id,name) values($1,'Division One'),($2,'Division Two')", [ids.division, ids.otherDivision]);
    await db.query("insert into teams(id,division_id,name) values($1,$2,'Sample Team')", [ids.team, ids.division]);

    await setAuthenticatedUser(db, ids.player);
    assert.equal((await db.query("select count(*)::int n from scheduling_special_requests")).rows[0].n, 0);
    await assert.rejects(
      db.query("insert into scheduling_special_requests(member_id,request_date,request_text) values($1,'2026-11-12','Denied')", [ids.member]),
      /row-level security/i
    );
    await db.exec("reset role");

    await setAuthenticatedUser(db, ids.manager);
    const created = (await db.query(`
      insert into scheduling_special_requests
        (location_id,member_id,request_date,division_id,team_id,request_text)
      values ($1,$2,'2026-11-12',$3,$4,'  Avoid evening play.  ')
      returning id, request_text, created_by_user_id, created_at, updated_at
    `, [ids.location, ids.member, ids.division, ids.team])).rows[0];
    assert.equal(created.request_text, "Avoid evening play.");
    assert.equal(created.created_by_user_id, ids.manager);
    assert.equal((await db.query("select count(*)::int n from scheduling_special_requests")).rows[0].n, 1);

    await db.query("update scheduling_special_requests set request_text='  Updated request.  ' where id=$1", [created.id]);
    const edited = (await db.query("select request_text,created_by_user_id,created_at,updated_at from scheduling_special_requests where id=$1", [created.id])).rows[0];
    assert.equal(edited.request_text, "Updated request.");
    assert.equal(edited.created_by_user_id, ids.manager);
    assert.equal(edited.created_at.toISOString(), created.created_at.toISOString());
    await assert.rejects(
      db.query("insert into scheduling_special_requests(member_id,request_date,division_id,team_id,request_text) values($1,'2026-11-13',$2,$3,'Mismatch')", [ids.member, ids.otherDivision, ids.team]),
      /does not belong/i
    );
    await db.exec("reset role");

    await setAuthenticatedUser(db, ids.commissioner);
    const general = (await db.query(`
      insert into scheduling_special_requests(member_id,request_date,request_text)
      values($1,'2026-11-14','General request')
      returning id,location_id,division_id,team_id,created_by_user_id
    `, [ids.member])).rows[0];
    assert.equal(general.location_id, null);
    assert.equal(general.division_id, null);
    assert.equal(general.team_id, null);
    assert.equal(general.created_by_user_id, ids.commissioner);
    await db.exec("reset role");

    await db.query("delete from locations where id=$1", [ids.location]);
    assert.equal((await db.query("select location_id from scheduling_special_requests where id=$1", [created.id])).rows[0].location_id, null);
    assert.equal((await db.query("select count(*)::int n from members where id=$1", [ids.member])).rows[0].n, 1);
    assert.equal((await db.query("select count(*)::int n from teams where id=$1", [ids.team])).rows[0].n, 1);

    await setAuthenticatedUser(db, ids.manager);
    await db.query("delete from scheduling_special_requests where id=$1", [created.id]);
    assert.equal((await db.query("select count(*)::int n from scheduling_special_requests")).rows[0].n, 1);
    await db.exec("reset role");

    await db.exec("set role anon");
    await assert.rejects(db.query("select * from scheduling_special_requests"), /permission denied/i);
    await db.exec("reset role");

    await db.exec("set role service_role");
    assert.equal((await db.query("select count(*)::int n from scheduling_special_requests")).rows[0].n, 1);
    await db.query("delete from scheduling_special_requests where id=$1", [general.id]);
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int n from scheduling_special_requests")).rows[0].n, 0);
  } finally {
    await db.close();
  }
});
