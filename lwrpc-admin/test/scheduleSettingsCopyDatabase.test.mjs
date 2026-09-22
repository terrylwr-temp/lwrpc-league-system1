import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(
  new URL("../supabase/migrations/20260922233200_schedule_setting_bye_ownership.sql", import.meta.url),
  "utf8"
);

test("copy ownership migration preserves existing rows and isolates new byes", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table public.league_schedule_settings (id uuid primary key);
      create table public.team_byes (id uuid primary key);
      insert into public.league_schedule_settings values ('10000000-0000-4000-8000-000000000001');
      insert into public.team_byes values ('20000000-0000-4000-8000-000000000001');
    `);
    await db.exec(migration);
    const existing = (await db.query("select is_copy from public.league_schedule_settings")).rows;
    assert.deepEqual(existing, [{ is_copy: false }]);
    assert.equal((await db.query("select schedule_setting_id from public.team_byes")).rows[0].schedule_setting_id, null);

    await db.exec(`
      insert into public.league_schedule_settings (id, is_copy)
        values ('10000000-0000-4000-8000-000000000002', true);
      insert into public.team_byes (id, schedule_setting_id)
        values ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002');
    `);
    assert.equal((await db.query("select count(*)::int n from public.team_byes where schedule_setting_id = '10000000-0000-4000-8000-000000000002'")).rows[0].n, 1);
    await db.exec("delete from public.league_schedule_settings where id = '10000000-0000-4000-8000-000000000002'");
    assert.equal((await db.query("select count(*)::int n from public.team_byes where schedule_setting_id is null")).rows[0].n, 2);
  } finally {
    await db.close();
  }
});
