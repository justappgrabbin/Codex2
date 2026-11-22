import test from 'node:test';
import assert from 'node:assert/strict';
import { createAndroidPermissionGate } from '../services/android-permission-gate.mjs';

test('requires start and one approval per call', async () => {
  const calls = [];
  const gate = createAndroidPermissionGate({ client: { callTool: async (name, args) => { calls.push([name,args]); return { ok: true }; } }, allowedTools: ['screen_observe'] });
  await assert.rejects(gate.callTool('screen_observe'), /stopped/);
  gate.start();
  await assert.rejects(gate.callTool('screen_observe'), /approval/);
  gate.approve('screen_observe');
  assert.deepEqual(await gate.callTool('screen_observe', { mode: 'redacted' }), { ok: true });
  assert.equal(calls.length, 1);
  await assert.rejects(gate.callTool('screen_observe'), /approval/);
  assert.throws(() => gate.approve('touch'), /not allowed/);
});
test('stop revokes approvals and discards in-flight results', async () => {
  let release;
  const gate = createAndroidPermissionGate({ client: { callTool: () => new Promise(resolve => { release = resolve; }) }, allowedTools: ['touch'] });
  gate.start();
  gate.approve('touch');
  const pending = gate.callTool('touch', { x: 1, y: 2 });
  gate.stop();
  release({ ok: true });
  await assert.rejects(pending, /stopped before result/);
  gate.start();
  await assert.rejects(gate.callTool('touch'), /approval/);
});
