import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { request } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const wait = ms => new Promise(r => setTimeout(r, ms));
async function freePort() {
  const server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  await new Promise(r => server.close(r));
  return port;
}
function http(port, path, method = 'GET', headers = {}, body) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method, headers }, res => {
      const chunks = [];
      res.on('data', b => chunks.push(b));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.end(body);
  });
}
test('full Computer rejects foreign HTTP origins and hosts without breaking local WebView', { timeout: 90000 }, async t => {
  const dir = await mkdtemp(join(tmpdir(), 'synthia-http-boundary-'));
  const port = await freePort();
  const host = '127.0.0.1:' + port;
  const child = spawn(process.execPath, ['host/server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, SYNTHIA_PORT: String(port), SYNTHIA_DATA_DIR: dir }, stdio: 'ignore',
  });
  t.after(async () => {
    if (child.exitCode === null) {
      const done = new Promise(r => child.once('exit', r));
      child.kill();
      await done;
    }
    await rm(dir, { recursive: true, force: true });
  });
  let ready = false;
  for (let i = 0; i < 150; i++) {
    try { ready = (await http(port, '/api/status')).status === 200; } catch { /* booting */ }
    if (ready) break;
    if (child.exitCode !== null) throw new Error('Computer exited during boot');
    await wait(100);
  }
  assert.equal(ready, true, 'Computer boot');
  const post = (name, headers) => http(port, '/api/ingest', 'POST',
    { 'Content-Type': 'text/plain', ...headers },
    JSON.stringify({ name, base64: Buffer.from('const preserved=1;').toString('base64') }));
  await t.test('foreign Origin rejected', async () =>
    assert.equal((await post('foreign-origin.js', { Host: host, Origin: 'https://foreign.example' })).status, 403));
  await t.test('foreign Host rejected', async () =>
    assert.equal((await post('foreign-host.js', { Host: 'foreign.example:' + port })).status, 403));
  await t.test('cross-site Fetch Metadata rejected', async () =>
    assert.equal((await post('cross-site.js', { Host: host, 'Sec-Fetch-Site': 'cross-site' })).status, 403));
  await t.test('opaque Origin rejected', async () =>
    assert.equal((await post('opaque.js', { Host: host, Origin: 'null' })).status, 403));
  await t.test('Android WebView same-origin accepted', async () =>
    assert.equal((await post('webview.js', { Host: host, Origin: 'http://' + host, 'Sec-Fetch-Site': 'same-origin' })).status, 200));
  await t.test('native localhost client accepted', async () =>
    assert.equal((await post('native.js', { Host: host })).status, 200));
  await t.test('denied writes have no persistent records', async () => {
    const files = JSON.parse((await http(port, '/api/files')).body).map(x => x.path);
    for (const name of ['foreign-origin.js', 'foreign-host.js', 'cross-site.js', 'opaque.js'])
      assert.equal(files.some(x => x.endsWith('/' + name)), false, name);
    for (const name of ['webview.js', 'native.js'])
      assert.equal(files.some(x => x.endsWith('/' + name)), true, name);
  });
  await t.test('Generative analysis uses the same origin boundary', async () => {
    const response = await http(port, '/api/generative/structure', 'POST',
      { Host: host, Origin: 'https://foreign.example', 'Content-Type': 'application/json' },
      JSON.stringify({ text: 'The player moves toward the goal.' }));
    assert.equal(response.status, 403);
    assert.deepEqual(JSON.parse((await http(port, '/api/generative/history')).body), []);
  });
  await t.test('Generative endpoint analyzes through the live shared engine and saves a receipt', async () => {
    const response = await http(port, '/api/generative/structure', 'POST',
      { Host: host, Origin: 'http://' + host, 'Content-Type': 'application/json' },
      JSON.stringify({ text: 'The player moves toward the goal.' }));
    assert.equal(response.status, 200, response.body);
    const receipt = JSON.parse(response.body);
    assert.ok(receipt.derivation.output.summary.recognizedRelationshipCount > 0);
    assert.equal(receipt.derivation.output.summary.addressCount, 0);
    const status = JSON.parse((await http(port, '/api/generative/status')).body);
    assert.equal(status.sameEngine, true);
    assert.equal(status.savedAnalyses, 1);
    const history = JSON.parse((await http(port, '/api/generative/history')).body);
    assert.equal(history[0].id, receipt.id);
  });
  await t.test('learning API preserves origin boundary and executes a checked retained component', async () => {
    const send = (route, value, origin = 'http://' + host) => http(port, '/api/learning' + route, 'POST',
      { Host: host, Origin: origin, 'Content-Type': 'application/json' }, JSON.stringify(value));
    assert.equal((await send('/teach', { text: 'private lesson' }, 'https://foreign.example')).status, 403);
    assert.equal((await send('/teach', { text: 'A quotation includes sales tax.' })).status, 200);
    const hits = JSON.parse((await send('/search', { query: 'quotation tax' })).body);
    assert.equal(hits[0].provenance.kind, 'user-teaching');
    const response = await send('/build', { goal: 'quotation tax', files: { '/main.js': 'export function run(x){return x*1.1}' }, entry: '/main.js', exportName: 'run', tests: [{ input: 20, expected: 22 }], sourceIds: [hits[0].sourceId] });
    assert.equal(response.status, 200, response.body);
    const built = JSON.parse(response.body);
    assert.equal(built.ok, true, response.body);
    const result = await send('/run', { id: built.id, input: 40 });
    assert.equal(JSON.parse(result.body).output, 44);
    const shelf = JSON.parse((await http(port, '/api/learning')).body);
    assert.equal(shelf.components[0].id, built.id);
    assert.equal(shelf.codingAvailable, false);
  });
  await t.test('foreign Origin cannot read API GET', async () =>
    assert.equal((await http(port, '/api/files', 'GET', { Host: host, Origin: 'https://foreign.example' })).status, 403));
});
