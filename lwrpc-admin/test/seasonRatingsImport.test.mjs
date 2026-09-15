import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseRatingsCsv, ratingSource, buildRatingsPreview } from '../app/lib/seasonRatingsImport.js';
import { openRatingsPreview, sealRatingsPreview, ratingsImportRequest } from '../app/lib/seasonRatingsImportServer.js';
import { sourceRfClassification, rulesRfThreshold } from '../app/lib/rfPolicy.js';
import { runEligibility } from '../app/lib/aiEligibilityService.js';
import { catalog, sourceDatabase } from './helpers/eligibilityFixture.mjs';
import { eligibilityPolicy, evaluateEligibility, divisionOptions } from '../app/lib/aiEligibilityPolicy.js';
import { eligibilityIntent } from '../app/lib/aiEligibilityIntent.js';
import { revision as substituteAnswer } from './fixtures/lms0731-substitute.mjs';
import { POST as importPost } from '../app/api/ratings/import/route.js';

process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-local-source-policy';
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/seasonRatings879.json', import.meta.url)));
const csv = rows => { const keys = Object.keys(rows[0]); return [keys, ...rows.map(r => keys.map(k => r[k] ?? ''))].map(r => r.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(',')).join('\r\n'); };
const snapshot = { season: { id: '00000000-0000-0000-0000-000000000020', name: 'Synthetic Fall' }, members: [{ id: 'member1', name: 'Synthetic member', dupr_id: 'ABC123', is_active_member: true, source: null, seasonRatings: { seasonDupr: 4, primetime: 4.2, rf: 29 } }] };
const preview = rows => buildRatingsPreview(parseRatingsCsv(csv(rows)), snapshot);

test('879-row scrubbed actual export reconciles source fields and recorded identity categories', () => {
  const rows = parseRatingsCsv(csv(fixture)); assert.equal(rows.length, 879);
  const sources = rows.map(ratingSource);
  assert.equal(sources.filter(r => r.patch.ageSource === 'over_65').length, 295);
  assert.equal(sources.filter(r => r.patch.ageSource === 'over_50').length, 394);
  assert.equal(sources.filter(r => r.patch.ageMissing).length, 190);
  assert.equal(sources.filter(r => r.patch.doubles === 'NR').length, 73);
  const members = rows.slice(0, 695).map((r, i) => ({ id: String(i), name: 'Synthetic', dupr_id: r.duprid, is_active_member: i >= 36 }));
  rows.slice(695, 701).forEach((r, i) => { members.push({ id: 'dup-a'+i, dupr_id: r.duprid }, { id: 'dup-b'+i, dupr_id: r.duprid }); });
  const p = buildRatingsPreview(rows, { ...snapshot, members });
  assert.equal(p.counts.matched, 695); assert.equal(p.counts.notFound, 178); assert.equal(p.counts.ambiguous, 6); assert.equal(p.counts.ready, 659);
  assert.equal(p.counts.ready + p.counts.noChange + p.counts.skipped + p.counts.invalid, 879);
});

test('DUPR only, normalized exact match, missing/unmatched and all duplicate rows rejected', () => {
  assert.equal(preview([{ duprId: ' abc123 ', doubles: '3.237' }]).counts.ready, 1);
  for (const duprId of ['', 'ABC124', 'ABC 123']) assert.equal(preview([{ duprId, name: 'Synthetic member', email: 'same@example.invalid', doubles: '3.237' }]).counts.ready, 0);
  assert.equal(preview([{ duprId: 'ABC123', doubles: '3' }, { duprId: 'abc123', doubles: '4' }]).counts.ambiguous, 2);
});
test('missing age preserves existing source age without touching locked inputs; unchanged repeat is no-op', () => {
  const original = structuredClone(snapshot); original.members[0].source = { revision: 2, data: { age: 4.744, ageSource: 'over_65' } };
  const rows = parseRatingsCsv(csv([{ duprId: 'ABC123', doubles: 'NR', doublesReliability: '29', metrics: '{}' }]));
  const p = buildRatingsPreview(rows, original); assert.equal(p.updates[0].data.age, 4.744); assert.equal(p.updates[0].data.ageMissing, true); assert.equal(p.rows[0].sourceRf, 29);
  assert.deepEqual(original.members[0].seasonRatings, snapshot.members[0].seasonRatings);
  original.members[0].source = { revision: 3, data: p.updates[0].data };
  assert.equal(buildRatingsPreview(rows, original).counts.noChange, 1);
});
for (const values of [
  { doubles: '3abc' }, { doubles: '-3' }, { doubles: 'Infinity' }, { doubles: '8.1' }, { doubles: '3.2345' },
  { doublesReliability: '29%' }, { doublesReliability: '-1' }, { doublesReliability: '101' }, { doublesReliability: '1e1' },
  { doublesReliability: '29', doublesRe: '30' }, { metrics: '{broken' }, { metrics: '[]' },
  { metrics: '{"subscores":{"doubles":{"over_65":"bad","over_50":"3.4"}}}' },
]) test('invalid values do not become ratings: ' + JSON.stringify(values), () => {
  assert.equal(preview([{ duprId: 'ABC123', doubles: '3.2', ...values }]).counts.invalid, 1);
});
test('full RF header is primary; short alias works only when primary absent', () => {
  assert.equal(ratingSource({ doublesre: '29' }).patch.rf, 29);
  assert.equal(ratingSource({ doublesreliability: '', doublesre: '29' }).patch.rfMissing, true);
  assert.equal(ratingSource({ doublesreliability: '0', doublesre: '0' }).patch.rf, 0);
});
test('strict CSV multiline, escaping, duplicate headers, width and row bound', () => {
  assert.equal(parseRatingsCsv('duprId,name,doubles\nABC123,"A\nB",3.2')[0].name, 'A\nB');
  for (const s of ['duprId,duprId\nA,A', 'duprId,doubles\nA', 'duprId\n"ABC', 'duprId,\nABC,x']) assert.throws(() => parseRatingsCsv(s));
  assert.throws(() => parseRatingsCsv('duprId\n' + 'ABC123\n'.repeat(1001)));
});
test('signed exact preview rejects tampering, wrong session, expiration and wrong purpose', () => {
  const payload = { policy: 'source-only-v1', expires: '2099-01-01', updates: [] };
  const receipt = sealRatingsPreview(payload, 'session', 'synthetic-secret');
  assert.deepEqual(openRatingsPreview(receipt, 'session', 'synthetic-secret'), payload);
  assert.throws(() => openRatingsPreview(receipt + 'x', 'session', 'synthetic-secret'));
  assert.throws(() => openRatingsPreview(receipt, 'another', 'synthetic-secret'));
  assert.throws(() => openRatingsPreview(receipt, 'session', 'synthetic-secret', Date.parse('2100-01-01')));
});
test('preview calls only read RPC; commit requires explicit confirmation and same season', async () => {
  const calls = []; const db = { rpc(name) { calls.push(name); return { abortSignal: async () => ({ data: snapshot }) }; } };
  const args = { actor: 'actor', token: 'token', secret: 'synthetic-secret', db };
  const p = await ratingsImportRequest({ ...args, body: { action: 'preview', seasonId: snapshot.season.id, csv: csv([{ duprId: 'ABC123', doubles: '3.2' }]) } });
  assert.deepEqual(calls, ['season_ratings_source_snapshot']);
  await assert.rejects(ratingsImportRequest({ ...args, body: { action: 'commit', receipt: p.receipt, seasonId: snapshot.season.id } }));
  await assert.rejects(ratingsImportRequest({ ...args, body: { action: 'commit', confirmed: true, receipt: p.receipt, seasonId: 'other' } }));
  assert.equal(calls.length, 1);
});
for (const [value, expected] of [[28, 'NR'], [29, 'NR'], [30, 'RATED'], ['29.0', 'NR'], ['29.01', 'RATED']]) test('current-policy RF '+value, () => assert.equal(sourceRfClassification(value, rulesRfThreshold(catalog.candidates.find(c => rulesRfThreshold(c.content) !== null)?.content)), expected));
for (const [question, expected] of [['My Reliability Factor is 29. Am I NR?', 'NR'], ['Is a Reliability Factor of 30 considered NR?', 'RATED'], ['What happens if my RF is 28?', 'NR']]) test('Ask LWR supplied RF: '+question, async () => {
  const r = await runEligibility({ body: { question }, principal: { user: { id: '00000000-0000-0000-0000-000000000101' }, supabase: sourceDatabase() }, loadCatalog: async () => catalog, lookup: async () => { throw Error('No personal lookup permitted'); }, persist: async () => true });
  assert.equal(r.kind, 'answer'); assert.equal(r.eligibility.classification, expected); assert.equal(r.eligibility.level, 'POLICY_ONLY'); assert.equal(r.sources[0].documentVersionId, '6ae10e5f-fdde-41be-a941-d1b7ed360d1a');
});

test('unchanged substitute Approved Answer applies current NR rules at RF29', () => {
  const original = structuredClone(substituteAnswer);
  assert.match(substituteAnswer.approved_answer, /If the substitute is classified as Not Rated \(NR\), all applicable NR eligibility rules also apply/);
  const division = divisionOptions(catalog.divisions, eligibilityIntent('Can I play DUPR5?'))[0];
  const result = evaluateEligibility(eligibilityPolicy(catalog.candidates, division), { rf: 29, value: 4, sourceIsNr: false });
  assert.equal(result.classification, 'NR');
  assert.equal(result.outcome, 'PARTIALLY_CONFIRMED');
  assert.deepEqual(substituteAnswer, original);
});

test('import rejects View-As credentials before authentication or database access', async () => {
  for (const headers of [{ 'x-view-as-context': 'synthetic' }, { authorization: 'Bearer va1.synthetic' }, { cookie: '__Host-lwr-view-binding=synthetic' }]) {
    const response = await importPost(new Request('http://localhost/api/ratings/import', { method: 'POST', headers, body: '{}' }));
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /Exit View As User/);
  }
});

test('RF cutoff comes from evidence, with no implicit fallback or importer classification', () => {
  assert.equal(sourceRfClassification(29), 'RF_UNKNOWN');
  assert.equal(rulesRfThreshold('unavailable'), null);
  const content = '4.1.1. A player with a DUPR Reliability Factor of 40 or below will be classified as NR.';
  assert.equal(sourceRfClassification(30, rulesRfThreshold(content)), 'NR');
  assert.equal(sourceRfClassification(41, rulesRfThreshold(content)), 'RATED');
  assert.equal(Object.hasOwn(preview([{ duprId: 'ABC123', doublesReliability: '29' }]).rows[0], 'sourceClassification'), false);
});
