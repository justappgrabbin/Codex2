import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTerminalPolicy } from '../services/terminal-policy.mjs';
import { createHostShell } from '../services/host-shell.mjs';
import { commandForWorkspaceFile, playProject, findEntry, previewUrl } from '../services/project-runner.mjs';

async function workspace(t) {
  const root = await mkdtemp(join(tmpdir(), 'synthia-terminal-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('terminal policy keeps profiles apart and blocks hard-deny commands', async (t) => {
  const userRoot = await workspace(t);
  const systemRoot = await workspace(t);
  const policy = createTerminalPolicy({ userRoot, systemRoot, allowNetwork: false, allowInstall: false });

  assert.equal(policy.evaluate({ profile: 'user', command: 'echo hi' }).allowed, true);
  assert.equal(policy.evaluate({ profile: 'user', command: 'sudo id' }).denied, true);
  assert.equal(policy.evaluate({ profile: 'user', command: 'reboot' }).denied, true);
  assert.equal(policy.evaluate({ profile: 'user', command: 'rm -rf /' }).denied, true);
  assert.equal(policy.evaluate({ profile: 'system', command: 'sudo id' }).allowed, true);

  const network = policy.evaluate({ profile: 'user', command: 'curl https://example.com' });
  assert.equal(network.allowed, false);
  assert.equal(network.requiresApproval, true);
  assert.equal(policy.evaluate({ profile: 'user', command: 'curl https://example.com', approve: true }).allowed, true);
  assert.equal(policy.evaluate({ profile: 'user', command: 'reboot', approve: true }).denied, true);
});

test('host shell runs real commands in the user and system roots', async (t) => {
  const userRoot = await workspace(t);
  const systemRoot = await workspace(t);
  const previous = process.env.LINUX_CONTAINER_ENABLED;
  process.env.LINUX_CONTAINER_ENABLED = 'true';
  t.after(() => {
    if (previous === undefined) delete process.env.LINUX_CONTAINER_ENABLED;
    else process.env.LINUX_CONTAINER_ENABLED = previous;
  });

  const shell = createHostShell({ userRoot, systemRoot });
  const user = await shell.runUser('echo hello && pwd');
  assert.equal(user.ok, true, user.stderr);
  assert.match(user.stdout, /hello/);
  assert.match(user.stdout, new RegExp(userRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const system = await shell.runSystem('pwd');
  assert.equal(system.ok, true, system.stderr);
  assert.match(system.stdout, new RegExp(systemRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const blocked = await shell.runUser('sudo id');
  assert.equal(blocked.ok, false);
  assert.equal(blocked.denied, true);
});

test('project runner uses her runWorkspaceFile rules', () => {
  assert.equal(commandForWorkspaceFile('run.sh'), "/bin/sh 'run.sh'");
  assert.match(commandForWorkspaceFile('main.py'), /python3 'main\.py'/);
  assert.match(commandForWorkspaceFile('main.js'), /node 'main\.js'/);
  assert.match(commandForWorkspaceFile('notes.md'), /cat 'notes\.md'/);
  assert.match(commandForWorkspaceFile('tool'), /chmod 700 'tool'/);
});

test('Play runs a selected project and detects a static preview', async (t) => {
  const userRoot = await workspace(t);
  const previous = process.env.LINUX_CONTAINER_ENABLED;
  process.env.LINUX_CONTAINER_ENABLED = 'true';
  t.after(() => {
    if (previous === undefined) delete process.env.LINUX_CONTAINER_ENABLED;
    else process.env.LINUX_CONTAINER_ENABLED = previous;
  });

  const scripted = join(userRoot, 'scripts');
  await mkdir(scripted, { recursive: true });
  await writeFile(join(scripted, 'main.js'), "console.log('played through node');\n");

  const web = join(userRoot, 'web');
  await mkdir(web, { recursive: true });
  await writeFile(join(web, 'index.html'), '<h1>hello</h1>\n');

  const shell = createHostShell({ userRoot, systemRoot: await workspace(t) });
  const run = await playProject({ root: userRoot, projectPath: 'scripts', shell });
  assert.equal(run.ok, true, run.stderr);
  assert.equal(run.mode, 'run');
  assert.match(run.stdout, /played through node/);

  const staticProject = await playProject({ root: userRoot, projectPath: 'web', shell });
  assert.equal(staticProject.ok, true);
  assert.equal(staticProject.mode, 'preview');
  assert.equal(staticProject.entry, 'index.html');
  assert.equal(staticProject.url, previewUrl(userRoot, web));

  assert.equal((await findEntry(scripted)).file, 'main.js');
});
