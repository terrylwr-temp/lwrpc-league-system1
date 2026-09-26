import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { auditNewPublicTableMigration, createdPublicTables, historicalPublicTables } from "./helpers/publicTableGrantGate.mjs";

const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);
const contractsUrl = new URL("./migration-grant-contracts/", import.meta.url);

test("every future public table has an isolated grant/RLS contract without old automatic grants", async (t) => {
  const migrations = (await readdir(migrationsUrl)).filter((name) => name.endsWith(".sql")).sort();
  const contracts = (await readdir(contractsUrl)).filter((name) => name.endsWith(".json"));
  const expectedContracts = [];
  const seenHistory = new Set();
  for (const migration of migrations) {
    const sql = await readFile(new URL(migration, migrationsUrl), "utf8");
    const created = createdPublicTables(sql, migration);
    for (const table of created) {
      const key = `${migration}:${table}`;
      if (historicalPublicTables.has(key)) seenHistory.add(key);
    }
    if (created.every((table) => historicalPublicTables.has(`${migration}:${table}`))) continue;
    expectedContracts.push(`${migration}.json`);
    await t.test(migration, async () => {
      let contract;
      try {
        contract = JSON.parse(await readFile(new URL(`${migration}.json`, contractsUrl), "utf8"));
      } catch (error) {
        throw new Error(`${migration}: missing or invalid migration-grant-contracts/${migration}.json`, { cause: error });
      }
      await auditNewPublicTableMigration({ migration, sql, contract });
    });
  }
  assert.deepEqual([...seenHistory].sort(), [...historicalPublicTables].sort(), "historical public-table allowlist drifted; review the migration inventory");
  assert.deepEqual(contracts.sort(), expectedContracts.sort(), "migration grant contracts must correspond exactly to future public-table migrations");
});

const migration = "future_example.sql";
const validSql = `
  create table public.example_gate (id serial primary key, note text not null);
  revoke all on table public.example_gate from public, anon, authenticated, service_role;
  grant select, insert on table public.example_gate to authenticated;
  grant select on table public.example_gate to service_role;
  alter table public.example_gate enable row level security;
  create policy "example read" on public.example_gate for select to authenticated using (true);
  create policy "example insert" on public.example_gate for insert to authenticated with check (true);
  revoke all on sequence public.example_gate_id_seq from public, anon, authenticated, service_role;
  grant usage on sequence public.example_gate_id_seq to authenticated;
`;
const validContract = {
  tables: {
    example_gate: {
      grants: { anon: [], authenticated: ["SELECT", "INSERT"], service_role: ["SELECT"] },
      rls: true,
      policies: [
        { name: "example read", command: "SELECT", roles: ["authenticated"], using: "true", check: null },
        { name: "example insert", command: "INSERT", roles: ["authenticated"], using: null, check: "true" },
      ],
      sequences: {
        example_gate_id_seq: { anon: [], authenticated: ["USAGE"], service_role: [] },
      },
    },
  },
};

test("grant gate accepts a deliberate table and sequence privilege matrix", async () => {
  assert.deepEqual(await auditNewPublicTableMigration({ migration, sql: validSql, contract: validContract }), ["example_gate"]);
});

test("grant gate detects missing contract, role decision, revoke, grant, RLS, policy, sequence and extra grant", async (t) => {
  const cases = [
    ["contract", validSql, undefined, /missing public-table grant contract/],
    ["role decision", validSql, { tables: { example_gate: { ...validContract.tables.example_gate, grants: { anon: [], authenticated: [] } } } }, /missing explicit service_role privilege decision/],
    ["table revoke", validSql.replace(/revoke all on table[^;]+;/i, ""), validContract, /missing REVOKE ALL ON table/],
    ["sequence revoke", validSql.replace(/revoke all on sequence[^;]+;/i, ""), validContract, /missing REVOKE ALL ON sequence/],
    ["missing grant", validSql.replace(/grant select, insert on table[^;]+;/i, ""), validContract, /authenticated grants differ/],
    ["extra grant", validSql.replace("grant select on table public.example_gate to service_role;", "grant select, update on table public.example_gate to service_role;"), validContract, /service_role grants differ/],
    ["PUBLIC grant", `${validSql}\ngrant select on table public.example_gate to public;`, validContract, /PUBLIC retains privileges/],
    ["grant all", validSql.replace("grant select on table public.example_gate to service_role;", "grant all on table public.example_gate to service_role;"), validContract, /GRANT ALL is forbidden/],
    ["RLS", validSql.replace(/alter table public\.example_gate enable row level security;/i, ""), validContract, /RLS state differs/],
    ["policy", validSql.replace(/create policy "example insert"[^;]+;/i, ""), validContract, /RLS policies differ/],
    ["policy predicate", validSql.replace("with check (true)", "with check (false)"), validContract, /RLS policies differ/],
    ["sequence grant", validSql.replace(/grant usage on sequence[^;]+;/i, ""), validContract, /sequence public\.example_gate_id_seq: authenticated grants differ/],
  ];
  for (const [name, sql, contract, message] of cases) {
    await t.test(name, async () => {
      await assert.rejects(auditNewPublicTableMigration({ migration, sql, contract }), message);
    });
  }
});
