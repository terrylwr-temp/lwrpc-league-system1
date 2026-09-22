import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync(new URL('../app/round-robin/[id]/admin/page.js', import.meta.url), 'utf8');

test('PBCC initial start and later-round actions use distinct labels', () => {
  assert.match(page, /initialMode \? "Start Match" : "Create Next Round"/);
  assert.match(page, /initialMode \? "Start and Generate First Game" : "Create Next Round"/);
  assert.match(page, /initialMode \? "Starting\.\.\." : "Creating Next Round\.\.\."/);
  assert.match(page, /isPlaying \? "Next Round" : "Start Match"/);
});
