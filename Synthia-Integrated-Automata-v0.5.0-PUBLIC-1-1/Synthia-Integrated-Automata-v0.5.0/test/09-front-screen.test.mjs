import test from 'node:test';
import assert from 'node:assert/strict';
import { startSynthiaFrontScreen } from '../src/index.mjs';

test('front screen serves live status, chat, and the independently callable execution tray', async (t) => {
  const started = await startSynthiaFrontScreen({ port: 0 });
  t.after(() => new Promise((resolve) => started.server.close(resolve)));

  const page = await fetch(started.url);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Synthia · Living Execution Field/);

  const status = await fetch(`${started.url}/api/status`).then((response) => response.json());
  assert.equal(status.ok, true);
  assert.equal(status.counts.meshes, 51);
  assert.equal(status.counts.channels, 36);
  assert.equal(status.counts.centers, 9);

  const tray = await fetch(`${started.url}/api/tray`).then((response) => response.json());
  assert.ok(tray.instruments.some((entry) => entry.kind === 'registered-app' && entry.id === 'gamegan-single-player'));
  assert.ok(tray.instruments.some((entry) => entry.kind === 'state-space' && entry.id === 'state-space-browser'));
  assert.ok(tray.instruments.some((entry) => entry.kind === 'channel' && entry.id === '16-48'));
  assert.ok(tray.instruments.some((entry) => entry.kind === 'hand' && entry.id === 'exact-address-recall'));

  const execution = await fetch(`${started.url}/api/tray`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'hand', id: 'five-level-state-space', input: { gate: 16 } }),
  }).then((response) => response.json());
  assert.equal(execution.ok, true);
  assert.deepEqual(execution.output.map((entry) => entry.level), ['Movement', 'Evolution', 'Being', 'Design', 'Space']);

  const chat = await fetch(`${started.url}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Show me the connected field.', context: { personId: 'front-screen-test' } }),
  }).then((response) => response.json());
  assert.equal(chat.ok, true);
  assert.equal(chat.pipelineTrace.length, 7);
  assert.equal(chat.coordination.participants.length, 2);
});
