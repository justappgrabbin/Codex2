import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';
import { digest } from '../services/project-research.mjs';

test('actual host interruption reconciles worker without replay and retains source/approval', { skip: process.env.SYNTHIA_DOCKER_TEST !== '1', timeout: 60000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synthia-crash-'));
  let child, origin;
  async function start() {
    const listener = createServer(); await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
    const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
    child = spawn(process.execPath, ['computer/host/server.mjs'], { cwd: new URL('../../', import.meta.url),
      env: { ...process.env, SYNTHIA_DATA_DIR: directory, SYNTHIA_PORT: String(port) }, stdio: ['ignore', 'ignore', 'pipe'] });
    let errors = ''; child.stderr.on('data', chunk => errors += chunk);
    origin = `http://127.0.0.1:${port}`;
    for (let count = 0; count < 200; count++) {
      if (child.exitCode !== null) throw new Error(errors);
      try { if ((await fetch(origin + '/api/status')).ok) return; } catch {}
      await pause(25);
    }
    throw new Error('Host readiness timeout ' + errors);
  }
  async function stop(signal = 'SIGTERM') {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const done = once(child, 'exit'); child.kill(signal); await done;
  }
  async function post(path, data) {
    const response = await fetch(origin + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return { status: response.status, data: await response.json() };
  }
  try {
    await start();
    const imported = await post('/api/projects/import', { name: 'Interrupted real project', files: [{ path: 'package.json',
      content: JSON.stringify({ scripts: { build: 'node -e "setTimeout(()=>{},55000)"', test: 'node -e "process.exit(0)"' } }) }] });
    assert.equal(imported.status, 200);
    const projectId = imported.data.project.id;
    const planned = await post('/api/construction/propose', { projectId, goal: 'Qualify interruption recovery', changes: [], requestKey: 'real-interruption-job' });
    assert.equal(planned.status, 200);
    const id = planned.data.id;
    assert.equal((await post('/api/construction/run', { id })).status, 400);
    assert.equal((await post('/api/construction/approve', { id, decision: 'approve', planDigest: digest(JSON.stringify(planned.data.spec)) })).status, 200);
    const active = post('/api/construction/run', { id }).catch(() => null);
    let running = false;
    for (let count = 0; count < 100; count++) {
      const snapshot = await fetch(origin + '/api/continuity').then(response => response.json());
      if (snapshot.construction.jobs[0].status === 'RUNNING') { running = true; break; }
      await pause(50);
    }
    assert.equal(running, true);
    let containerRunning = false;
    for (let count = 0; count < 100; count++) {
      try {
        const inspected = await promisify(execFile)('docker', ['--host=unix:///var/run/docker.sock', 'inspect', '--format={{.State.Running}}', `synthia-${id}`], { timeout: 3000 });
        if (inspected.stdout.trim() === 'true') { containerRunning = true; break; }
      } catch {}
      await pause(50);
    }
    assert.equal(containerRunning, true, 'Kill only after actual container execution starts, not merely a queued/claimed job');
    await stop('SIGKILL'); await active;
    await start();
    const restored = await fetch(origin + '/api/continuity').then(response => response.json());
    assert.equal(restored.construction.jobs[0].status, 'INTERRUPTED');
    assert.equal(restored.construction.jobs[0].attempts, 1);
    assert.equal(restored.construction.approvals.length, 1);
    assert.equal(restored.projects[0].id, projectId);
    assert.equal((await post('/api/construction/run', { id })).status, 400);
  } finally { await stop(); await rm(directory, { recursive: true, force: true }); }
});
