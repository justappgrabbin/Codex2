import test from 'node:test';
import assert from 'node:assert/strict';
import { createAndroidConsentAdapter } from '../services/android-consent-adapter.mjs';

test('no Android access without start and exact one-time approval', async () => {
  const calls = [];
  const gate = createAndroidConsentAdapter({ transport: { async callTool(name,args) { calls.push([name,args]); return { ok:true }; } } });
  assert.throws(() => gate.request('android_screen_observe'), /stopped/);
  gate.start();
  assert.throws(() => gate.request('android_delete_file'), /not permitted/);
  await assert.rejects(gate.execute('android_touch', { x: 1 }, 'missing'), /approval required/);
  const approval = gate.request('android_touch', { x: 1 });
  await assert.rejects(gate.execute('android_touch', { x: 2 }, approval.id), /approval required/);
  await assert.rejects(gate.execute('android_touch', { x: 1 }, approval.id), /approval required/);
  const valid = gate.request('android_touch', { x: 1 });
  assert.deepEqual(await gate.execute('android_touch', { x: 1 }, valid.id), { ok:true });
  assert.equal(calls.length, 1);
  await assert.rejects(gate.execute('android_touch', { x: 1 }, valid.id), /approval required/);
});

test('stop revokes pending approvals and rejects late results', async () => {
  let resolve;
  const gate = createAndroidConsentAdapter({ transport: { callTool: () => new Promise(r => { resolve = r; }) } });
  gate.start();
  const approval = gate.request('android_screen_observe');
  const pending = gate.execute('android_screen_observe', {}, approval.id);
  gate.stop();
  resolve({ screen: 'sensitive' });
  await assert.rejects(pending, /stopped during operation/);
  gate.start();
  await assert.rejects(gate.execute('android_screen_observe', {}, approval.id), /approval required/);
});

test('approval expires and cannot authorize another tool', async () => {
  let clock = 100;
  const gate = createAndroidConsentAdapter({ transport: { callTool: async () => ({ok:true}) }, now: () => clock, ttlMs: 20 });
  gate.start();
  const a = gate.request('android_screen_observe');
  await assert.rejects(gate.execute('android_touch', {}, a.id), /approval required/);
  const b = gate.request('android_screen_observe');
  clock = 121;
  await assert.rejects(gate.execute('android_screen_observe', {}, b.id), /approval required/);
});
