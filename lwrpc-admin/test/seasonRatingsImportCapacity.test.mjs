import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MAX_CSV_BYTES, MAX_IMPORT_ROWS, parseRatingsCsv } from '../app/lib/seasonRatingsImport.js';
import { RATINGS_UPLOAD_RPC_TIMEOUT_MS, signUpload, uploadInputs } from '../app/lib/seasonRatingsUploadServer.js';

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/seasonRatings879.json', import.meta.url)));
const escapeCsv = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const minimalCsv = count => `duprId,doubles\n${Array.from({ length: count }, (_, index) => `SYN${index},3.237`).join('\n')}`;
function realisticCsv(count) {
  const rows = Array.from({ length: count }, (_, index) => ({
    ...fixture[index % fixture.length],
    duprId: `SYN${String(index).padStart(6, '0')}`,
  }));
  const keys = Object.keys(rows[0]);
  return [keys, ...rows.map(row => keys.map(key => row[key] ?? ''))]
    .map(row => row.map(escapeCsv).join(','))
    .join('\r\n');
}

test('ratings CSV accepts the reviewed row boundaries through 5,000', () => {
  assert.equal(MAX_IMPORT_ROWS, 5_000);
  for (const count of [1, 1_000, 1_001, 1_800, 5_000]) {
    assert.equal(parseRatingsCsv(minimalCsv(count)).length, count);
  }
});

test('ratings CSV rejects 5,001 rows with the updated bounded message', () => {
  assert.throws(
    () => parseRatingsCsv(minimalCsv(5_001)),
    /Choose a CSV with 1–5,000 rows\./,
  );
});

test('realistic 1,800 and 5,000 row requests retain all explicit size bounds', () => {
  for (const count of [1_800, 5_000]) {
    const csv = realisticCsv(count);
    const upload = uploadInputs(csv);
    const payload = {
      id: '00000000-0000-0000-0000-000000000001',
      policy: 'upload-working-inputs-v1',
      actor: '00000000-0000-0000-0000-000000000101',
      seasonId: '00000000-0000-0000-0000-000000000020',
      operation: 'upload',
      upload,
      fingerprint: 'f'.repeat(32),
      fileHash: 'f'.repeat(64),
      expires: '2099-01-01T00:00:00.000Z',
    };
    const receipt = signUpload(payload, payload.actor, 'session', 'secret');
    const previewRequest = JSON.stringify({ action: 'preview', seasonId: payload.seasonId, csv });
    const commitRequest = JSON.stringify({ action: 'commit', confirmed: true, seasonId: payload.seasonId, receipt });
    assert.ok(Buffer.byteLength(csv) < MAX_CSV_BYTES);
    assert.ok(Buffer.byteLength(previewRequest) < 4 * 1024 * 1024);
    assert.ok(receipt.length < 2_800_000);
    assert.ok(Buffer.byteLength(commitRequest) < 4 * 1024 * 1024);
  }
});

test('ratings upload RPCs retain a bounded 30 second timeout', () => {
  assert.equal(RATINGS_UPLOAD_RPC_TIMEOUT_MS, 30_000);
});
