import test from 'node:test';
import assert from 'node:assert/strict';
import { createAndroidMcp } from '../services/trident-mcp-glue.mjs';

test('Android MCP defaults to stopped and requires explicit start', async () => {
  let calls = 0;
  const android = createAndroidMcp({ token: 'test-only', fetcher: async () => { calls++; throw Error('unexpected'); } });
  assert.equal(android.stopped, true);
  await assert.rejects(android.listTools(), /stopped/);
  assert.equal(calls, 0);
  assert.deepEqual(android.start(), { stopped: false });
  assert.equal(android.stopped, false);
  assert.deepEqual(android.stop(), { stopped: true });
  assert.equal(android.stopped, true);
  await assert.rejects(android.callTool('mobile_take_screenshot'), /stopped/);
  assert.equal(calls, 0);
});

test('Android MCP enforces allowlist and loopback transport', async () => {
  const requests = [];
  const android = createAndroidMcp({
    token: 'test-only',
    fetcher: async (url, options) => {
      requests.push({ url, options });
      const body = JSON.parse(options.body);
      return { ok: true, json: async () => ({ id: body.id, result: { tools: [{ name: 'mobile_take_screenshot' }, { name: 'delete_everything' }] } }) };
    }
  });
  android.start();
  await assert.rejects(android.callTool('delete_everything'), /not permitted/);
  assert.deepEqual((await android.listTools()).map(t => t.name), ['mobile_take_screenshot']);
  assert.equal(requests[0].url, 'http://127.0.0.1:8765/mcp');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-only');
  android.stop();
});

test('Stopping aborts an in-flight Android request', async () => {
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const android = createAndroidMcp({
    token: 'test-only',
    fetcher: async (_url, { signal }) => {
      started();
      await new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
    }
  });
  android.start();
  const pending = android.listTools();
  await ready;
  android.stop();
  await assert.rejects(pending, /aborted/);
});
