import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fixture } from './helpers/uploadWorkingDatabase.mjs';

const migration = fs.readFileSync(new URL('../supabase/migrations/20260922003928_season_ratings_large_csv_import.sql', import.meta.url), 'utf8');
const functionState = async (db, signature) => (await db.query(`
  select p.prosrc, p.proconfig, p.proowner, p.prosecdef, p.provolatile, p.proacl
  from pg_proc p
  where p.oid = $1::regprocedure
`, [signature])).rows[0];

test('ratings capacity migration reconciles old and current states idempotently', async () => {
  const db = await fixture();
  try {
    const planSignature = 'ratings_workflow_private.plan(uuid,uuid,text,jsonb)';
    const commitSignature = 'ratings_workflow_private.commit_run(uuid,jsonb)';
    const beforePlan = await functionState(db, planSignature);
    const beforeCommit = await functionState(db, commitSignature);
    assert.match(beforePlan.prosrc, /jsonb_array_length\(p_upload\)>1000/);
    assert.ok(beforePlan.proconfig.includes('statement_timeout=8s'));

    await db.exec(migration);
    const afterPlan = await functionState(db, planSignature);
    assert.match(afterPlan.prosrc, /jsonb_array_length\(p_upload\)>5000/);
    assert.doesNotMatch(afterPlan.prosrc, /jsonb_array_length\(p_upload\)>1000/);
    assert.ok(afterPlan.proconfig.includes('statement_timeout=20s'));
    assert.deepEqual(
      { ...afterPlan, prosrc: beforePlan.prosrc, proconfig: beforePlan.proconfig },
      beforePlan,
    );
    assert.deepEqual(await functionState(db, commitSignature), beforeCommit);

    const desiredState = await functionState(db, planSignature);
    await db.exec(migration);
    assert.deepEqual(await functionState(db, planSignature), desiredState);
    assert.deepEqual(await functionState(db, commitSignature), beforeCommit);
  } finally {
    await db.close();
  }
});
