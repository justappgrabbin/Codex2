import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('Monaco loads from the bundled local 0.52.2 files, not a CDN', async () => {
  const pane = await readFile(join(root, 'shell/kimi-linux/src/editor/MonacoPane.tsx'), 'utf8');
  assert.match(pane, /const BASE = '\/monaco\/0\.52\.2'/);
  assert.match(pane, /export async function loadMonaco/);
  assert.match(pane, /export function MonacoPane/);
  for (const banned of ['cdn.jsdelivr', 'unpkg.com', 'cdnjs', 'microsoft.com/monaco', 'https://cdn']) {
    assert.equal(pane.toLowerCase().includes(banned), false, `MonacoPane should not fetch ${banned}`);
  }
  for (const rel of [
    'shell/kimi-linux/public/monaco/0.52.2/editor.main.umd.js',
    'shell/kimi-linux/public/monaco/0.52.2/editor.main.css',
    'shell/kimi-linux/public/monaco/0.52.2/editor.worker.umd.js',
    'shell/kimi-linux/public/monaco/0.52.2/json.worker.umd.js',
    'shell/kimi-linux/public/monaco/0.52.2/css.worker.umd.js',
    'shell/kimi-linux/public/monaco/0.52.2/html.worker.umd.js',
    'shell/kimi-linux/public/monaco/0.52.2/ts.worker.umd.js',
  ]) await access(join(root, rel));
});

test('Code Editor uses the local Monaco pane and optional Self-Helpton side panel, off by default', async () => {
  const editor = await readFile(join(root, 'shell/kimi-linux/src/apps/CodeEditor.tsx'), 'utf8');
  assert.match(editor, /from '@\/editor\/MonacoPane'/);
  assert.match(editor, /<MonacoPane/);
  assert.match(editor, /from '@\/editor\/self-helpton\/SelfHelptonPanel'/);
  assert.match(editor, /loadSettings\(\)\.selfHelptonPanel/);
  assert.match(editor, /data-testid="self-helpton-toggle"/);
  const settings = await readFile(join(root, 'shell/kimi-linux/src/lib/editor-settings.mjs'), 'utf8');
  assert.match(settings, /selfHelptonPanel: false/);
});
