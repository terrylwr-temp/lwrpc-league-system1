import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { copyMemberEmail } from '../app/lib/memberEmailClipboard.js';
import { formatDisplayTimestamp, formatDisplayTimestampShort } from '../app/lib/dateTime.js';

test('0757 Copy Email copies the exact saved value and never opens the row', async () => {
  let stopped = 0;
  const event = { stopPropagation() { stopped += 1; } };
  let copied = null;
  assert.equal(await copyMemberEmail(event, ' Saved.Email@example.com ', { writeText: async value => { copied = value; } }), true);
  assert.equal(copied, ' Saved.Email@example.com ');
  assert.equal(stopped, 1);
  assert.equal(await copyMemberEmail(event, '', { writeText: async () => { throw new Error('must not copy'); } }), false);
  assert.equal(stopped, 2);
  assert.equal(copied, ' Saved.Email@example.com ');
});

test('0757 Copy Email uses the safe fallback when the Clipboard API fails', async () => {
  const field = { style: {}, setAttribute() {}, select() {}, remove() { this.removed = true; } };
  const documentRef = {
    body: { appendChild() {} },
    createElement: () => field,
    execCommand: command => command === 'copy',
  };
  const result = await copyMemberEmail({ stopPropagation() {} }, 'person@example.com', { writeText: async () => { throw new Error('blocked'); } }, documentRef);
  assert.equal(result, true);
  assert.equal(field.value, 'person@example.com');
  assert.equal(field.removed, true);
});

test('0757 Member Administration uses Eastern short time and both desktop/mobile copy controls', async () => {
  const timestamp = '2026-09-22T14:42:00Z';
  assert.equal(formatDisplayTimestampShort(timestamp), '9/22/2026 10:42AM');
  assert.match(formatDisplayTimestamp(timestamp), /EDT$/);
  const page = await readFile(new URL('../app/members/page.js', import.meta.url), 'utf8');
  assert.ok((page.match(/<CopyEmailButton email=\{member\.email\}/g) || []).length === 2);
  assert.match(page, /formatDisplayTimestampShort\(/);
  assert.doesNotMatch(page, /formatDisplayTimestamp\(/);
});
