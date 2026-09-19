import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { handleReviewRequest } from '../app/lib/aiReviewHttp.js';
import { reviewToken, readReviewToken } from '../app/lib/aiReviewService.js';
import {
  interactionFilters, interactionReport, interactionDetail, interactionView,
  sanitizeInteractionDiagnostics, safeInteractionText,
} from '../app/lib/aiInteractionHistory.js';
import { rejectViewAsMutation, VIEW_AS_COOKIE } from '../app/lib/viewAsBoundary.js';

const signingKey = 'isolated-interaction-history-test-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = signingKey;
const user = randomUUID();
const answerId = randomUUID();
const summary = { total: 30, helpful: 11, not_helpful: 7, no_feedback: 10, ambiguous: 2 };
const cutoff = '2026-09-01T00:00:00.000Z';
const params = (values = {}) => new URLSearchParams({ period: 'all', asof: cutoff, ...values });
const row = (overrides = {}) => ({
  answer_id: answerId, occurred_at: '2026-08-31T12:00:00.000Z', time_basis: 'completed',
  origin: 'player_interface', result: 'answer', assistant_version: 'LMS-0749',
  source_family: 'lwr', question: 'When does league play begin?', answer: 'League play begins Saturday.',
  effective_question: 'When does the selected league begin?', feedback: 'helpful',
  feedback_at: '2026-08-31T12:01:00.000Z', user_name: 'Synthetic Member',
  user_name_basis: 'current_member_record', total_ms: 1500, legacy: false, redacted: false,
  payload_purged: false, has_question: true, has_answer: true, ...overrides,
});

function database(responses = [{ rows: [row()], summary }]) {
  const calls = [];
  return {
    calls,
    async rpc(name, args) {
      calls.push({ name, args });
      assert.equal(name, 'ai_review_interactions', 'history may invoke only the dedicated read RPC');
      const response = responses[Math.min(calls.length - 1, responses.length - 1)];
      return response?.error ? response : { data: response };
    },
    from() { assert.fail('history must not read or write unrelated tables'); },
  };
}

for (const role of ['commissioner', 'league_manager', 'club_pro', 'captain', 'co_captain', 'player', null]) {
  for (const op of ['interactions', 'interaction']) {
    test(`history ${op} authorizes ${role || 'anonymous'} before any database access`, async () => {
      const db = database();
      let authorizations = 0;
      const authorize = async (_request, requiredRole) => {
        authorizations++;
        assert.equal(requiredRole, 'league_manager');
        return role ? { role, user: { id: user }, supabase: db } : { error: 'unauthenticated', status: 401 };
      };
      const response = await handleReviewRequest(new Request(`http://local/api/ai-assistant/review?op=${op}&answer=${answerId}`), authorize);
      const allowed = ['commissioner', 'league_manager'].includes(role);
      assert.equal(response.status, allowed ? 200 : role ? 403 : 401);
      assert.equal(authorizations, 1);
      assert.equal(db.calls.length, allowed ? 1 : 0);
      assert.match(response.headers.get('cache-control'), /private, no-store/);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      const body = await response.json();
      assert.equal(body.success, allowed);
      if (!allowed) assert.equal(body.rows, undefined);
    });
  }
}

test('both history operations reject writes even with a valid existing review action token', async () => {
  for (const op of ['interactions', 'interaction']) {
    const db = database();
    const body = { token: reviewToken({ user, caseId: randomUUID(), revision: 1, cutoff }), operation: randomUUID(), action: 'note', note: 'Do not write this' };
    const response = await handleReviewRequest(new Request(`http://local/api/ai-assistant/review?op=${op}`, {
      method: 'POST', body: JSON.stringify(body),
    }), async () => ({ role: 'commissioner', user: { id: user }, supabase: db }));
    assert.equal(response.status, 405);
    assert.equal(db.calls.length, 0);
  }
});

test('the existing route blocks View As markers before delegating either history operation', async () => {
  const source = await readFile(new URL('../app/api/ai-assistant/review/route.js', import.meta.url), 'utf8');
  const env = { NODE_ENV: 'production', LMS_ORIGIN: 'https://lms.example.invalid', VIEW_AS_ORIGIN: 'https://view.example.invalid' };
  let delegated = 0;
  const route = vm.runInNewContext(`${source.replace(/^import .*;\r?$/gm, '').replace(/\bexport /g, '')}\n({GET, POST})`, {
    rejectViewAsMutation: request => rejectViewAsMutation(request, env),
    handleReviewRequest: () => { delegated++; return Response.json({ success: true }); },
    authorizeAdminRequest: () => { throw Error('authorization must not run inside isolated context'); },
  });
  for (const op of ['interactions', 'interaction']) {
    for (const method of ['GET', 'POST']) {
      for (const headers of [
        { 'x-view-as-context': 'synthetic-context' },
        { authorization: 'Bearer va1.synthetic-context' },
        { cookie: `${VIEW_AS_COOKIE}=synthetic-binding` },
        { origin: env.VIEW_AS_ORIGIN },
      ]) {
        const response = route[method](new Request(`${env.LMS_ORIGIN}/api/ai-assistant/review?op=${op}`, { method, headers }));
        assert.equal(response.status, 403);
      }
      assert.equal(route[method](new Request(`${env.VIEW_AS_ORIGIN}/api/ai-assistant/review?op=${op}`, { method })).status, 403);
    }
  }
  assert.equal(delegated, 0);
  assert.equal(route.GET(new Request(`${env.LMS_ORIGIN}/api/ai-assistant/review?op=interactions`)).status, 200);
  assert.equal(delegated, 1);
});

test('history supports seven, thirty, ninety days and all time with bounded page sizes', () => {
  const now = new Date('2026-09-19T15:00:00Z');
  for (const period of ['7', '30', '90', 'all']) {
    for (const limit of ['25', '50']) {
      const filters = interactionFilters(new URLSearchParams({ period, limit }), now);
      assert.equal(filters.from, period === 'all' ? null : new Date(now.getTime() - Number(period) * 86400000).toISOString());
      assert.equal(filters.to, now.toISOString());
      assert.equal(filters.asof, filters.to);
      assert.equal(filters.limit, Number(limit));
    }
  }
  assert.equal(interactionFilters(new URLSearchParams(), now).period, '30');
  assert.equal(interactionFilters(new URLSearchParams(), now).limit, 25);
  assert.equal(interactionFilters(new URLSearchParams({ search: '  %_literal search  ' }), now).search, '%_literal search');
  const snapshot = interactionFilters(new URLSearchParams({ period: '7', asof: cutoff }), now);
  assert.equal(snapshot.from, '2026-08-25T00:00:00.000Z');
});

test('invalid history filters fail before querying the database', async () => {
  for (const invalid of [
    { period: '365' }, { period: '-7' }, { feedback: 'unanswered' }, { origin: 'other' },
    { limit: '0' }, { limit: '26' }, { limit: '100' }, { limit: 'NaN' },
    { search: 'x'.repeat(201) }, { asof: 'not-a-date' }, { asof: '2999-01-01' },
  ]) {
    const db = database();
    await assert.rejects(interactionReport(db, params(invalid), user), error => error.status === 400);
    assert.equal(db.calls.length, 0);
  }
});

test('history pagination signs the final displayed timestamp and ID while preserving totals and cutoff', async () => {
  const rows = Array.from({ length: 26 }, (_, index) => row({ answer_id: `10000000-0000-4000-8000-${String(100 - index).padStart(12, '0')}` }));
  const db = database([{ rows, summary }, { rows: [rows[25]], summary }]);
  const first = await interactionReport(db, params(), user);
  assert.equal(first.rows.length, 25);
  assert.deepEqual(first.summary, summary);
  assert.equal(first.total, summary.total);
  assert.ok(first.next);
  const decoded = readReviewToken(first.next, user);
  assert.equal(decoded.kind, 'ai_interactions');
  assert.equal(decoded.id, rows[24].answer_id);
  assert.equal(decoded.at, rows[24].occurred_at);
  const second = await interactionReport(db, params({ cursor: first.next, asof: '2026-08-01T00:00:00Z' }), user);
  assert.equal(db.calls[1].args.p_filters.cursor_id, rows[24].answer_id);
  assert.equal(db.calls[1].args.p_filters.cursor_at, rows[24].occurred_at);
  assert.equal(db.calls[1].args.p_filters.asof, cutoff, 'the signed snapshot owns the continuation cutoff');
  assert.equal(second.asof, first.asof);
  assert.equal(second.rows[0].id, rows[25].answer_id);
  assert.deepEqual(second.summary, first.summary);
  assert.equal(second.next, null);
});

test('fifty-row pages remain bounded and filtered totals select the same summary bucket', async () => {
  const rows = Array.from({ length: 51 }, () => row({ answer_id: randomUUID() }));
  for (const feedback of ['all', 'helpful', 'not_helpful', 'no_feedback', 'ambiguous']) {
    const db = database([{ rows, summary }]);
    const report = await interactionReport(db, params({ limit: '50', feedback }), user);
    assert.equal(report.rows.length, 50);
    assert.equal(report.total, summary[feedback === 'all' ? 'total' : feedback]);
    assert.deepEqual(report.summary, summary);
    assert.equal(db.calls[0].args.p_filters.feedback, feedback);
  }
});

test('history cursors cannot cross actors, filter controls, purposes, or signature validity', async () => {
  const rows = Array.from({ length: 26 }, () => row({ answer_id: randomUUID() }));
  const { next } = await interactionReport(database([{ rows, summary }]), params(), user);
  const decoded = readReviewToken(next, user);
  const failures = [
    [params({ cursor: next }), randomUUID()],
    [params({ cursor: `${next}x` }), user],
    ...[{ period: '7' }, { feedback: 'helpful' }, { search: 'different' }, { origin: 'manager_test' }, { limit: '50' }]
      .map(change => [params({ cursor: next, ...change }), user]),
    [params({ cursor: reviewToken({ ...decoded, user, kind: 'occurrences' }) }), user],
    [params({ cursor: reviewToken({ ...decoded, user, id: 'invalid' }) }), user],
    [params({ cursor: reviewToken({ ...decoded, user, at: 'invalid' }) }), user],
  ];
  const expiredBody = Buffer.from(JSON.stringify({ ...decoded, expires: Date.now() - 1000 })).toString('base64url');
  const expiredSignature = createHmac('sha256', signingKey).update('lwr-review-v1:').update(expiredBody).digest('base64url');
  failures.push([params({ cursor: `${expiredBody}.${expiredSignature}` }), user]);
  for (const [query, actor] of failures) {
    const db = database();
    await assert.rejects(interactionReport(db, query, actor), error => error.status === 400);
    assert.equal(db.calls.length, 0);
  }
});

test('detail preserves all retained question, effective question and answer text', async () => {
  const long = row({ question: 'Q'.repeat(2400), effective_question: 'E'.repeat(2400), answer: 'A'.repeat(6000) });
  const db = database([{ rows: [long], summary }]);
  const { interaction } = await interactionDetail(db, new URLSearchParams({ answer: answerId }));
  assert.equal(interaction.question, long.question);
  assert.equal(interaction.effectiveQuestion, long.effective_question);
  assert.equal(interaction.answer, long.answer);
  assert.equal(db.calls[0].args.p_filters.answer, answerId);
  assert.equal(db.calls[0].args.p_filters.from, null);
  assert.equal(interaction.id, answerId);
  assert.equal(interaction.userRole, null, 'current role cannot substitute for an unrecorded historical role');
});

test('detail rejects invalid or absent identities and never substitutes a different interaction', async () => {
  const invalidDb = database();
  await assert.rejects(interactionDetail(invalidDb, new URLSearchParams({ answer: 'not-a-uuid' })), error => error.status === 400);
  assert.equal(invalidDb.calls.length, 0);
  for (const rows of [[], [row({ answer_id: randomUUID() })]]) {
    await assert.rejects(interactionDetail(database([{ rows, summary }]), new URLSearchParams({ answer: answerId })), error => error.status === 404);
  }
});

test('missing, legacy and purged metadata remain explicitly unavailable', () => {
  const missing = interactionView({ answer_id: answerId, legacy: true }, true);
  for (const key of ['question', 'answer', 'effectiveQuestion', 'userName', 'userNameBasis', 'userRole', 'totalMs', 'occurredAt', 'version', 'feedbackAt']) assert.equal(missing[key], null, key);
  assert.equal(missing.origin, 'legacy_unknown');
  assert.equal(missing.feedback, 'no_feedback');
  assert.equal(missing.timeBasis, 'first_recorded');
  assert.equal(missing.hasQuestion, false);
  assert.equal(missing.hasAnswer, false);
  const purged = interactionView(row({ payload_purged: true, diagnostics: { sources: [{ documentTitle: 'Discarded' }] } }), true);
  for (const key of ['question', 'answer', 'effectiveQuestion']) assert.equal(purged[key], null);
  assert.equal(purged.hasQuestion, false);
  assert.equal(purged.hasAnswer, false);
  assert.deepEqual(purged.diagnostics, {});
  assert.equal(purged.payloadPurged, true);
});

test('interaction and diagnostic allowlists omit auth identity, sessions, receipts, credentials, and unknown structures', () => {
  const secretFields = {
    auth_user_id: 'AUTH-IDENTITY', user_id: 'USER-IDENTITY', session: 'SESSION-DATA',
    session_id: 'SESSION-IDENTITY', feedbackReceipt: 'FEEDBACK-RECEIPT', conversationReceipt: 'CONVERSATION-RECEIPT',
    credential: 'CREDENTIAL-DATA', access_token: 'ACCESS-DATA', headers: { authorization: 'AUTH-DATA' },
  };
  const source = { documentTitle: 'League Rules', documentId: randomUUID(), pageNumber: 7, ...secretFields };
  const diagnostics = {
    ...secretFields,
    outcome: { candidateCount: 5, ...secretFields, policy: { intent: 'league_rules', candidateCount: 5, ...secretFields } },
    selection: { ...secretFields, selectedEvidence: [source], retrieval: { candidateCount: 3, ...secretFields } },
    resolver: { classification: 'standalone', ...secretFields }, sources: [source],
  };
  const view = interactionView(row({ ...secretFields, user_role: 'commissioner', diagnostics }), true);
  assert.equal(view.userRole, null);
  assert.equal(view.diagnostics.outcome.candidateCount, 5);
  assert.equal(view.diagnostics.sources[0].documentTitle, 'League Rules');
  assert.equal(view.diagnostics.selection.retrieval.candidateCount, 3);
  const serialized = JSON.stringify(view);
  for (const marker of ['AUTH-IDENTITY', 'USER-IDENTITY', 'SESSION-DATA', 'SESSION-IDENTITY', 'FEEDBACK-RECEIPT', 'CONVERSATION-RECEIPT', 'CREDENTIAL-DATA', 'ACCESS-DATA', 'AUTH-DATA']) assert.ok(!serialized.includes(marker), marker);
  assert.equal(interactionView(row({ diagnostics })).diagnostics, undefined, 'list responses do not include detailed diagnostics');
  assert.deepEqual(sanitizeInteractionDiagnostics(null), { outcome: {}, selection: {}, resolver: {}, sources: [] });
});

test('free-text credentials are omitted from questions, answers, names, and retained diagnostic strings', () => {
  const sensitive = [
    'Bearer fixture-access-value', 'Basic ZmFrZTpwYXNzd29yZA==',
    'eyJabcdefghijk.eyJfixture.signature', 'sk-proj-abcdefghijklmnop',
    'sb_secret_abcdefghijklmnop', 'password=fixture-password', 'api_key: fixture-key',
    'access_token=fixture-access', 'refresh_token=fixture-refresh',
    'client_secret=fixture-client-secret', 'service_role_key=fixture-service-key',
    'supabase_service_role_key=fixture-prefixed-service-key', 'token=fixture-generic-token',
    'secret: fixture-generic-secret', 'credential=fixture-credential',
    'secret_key=fixture-secret-key', 'private_key=fixture-private-key',
    'supabase_service_key=fixture-service-key', 'session_id=fixture-session',
    'My password is fixture-password', '{"api_key":"fixture-json-key"}',
    'https://example.invalid/citation?token=fixture-link-token',
    'postgresql://fixture-user:fixture-pass@host.invalid/database',
    '-----BEGIN PRIVATE KEY----- fixture-key-material',
  ];
  for (const content of sensitive) {
    assert.equal(safeInteractionText(content), '[Security-sensitive text omitted]', content);
    const view = interactionView(row({ question: content, answer: content, user_name: content, diagnostics: { sources: [{ documentTitle: content }] } }), true);
    assert.ok(!JSON.stringify(view).includes(content), content);
    assert.equal(view.redacted, true);
  }
  for (const content of ['API keys must stay private.', 'The token count was 120.', 'Scores are 11-7, 11-5.', 'Call the captain at 555-0100.']) assert.equal(safeInteractionText(content), content);
});

test('unavailable reporting data fails explicitly and malformed counts cannot become fabricated totals', async () => {
  for (const response of [{ error: { message: 'database denied' } }, null, {}, { rows: null }]) {
    await assert.rejects(interactionReport(database([response]), params(), user), error => error.status === 503);
  }
  const result = await interactionReport(database([{ rows: [], summary: { total: -1, helpful: '7', not_helpful: NaN, no_feedback: 1.5, ambiguous: Infinity } }]), params(), user);
  assert.deepEqual(result.summary, { total: 0, helpful: 7, not_helpful: 0, no_feedback: 0, ambiguous: 0 });
  assert.equal(result.next, null);
});
