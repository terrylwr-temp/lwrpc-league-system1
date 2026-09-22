import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  isReviewOrInvalidRatingRow,
  ratingsImportPreviewView,
  toggleRatingsPreviewReviewOnly,
} from '../app/lib/ratingsImportPreviewView.js';

const row = (action, line) => ({ action, line, reason: `${action} reason` });

test('ratings preview defaults to every row with existing pagination', () => {
  const rows = Array.from({ length: 123 }, (_, index) => row(index === 1 ? 'REVIEW' : 'FILL', index + 2));
  const view = ratingsImportPreviewView(rows, { page: 0, reviewOnly: false });
  assert.equal(view.visibleCount, 123);
  assert.equal(view.totalCount, 123);
  assert.equal(view.pages, 3);
  assert.equal(view.pageRows.length, 50);
  assert.deepEqual(view.pageRows, rows.slice(0, 50));
});

test('review-only mode includes REVIEW and INVALID while excluding normal actions', () => {
  const rows = ['REVIEW', 'INVALID', 'FILL', 'RECORD', 'SKIP', 'DEFER'].map((action, index) => row(action, index + 2));
  const view = ratingsImportPreviewView(rows, { page: 0, reviewOnly: true });
  assert.deepEqual(view.pageRows.map(item => item.action), ['REVIEW', 'INVALID']);
  assert.equal(view.visibleCount, 2);
  assert.equal(view.totalCount, 6);
  assert.equal(view.pages, 1);
  assert.equal(isReviewOrInvalidRatingRow(row('SKIP', 9)), false);
});

test('review-only mode reports the expected eight rows from a 1,800-row preview', () => {
  const rows = [
    ...Array.from({ length: 8 }, (_, index) => row(index % 2 ? 'INVALID' : 'REVIEW', index + 2)),
    ...Array.from({ length: 1_792 }, (_, index) => row(index % 3 === 0 ? 'SKIP' : index % 2 ? 'FILL' : 'RECORD', index + 10)),
  ];
  const view = ratingsImportPreviewView(rows, { page: 0, reviewOnly: true });
  assert.equal(view.visibleCount, 8);
  assert.equal(view.totalCount, 1_800);
  assert.equal(view.pages, 1);
  assert.ok(view.pageRows.every(isReviewOrInvalidRatingRow));
});

test('filtered pagination uses only review rows', () => {
  const rows = [
    ...Array.from({ length: 108 }, (_, index) => row(index % 2 ? 'INVALID' : 'REVIEW', index + 2)),
    ...Array.from({ length: 1_692 }, (_, index) => row(index % 2 ? 'FILL' : 'RECORD', index + 110)),
  ];
  const view = ratingsImportPreviewView(rows, { page: 1, reviewOnly: true });
  assert.equal(view.totalCount, 1_800);
  assert.equal(view.visibleCount, 108);
  assert.equal(view.pages, 3);
  assert.equal(view.page, 1);
  assert.equal(view.pageRows.length, 50);
  assert.ok(view.pageRows.every(isReviewOrInvalidRatingRow));
});

test('switching the review filter resets pagination to page one', () => {
  assert.deepEqual(
    toggleRatingsPreviewReviewOnly({ page: 27, reviewOnly: false }),
    { page: 0, reviewOnly: true },
  );
  assert.deepEqual(
    toggleRatingsPreviewReviewOnly({ page: 2, reviewOnly: true }),
    { page: 0, reviewOnly: false },
  );
});

test('component retains the protected import callback and receipt gate', () => {
  const source = fs.readFileSync(new URL('../app/components/RatingsImportPreview.js', import.meta.url), 'utf8');
  assert.match(source, /preview\.receipt&&preview\.counts\.ready>0/);
  assert.match(source, /onClick=\{onImport\}/);
  assert.match(source, /disabled=\{busy\}/);
  assert.match(source, /row\.reason/);
});
