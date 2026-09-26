import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fixture, id } from './helpers/uploadWorkingDatabase.mjs';

const migration = fs.readFileSync(
  new URL('../supabase/migrations/20260923152035_private_season_ratings_roster_policy.sql', import.meta.url),
  'utf8',
);

const names = {
  public: 'public.season_ratings_roster_policy()',
  private: 'ratings_roster_policy_private.season_ratings_roster_policy()',
};

async function asRole(db, role, uid, sql) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid || '']);
  await db.exec(`set role ${role}`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

const call = (db, role, uid, functionName = names.public) =>
  asRole(db, role, uid, `select ${functionName} as policy`);

async function functionMetadata(db, signature) {
  return (await db.query(`
    select n.nspname as schema_name, p.oid::text as oid,
      pg_catalog.pg_get_userbyid(p.proowner) as owner,
      p.prosecdef, p.proconfig, p.proacl::text as acl,
      pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
      pg_catalog.pg_get_function_result(p.oid) as result_type,
      p.prosrc,
      exists (
        select 1 from pg_catalog.aclexplode(p.proacl) a
        where a.grantee = 0 and a.privilege_type = 'EXECUTE'
      ) as public_execute
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where p.oid = $1::pg_catalog.regprocedure
  `, [signature])).rows[0];
}

async function privileges(db, signature) {
  return (await db.query(`
    select
      pg_catalog.has_function_privilege('anon', $1::pg_catalog.regprocedure, 'EXECUTE') as anon,
      pg_catalog.has_function_privilege('authenticated', $1::pg_catalog.regprocedure, 'EXECUTE') as authenticated,
      pg_catalog.has_function_privilege('service_role', $1::pg_catalog.regprocedure, 'EXECUTE') as service_role
  `, [signature])).rows[0];
}

async function outboundDependencies(db, signature) {
  return (await db.query(`
    select d.refclassid::pg_catalog.regclass::text as referenced_class,
      d.refobjid::text as referenced_oid, d.deptype
    from pg_catalog.pg_depend d
    where d.classid = 'pg_catalog.pg_proc'::pg_catalog.regclass
      and d.objid = $1::pg_catalog.regprocedure
      and d.refclassid <> 'pg_catalog.pg_namespace'::pg_catalog.regclass
    order by d.refclassid, d.refobjid, d.deptype
  `, [signature])).rows;
}

test('roster policy migration preserves RPC behavior and narrows the exposed privilege boundary', async () => {
  const db = await fixture();
  try {
    await db.query("select set_config('pgrst.db_schemas', 'public', false)");
    // The fixture supplies synthetic identities; the unchanged production
    // resolver is inspected separately. auth.uid() reads only the JWT subject.
    await db.exec(`
      create or replace function auth.uid() returns uuid language sql stable
      as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      insert into public.members values
        ('${id(3)}','Synthetic','Manager',null,true),
        ('${id(4)}','Synthetic','Captain',null,true),
        ('${id(5)}','Synthetic','Club Pro',null,true),
        ('${id(6)}','Synthetic','Inactive',null,false);
      insert into public.user_roles values
        ('${id(103)}','${id(3)}','league_manager'),
        ('${id(104)}','${id(4)}','captain'),
        ('${id(105)}','${id(5)}','club_pro'),
        ('${id(106)}','${id(6)}','commissioner');
    `);

    const before = await functionMetadata(db, names.public);
    const beforePrivilege = await privileges(db, names.public);
    const dependenciesBefore = await outboundDependencies(db, names.public);
    const publicSchemaBefore = (await db.query(
      "select nspacl::text as acl from pg_catalog.pg_namespace where nspname = 'public'",
    )).rows[0].acl;
    const exposedSchemasBefore = (await db.query(
      "select current_setting('pgrst.db_schemas') as value",
    )).rows[0].value;
    const workflowBefore = (await db.query(`
      select n.nspname, p.proname, p.prosrc, p.proacl::text as acl, p.prosecdef
      from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where (n.nspname = 'ratings_workflow_private' and p.proname in ('policy', 'context', 'plan', 'commit_run'))
         or (n.nspname = 'public' and p.proname in ('season_ratings_workflow_preview', 'season_ratings_workflow_commit'))
      order by n.nspname, p.proname
    `)).rows;
    const baseline = (await call(db, 'authenticated', id(101))).rows[0].policy;
    assert.deepEqual(Object.keys(baseline).sort(),
      ['adjustment', 'hash', 'nrAdmission', 'scale', 'threshold', 'version'].sort());
    assert.equal(before.owner, 'postgres');
    assert.equal(before.prosecdef, true);
    assert.equal(beforePrivilege.anon, false);
    assert.equal(beforePrivilege.authenticated, true);
    assert.equal(beforePrivilege.service_role, false);

    await db.exec(migration);

    const wrapper = await functionMetadata(db, names.public);
    const helper = await functionMetadata(db, names.private);
    assert.equal(helper.oid, before.oid, 'the reviewed function is moved, not rewritten');
    assert.equal(helper.prosrc, before.prosrc);
    assert.equal(helper.owner, before.owner);
    assert.equal(helper.prosecdef, true);
    assert.deepEqual(helper.proconfig, before.proconfig);
    assert.equal(helper.arguments, before.arguments);
    assert.equal(helper.result_type, before.result_type);
    assert.equal(helper.public_execute, false);
    assert.equal(helper.acl, '{postgres=X/postgres,authenticated=X/postgres}');
    assert.deepEqual(await outboundDependencies(db, names.private), dependenciesBefore);

    assert.equal(wrapper.owner, 'postgres');
    assert.equal(wrapper.prosecdef, false);
    assert.deepEqual(wrapper.proconfig, ['search_path=""']);
    assert.equal(wrapper.arguments, before.arguments);
    assert.equal(wrapper.result_type, before.result_type);
    assert.match(wrapper.prosrc, /ratings_roster_policy_private\.season_ratings_roster_policy\(\)/);
    assert.equal(wrapper.public_execute, false);
    assert.equal(wrapper.acl, '{postgres=X/postgres,authenticated=X/postgres}');
    assert.equal((await db.query(
      "select nspacl::text as acl from pg_catalog.pg_namespace where nspname = 'public'",
    )).rows[0].acl, publicSchemaBefore);
    assert.deepEqual((await db.query(`
      select n.nspname, p.proname, p.prosrc, p.proacl::text as acl, p.prosecdef
      from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where (n.nspname = 'ratings_workflow_private' and p.proname in ('policy', 'context', 'plan', 'commit_run'))
         or (n.nspname = 'public' and p.proname in ('season_ratings_workflow_preview', 'season_ratings_workflow_commit'))
      order by n.nspname, p.proname
    `)).rows, workflowBefore);

    for (const signature of Object.values(names)) {
      assert.deepEqual(await privileges(db, signature), {
        anon: false, authenticated: true, service_role: false,
      });
    }
    const schemaAcl = (await db.query(`
      select n.nspacl::text as acl,
        pg_catalog.has_schema_privilege('anon', n.oid, 'USAGE') as anon_usage,
        pg_catalog.has_schema_privilege('authenticated', n.oid, 'USAGE') as authenticated_usage,
        pg_catalog.has_schema_privilege('authenticated', n.oid, 'CREATE') as authenticated_create,
        pg_catalog.has_schema_privilege('service_role', n.oid, 'USAGE') as service_usage
      from pg_catalog.pg_namespace n where n.nspname = 'ratings_roster_policy_private'
    `)).rows[0];
    assert.deepEqual({
      anon: schemaAcl.anon_usage,
      authenticated: schemaAcl.authenticated_usage,
      authenticatedCreate: schemaAcl.authenticated_create,
      serviceRole: schemaAcl.service_usage,
    }, { anon: false, authenticated: true, authenticatedCreate: false, serviceRole: false });
    assert.equal(schemaAcl.acl, '{postgres=UC/postgres,authenticated=U/postgres}');

    // The isolated fixture models a public-only PostgREST allowlist. An actual
    // HTTP rejection still requires a PostgREST environment after migration.
    assert.equal((await db.query(
      "select current_setting('pgrst.db_schemas') as value",
    )).rows[0].value, exposedSchemasBefore);
    const exposure = (await db.query(`
      select n.nspname = any(string_to_array(current_setting('pgrst.db_schemas'), ',')) as exposed
      from pg_catalog.pg_namespace n where n.nspname = 'ratings_roster_policy_private'
    `)).rows[0];
    assert.equal(exposure.exposed, false);

    for (const uid of [id(101), id(103), id(104)]) {
      assert.deepEqual((await call(db, 'authenticated', uid)).rows[0].policy, baseline);
      assert.deepEqual((await call(db, 'authenticated', uid, names.private)).rows[0].policy, baseline);
    }
    for (const uid of [id(102), id(105), id(106), id(107), null]) {
      await assert.rejects(call(db, 'authenticated', uid), /Roster authorization required/);
      await assert.rejects(call(db, 'authenticated', uid, names.private), /Roster authorization required/);
    }
    await assert.rejects(call(db, 'anon', null), /permission denied/);
    await assert.rejects(call(db, 'anon', null, names.private), /permission denied/);
    await assert.rejects(asRole(db, 'authenticated', id(102),
      `select public.season_ratings_roster_policy('${id(101)}'::uuid)`), /does not exist/);
    await assert.rejects(asRole(db, 'authenticated', id(102),
      "select public.season_ratings_roster_policy(p_role => 'commissioner')"), /does not exist/);
  } finally {
    await db.close();
  }
});

test('a failure after moving the function rolls back the whole migration', async () => {
  const db = await fixture();
  try {
    const before = await functionMetadata(db, names.public);
    const injectedFailure = migration.replace(
      'grant execute on function public.season_ratings_roster_policy()',
      'select 1 / 0;\ngrant execute on function public.season_ratings_roster_policy()',
    );
    await assert.rejects(db.exec(injectedFailure), /division by zero/);
    await db.exec('rollback;');
    assert.deepEqual(await functionMetadata(db, names.public), before);
    assert.equal((await db.query(
      "select to_regnamespace('ratings_roster_policy_private') is null as absent",
    )).rows[0].absent, true);
  } finally {
    await db.close();
  }
});
