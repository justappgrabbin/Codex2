import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:net';
import { request } from 'node:http';
import { spawn } from 'node:child_process';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { ConversationExecution } from '../services/conversation-execution.mjs';
import { createHostShell } from '../services/host-shell.mjs';
import { createTridentMcp } from '../services/trident-mcp-glue.mjs';
import { describePlatforms, detectPlatform } from '../services/platform-runtime.mjs';
import { GroveStore } from '../services/grove-store.mjs';
import { fileURLToPath } from 'node:url';
import { javascriptArtifactName } from '../services/execute-output.mjs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function freePort() {
  const server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  await new Promise((r) => server.close(r));
  return port;
}

function http(port, path, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: '127.0.0.1', port, path, method,
      headers: { 'Content-Type': 'application/json', Host: `127.0.0.1:${port}` },
    }, (res) => {
      const chunks = [];
      res.on('data', (b) => chunks.push(b));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test('console.log(2+2) execution output includes 4', async () => {
  assert.equal(javascriptArtifactName('untitled', 'javascript'), 'untitled.js');
  const computer = await new ComputerRuntime({ namespace: 'assemble-exec' }).boot();
  const conversation = new ConversationExecution(computer);
  const receipt = await conversation.executeArtifact({
    name: 'untitled',
    type: 'javascript',
    content: 'console.log(2+2);',
  });
  const text = [receipt.output, ...(receipt.stdout ?? [])].join('\n');
  assert.match(text, /\b4\b/, `expected 4 in stdout, got ${JSON.stringify(receipt.stdout)} ${JSON.stringify(receipt.result).slice(0, 400)}`);
});

test('host-backed filesystem writes a real file that survives a second runtime', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'assemble-vfs-'));
  try {
    const first = await new ComputerRuntime({ namespace: 'assemble-vfs', hostRoot: dir }).boot();
    const record = await first.vfs.write('/home/user/Documents/note.txt', 'hello-assemble', { type: 'text' });
    const onDisk = await readFile(join(dir, 'home/user/Documents/note.txt'), 'utf8');
    assert.equal(onDisk, 'hello-assemble');
    const second = await new ComputerRuntime({ namespace: 'assemble-vfs-2', hostRoot: dir }).boot();
    const recalled = second.vfs.read('/home/user/Documents/note.txt');
    assert.equal(recalled?.content, 'hello-assemble');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('user and system terminals are separate and both execute real commands', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'assemble-shell-'));
  try {
    const userRoot = join(dir, 'user');
    const systemRoot = join(dir, 'system');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(userRoot, { recursive: true });
    await mkdir(systemRoot, { recursive: true });
    const shell = createHostShell({ userRoot, systemRoot });
    const user = await shell.runUser('echo 4 && pwd');
    const system = await shell.runSystem('uname -s && pwd');
    assert.equal(user.ok, true, user.stderr);
    assert.match(user.stdout, /\b4\b/);
    assert.match(user.cwd, /\/user$/);
    assert.equal(system.ok, true, system.stderr);
    assert.match(system.stdout, /Linux/);
    assert.match(system.cwd, /\/system$/);
    assert.notEqual(user.cwd, system.cwd);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Trident MCP glue lists tools and calls filesystem plus terminal', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'assemble-mcp-'));
  try {
    const computer = await new ComputerRuntime({ namespace: 'assemble-mcp', hostRoot: dir }).boot();
    const shell = createHostShell({ userRoot: join(dir, 'home/user'), systemRoot: join(dir, 'system') });
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(dir, 'home/user'), { recursive: true });
    await mkdir(join(dir, 'system'), { recursive: true });
    const mcp = createTridentMcp({ vfs: computer.vfs, shell, computer });
    const names = mcp.listTools().map((t) => t.name);
    assert.ok(names.includes('filesystem_list'));
    assert.ok(names.includes('terminal_run'));
    const written = await mcp.callTool('filesystem_write', { path: '/home/user/Documents/mcp.txt', content: 'via-mcp' });
    assert.equal(written.ok, true);
    const read = await mcp.callTool('filesystem_read', { path: '/home/user/Documents/mcp.txt' });
    assert.equal(read.content, 'via-mcp');
    const term = await mcp.callTool('terminal_run', { command: 'echo mcp-ok' });
    assert.equal(term.ok, true, term.stderr);
    assert.match(term.stdout, /mcp-ok/);
    const listed = await mcp.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    assert.ok(listed.result.tools.length >= 4);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('platform index points at her donors and only claims Linux verified here', () => {
  assert.equal(detectPlatform(), 'linux');
  const adapters = describePlatforms();
  const linux = adapters.find((a) => a.id === 'linux');
  const windows = adapters.find((a) => a.id === 'win32');
  assert.equal(linux.verifiedOnThisBox, true);
  assert.match(linux.donor, /synthctl/);
  assert.equal(windows.status, 'missing');
  assert.equal(windows.verifiedOnThisBox, false);
});

test('Grove hook lists the local registry including her r22 module', async () => {
  const grove = new GroveStore({});
  const catalog = await grove.list();
  assert.ok(catalog.builtin.some((item) => item.id === 'terminal'));
  assert.ok(catalog.builtin.some((item) => item.id === 'codeeditor'));
  assert.ok(!catalog.builtin.some((item) => item.id === 'selfhelpton'), 'Self-Helpton stays out of the Grove Store');
  assert.ok(catalog.packages.some((item) => item.id === 'linux-guest-r22'));
});

test('Monaco UMD bundle and her donor editor/terminal/grove files are present', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const files = [
    'shell/kimi-linux/public/monaco/0.52.2/editor.main.umd.js',
    'shell/kimi-linux/public/monaco/0.52.2/editor.main.css',
    'donors/copied/guagan-monaco/DevEnvironment.jsx',
    'donors/copied/synthai2-container/linuxContainerService.ts',
    'donors/copied/grove-store/GroveStore.tsx',
    'donors/copied/terminals/Terminal.tsx',
    'donors/copied/synthia-server-mcp/trident-mcp-server.ts',
    'donors/copied/mrnn-mcp-client/mrnn-mcp-client.ts',
    'donors/copied/self-helpton-foundry/index.html',
    'shell/kimi-linux/public/apps/self-helpton-foundry/index.html',
    'modules/r22-linux-guest/PROVENANCE.md',
  ];
  for (const rel of files) await access(join(root, rel));
});

test('live computer HTTP: execute 4, two shells, mcp, platform', { timeout: 90000 }, async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'assemble-http-'));
  const port = await freePort();
  const child = spawn(process.execPath, ['host/server.mjs'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, SYNTHIA_PORT: String(port), SYNTHIA_DATA_DIR: dir, LINUX_CONTAINER_ENABLED: 'true' },
    stdio: 'ignore',
  });
  t.after(async () => {
    if (child.exitCode === null) {
      const done = new Promise((r) => child.once('exit', r));
      child.kill();
      await done;
    }
    await rm(dir, { recursive: true, force: true });
  });
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await http(port, '/api/status');
      if (res.status === 200) { ready = true; break; }
    } catch { /* still booting */ }
    await wait(250);
  }
  assert.equal(ready, true, 'server did not become ready');

  const executed = await http(port, '/api/execute', 'POST', { name: 'untitled', type: 'javascript', content: 'console.log(2+2);' });
  assert.equal(executed.status, 200, executed.body);
  const receipt = JSON.parse(executed.body);
  const text = [receipt.output, ...(receipt.stdout ?? [])].join('\n');
  assert.match(text, /\b4\b/, executed.body.slice(0, 800));

  const user = JSON.parse((await http(port, '/api/container/exec', 'POST', { command: 'echo user-ok' })).body);
  const system = JSON.parse((await http(port, '/api/system-container/exec', 'POST', { command: 'uname -s' })).body);
  assert.match(user.stdout ?? '', /user-ok/);
  assert.match(system.stdout ?? '', /Linux/);
  assert.notEqual(user.cwd, system.cwd);

  const tools = JSON.parse((await http(port, '/api/mcp/tools')).body);
  assert.ok(tools.tools.some((t) => t.name === 'filesystem_list'));
  const term = JSON.parse((await http(port, '/api/mcp/call', 'POST', { name: 'terminal_run', arguments: { command: 'echo mcp-http' } })).body);
  assert.match(term.stdout ?? '', /mcp-http/);

  const platform = JSON.parse((await http(port, '/api/platform')).body);
  assert.equal(platform.current, 'linux');
});
