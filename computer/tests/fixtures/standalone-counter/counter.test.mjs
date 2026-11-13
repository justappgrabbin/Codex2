import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('build preserves the actual standalone source', async () => {
  assert.equal(await readFile('dist/index.html', 'utf8'), await readFile('index.html', 'utf8'));
});
