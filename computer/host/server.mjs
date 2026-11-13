import { createServer } from 'node:http';
import { readFile, stat, mkdir, readdir } from 'node:fs/promises';
import { join, resolve, extname, sep, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { JsonFilePersistence } from '../runtime/json-file-persistence.mjs';
import { ConversationExecution } from '../services/conversation-execution.mjs';
import { FileAdmission } from '../services/file-admission.mjs';
import { createLocalCoder } from '../services/local-coder.mjs';
import { LearningWorkspace } from '../services/learning-workspace.mjs';
import { readZipMembers } from './zip-members.mjs';
import { createHostShell } from '../services/host-shell.mjs';
import { findEntry, previewUrl, playProject } from '../services/project-runner.mjs';
import { createTridentMcp } from '../services/trident-mcp-glue.mjs';
import { mindsStatus, routeChat } from '../services/resident-minds.mjs';
import { GroveStore } from '../services/grove-store.mjs';
import { describePlatforms, detectPlatform } from '../services/platform-runtime.mjs';
import { PersonalVault } from '../donors/Back-up-/vendor/pure-synthia-v0.4.0/src/synthia/morph-engine/substrate/vault/PersonalVault.mjs';
import { FileVaultStore } from '../services/vault-file-store.mjs';
import { openActivityJournal } from '../services/activity-journal.mjs';
import { saveNamedWorkspace } from '../services/workspace-remember.mjs';

// The Computer ships with its real terminal backend on. Set
// LINUX_CONTAINER_ENABLED=false to keep both terminals read-only.
process.env.LINUX_CONTAINER_ENABLED ??= 'true';
import { ProjectResearch } from '../services/project-research.mjs';
import { ConstructionWorker } from '../services/construction-worker.mjs';
import { EncryptedFilePersistence, EncryptedEventEmitter, readStateKey } from '../runtime/encrypted-persistence.mjs';

const root = resolve(fileURLToPath(new URL('../shell/kimi-linux/dist/', import.meta.url)));
const dataDir = resolve(process.env.SYNTHIA_DATA_DIR ?? fileURLToPath(new URL('../runtime/data/local-computer/', import.meta.url)));
const port = Number(process.env.SYNTHIA_PORT ?? 8765);
const host = '127.0.0.1';
// WebView and the resident Node service share a loopback origin. Reject foreign
// Host/Origin and cross-site Fetch Metadata before any API or file operation.
// This is a browser/DNS-rebinding boundary, not authentication for other local apps.
const allowedAuthorities = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
const allowedOrigins = new Set([...allowedAuthorities].map(authority => `http://${authority}`));
function isLocalRequest(req) {
  const origin = req.headers.origin;
  const fetchSite = req.headers['sec-fetch-site'];
  return allowedAuthorities.has(req.headers.host)
    && (origin === undefined || allowedOrigins.has(origin))
    && (fetchSite === undefined || fetchSite === 'same-origin' || fetchSite === 'none');
}
await mkdir(dataDir, { recursive: true });
const filesRoot = join(dataDir, 'files');
const systemRoot = join(dataDir, 'system');
await mkdir(filesRoot, { recursive: true });
await mkdir(systemRoot, { recursive: true });
const keyPath = process.env.SYNTHIA_STATE_KEY_FILE;
const stateKey = keyPath ? await readStateKey(keyPath) : null;
if (!stateKey && ((await stat(join(dataDir, 'state.enc.json')).catch(() => null)) || (await stat(join(dataDir, 'events.enc.jsonl')).catch(() => null))))
  throw new Error('Encrypted data exists; provide its SYNTHIA_STATE_KEY_FILE. Refusing to create an empty plaintext replacement.');
if (stateKey && ((await stat(join(dataDir, 'state.json')).catch(() => null)) || (await stat(join(dataDir, 'events.jsonl')).catch(() => null))))
  throw new Error('Encryption opt-in requires a new data directory. Existing plaintext data is preserved; automatic migration is not implemented.');
const computer = await new ComputerRuntime({
  persistence: stateKey ? new EncryptedFilePersistence(join(dataDir, 'state.enc.json'), stateKey) : new JsonFilePersistence(join(dataDir, 'state.json')),
  eventLogPath: join(dataDir, stateKey ? 'events.enc.jsonl' : 'events.jsonl'),
  ...(stateKey ? { eventEmitterFactory: options => new EncryptedEventEmitter({ ...options, key: stateKey }) } : {}),
  hostRoot: filesRoot,
}).boot();
const conversation = new ConversationExecution(computer);
const vaultStore = new FileVaultStore(join(dataDir, 'codex2-vault.json'));
await vaultStore.ready;
const vault = new PersonalVault({ store: vaultStore });
const files = new FileAdmission(computer, conversation.execution, { vault });
const journal = openActivityJournal(computer);
const SETTINGS_KEYS = ['ubuntuos_settings', 'synthia_computer_settings', 'synthia_computer_theme'];
const generative = computer.generative;
const shell = createHostShell({ userRoot: join(filesRoot, 'home/user'), systemRoot });
const mcp = createTridentMcp({ vfs: computer.vfs, shell, computer });
const grove = new GroveStore({ registryPath: fileURLToPath(new URL('../grove/registry.json', import.meta.url)), installRoot: filesRoot, files: computer.vfs });
const learning = new LearningWorkspace(computer, { coder: process.env.SYNTHIA_CODER_URL ? createLocalCoder({ url: process.env.SYNTHIA_CODER_URL, model: process.env.SYNTHIA_CODER_MODEL }) : null });
conversation.learning = learning;
const research = await new ProjectResearch(computer).boot();
const worker = await new ConstructionWorker(computer).boot();
computer.services.register('project-research', { provider: research, contract: 'inspect' });
computer.services.register('bounded-construction', { provider: worker, contract: 'propose/approve/run' });
await computer.contextual.updateEnvironment({ 'runtime:node': true });
let journalPending = Promise.resolve();
computer.bus.on('*', event => {
  if (!/^(research:|worker:|contextual:|generative:|project:)/.test(event.type)) return;
  journalPending = journalPending.then(async () => {
    const history = computer.state.get('computer.activity', []);
    await computer.state.set('computer.activity', [...history, event], { source: 'activity-journal' });
  }).catch(error => console.error('Activity checkpoint failed:', error.message));
});

// Import names are allocated before the first asynchronous write. This prevents
// an upload with the same filename from replacing an earlier user's original.
const activeImportPaths = new Set();
function reserveImportPath(originalName) {
  const dot = originalName.lastIndexOf('.');
  const stem = dot > 0 ? originalName.slice(0, dot) : originalName;
  const extension = dot > 0 ? originalName.slice(dot) : '';
  for (let copy = 1; copy <= 10000; copy++) {
    const name = copy === 1 ? originalName : `${stem} (${copy})${extension}`;
    const path = `/home/user/Imports/${name}`;
    const members = name.toLowerCase().endsWith('.zip')
      ? `/home/user/Imports/${name.slice(0, -4)}/` : null;
    if (activeImportPaths.has(path) || computer.vfs.read(path)) continue;
    if (members && (activeImportPaths.has(members) || computer.vfs.list(members).length)) continue;
    activeImportPaths.add(path);
    if (members) activeImportPaths.add(members);
    return { name, path, members, release() {
      activeImportPaths.delete(path);
      if (members) activeImportPaths.delete(members);
    } };
  }
  throw new RangeError('Import name collision limit reached.');
}

// Execution requests without an existing address are new admissions, not editor saves.
// Reserve a unique Documents path before any asynchronous write so concurrent
// requests cannot replace an earlier source under the same user-facing name.
const activeExecutionPaths = new Set();
function reserveExecutionPath(originalName) {
  const safeName = String(originalName ?? 'artifact').split(/[\\/]/).at(-1).replace(/[^\w. -]/g, '_');
  if (!safeName || safeName === '.' || safeName === '..') throw new TypeError('Invalid execution artifact name.');
  const dot = safeName.lastIndexOf('.');
  const stem = dot > 0 ? safeName.slice(0, dot) : safeName;
  const extension = dot > 0 ? safeName.slice(dot) : '';
  for (let copy = 1; copy <= 10000; copy++) {
    const name = copy === 1 ? safeName : `${stem} (${copy})${extension}`;
    const path = `/home/user/Documents/${name}`;
    if (activeExecutionPaths.has(path) || computer.vfs.read(path)) continue;
    activeExecutionPaths.add(path);
    return { path, release() { activeExecutionPaths.delete(path); } };
  }
  throw new RangeError('Execution artifact name collision limit reached.');
}

async function ingestUpload({ name, base64 }) {
  if (typeof name !== 'string' || !name || typeof base64 !== 'string' || base64.length > 8000000) throw new TypeError('A named file of at most 6 MB is required.');
  const safeName = name.split(/[\\/]/).at(-1).replace(/[^\w. -]/g, '_');
  if (!safeName || safeName === '.' || safeName === '..') throw new TypeError('Invalid file name.');
  const bytes = Buffer.from(base64, 'base64');
  const asText = (buffer) => {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer).includes('\0') ? null : new TextDecoder().decode(buffer); }
    catch { return null; }
  };
  const save = async (path, buffer, source) => {
    const text = asText(buffer);
    const record = await files.write(path, text === null ? buffer.toString('base64') : text, source, text === null ? 'base64' : 'utf8');
    return { path: record.path, address: record.meta.address, addressKey: record.meta.addressKey, digest: record.meta.digest, encoding: record.meta.encoding, size: buffer.length, dna: record.meta.dna };
  };
  const reservation = reserveImportPath(safeName);
  try {
    const archive = await save(reservation.path, bytes, 'file-import');
    if (!reservation.members) {
      await files.mirrorImported([archive]);
      return { items: [archive] };
    }
    const items = [archive];
    for (const { name: entry, content } of readZipMembers(bytes)) {
      items.push(await save(`${reservation.members}${entry}`, content, `archive:${archive.addressKey}`));
    }
    await files.mirrorImported(items);
    return { items };
  } finally {
    reservation.release();
  }
}

// Play: list folders under the user's home that can be run. This mirrors what
// the IDE explorer shows, but reads the real host-backed workspace so the
// hidden Linux backend and the preview server see the same files.
async function listProjects(userRoot, maxDepth = 4) {
  const found = [];
  async function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries = [];
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = join(dir, entry.name);
      if (!entry.isDirectory()) continue;
      const runnable = await findEntry(full);
      if (runnable) {
        found.push({
          name: entry.name,
          path: '/' + relative(userRoot, full).split(sep).join('/'),
          entry: runnable.file,
          mode: runnable.preview ? 'preview' : 'run',
          url: runnable.preview ? previewUrl(userRoot, full) : null,
        });
        continue;
      }
      await walk(full, depth + 1);
    }
  }
  await walk(userRoot, 0);
  return found;
}

// Preview: serve a static project folder from the user workspace only.
async function servePreview(res, userRoot, requested) {
  let cleaned;
  try {
    cleaned = decodeURIComponent(requested).replace(/^\/+/, '');
  } catch {
    return json(res, 400, { error: 'Invalid preview path.' });
  }
  const base = resolve(userRoot);
  const target = resolve(base, cleaned || '.');
  if (target !== base && !target.startsWith(base + sep)) return json(res, 403, { error: 'Invalid preview path.' });
  let info = await stat(target).catch(() => null);
  let file = target;
  if (info?.isDirectory()) file = join(target, 'index.html');
  const fileInfo = await stat(file).catch(() => null);
  if (!fileInfo?.isFile()) return json(res, 404, { error: 'Preview file not found.' });
  const bytes = await readFile(file);
  const types = {
    ...mime,
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.wasm': 'application/wasm',
    '.woff': 'font/woff', '.woff2': 'font/woff2',
    '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
  };
  res.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
  res.end(bytes);
}

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const json = (res, status, value) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
};
async function body(req) {
  let text = '';
  for await (const part of req) {
    text += part;
    if (text.length > 8500000) throw new RangeError('Request is too large.');
  }
  return JSON.parse(text);
}

const server = createServer(async (req, res) => {
  try {
    if (!isLocalRequest(req)) return json(res, 403, { error: 'Computer requests must use its local origin.' });
    const url = new URL(req.url ?? '/', `http://${host}:${port}`);
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'GET' && url.pathname === '/api/status') {
        const swarm = await computer.automataGateway.snapshot();
        return json(res, 200, { ready: true, computer: 'SynthAI Computer', swarmProcesses: swarm.processCount, files: computer.vfs.list('/').length });
      }
      if (req.method === 'GET' && url.pathname === '/api/continuity') return json(res, 200, {
        memory: await computer.automataGateway.memoryStatus(),
        storage: { encryptedCheckpointAndJournal: Boolean(stateKey), keyRecovery: 'Owner-managed key file; Android Keystore integration pending', localHttpAuthenticated: false },
        projects: computer.projects.list(), research: research.snapshot(), capabilities: computer.contextual.list(),
        construction: worker.snapshot(), activity: computer.state.get('computer.activity', []), runner: await worker.runner.available(),
      });
      if (req.method === 'GET' && url.pathname === '/api/research/search') return json(res, 200, research.search(url.searchParams.get('q') ?? ''));
      if (req.method === 'POST' && url.pathname === '/api/projects/import') return json(res, 200, await research.import(await body(req)));
      if (req.method === 'POST' && url.pathname === '/api/projects/from-import') {
        const { name, prefix } = await body(req);
        if (typeof prefix !== 'string' || !prefix.startsWith('/home/user/Imports/') || !prefix.endsWith('/')) throw new TypeError('Choose an admitted import folder prefix');
        const entries = computer.vfs.list(prefix).filter(file => file.meta?.encoding !== 'base64');
        return json(res, 200, await research.import({ name, source: prefix, files: entries.map(file => ({ path: file.path.slice(prefix.length), content: file.content, originalPath: file.path })) }));
      }
      if (req.method === 'POST' && url.pathname === '/api/projects/inspect') {
        const { projectId } = await body(req); return json(res, 200, await research.enqueue(() => research.inspect(projectId)));
      }
      if (req.method === 'POST' && url.pathname === '/api/construction/propose') return json(res, 200, await worker.propose(await body(req)));
      if (req.method === 'POST' && url.pathname === '/api/construction/approve') {
        const request = await body(req); return json(res, 200, await worker.approve(request.id, request));
      }
      if (req.method === 'POST' && url.pathname === '/api/construction/run') return json(res, 200, await computer.processes.execute('bounded-construction', await body(req)));
      if (req.method === 'GET' && url.pathname === '/api/artifact') {
        const artifact = worker.artifact(url.searchParams.get('id'));
        if (!artifact) return json(res, 404, { error: 'Verified artifact not found' });
        res.setHeader('Content-Disposition', `attachment; filename="${artifact.name}"`);
        return json(res, 200, artifact);
      }
      if (req.method === 'GET' && url.pathname === '/api/generative/status') return json(res, 200, await generative.status());
      if (req.method === 'GET' && url.pathname === '/api/generative/history') return json(res, 200, generative.history());
      if (req.method === 'POST' && url.pathname === '/api/generative/structure') return json(res, 200, await generative.inspect(await body(req)));
      if (req.method === 'GET' && url.pathname === '/api/learning') {
        const state = learning.snapshot();
        return json(res, 200, { codingAvailable: Boolean(learning.coder), sources: state.sources.map(({ content, ...record }) => record), components: state.components.map(({ files, ...record }) => record), attempts: state.attempts, interactions: state.interactions });
      }
      if (req.method === 'POST' && url.pathname === '/api/learning/index') return json(res, 200, await learning.indexFiles());
      if (req.method === 'POST' && url.pathname === '/api/learning/search') return json(res, 200, learning.search((await body(req)).query));
      if (req.method === 'POST' && url.pathname === '/api/learning/teach') return json(res, 200, await learning.learn(await body(req)));
      if (req.method === 'POST' && url.pathname === '/api/learning/github') return json(res, 200, await learning.importGitHub(await body(req)));
      if (req.method === 'POST' && url.pathname === '/api/learning/build') return json(res, 200, await learning.build(await body(req)));
      if (req.method === 'POST' && url.pathname === '/api/learning/run') return json(res, 200, await learning.run(await body(req)));
      if (req.method === 'GET' && url.pathname === '/api/history') return json(res, 200, conversation.history());
      if (req.method === 'POST' && url.pathname === '/api/chat') return json(res, 200, await conversation.talk((await body(req)).text));
      if (req.method === 'GET' && url.pathname === '/api/filesystem') return json(res, 200, computer.state.get('computer.desktop.filesystem', null));
      if (req.method === 'PUT' && url.pathname === '/api/filesystem') {
        const filesystem = await body(req);
        return json(res, 200, await files.admitDesktop(filesystem));
      }
      if (req.method === 'GET' && url.pathname === '/api/resolve-file') {
        const matches = files.resolve(url.searchParams.get('address') ?? '');
        return json(res, 200, matches.map(({ path, meta }) => ({ path, address: meta.address, digest: meta.digest, dna: meta.dna })));
      }
      if (req.method === 'GET' && url.pathname === '/api/files') return json(res, 200, computer.vfs.list('/').map(({ content, ...record }) => record));
      if (req.method === 'GET' && url.pathname === '/api/activate-file') {
        return json(res, 200, await files.activate(url.searchParams.get('address') ?? '', url.searchParams.get('path') ?? ''));
      }
      if (req.method === 'POST' && url.pathname === '/api/ingest') return json(res, 200, await ingestUpload(await body(req)));
      if (req.method === 'PUT' && url.pathname === '/api/files') {
        const { path, content } = await body(req);
        return json(res, 200, await files.write(path, content, 'kimi-linux-file'));
      }
      if (req.method === 'POST' && url.pathname === '/api/execute') {
        const request = await body(req);
        let admitted;
        if (request.addressKey) {
          const matches = files.resolve(request.addressKey);
          admitted = request.path ? matches.find((entry) => entry.path === request.path) : matches[0];
        } else {
          const reservation = reserveExecutionPath(request.name);
          try { admitted = await files.write(reservation.path, request.content, 'execution-intake'); }
          finally { reservation.release(); }
        }
        if (!admitted) throw new TypeError('No artifact found at that state-space address.');
        const artifact = await files.activate(admitted.meta.addressKey, admitted.path);
        if (artifact.meta.encoding === 'base64') throw new TypeError('Binary artifacts cannot be executed as text.');
        return json(res, 200, await conversation.executeArtifact({ name: artifact.path.split('/').at(-1), type: request.type, content: artifact.content }));
      }
      if (req.method === 'GET' && url.pathname === '/api/container/status') return json(res, 200, await shell.status('user'));
      if (req.method === 'POST' && url.pathname === '/api/container/exec') {
        const request = await body(req);
        const result = await shell.runUser(request.command, { cwd: request.cwd, approve: request.approve === true });
        return json(res, 200, { success: result.ok, ...result });
      }
      if (req.method === 'GET' && url.pathname === '/api/system-container/status') return json(res, 200, await shell.status('system'));
      if (req.method === 'POST' && url.pathname === '/api/system-container/exec') {
        const request = await body(req);
        const result = await shell.runSystem(request.command, { cwd: request.cwd, approve: request.approve === true });
        return json(res, 200, { success: result.ok, ...result });
      }
      // One permission-checked terminal endpoint for both profiles.
      if (req.method === 'GET' && url.pathname === '/api/terminal/status') {
        const profile = url.searchParams.get('profile') === 'system' ? 'system' : 'user';
        return json(res, 200, await shell.status(profile));
      }
      if (req.method === 'POST' && url.pathname === '/api/terminal/exec') {
        const request = await body(req);
        const profile = request.profile === 'system' ? 'system' : 'user';
        const result = await shell.run({ command: request.command, cwd: request.cwd, profile, approve: request.approve === true });
        return json(res, 200, { success: result.ok, ...result });
      }
      // Play: list runnable project folders and run the selected one.
      if (req.method === 'GET' && url.pathname === '/api/projects') {
        return json(res, 200, { projects: await listProjects(join(filesRoot, 'home/user')) });
      }
      if (req.method === 'POST' && url.pathname === '/api/projects/play') {
        const request = await body(req);
        return json(res, 200, await playProject({
          root: join(filesRoot, 'home/user'),
          projectPath: request.path,
          shell,
          approve: request.approve === true,
        }));
      }
      if (req.method === 'GET' && url.pathname === '/api/minds/status') return json(res, 200, mindsStatus());
      if (req.method === 'POST' && url.pathname === '/api/minds/chat') return json(res, 200, await routeChat({ text: (await body(req)).text, mcp }));
      if (req.method === 'GET' && url.pathname === '/api/mcp/tools') return json(res, 200, { tools: mcp.listTools() });
      if (req.method === 'POST' && url.pathname === '/api/mcp/call') {
        const request = await body(req);
        return json(res, 200, await mcp.callTool(request.name, request.arguments ?? request.args ?? {}));
      }
      if (req.method === 'GET' && url.pathname === '/api/grove') return json(res, 200, await grove.list());
      if (req.method === 'POST' && url.pathname === '/api/grove/install') {
        const request = await body(req);
        return json(res, 200, await grove.install(request.id ?? request.packageId));
      }
      if (req.method === 'GET' && url.pathname === '/api/platform') return json(res, 200, { current: detectPlatform(), adapters: describePlatforms() });
      if (req.method === 'GET' && url.pathname === '/api/settings') return json(res, 200, computer.state.get('computer.settings.local', {}));
      if (req.method === 'PUT' && url.pathname === '/api/settings') {
        const incoming = await body(req);
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw new TypeError('Settings must be an object.');
        const next = { ...(computer.state.get('computer.settings.local', {})) };
        for (const key of SETTINGS_KEYS) {
          if (typeof incoming[key] !== 'string') continue;
          if (incoming[key].length > 200000) throw new RangeError('Setting is too large.');
          next[key] = incoming[key];
        }
        await computer.state.set('computer.settings.local', next, { source: 'settings-remember' });
        return json(res, 200, next);
      }
      if (req.method === 'GET' && url.pathname === '/api/journal') return json(res, 200, { records: journal.list(), routes: journal.rank() });
      if (req.method === 'POST' && url.pathname === '/api/journal') return json(res, 200, await journal.write(await body(req)));
      if (req.method === 'GET' && url.pathname === '/api/workspace') return json(res, 200, computer.projects.list());
      if (req.method === 'POST' && url.pathname === '/api/workspace') return json(res, 200, await saveNamedWorkspace(computer, await body(req)));
      if (req.method === 'GET' && url.pathname === '/api/vault') {
        const items = await vault.list();
        return json(res, 200, items.map(({ bytes, ...item }) => item));
      }
      return json(res, 404, { error: 'Unknown computer operation.' });

    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed.' });
    // Play previews: static project folders from the user workspace only.
    if (url.pathname.startsWith('/preview/')) {
      return servePreview(res, join(filesRoot, 'home/user'), url.pathname.slice('/preview'.length));
    }
    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const moduleRoot = resolve(fileURLToPath(new URL('../modules/r22-linux-guest/', import.meta.url)));
    const monacoRoot = resolve(fileURLToPath(new URL('../shell/kimi-linux/public/monaco/', import.meta.url)));
    let path;
    let allowedRoot = root;
    if (requested.startsWith('/modules/r22-linux-guest/')) {
      path = resolve(moduleRoot, '.' + requested.slice('/modules/r22-linux-guest'.length));
      allowedRoot = moduleRoot;
    } else if (requested.startsWith('/monaco/')) {
      path = resolve(monacoRoot, '.' + requested.slice('/monaco'.length));
      allowedRoot = monacoRoot;
    } else {
      path = resolve(root, '.' + requested);
    }
    if (path !== allowedRoot && !path.startsWith(allowedRoot + sep)) return json(res, 403, { error: 'Invalid path.' });
    const target = (await stat(path).catch(() => null))?.isFile() ? path : join(root, 'index.html');
    const bytes = await readFile(target);
    res.writeHead(200, { 'Content-Type': mime[extname(target)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    const code = error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError ? 400 : 500;
    json(res, code, { error: String(error?.message ?? error) });
  }
});
server.listen(port, host, () => console.log(`Synthia Computer ready at http://${host}:${port}`));
