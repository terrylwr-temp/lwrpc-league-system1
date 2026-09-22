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

test('Member Administration copy control stays compact and icon-only in both states', async () => {
  const page = await readFile(new URL('../app/members/page.js', import.meta.url), 'utf8');
  const component = page.slice(
    page.indexOf('function CopyEmailButton('),
    page.indexOf('\nfunction readMemberDirectoryViewState(')
  );

  assert.ok(component.startsWith('function CopyEmailButton('));
  assert.ok(component.includes('if (await copyMemberEmail(event, email)) setCopied(true)'));
  assert.ok(component.includes('window.setTimeout(() => setCopied(false), 2000)'));
  assert.ok(component.includes('aria-label={`Copy email ${email}`}'));
  assert.ok(component.includes('title={copied ? "Copied" : "Copy Email"}'));
  assert.match(component, /className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-blue-700 hover:bg-blue-100/);
  assert.equal((component.match(/<svg aria-hidden="true"/g) || []).length, 2);
  assert.match(component, /<rect x="8" y="8" width="11" height="11" rx="2" \/>/);
  assert.match(component, /<path d="m5 12 4 4L19 6" \/>/);
  const buttonContent = component.split('    >\n')[1]?.split('    </button>')[0];
  assert.ok(buttonContent);
  assert.doesNotMatch(buttonContent, /"Copied"|"Copy Email"/);
});
