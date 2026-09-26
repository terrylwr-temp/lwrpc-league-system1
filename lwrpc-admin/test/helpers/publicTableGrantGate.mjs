import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const API_ROLES = ["anon", "authenticated", "service_role"];
const TABLE_PRIVILEGES = ["SELECT", "INSERT", "UPDATE", "DELETE"];
const SEQUENCE_PRIVILEGES = ["USAGE", "SELECT", "UPDATE"];

// These exact tables predate the October 30 future-migration standard. Adding a
// table to any old file still requires a contract; do not expand this list.
export const historicalPublicTables = new Set([
  "20260906152030_lms0721_approved_answers.sql:ai_approved_answers",
  "20260906152030_lms0721_approved_answers.sql:ai_approved_answer_revisions",
  "20260906152030_lms0721_approved_answers.sql:ai_approved_answer_events",
  "20260918012928_rule_5_15_1_compensatory_points.sql:division_compensation_baselines",
  "20260918012928_rule_5_15_1_compensatory_points.sql:division_compensation_baseline_teams",
  "20260918012928_rule_5_15_1_compensatory_points.sql:division_compensation_baseline_matches",
  "20260918012928_rule_5_15_1_compensatory_points.sql:division_compensatory_point_awards",
  "20260918150701_scheduling_special_requests.sql:scheduling_special_requests",
]);

function withoutComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\r\n]*/g, " ");
}

export function createdPublicTables(sql, migration) {
  const names = [];
  const expression = /\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?((?:"[^"]+"|[a-z_][\w$]*)(?:\.(?:"[^"]+"|[a-z_][\w$]*))?)/gi;
  for (const match of withoutComments(sql).matchAll(expression)) {
    const identifier = match[1].replaceAll('"', "").toLowerCase();
    if (!identifier.includes(".")) {
      throw new Error(`${migration}: qualify CREATE TABLE ${identifier} with its schema so the grant gate can audit it`);
    }
    const [schema, table] = identifier.split(".");
    if (schema === "public") names.push(table);
  }
  return [...new Set(names)];
}

function assertDecision(matrix, privileges, label) {
  assert.ok(matrix && typeof matrix === "object", `${label}: missing privilege matrix`);
  for (const role of API_ROLES) {
    assert.ok(Object.hasOwn(matrix, role), `${label}: missing explicit ${role} privilege decision (use [] for none)`);
    assert.ok(Array.isArray(matrix[role]), `${label}: ${role} privileges must be an array`);
    for (const privilege of matrix[role]) {
      assert.ok(privileges.includes(privilege), `${label}: unsupported ${role} privilege ${privilege}`);
    }
  }
}

function assertExplicitRevoke(sql, kind, name, label) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`\\brevoke\\s+all(?:\\s+privileges)?\\s+on\\s+(?:${kind}\\s+)?public\\.${escaped}\\s+from\\s+([^;]+);`, "ig");
  const match = [...withoutComments(sql).matchAll(expression)].find((entry) =>
    ["public", ...API_ROLES].every((role) => entry[1].toLowerCase().split(",").map((item) => item.trim()).includes(role))
  );
  assert.ok(match, `${label}: missing REVOKE ALL ON ${kind} public.${name} FROM PUBLIC, anon, authenticated, service_role`);
}

function assertNoGrantAll(sql, kind, name, label) {
  const expression = new RegExp(`\\bgrant\\s+all(?:\\s+privileges)?\\s+on\\s+(?:${kind}\\s+)?public\\.${name}\\b`, "i");
  assert.ok(!expression.test(withoutComments(sql)), `${label}: GRANT ALL is forbidden; declare exact privileges`);
}

async function directAcl(db, regclass) {
  const rows = (await db.query(`
    select case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end role,
           upper(a.privilege_type) privilege
    from pg_class c, lateral aclexplode(c.relacl) a
    where c.oid = $1::regclass and a.grantee <> c.relowner
  `, [regclass])).rows;
  const acl = new Map();
  for (const row of rows) {
    if (!acl.has(row.role)) acl.set(row.role, []);
    acl.get(row.role).push(row.privilege);
  }
  return acl;
}

function assertExactAcl(acl, matrix, label) {
  assert.deepEqual((acl.get("PUBLIC") ?? []).sort(), [], `${label}: PUBLIC retains privileges`);
  for (const role of API_ROLES) {
    assert.deepEqual((acl.get(role) ?? []).sort(), [...matrix[role]].sort(), `${label}: ${role} grants differ from declared matrix`);
  }
  for (const [role, privileges] of acl) {
    if (role !== "PUBLIC" && !API_ROLES.includes(role)) {
      assert.deepEqual(privileges, [], `${label}: unexpected grantee ${role}`);
    }
  }
}

function normalizedPolicies(rows) {
  return rows.map((row) => ({
    name: row.policyname,
    command: row.cmd.toUpperCase(),
    roles: [...row.roles].sort(),
    using: row.qual,
    check: row.with_check,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function auditNewPublicTableMigration({ migration, sql, contract }) {
  const tables = createdPublicTables(sql, migration).filter((table) => !historicalPublicTables.has(`${migration}:${table}`));
  if (tables.length === 0) return [];
  assert.ok(contract?.tables && typeof contract.tables === "object", `${migration}: missing public-table grant contract`);
  assert.deepEqual(Object.keys(contract.tables).sort(), [...tables].sort(), `${migration}: contract tables must match newly created public tables`);

  for (const table of tables) {
    const label = `${migration}: public.${table}`;
    const decision = contract.tables[table];
    assertDecision(decision.grants, TABLE_PRIVILEGES, label);
    assert.equal(typeof decision.rls, "boolean", `${label}: declare expected RLS state`);
    assert.ok(Array.isArray(decision.policies), `${label}: declare expected policies (use [] for none)`);
    for (const policy of decision.policies) {
      assert.ok(typeof policy.name === "string" && typeof policy.command === "string" && Array.isArray(policy.roles), `${label}: each policy needs name, command, and roles`);
      assert.ok(Object.hasOwn(policy, "using") && Object.hasOwn(policy, "check"), `${label}: policy ${policy.name} must declare using and check predicates (null when absent)`);
    }
    assert.ok(decision.sequences && typeof decision.sequences === "object", `${label}: declare owned sequences (use {} for none)`);
    assertExplicitRevoke(sql, "table", table, label);
    assertNoGrantAll(sql, "table", table, label);
    for (const [sequence, matrix] of Object.entries(decision.sequences)) {
      assertDecision(matrix, SEQUENCE_PRIVILEGES, `${label} sequence ${sequence}`);
      assertExplicitRevoke(sql, "sequence", sequence, `${label} sequence ${sequence}`);
      assertNoGrantAll(sql, "sequence", sequence, `${label} sequence ${sequence}`);
    }
  }

  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      grant usage on schema public to anon, authenticated, service_role;
      alter default privileges in schema public revoke all on tables from public, anon, authenticated, service_role;
      alter default privileges in schema public revoke all on sequences from public, anon, authenticated, service_role;
    `);
    if (contract.setupSql) await db.exec(contract.setupSql);
    const before = new Set((await db.query("select relname from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r','p')")).rows.map((row) => row.relname));
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`${migration}: isolated migration failed; add only required schema dependencies to setupSql: ${error.message}`, { cause: error });
    }
    const after = (await db.query("select relname from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r','p')")).rows.map((row) => row.relname);
    assert.deepEqual(after.filter((name) => !before.has(name)).sort(), [...tables].sort(), `${migration}: executed public tables differ from detected CREATE TABLE statements`);

    for (const table of tables) {
      const label = `${migration}: public.${table}`;
      const decision = contract.tables[table];
      const metadata = (await db.query("select relrowsecurity from pg_class where oid = $1::regclass", [`public.${table}`])).rows[0];
      assert.equal(metadata.relrowsecurity, decision.rls, `${label}: RLS state differs from contract`);
      assertExactAcl(await directAcl(db, `public.${table}`), decision.grants, label);
      const policies = normalizedPolicies((await db.query("select policyname, cmd, roles, qual, with_check from pg_policies where schemaname='public' and tablename=$1", [table])).rows);
      const expected = decision.policies.map((policy) => ({ name: policy.name, command: policy.command.toUpperCase(), roles: [...policy.roles].sort(), using: policy.using, check: policy.check })).sort((a, b) => a.name.localeCompare(b.name));
      assert.deepEqual(policies, expected, `${label}: RLS policies differ from contract`);
      const sequences = (await db.query(`
        select s.relname name from pg_class s
        join pg_depend d on d.objid=s.oid and d.classid='pg_class'::regclass and d.deptype in ('a','i')
        where s.relkind='S' and d.refobjid=$1::regclass
      `, [`public.${table}`])).rows.map((row) => row.name).sort();
      assert.deepEqual(sequences, Object.keys(decision.sequences).sort(), `${label}: owned sequences differ from contract`);
      for (const sequence of sequences) {
        assertExactAcl(await directAcl(db, `public.${sequence}`), decision.sequences[sequence], `${label} sequence public.${sequence}`);
      }
    }
    return tables;
  } finally {
    await db.close();
  }
}
