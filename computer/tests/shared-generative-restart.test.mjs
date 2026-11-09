import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit'); child.kill(); await exited;
}
async function start(directory) {
  const listener = createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const child = spawn(process.execPath, ['host/server.mjs'], { cwd: new URL('..', import.meta.url),
    env: { ...process.env, SYNTHIA_PORT: String(port), SYNTHIA_DATA_DIR: directory }, stdio: ['ignore', 'ignore', 'pipe'] });
  let errors = ''; child.stderr.on('data', data => errors += data.toString());
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error('Computer boot failed: ' + errors);
    try { if ((await fetch(url + '/api/status')).ok) return { child, url }; } catch { /* starting */ }
    await pause(50);
  }
  await stop(child); throw new Error('Computer boot timed out: ' + errors);
}

test('shared-engine analysis survives an actual Computer process restart without reanalysis', { timeout: 30000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synthia-generative-restart-'));
  let running;
  try {
    running = await start(directory);
    const response = await fetch(running.url + '/api/generative/structure', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'The player moves toward the goal.' }) });
    assert.equal(response.status, 200);
    const original = await response.json();
    await stop(running.child);
    running = await start(directory);
    const restored = await fetch(running.url + '/api/generative/history').then(r => r.json());
    assert.equal(restored.length, 1);
    assert.deepEqual(restored[0], original);
    const status = await fetch(running.url + '/api/generative/status').then(r => r.json());
    assert.equal(status.sameEngine, true);
    assert.equal(status.savedAnalyses, 1);
    const invalid = await fetch(running.url + '/api/generative/structure', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(50001) }) });
    assert.equal(invalid.status, 400);
    assert.equal((await fetch(running.url + '/api/generative/history').then(r => r.json())).length, 1);
  } finally {
    if (running) await stop(running.child);
    await rm(directory, { recursive: true, force: true });
  }
});
