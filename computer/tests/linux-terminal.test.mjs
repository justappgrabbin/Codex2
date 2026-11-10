import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, chmod, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { createHostShell } from '../services/host-shell.mjs';
import { buildProotArgv, runContainerCommand, runWorkspaceFile } from '../runtime/linux-container.mjs';
import { reviewTerminalCommand } from '../services/terminal-policy.mjs';

async function roots() {
  const dir = await mkdtemp(join(tmpdir(), 'linux-terminal-'));
  const userRoot = join(dir, 'user');
  const systemRoot = join(dir, 'system');
  await mkdir(userRoot, { recursive: true });
  await mkdir(systemRoot, { recursive: true });
  return { dir, userRoot, systemRoot };
}

test('user and system terminals run real commands inside separate roots', async () => {
  const { dir, userRoot, systemRoot } = await roots();
  try {
    const shell = createHostShell({ userRoot, systemRoot });
    const user = await shell.runUser('echo user-4 && pwd');
    const system = await shell.runSystem('echo system-ok && pwd');
    assert.equal(user.ok, true, user.stderr);
    assert.match(user.stdout, /user-4/);
    assert.match(user.cwd, /\/user$/);
    assert.equal(user.backend, 'host');
    assert.equal(user.engine, 'host-shell');
    assert.equal(system.ok, true, system.stderr);
    assert.match(system.stdout, /system-ok/);
    assert.match(system.cwd, /\/system$/);
    assert.notEqual(user.cwd, system.cwd);
    const status = shell.status('user');
    assert.equal(status.enabled, true);
    assert.equal(status.engine, 'host-shell');
    assert.equal(status.backend, 'host');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('a denied network command is not spawned, and approval lets it run', async () => {
  const { dir, userRoot, systemRoot } = await roots();
  const hits = [];
  const listener = createServer((req, res) => {
    hits.push(req.url);
    res.end('seen');
  });
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  try {
    const shell = createHostShell({ userRoot, systemRoot });
    const denied = await shell.runUser(`curl -s http://127.0.0.1:${port}/user`);
    assert.equal(denied.denied, true);
    assert.equal(denied.code, 126);
    assert.match(denied.stderr, /network command requires approval: curl/);
    assert.deepEqual(hits, []);
    const install = reviewTerminalCommand('sudo apt-get install curl', { profile: 'user' });
    assert.equal(install.allow, false);
    assert.equal(reviewTerminalCommand('echo still-ok', { profile: 'user' }).allow, true);
    assert.equal(reviewTerminalCommand('curl http://127.0.0.1/', { profile: 'system' }).allow, true);
    const approved = await shell.runUser(`curl -s http://127.0.0.1:${port}/approved`, { approved: true });
    if (approved.code === 127) {
      assert.doesNotMatch(approved.stderr, /requires approval/);
    } else {
      assert.equal(approved.ok, true, approved.stderr);
      assert.deepEqual(hits, ['/approved']);
    }
    await shell.runSystem('echo system-not-denied');
  } finally {
    await new Promise((resolve) => listener.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});

test('cwd outside the profile root is rejected', async () => {
  const { dir, userRoot, systemRoot } = await roots();
  try {
    const shell = createHostShell({ userRoot, systemRoot });
    await assert.rejects(() => shell.runUser('echo no', { cwd: systemRoot }), /workspace/);
    await assert.rejects(() => shell.runUser('echo no', { cwd: '../system' }), /workspace/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Play runs a project file with her workspace-file rules and previews index.html', async () => {
  const { dir, userRoot, systemRoot } = await roots();
  try {
    const shell = createHostShell({ userRoot, systemRoot });
    const played = await shell.play({
      path: '/home/user/demo/main.js',
      content: 'console.log(2+2);\n',
    });
    assert.equal(played.mode, 'run', JSON.stringify(played));
    assert.equal(played.ok, true, played.stderr);
    assert.match(played.stdout, /\b4\b/);
    assert.equal(played.entry, 'demo/main.js');
    await writeFile(join(userRoot, 'demo/hi.py'), 'print("py-ok")\n');
    const pyRun = await runWorkspaceFile('demo/hi.py', { enabled: true, workdir: userRoot });
    assert.equal(pyRun.code, 0, pyRun.stderr);
    assert.match(pyRun.stdout, /py-ok/);
    const preview = await shell.play({
      path: 'site/index.html',
      content: '<!doctype html><p>site-ok</p>',
    });
    assert.equal(preview.mode, 'preview');
    assert.equal(preview.previewUrl, '/preview/site/index.html');
    await assert.rejects(() => shell.play({ path: '../etc/passwd' }), /Workspace path rejected/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('PRoot argv matches LocalLinuxRuntime and a stand-in binary is actually spawned', async () => {
  const { dir, userRoot } = await roots();
  const rootfs = join(dir, 'rootfs');
  await mkdir(rootfs);
  const proot = join(dir, 'proot.mjs');
  const script = `#!${process.execPath}
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2);
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'argv.json'), JSON.stringify(args));
const command = args[args.indexOf('-lc') + 1];
const child = spawn('/bin/bash', ['-lc', command], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
`;
  await writeFile(proot, script);
  await chmod(proot, 0o755);
  try {
    const argv = buildProotArgv({
      proot: '/opt/libproot.so',
      rootfs: '/data/rootfs',
      workspace: '/data/workspace',
      tmp: '/data/tmp',
      guestCwd: '/workspace',
      command: 'echo hi',
    });
    assert.deepEqual(argv, [
      '/opt/libproot.so', '-0', '-r', '/data/rootfs',
      '-b', '/data/workspace:/workspace',
      '-b', '/data/tmp:/tmp',
      '-b', '/dev',
      '-w', '/workspace',
      '/bin/sh', '-lc', 'echo hi',
    ]);
    const result = await runContainerCommand('echo from-proot', undefined, {
      enabled: true,
      workdir: userRoot,
      proot,
      rootfs,
      tmp: join(dir, 'tmp'),
    });
    assert.equal(result.backend, 'proot');
    assert.equal(result.engine, 'embedded-proot-linux');
    assert.match(result.stdout, /from-proot/);
    const recorded = JSON.parse(await readFile(join(dir, 'argv.json'), 'utf8'));
    assert.equal(recorded[0], '-0');
    assert.deepEqual(recorded.slice(0, 4), ['-0', '-r', rootfs, '-b']);
    assert.ok(recorded.includes(`${userRoot}:/workspace`));
    assert.ok(recorded.includes('/bin/sh'));
    assert.ok(recorded.includes('echo from-proot'));
    await assert.rejects(
      () => runContainerCommand('echo no', undefined, { enabled: true, workdir: userRoot, proot: join(dir, 'missing-proot'), rootfs }),
      /embedded-proot-not-extracted/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
