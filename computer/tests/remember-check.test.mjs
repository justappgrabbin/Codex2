/**
 * Remember check — file, setting, journal entry, and workspace must still be
 * there after the computer process is stopped and started again on the same
 * data directory. Codex2 organization is checked on the file as well.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { organizeArtifact } from '../donors/Back-up-/vendor/pure-synthia-v0.4.0/src/synthia/morph-engine/substrate/vault/organize.mjs';

async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill();
  await exited;
}

async function start(directory) {
  const listener = createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const child = spawn(process.execPath, ['host/server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, SYNTHIA_PORT: String(port), SYNTHIA_DATA_DIR: directory },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let errors = '';
  child.stderr.on('data', (data) => { errors += data.toString(); });
  const url = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Computer boot failed: ${errors}`);
    try {
      if ((await fetch(`${url}/api/status`)).ok) return { child, url, errors };
    } catch { /* still starting */ }
    await pause(100);
  }
  await stop(child);
  throw new Error(`Computer boot timed out: ${errors}`);
}

async function post(url, path, body) {
  const response = await fetch(url + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `${path} failed`);
  return payload;
}

test('Remember check: file, setting, journal, and workspace survive a process restart', { timeout: 120000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synthia-remember-'));
  let running;
  const report = {};
  try {
    running = await start(directory);
    const file = await fetch(`${running.url}/api/files`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/home/user/Documents/remember-note.txt', content: 'remember this file' }),
    });
    assert.equal(file.status, 200, await file.text());
    const settings = await fetch(`${running.url}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ubuntuos_settings: JSON.stringify({ wifi_enabled: false, sound_volume: 30 }) }),
    });
    assert.equal(settings.status, 200);
    const entry = await post(running.url, '/api/journal', { text: 'Planted the north garden bed.' });
    const workspace = await post(running.url, '/api/workspace', {
      name: 'North garden',
      description: 'Remember check workspace',
      files: [{ path: 'notes/garden.txt', content: 'beans and basil' }],
    });
    const desktop = await fetch(`${running.url}/api/filesystem`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trashMetadata: {},
        nodes: {
          root: { id: 'root', name: '/', type: 'folder', parentId: null, createdAt: 1, modifiedAt: 1 },
          home: { id: 'home', name: 'home', type: 'folder', parentId: 'root', createdAt: 1, modifiedAt: 1 },
          user: { id: 'user', name: 'user', type: 'folder', parentId: 'home', createdAt: 1, modifiedAt: 1 },
          docs: { id: 'docs', name: 'Documents', type: 'folder', parentId: 'user', createdAt: 1, modifiedAt: 1 },
          note: { id: 'note', name: 'desktop-remember.txt', type: 'file', parentId: 'docs', createdAt: 1, modifiedAt: 1, content: 'from the file manager', size: 21 },
        },
      }),
    });
    assert.equal(desktop.status, 200, await desktop.text());
    assert.equal(entry.task, 'Planted the north garden bed.');
    assert.ok(workspace.id);

    await stop(running.child);
    running = await start(directory);

    const files = await fetch(`${running.url}/api/files`).then((response) => response.json());
    const kept = files.find((item) => item.path === '/home/user/Documents/remember-note.txt');
    const filesystem = await fetch(`${running.url}/api/filesystem`).then((response) => response.json());
    const restoredSettings = await fetch(`${running.url}/api/settings`).then((response) => response.json());
    const journal = await fetch(`${running.url}/api/journal`).then((response) => response.json());
    const projects = await fetch(`${running.url}/api/workspace`).then((response) => response.json());
    const vault = await fetch(`${running.url}/api/vault`).then((response) => response.json());
    const project = projects.find((item) => item.name === 'North garden');
    const projectFile = project ? await fetch(`${running.url}/api/files`).then((response) => response.json()) : [];
    const log = await readFile(join(directory, 'events.jsonl'), 'utf8');
    const organized = vault.find((item) => item.path === '/home/user/Documents/remember-note.txt');

    report.file = Boolean(kept) && kept.meta?.organization?.collection;
    report.fileContentViaActivate = null;
    if (kept?.meta?.addressKey) {
      const active = await fetch(`${running.url}/api/activate-file?address=${encodeURIComponent(kept.meta.addressKey)}&path=${encodeURIComponent(kept.path)}`).then((response) => response.json());
      report.fileContentViaActivate = active.content;
    }
    report.setting = restoredSettings.ubuntuos_settings ? JSON.parse(restoredSettings.ubuntuos_settings) : null;
    report.journal = journal.records.map((record) => record.task);
    report.workspace = project ? { id: project.id, files: project.files } : null;
    report.vaultCollection = organized?.organization?.collection ?? null;
    report.eventLogHasEntry = log.includes('Planted the north garden bed.');
    const desktopFile = filesystem?.nodes ? Object.values(filesystem.nodes).find((node) => node.name === 'desktop-remember.txt') : null;
    report.desktopFile = desktopFile ? { content: desktopFile.content, collection: desktopFile.organization?.collection } : null;
    void projectFile;

    const expectedOrganization = organizeArtifact({ name: 'remember-note.txt', type: 'text/plain', path: '/home/user/Documents/remember-note.txt' });
    assert.equal(report.fileContentViaActivate, 'remember this file');
    assert.equal(report.file, expectedOrganization.collection);
    assert.equal(report.vaultCollection, expectedOrganization.collection);
    assert.equal(report.desktopFile?.content, 'from the file manager');
    assert.equal(report.desktopFile?.collection, organizeArtifact({ name: 'desktop-remember.txt', type: 'text/plain', path: '/home/user/Documents/desktop-remember.txt' }).collection);
    assert.equal(report.setting.wifi_enabled, false);
    assert.equal(report.setting.sound_volume, 30);
    assert.deepEqual(report.journal, ['Planted the north garden bed.']);
    assert.equal(report.eventLogHasEntry, true);
    assert.equal(project.files['notes/garden.txt'].path, 'notes/garden.txt');
    await stop(running.child);
    running = null;
    const { ComputerRuntime } = await import('../ComputerRuntime.mjs');
    const { JsonFilePersistence } = await import('../runtime/json-file-persistence.mjs');
    const again = await new ComputerRuntime({
      persistence: new JsonFilePersistence(join(directory, 'state.json')),
      eventLogPath: join(directory, 'events.jsonl'),
    }).boot();
    const workspaceFile = again.projects.readFile(project.id, 'notes/garden.txt');
    report.workspaceFile = workspaceFile?.content ?? null;
    assert.equal(report.workspaceFile, 'beans and basil');
    console.log('REMEMBER_REPORT ' + JSON.stringify(report));
  } finally {
    if (running) await stop(running.child);
    await rm(directory, { recursive: true, force: true });
  }
});
