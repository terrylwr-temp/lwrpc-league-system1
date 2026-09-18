import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const initialMigration = await readFile(
  new URL("../supabase/migrations/20260918012928_rule_5_15_1_compensatory_points.sql", import.meta.url),
  "utf8"
);
const endOnlyMigration = await readFile(
  new URL("../supabase/migrations/20260918114101_end_of_season_played_date_points.sql", import.meta.url),
  "utf8"
);

test("end-of-season points migrations retain least privilege and support audited awards without a baseline", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      grant usage on schema public to anon, authenticated, service_role;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      create table public.members (id uuid primary key);
      create table public.leagues (id uuid primary key);
      create table public.divisions (id uuid primary key, league_id uuid references public.leagues(id));
      create table public.teams (id uuid primary key, division_id uuid references public.divisions(id));
      create table public.team_standings (id uuid primary key default gen_random_uuid());
    `);
    await db.exec(initialMigration);
    await db.exec(endOnlyMigration);

    const tables = [
      "division_compensation_baselines",
      "division_compensation_baseline_teams",
      "division_compensation_baseline_matches",
      "division_compensatory_point_awards",
    ];
    const security = (await db.query(
      "select relname, relrowsecurity from pg_class where relname = any($1) order by relname",
      [tables]
    )).rows;
    assert.equal(security.length, 4);
    assert.ok(security.every((row) => row.relrowsecurity));

    for (const table of tables.slice(0, 3)) {
      assert.equal((await db.query("select has_table_privilege('anon',$1,'SELECT') allowed", [table])).rows[0].allowed, false);
      assert.equal((await db.query("select has_table_privilege('authenticated',$1,'SELECT') allowed", [table])).rows[0].allowed, false);
      assert.equal((await db.query("select has_table_privilege('service_role',$1,'SELECT,INSERT,UPDATE,DELETE') allowed", [table])).rows[0].allowed, true);
    }
    assert.equal((await db.query("select has_table_privilege('authenticated','division_compensatory_point_awards','SELECT') allowed")).rows[0].allowed, true);
    assert.equal((await db.query("select has_table_privilege('authenticated','division_compensatory_point_awards','INSERT') allowed")).rows[0].allowed, false);
    assert.equal((await db.query("select has_table_privilege('anon','division_compensatory_point_awards','SELECT') allowed")).rows[0].allowed, false);

    const leagueId = "10000000-0000-4000-8000-000000000001";
    const divisionId = "20000000-0000-4000-8000-000000000001";
    const oldTeamId = "30000000-0000-4000-8000-000000000001";
    const newTeamId = "30000000-0000-4000-8000-000000000002";
    await db.query("insert into leagues(id) values($1)", [leagueId]);
    await db.query("insert into divisions(id,league_id) values($1,$2)", [divisionId, leagueId]);
    await db.query("insert into teams(id,division_id) values($1,$2),($3,$2)", [oldTeamId, divisionId, newTeamId]);
    await db.exec("set role service_role");
    const baseline = (await db.query(
      `insert into division_compensation_baselines
        (division_id,league_id,max_scheduled_match_dates,schedule_match_count,schedule_fingerprint)
       values($1,$2,10,9,'fixture') returning id`,
      [divisionId, leagueId]
    )).rows[0];
    await db.query(
      `insert into division_compensatory_point_awards
        (division_id,team_id,baseline_id,scheduled_match_dates_at_start,maximum_scheduled_match_dates,
         missing_match_dates,qualifying_match_dates,verified_match_count,earned_standings_points,
         average_points_per_match,raw_compensatory_points,compensatory_points)
       values($1,$2,$3,8,10,2,8,8,28,3.5,7,7)`,
      [divisionId, oldTeamId, baseline.id]
    );
    await db.query(
      `insert into division_compensatory_point_awards
        (division_id,team_id,baseline_id,scheduled_match_dates_at_start,maximum_scheduled_match_dates,
         missing_match_dates,qualifying_match_dates,verified_match_count,earned_standings_points,
         average_points_per_match,raw_compensatory_points,compensatory_points,calculation_basis,
         match_dates_played,maximum_match_dates_played)
       values($1,$2,null,8,10,2,8,8,28,3.5,7,7,'verified_match_dates',8,10)`,
      [divisionId, newTeamId]
    );
    await db.exec("reset role");

    await db.exec("set role authenticated");
    const awards = (await db.query(
      "select team_id, baseline_id, calculation_basis, match_dates_played, maximum_match_dates_played from division_compensatory_point_awards order by team_id"
    )).rows;
    assert.equal(awards.length, 2);
    assert.equal(awards[0].calculation_basis, "starting_schedule");
    assert.equal(awards[1].baseline_id, null);
    assert.equal(awards[1].calculation_basis, "verified_match_dates");
    assert.equal(awards[1].match_dates_played, 8);
    assert.equal(awards[1].maximum_match_dates_played, 10);
    await assert.rejects(db.query("select * from division_compensation_baselines"), /permission denied/);
    await assert.rejects(db.query("delete from division_compensatory_point_awards"), /permission denied/);
    await db.exec("reset role");

    await db.exec("insert into team_standings default values");
    const standing = (await db.query("select earned_standings_points,compensatory_points from team_standings")).rows[0];
    assert.equal(standing.earned_standings_points, null);
    assert.equal(standing.compensatory_points, 0);

    await db.query("delete from teams where id=$1", [newTeamId]);
    assert.equal(Number((await db.query("select count(*) n from division_compensatory_point_awards where team_id=$1", [newTeamId])).rows[0].n), 0);
    await db.query("delete from teams where id=$1", [oldTeamId]);
    await db.query("delete from divisions where id=$1", [divisionId]);
    assert.equal(Number((await db.query("select count(*) n from division_compensation_baselines")).rows[0].n), 0);
    assert.equal(Number((await db.query("select count(*) n from division_compensatory_point_awards")).rows[0].n), 0);
  } finally {
    await db.close();
  }
});
