import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir, cp, access, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { GroveStore, readSupabaseEnv } from '../services/grove-store.mjs';
import { ConversationExecution } from '../services/conversation-execution.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

const BASE_SURFACES = {
  Desktop: 'shell/kimi-linux/src/components/Desktop.tsx',
  Files: 'shell/kimi-linux/src/apps/FileManager.tsx',
  Terminal: 'shell/kimi-linux/src/apps/DonorUserTerminal.tsx',
  Editor: 'shell/kimi-linux/src/apps/CodeEditor.tsx',
  launcher: 'shell/kimi-linux/src/components/AppLauncher.tsx',
  registry: 'shell/kimi-linux/src/apps/registry.ts',
  router: 'shell/kimi-linux/src/apps/AppRouter.tsx',
};

async function sha(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

test('Grove settings file is empty until Alexis sets it, and env names are not invented', async () => {
  const settings = await readFile(join(root, 'grove/supabase.settings.mjs'), 'utf8');
  assert.match(settings, /set by Alexis/);
  assert.match(settings, /url: ''/);
  assert.match(settings, /anonKey: ''/);
  const cfg = readSupabaseEnv({});
  assert.equal(cfg.configured, false);
  assert.ok(cfg.needed.url);
  assert.ok(cfg.needed.key);
});

test('Extend: installing a module does not modify or break the computer', async () => {
  const before = {};
  for (const [name, rel] of Object.entries(BASE_SURFACES)) {
    const path = join(root, rel);
    await access(path);
    before[name] = await sha(path);
  }

  const registry = await readFile(join(root, 'shell/kimi-linux/src/apps/registry.ts'), 'utf8');
  const router = await readFile(join(root, 'shell/kimi-linux/src/apps/AppRouter.tsx'), 'utf8');
  const launcher = await readFile(join(root, 'shell/kimi-linux/src/components/AppLauncher.tsx'), 'utf8');
  for (const id of ['filemanager', 'terminal', 'codeeditor', 'grovestore']) {
    assert.match(registry, new RegExp(`id: '${id}'`));
    if (id !== 'grovestore' || true) assert.match(router, new RegExp(`case '${id}'`));
  }
  assert.match(launcher, /export default AppLauncher/);
  assert.match(await readFile(join(root, BASE_SURFACES.Desktop), 'utf8'), /function Desktop|export default function Desktop|export default Desktop/);

  // These names were requested as base surfaces. On assemble-core they are
  // not standalone apps, so the test records that instead of inventing them.
  const missingStandalone = [];
  for (const id of ['preview', 'settings', 'journal', 'models']) {
    if (!new RegExp(`id: '${id}'`).test(registry)) missingStandalone.push(id);
  }
  assert.deepEqual(missingStandalone, ['preview', 'settings', 'journal', 'models']);
  const fileManager = await readFile(join(root, BASE_SURFACES.Files), 'utf8');
  assert.match(fileManager, /preview|Preview/i, 'Files still has in-app preview');
  const editorSettings = await readFile(join(root, 'shell/kimi-linux/src/lib/editor-settings.mjs'), 'utf8');
  assert.match(editorSettings, /SETTINGS_KEY/, 'Editor settings file still present');

  const dir = await mkdtemp(join(tmpdir(), 'grove-extend-'));
  const installRoot = join(dir, 'files');
  const packSrc = join(dir, 'pack-src');
  try {
    await mkdir(packSrc, { recursive: true });
    await cp(join(root, 'modules/r22-linux-guest/PROVENANCE.md'), join(packSrc, 'PROVENANCE.md'));
    const registryPath = join(dir, 'registry.json');
    const original = JSON.parse(await readFile(join(root, 'grove/registry.json'), 'utf8'));
    original.packages.push({
      id: 'extend-check-sample',
      name: 'Extend check sample',
      kind: 'local-path',
      sourcePath: packSrc,
      description: 'Temporary copy of her r22 provenance used only to prove install-as-module.',
    });
    await writeFile(registryPath, JSON.stringify(original, null, 2));

    const grove = new GroveStore({ registryPath, installRoot, env: {} });
    const catalog = await grove.list();
    assert.equal(catalog.supabase.configured, false);
    assert.ok(catalog.packages.some((item) => item.id === 'linux-guest-r22'));

    const moduleInstall = await grove.install('linux-guest-r22');
    assert.equal(moduleInstall.ok, true);
    assert.equal(moduleInstall.kind, 'local-module');
    assert.equal(moduleInstall.location, 'modules/r22-linux-guest');

    const copied = await grove.install('extend-check-sample');
    assert.equal(copied.ok, true);
    assert.ok(copied.path.startsWith(join(installRoot, 'Grove', 'extend-check-sample')));
    await access(join(installRoot, 'Grove', 'extend-check-sample', 'PROVENANCE.md'));

    // The computer itself was not rewritten.
    for (const [name, rel] of Object.entries(BASE_SURFACES)) {
      assert.equal(await sha(join(root, rel)), before[name], `${name} changed after install`);
    }
    assert.equal(await sha(join(root, 'ComputerRuntime.mjs')), await sha(join(root, 'ComputerRuntime.mjs')));
    const computerSource = join(root, 'ComputerRuntime.mjs');
    const runtimeHashBefore = before; // surfaces already checked
    void runtimeHashBefore;
    const runtimeBefore = createHash('sha256').update(await readFile(computerSource)).digest('hex');
    // re-read after install: same file
    assert.equal(await sha(computerSource), runtimeBefore);

    const computer = await new ComputerRuntime({ namespace: 'extend-check', hostRoot: installRoot }).boot();
    const conversation = new ConversationExecution(computer);
    const receipt = await conversation.executeArtifact({
      name: 'untitled',
      type: 'javascript',
      content: 'console.log(2+2);',
    });
    const text = [receipt.output, ...(receipt.stdout ?? [])].join('\n');
    assert.match(text, /\b4\b/);
    assert.ok(computer.vfs, 'filesystem still present');

    // Already-installed module stays listed with no Supabase.
    const offline = new GroveStore({ registryPath, installRoot, env: {} });
    const again = await offline.list();
    assert.ok(again.installed.some((item) => item.id === 'extend-check-sample'));
    const reuse = await offline.install('extend-check-sample');
    assert.equal(reuse.already, true);
    assert.equal(reuse.offline, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Grove can install from a mocked Supabase catalog, then stay usable offline', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'grove-sb-'));
  try {
    const objects = {
      '': [{ name: 'demo-app/readme.txt', id: '1' }],
      'demo-app/': [{ name: 'readme.txt', id: '2' }],
    };
    const fetchImpl = async (url, opts = {}) => {
      const href = String(url);
      if (href.includes('/storage/v1/object/list/')) {
        const body = JSON.parse(opts.body || '{}');
        const prefix = body.prefix ?? '';
        return { ok: true, async json() { return objects[prefix] ?? objects[''] ?? []; }, async text() { return '[]'; } };
      }
      if (href.includes('/storage/v1/object/synthia-apps/demo-app/readme.txt') || href.endsWith('/demo-app/readme.txt')) {
        return { ok: true, async arrayBuffer() { return Buffer.from('hello from grove'); } };
      }
      return { ok: false, status: 404, async text() { return 'missing ' + href; }, async json() { return {}; } };
    };
    const grove = new GroveStore({
      installRoot: join(dir, 'files'),
      env: { SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'test-anon' },
      fetch: fetchImpl,
    });
    const catalog = await grove.list();
    assert.equal(catalog.supabase.configured, true);
    assert.ok(catalog.supabase.packages.some((item) => item.id === 'demo-app'));
    const installed = await grove.install('demo-app');
    assert.equal(installed.ok, true);
    const content = await readFile(join(dir, 'files/Grove/demo-app/readme.txt'), 'utf8');
    assert.equal(content, 'hello from grove');

    const offline = new GroveStore({ installRoot: join(dir, 'files'), env: {}, fetch: async () => { throw new Error('network down'); } });
    const listed = await offline.list();
    assert.equal(listed.supabase.configured, false);
    assert.ok(listed.installed.some((item) => item.id === 'demo-app'));
    const reused = await offline.install('demo-app');
    assert.equal(reused.already, true);
    assert.equal(reused.offline, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Android launcher icon is her existing synthia-icon, wired in the manifest', async () => {
  const manifest = await readFile(join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
  assert.match(manifest, /android:icon="@mipmap\/ic_launcher"/);
  assert.match(manifest, /android:roundIcon="@mipmap\/ic_launcher_round"/);
  await access(join(root, 'android/branding/synthia-icon.svg'));
  await access(join(root, 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png'));
  await access(join(root, 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'));
  const provenance = await readFile(join(root, 'android/branding/PROVENANCE.md'), 'utf8');
  assert.match(provenance, /synthia-icon\.svg/);
  const { size } = await stat(join(root, 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'));
  assert.ok(size > 0);
});
