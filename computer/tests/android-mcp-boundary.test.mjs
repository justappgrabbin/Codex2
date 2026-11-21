import test from 'node:test';
import assert from 'node:assert/strict';
import { createAndroidMcp } from '../services/trident-mcp-glue.mjs';

test('Android MCP starts stopped and cannot call tools before explicit start', async () => {
  let requests = 0;
  const android = createAndroidMcp({ token: 'test-token', fetcher: async () => { requests++; throw new Error('unexpected request'); } });
  assert.equal(android.enabled, true);
  assert.equal(android.stopped, true);
  await assert.rejects(android.listTools(), /stopped/);
  assert.equal(requests, 0);
});

test('Android MCP denies unlisted tools without contacting phone', async () => {
  let requests = 0;
  const android = createAndroidMcp({ token: 'test-token', fetcher: async () => { requests++; throw new Error('unexpected request'); } });
  android.start();
  await assert.rejects(android.callTool('mobile_delete_file', {}), /not permitted/);
  assert.equal(requests, 0);
});

test('Android MCP stop aborts an in-flight request', async () => {
  let onRequest;
  const reached = new Promise(resolve => { onRequest = resolve; });
  const android = createAndroidMcp({ token: 'test-token', fetcher: async (_url, opts) => {
    onRequest();
    return new Promise((_resolve, reject) => {
      opts.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
    });
  } });
  android.start();
  const pending = android.listTools();
  await reached;
  assert.deepEqual(android.stop(), { stopped: true });
  await assert.rejects(pending, /abort/i);
  assert.equal(android.stopped, true);
});
