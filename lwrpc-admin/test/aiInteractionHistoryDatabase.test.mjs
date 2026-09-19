import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createInteractionHistoryFixture } from './helpers/aiInteractionHistoryFixture.mjs';

test('AI interaction history uses retained records, consistent cohorts and server-only access', async t => {
  const fixture = await createInteractionHistoryFixture();
  const { db, ids, filters, addOutcome, addVote, addLiveVote, addOccurrence, snapshotTables, tablesBefore, migration } = fixture;
  const report = async overrides => (await db.query('select public.ai_review_interactions($1) result', [{ ...filters, ...overrides }])).rows[0].result;
  const detail = async answer => (await report({ answer })).rows[0];
  try {
    await t.test('function-only migration preserves existing schema, indexes, table grants and RLS', async () => {
      assert.equal(await snapshotTables(), tablesBefore);
      await db.exec(migration);
      assert.equal(await snapshotTables(), tablesBefore);
      const fn = (await db.query("select prosecdef,proconfig,proacl::text from pg_proc where oid='public.ai_review_interactions(jsonb)'::regprocedure")).rows[0];
      assert.equal(fn.prosecdef, false);
      assert.ok(fn.proconfig.includes('search_path=pg_catalog, public'));
      assert.ok(fn.proconfig.includes('statement_timeout=5s'));
      assert.ok(fn.proconfig.includes('plan_cache_mode=force_custom_plan'));
      assert.match(fn.proacl, /service_role=X/);
      assert.doesNotMatch(fn.proacl, /(?:anon|authenticated)=|[,\{]=X/);
      for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role}`);
        await assert.rejects(report(), /permission denied/);
        await assert.rejects(db.query('select * from public.ai_request_outcomes'), /permission denied/);
        await assert.rejects(db.query('select * from public.ai_answer_feedback_events'), /permission denied/);
        await db.exec('reset role');
      }
      await db.exec('set role service_role');
      assert.ok((await report()).rows.length);
      await db.exec('reset role');
      assert.equal((await db.query('show plan_cache_mode')).rows[0].plan_cache_mode, 'auto');
    });

    await t.test('counts and card drilldowns agree, including current flips, ties and Live votes', async () => {
      const all = await report({ limit: 50 });
      assert.equal(all.rows.length, 45);
      assert.equal(all.summary.total, 45);
      assert.equal(all.summary.helpful + all.summary.not_helpful + all.summary.no_feedback + all.summary.ambiguous, all.summary.total);
      assert.equal(all.rows.find(r => r.answer_id === ids.flipped).feedback, 'not_helpful');
      assert.equal(all.rows.find(r => r.answer_id === ids.ambiguous).feedback, 'ambiguous');
      assert.equal(all.rows.find(r => r.answer_id === ids.live).feedback, 'not_helpful');
      assert.equal(all.rows.find(r => r.answer_id === ids.liveUnvoted).feedback, 'no_feedback');
      for (const feedback of ['helpful', 'not_helpful', 'no_feedback', 'ambiguous']) {
        const data = await report({ feedback, limit: 50 });
        assert.equal(data.rows.length, all.summary[feedback]);
        assert.deepEqual(data.summary, all.summary);
        assert.ok(data.rows.every(r => r.feedback === feedback));
      }
    });

    await t.test('list previews are bounded; detail returns full corresponding retained Q/A', async () => {
      const list = (await report({ limit: 50 })).rows.find(r => r.answer_id === ids.long);
      assert.equal(list.question.length, 240);
      assert.equal(list.answer.length, 320);
      assert.equal(Object.hasOwn(list, 'diagnostics'), false);
      const row = await detail(ids.long);
      assert.equal(row.question, ids.longQuestion);
      assert.equal(row.answer, ids.longAnswer);
      assert.equal(row.has_question, true);
      assert.equal(row.has_answer, true);
      assert.ok(row.diagnostics);
      const named = await detail(ids.helpful);
      assert.equal(named.user_name, 'Synthetic Reviewer');
      assert.equal(named.user_name_basis, 'current_member_record');
      assert.equal(named.user_role, null);
      assert.equal(named.total_ms, 125);
      assert.equal(named.diagnostics.outcome.candidateCount, 4);
      assert.equal(Object.hasOwn(named.diagnostics.outcome, 'rawAuthorization'), false);
      assert.doesNotMatch(JSON.stringify(named), /never-display|auth_user_id|member_id|actor|session_id/);
    });

    await t.test('missing, redacted, expired and Live content is never reconstructed', async () => {
      const missing = await detail(ids.unvoted);
      assert.equal(missing.question, null); assert.equal(missing.answer, null);
      assert.equal(missing.user_name, null); assert.equal(missing.has_answer, false);
      const redacted = await detail(ids.redacted);
      assert.equal(redacted.redacted, true);
      assert.equal(redacted.question, '[detail omitted for privacy]');
      assert.equal(redacted.answer, null);
      assert.doesNotMatch(JSON.stringify(redacted), /private retained|private legacy/);
      const expired = await detail(ids.purged);
      assert.equal(expired.payload_purged, true);
      assert.equal(expired.question, null); assert.equal(expired.answer, null);
      assert.deepEqual(expired.diagnostics.selection, {});
      assert.deepEqual(expired.diagnostics.sources, []);
      const live = await detail(ids.live);
      assert.equal(live.question, null); assert.equal(live.answer, null);
      assert.equal(live.user_name, null); assert.equal(live.feedback, 'not_helpful');
      assert.deepEqual(live.context, { liveIntent: 'SELF_TEAM', relationship: 'self', resultCode: 'success' });
      assert.doesNotMatch(JSON.stringify(live), /never-display|target|actor|session_id/);
    });

    await t.test('parentless feedback and occurrences stay visible with honest time basis', async () => {
      const legacy = await detail(ids.legacy);
      assert.equal(legacy.legacy, true); assert.equal(legacy.time_basis, 'first_recorded');
      assert.equal(legacy.origin, 'legacy_unknown');
      assert.equal(legacy.question, 'Legacy retained question?');
      assert.equal(legacy.answer, 'Legacy complete answer.');
      const orphan = await detail(ids.orphanOccurrence);
      assert.equal(orphan.legacy, true); assert.equal(orphan.feedback, 'no_feedback');
      assert.equal(orphan.question, 'Orphan retained question?');
      assert.equal(orphan.time_basis, 'first_recorded');
    });

    await t.test('literal question/answer/user search, dates and origins share the card population', async () => {
      for (const search of ['Which ball', 'Franklin X-40', 'Synthetic Reviewer']) {
        const data = await report({ search, limit: 50 });
        assert.ok(data.rows.length); assert.equal(data.rows.length, data.summary.total);
        const helpful = await report({ search, feedback: 'helpful', limit: 50 });
        assert.deepEqual(helpful.summary, data.summary);
        assert.equal(helpful.rows.length, data.summary.helpful);
      }
      assert.equal((await report({ search: '%' })).summary.total, 0);
      assert.equal((await report({ search: '_%' })).summary.total, 0);
      const from = new Date(Date.parse(filters.asof) - 7 * 86400000).toISOString();
      const recent = await report({ from, limit: 50 });
      assert.equal(recent.rows.length, recent.summary.total);
      assert.ok(recent.rows.every(r => Date.parse(r.occurred_at) >= Date.parse(from)));
      assert.equal(recent.rows.some(r => r.answer_id === ids.legacy), false);
      assert.equal((await report({ origin: 'manager_test' })).rows[0].answer_id, ids.manager);
      assert.equal((await report({ origin: 'view_as' })).rows[0].answer_id, ids.viewAs);
      assert.equal((await report({ origin: 'legacy_unknown' })).rows[0].answer_id, ids.legacy);
    });

    await t.test('keyset pagination has no omission or duplicates with many equal timestamps', async () => {
      const expected = (await report({ limit: 50 })).rows.map(r => r.answer_id);
      let cursor = {}, seen = [];
      do {
        const page = await report(cursor);
        assert.ok(page.rows.length <= 26);
        const visible = page.rows.slice(0, 25);
        seen.push(...visible.map(r => r.answer_id));
        if (page.rows.length <= 25) break;
        const last = visible.at(-1);
        cursor = { cursor_at: last.occurred_at, cursor_id: last.answer_id };
      } while (seen.length < 100);
      assert.deepEqual(seen, expected);
      assert.equal(new Set(seen).size, expected.length);
    });

    await t.test('as-of snapshot excludes late votes/outcomes/occurrences and preserves latest semantics', async () => {
      const before = await report({ limit: 50 });
      const future = new Date(Date.parse(filters.asof) + 1000).toISOString();
      await addVote(ids.helpful, { helpful: false, at: future });
      await addOutcome({ at: new Date(Date.parse(filters.asof) - 1000).toISOString(), recordedAt: future });
      await addOccurrence(randomUUID(), { at: new Date(Date.parse(filters.asof) - 1000).toISOString(), recordedAt: future, parent: false });
      const after = await report({ limit: 50 });
      assert.deepEqual(after, before);
      const liveTie = await addOutcome();
      const at = new Date(Date.parse(filters.asof) - 10000).toISOString();
      await addLiveVote(liveTie, { id: '00000000-0000-4000-8000-000000000001', helpful: true, at });
      await addLiveVote(liveTie, { id: '00000000-0000-4000-8000-000000000002', helpful: false, at });
      assert.equal((await detail(liveTie)).feedback, 'not_helpful');
    });

    await t.test('retained safe redacted output, known orphan completion and current full-name fallback remain available', async () => {
      const id = await addOutcome({ diagnostic: { workflow: 'ELIGIBILITY_SELF', mode: 'hybrid', liveDataUsed: true, target: 'never-display' } });
      await addVote(id, { question: 'raw private question', answer: 'raw private answer' });
      await addOccurrence(id, { redacted: true, question: '[detail omitted for privacy]', output: 'Retained safe answer.' });
      const safe = await detail(id);
      assert.equal(safe.answer, 'Retained safe answer.');
      assert.equal(safe.has_answer, true);
      assert.equal(safe.redacted, true);
      assert.equal(safe.context.workflow, 'ELIGIBILITY_SELF');
      assert.equal(safe.context.liveDataUsed, true);
      assert.equal(safe.diagnostics.outcome.mode, 'hybrid');
      assert.doesNotMatch(JSON.stringify(safe), /raw private|never-display/);
      const orphan = randomUUID(), completedAt = new Date(Date.parse(filters.asof) - 3 * 86400000).toISOString();
      await addOccurrence(orphan, { parent: false, completedAt });
      const known = await detail(orphan);
      assert.equal(known.time_basis, 'completed');
      assert.equal(Date.parse(known.occurred_at), Date.parse(completedAt));
      await db.query('update public.members set first_name=null,last_name=null,full_name=$1 where id=$2', ['Synthetic Full Name', ids.member]);
      const named = await detail(ids.helpful);
      assert.equal(named.user_name, 'Synthetic Full Name');
      assert.equal(named.user_name_basis, 'current_member_record');
    });

    await t.test('invalid requests fail closed and reporting does not modify stored rows', async () => {
      for (const bad of [{ limit: 500 }, { feedback: 'everything' }, { origin: 'captain' }, { search: 'x'.repeat(201) }, { cursor_id: ids.helpful }]) {
        await assert.rejects(report(bad), /review_invalid/);
      }
      const state = async () => (await db.query(`select
        (select count(*) from public.ai_request_outcomes) outcomes,
        (select count(*) from public.ai_answer_feedback_events) feedback,
        (select count(*) from public.ai_review_occurrences) occurrences,
        (select count(*) from ai_live_private.feedback) live_feedback,
        (select jsonb_agg(to_jsonb(m)) from public.members m) members`)).rows[0];
      const before = await state();
      await report(); await detail(ids.helpful);
      assert.deepEqual(await state(), before);
      assert.equal(await snapshotTables(), tablesBefore);
    });
  } finally { await db.close(); }
});
