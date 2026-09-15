import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { rfClassification, evaluateEligibility } from '../app/lib/aiEligibilityPolicy.js';

// Owner resolved: RF <=29 is NR. Preserve Clean Ratings and synchronize current policy.
// Execute the actual pure cleanup helpers without loading React or any database.
const page = readFileSync(new URL('../app/ratings/page.js', import.meta.url), 'utf8');
function helper(name) {
  const start = page.indexOf(`\nfunction ${name}(`);
  assert.notEqual(start, -1, `Missing cleanup helper: ${name}`);
  const next = page.indexOf('\nfunction ', start + 1);
  return page.slice(start, next === -1 ? undefined : next);
}
const cleanup = vm.runInNewContext(
  ['parseReliabilityThreshold', 'isReliabilityNrAdjustment', 'cleanedSeasonDuprRating', 'truncateToTenth']
    .map(helper).join('\n')
    + '\n({parseReliabilityThreshold,isReliabilityNrAdjustment,cleanedSeasonDuprRating})',
  {}, { timeout: 1000 },
);

test('owner resolution synchronizes cleanup and Ask LWR at RF 29', () => {
  for (const [rf, cleanupNr, askClassification] of [
    [28, true, 'NR'], [28.999, true, 'NR'],
    [29, true, 'NR'], [29.001, false, 'RATED'], [30, false, 'RATED'],
  ]) {
    assert.equal(cleanup.isReliabilityNrAdjustment(rf, 29), cleanupNr, `cleanup RF=${rf}`);
    assert.equal(rfClassification(rf, { threshold: '29' }), askClassification, `Ask RF=${rf}`);
  }
});

test('RF=29 retains actual cleanup rating result and existing eligibility result', () => {
  assert.equal(cleanup.cleanedSeasonDuprRating('3.237', 4.5, 29, 29), 4);
  assert.equal(cleanup.cleanedSeasonDuprRating('3.237', 4.5, 30, 29), 3.2);
  const policy = { status: 'READY', threshold: '29', min: '2', max: '4.899' };
  assert.equal(evaluateEligibility(policy, { rf: 29, sourceIsNr: false, value: 3.2 }).classification, 'NR');
  assert.equal(evaluateEligibility(policy, { rf: 29, sourceIsNr: true, value: 4 }).classification, 'NR');
});

test('owner resolution preserves cleanup threshold opt-out and missing RF behavior', () => {
  assert.equal(cleanup.parseReliabilityThreshold(''), 0);
  assert.equal(cleanup.parseReliabilityThreshold('29'), 29);
  assert.equal(cleanup.isReliabilityNrAdjustment(28, 0), false);
  for (const rf of [null, undefined, '']) {
    assert.equal(cleanup.isReliabilityNrAdjustment(rf, 29), false);
    assert.equal(rfClassification(rf, { threshold: '29' }), 'RF_UNKNOWN');
  }
});

test('current CSV import contains no cleanup or eligibility-classification calls', () => {
  const start = page.indexOf('  async function handleRatingsImportFile(');
  const end = page.indexOf('  async function copyRatingsBetweenSeasons(', start);
  assert.ok(start >= 0 && end > start, 'Review this guard when import functions move');
  assert.doesNotMatch(page.slice(start, end), /\b(?:cleanRatings|continueCleanRatings|buildRatingCleanupChanges|applyRatingCleanupChanges|cleanedSeasonDuprRating|isReliabilityNrAdjustment|rfClassification|evaluateEligibility)\s*\(/);
});
