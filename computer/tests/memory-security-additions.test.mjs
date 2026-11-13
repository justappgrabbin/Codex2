import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';
import { EventBus, StateStore, MemoryPersistence } from '../core/kernel.mjs';
import { ResidentCheckpointStore } from '../runtime/resident-checkpoint-store.mjs';
import { EncryptedFilePersistence, EncryptedEventEmitter, readStateKey } from '../runtime/encrypted-persistence.mjs';

test('donor checkpoint adapter retains concurrent revisions and tombstones on the resident store', async () => {
  const state = new StateStore({ persistence: new MemoryPersistence() }); await state.restore();
  const store = new ResidentCheckpointStore(state);
  await Promise.all([store.put('worker.one', { version: 1 }), store.put('worker.one', { version: 2 })]);
  assert.deepEqual(await store.get('worker.one'), { version: 2 });
  await store.delete('worker.one'); assert.equal(await store.get('worker.one'), null);
  const history = state.get('computer.automataCheckpoints.history');
  assert.deepEqual(history.map(record => record.value), [{ version: 1 }, { version: 2 }, null]);
  assert.notEqual(history[0].digest, history[1].digest);
});

test('encrypted StateStore and event grammar retain data across restart, reject wrong keys/tampering and separate namespaces', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synthia-encryption-'));
  try {
    const key = randomBytes(32), file = join(directory, 'state.enc.json'), log = join(directory, 'events.enc.jsonl');
    const persistence = new EncryptedFilePersistence(file, key);
    await persistence.save('person-a', { evidence: 'private-evidence-example', pending: ['continue'] });
    assert.ok(!(await readFile(file, 'utf8')).includes('private-evidence-example'));
    const restored = new EncryptedFilePersistence(file, key);
    assert.deepEqual(await restored.load('person-a'), { evidence: 'private-evidence-example', pending: ['continue'] });
    await assert.rejects(() => new EncryptedFilePersistence(file, randomBytes(32)).load('person-a'));
    const envelope = JSON.parse(await readFile(file, 'utf8'));
    envelope['person-b'] = envelope['person-a']; await writeFile(file, JSON.stringify(envelope));
    await assert.rejects(() => restored.load('person-b'), 'AAD prevents ciphertext moving between namespaces');
    const bus = new EventBus(), emitter = new EncryptedEventEmitter({ key, logPath: log, bus });
    const event = await emitter.emitEvent({ actor_id: 'owner', event_type: 'observation', input: 'private-journal-example', trajectory_id: 'one' });
    assert.ok(!(await readFile(log, 'utf8')).includes('private-journal-example'));
    assert.deepEqual(await new EncryptedEventEmitter({ key, logPath: log }).history('one'), [event]);
    await assert.rejects(() => new EncryptedEventEmitter({ key: randomBytes(32), logPath: log }).readAll());
    const corrupted = JSON.parse((await readFile(log, 'utf8')).trim());
    const ciphertext = Buffer.from(corrupted.data, 'base64'); ciphertext[0] ^= 1; corrupted.data = ciphertext.toString('base64');
    await writeFile(log, JSON.stringify(corrupted) + '\n');
    await assert.rejects(() => emitter.readAll(), 'Authentication failure must not silently erase history');
    const keyFile = join(directory, 'state.key'); await writeFile(keyFile, key, { mode: 0o600 });
    assert.deepEqual(await readStateKey(keyFile), key);
    await writeFile(keyFile, 'too-short'); await assert.rejects(() => readStateKey(keyFile));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('real original donor ownedState survives separate Computer processes without replacing the engine', { timeout: 30000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synthia-donor-memory-'));
  const script = `
    import assert from 'node:assert/strict';
    import { ComputerRuntime } from './computer/ComputerRuntime.mjs';
    import { JsonFilePersistence } from './computer/runtime/json-file-persistence.mjs';
    import { join } from 'node:path';
    const [directory, phase] = process.argv.slice(1);
    const computer = await new ComputerRuntime({ persistence: new JsonFilePersistence(join(directory,'state.json')), eventLogPath: join(directory,'events.jsonl') }).boot();
    const engine = computer.semanticEngine;
    const swarm = await computer.automataGateway._boot();
    const worker = swarm.workers.get('synthia-tool-synthesis-worker');
    assert.ok(worker && 'ownedState' in worker.target);
    if (phase === 'write') {
      worker.target.ownedState = { observedState: 'retained-original-worker-contract', history: ['original-source-evidence'] };
      await swarm.checkpoint('actual-process-retention-test');
    } else {
      assert.deepEqual(worker.target.ownedState, { observedState: 'retained-original-worker-contract', history: ['original-source-evidence'] });
      assert.equal(await computer.automataGateway.semanticEngine(), engine);
      const status = await computer.automataGateway.memoryStatus();
      assert.equal(status.persistence, 'resident-StateStore');
      assert.ok(status.revisions > 0);
      assert.equal(status.completeLearnedStateCoverage, false);
    }
    console.log(JSON.stringify({ phase, sameEngine: true }));
  `;
  try {
    for (const phase of ['write', 'read']) {
      const result = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', script, directory, phase], { cwd: new URL('../../', import.meta.url), timeout: 25000, maxBuffer: 100000 });
      assert.match(result.stdout, /sameEngine/);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('opt-in encrypted host retains imports/chat across actual restart and refuses missing-key plaintext fallback', { timeout: 30000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synthia-encrypted-host-'));
  const keyFile = join(directory, 'state.key'), data = join(directory, 'private-data');
  await writeFile(keyFile, randomBytes(32), { mode: 0o600 });
  let child, origin;
  async function start(withKey = true) {
    const listener = createServer(); await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
    const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
    const env = { ...process.env, SYNTHIA_DATA_DIR: data, SYNTHIA_PORT: String(port) };
    delete env.SYNTHIA_STATE_KEY_FILE; if (withKey) env.SYNTHIA_STATE_KEY_FILE = keyFile;
    child = spawn(process.execPath, ['computer/host/server.mjs'], { cwd: new URL('../../', import.meta.url), env, stdio: ['ignore', 'ignore', 'pipe'] });
    let errors = ''; child.stderr.on('data', bytes => errors += bytes);
    origin = `http://127.0.0.1:${port}`;
    for (let attempt = 0; attempt < 150; attempt++) {
      if (child.exitCode !== null) return { ready: false, errors };
      try { if ((await fetch(origin + '/api/status')).ok) return { ready: true, errors }; } catch {}
      await pause(25);
    }
    throw new Error('Encrypted host readiness timeout: ' + errors);
  }
  async function stop() {
    if (child && child.exitCode === null && child.signalCode === null) { const done = once(child, 'exit'); child.kill(); await done; }
  }
  async function post(path, payload) {
    const response = await fetch(origin + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    assert.equal(response.status, 200); return response.json();
  }
  try {
    assert.equal((await start()).ready, true);
    const marker = 'private-import-marker-for-encryption-test';
    const imported = await post('/api/ingest', { name: 'private.txt', base64: Buffer.from(marker).toString('base64') });
    await post('/api/chat', { text: 'Please list uploaded files' });
    const history = await fetch(origin + '/api/history').then(response => response.json());
    await stop();
    assert.ok(!(await readFile(join(data, 'state.enc.json'), 'utf8')).includes(marker));
    assert.ok(!(await readFile(join(data, 'events.enc.jsonl'), 'utf8')).includes('Please list uploaded files'));
    assert.equal((await start()).ready, true);
    assert.deepEqual(await fetch(origin + '/api/history').then(response => response.json()), history);
    const file = imported.items[0];
    const recalled = await fetch(origin + `/api/activate-file?address=${encodeURIComponent(file.addressKey)}&path=${encodeURIComponent(file.path)}`).then(response => response.json());
    assert.equal(recalled.content, marker);
    const continuity = await fetch(origin + '/api/continuity').then(response => response.json());
    assert.equal(continuity.storage.encryptedCheckpointAndJournal, true);
    assert.equal(continuity.memory.persistence, 'resident-StateStore');
    await stop();
    const withoutKey = await start(false);
    assert.equal(withoutKey.ready, false); assert.match(withoutKey.errors, /provide its SYNTHIA_STATE_KEY_FILE/);
    await assert.rejects(() => readFile(join(data, 'state.json')), { code: 'ENOENT' });
  } finally { await stop(); await rm(directory, { recursive: true, force: true }); }
});
