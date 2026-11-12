import { createHash, randomUUID } from 'node:crypto';
import { getQuickJS } from 'quickjs-emscripten';

const digest = text => createHash('sha256').update(text).digest('hex');
const words = text => String(text).toLowerCase().match(/[a-z0-9_$]{2,}/g) ?? [];
const key = 'computer.learning.workspace';
const evidencePath = path => typeof path === 'string' && path.startsWith('/') && path.length <= 2000 && !/[\x00-\x1f]/.test(path) && !path.split('/').includes('..');
const validPath = path => typeof path === 'string' && /^\/[a-zA-Z0-9_./-]+$/.test(path) && !path.split('/').includes('..');

/** Local evidence and checked components. Retrieval proposes; execution verifies. */
export class LearningWorkspace {
  constructor(computer, { fetcher = globalThis.fetch, coder = null } = {}) {
    this.computer = computer;
    this.fetcher = fetcher;
    this.coder = coder;
    this.queue = Promise.resolve();
    if (computer.services && !computer.services.has('learning-workspace')) computer.services.register('learning-workspace', { provider: this, contract: 'build' });
    for (const component of this.snapshot().components) this.mount(component);
  }
  mount(component) {
    const id = `learned-component:${component.id}`;
    if (this.computer.capabilities && !this.computer.capabilityRegistry?.has(id)) {
      this.computer.capabilities.register(id, { providers: ['learning-workspace'], goal: component.goal, componentId: component.id });
    }
  }
  snapshot() { return this.computer.state.get(key, { sources: [], components: [], attempts: [], interactions: [] }); }
  mutate(fn) {
    const run = this.queue.then(async () => {
      const state = this.snapshot();
      const result = await fn(state);
      await this.computer.state.set(key, state, { source: 'learning-workspace' });
      return result;
    });
    this.queue = run.catch(() => {});
    return run;
  }
  async ingest({ path, content, provenance = { kind: 'local' } }) {
    if (!evidencePath(path) || typeof content !== 'string' || content.length > 500000) throw new TypeError('Provide a safe absolute path and at most 500,000 text characters.');
    const record = { id: digest(JSON.stringify([path, content, provenance])), path, content, digest: digest(content), provenance, at: new Date().toISOString() };
    return this.mutate(state => {
      state.sources = state.sources.filter(source => source.id !== record.id);
      state.sources.push(record);
      return record;
    });
  }
  async indexFiles() {
    let count = 0;
    for (const file of this.computer.vfs.list('/home/')) {
      if (file.meta?.encoding === 'base64' || typeof file.content !== 'string' || file.content.length > 500000) continue;
      await this.ingest({ path: file.path, content: file.content, provenance: { kind: 'import', digest: file.meta?.digest } });
      count++;
    }
    return { indexed: count };
  }
  search(query, limit = 8) {
    if (typeof query !== 'string' || !query.trim() || query.length > 12000) throw new TypeError('A search query of 1..12,000 characters is required.');
    const terms = [...new Set(words(query))];
    const chunks = [];
    const sources = this.snapshot().sources;
    // Keep historical revisions for provenance; search the latest version of each path/repository.
    const latest = new Map(sources.map(s => [JSON.stringify([s.provenance.repository, s.path]), s]));
    for (const source of latest.values()) {
      const lines = source.content.split('\n');
      for (let i = 0; i < lines.length; i += 32) {
        const text = lines.slice(i, i + 40).join('\n');
        const tokens = new Set(words(source.path + ' ' + (source.provenance.goal ?? '') + ' ' + text));
        const score = terms.reduce((sum, term) => sum + (tokens.has(term) ? 1 : 0), 0);
        if (score) chunks.push({ sourceId: source.id, path: source.path, digest: source.digest, provenance: source.provenance, startLine: i + 1, endLine: Math.min(i + 40, lines.length), text, score });
      }
    }
    return chunks.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, Math.max(1, Math.min(20, Number(limit) || 8)));
  }
  async learn({ text, correctionOf = null }) {
    if (typeof text !== 'string' || !text.trim() || text.length > 12000) throw new TypeError('Teaching text must contain 1..12,000 characters.');
    const id = randomUUID();
    await this.ingest({ path: `/conversations/${id}.md`, content: text, provenance: { kind: 'user-teaching', correctionOf } });
    return this.mutate(state => {
      const interaction = { id, text, correctionOf, at: new Date().toISOString(), status: 'user-stated' };
      state.interactions.push(interaction);
      return interaction;
    });
  }
  async importGitHub({ repository, ref = 'HEAD', paths }) {
    if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository) || typeof ref !== 'string' || ref.length > 200 || !Array.isArray(paths) || !paths.length || paths.length > 30) throw new TypeError('Provide owner/repository, a revision, and 1..30 file paths.');
    if (paths.some(path => !validPath('/' + path) || path.startsWith('/'))) throw new TypeError('Unsafe repository path.');
    const get = async route => {
      const response = await this.fetcher(`https://api.github.com/repos/${repository}/${route}`, { headers: { Accept: 'application/vnd.github+json' }, redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`GitHub returned ${response.status}. Public repository access is required; offline imports remain available.`);
      const reader = response.body.getReader();
      const chunks = []; let size = 0;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 1000000) throw new RangeError('GitHub response exceeds 1 MB.');
          chunks.push(Buffer.from(value));
        }
      } finally { await reader.cancel(); }
      return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
    };
    const commit = await get(`commits/${encodeURIComponent(ref)}`);
    if (!/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error('GitHub did not return a commit SHA.');
    const records = [];
    for (const path of [...new Set(paths)]) {
      const data = await get(`contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${commit.sha}`);
      if (data.type !== 'file' || data.encoding !== 'base64' || data.size > 500000) throw new TypeError(`Unsupported or oversized GitHub file: ${path}`);
      const content = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(data.content, 'base64'));
      records.push({ path: `/github/${repository}/${path}`, content, provenance: { kind: 'github', repository, commit: commit.sha, path, url: `https://github.com/${repository}/blob/${commit.sha}/${path}` } });
    }
    for (const record of records) await this.ingest(record);
    return { repository, commit: commit.sha, files: records.length };
  }
  async evaluate(files, entry, exportName, input) {
    if (!files || typeof files !== 'object' || Array.isArray(files) || Object.keys(files).length > 30 || !validPath(entry) || !/^[A-Za-z_$][\w$]*$/.test(exportName)) throw new TypeError('Provide up to 30 JavaScript modules, entry path, and exported function name.');
    for (const [path, source] of Object.entries(files)) if (!validPath(path) || typeof source !== 'string' || source.length > 100000) throw new TypeError('Invalid module path or source.');
    if (!Object.hasOwn(files, entry)) throw new TypeError('Entry module is missing.');
    const quickJS = await getQuickJS();
    const runtime = quickJS.newRuntime();
    runtime.setMemoryLimit(16 * 1024 * 1024);
    runtime.setMaxStackSize(256 * 1024);
    const deadline = Date.now() + 500;
    runtime.setInterruptHandler(() => Date.now() > deadline);
    runtime.setModuleLoader(name => {
      if (!Object.hasOwn(files, name)) throw new Error(`Dependency is not included: ${name}`);
      return files[name];
    }, (base, name) => {
      if (!name.startsWith('.') && !name.startsWith('/')) throw new Error('Only bundled module imports are supported.');
      const normalized = new URL(name, `file://${base}`).pathname;
      if (!validPath(normalized)) throw new Error('Invalid module import.');
      return normalized;
    });
    const context = runtime.newContext();
    try {
      const script = `import { ${exportName} as run } from ${JSON.stringify(entry)}; const value = run(${JSON.stringify(input) ?? 'null'}); if(value && typeof value.then === 'function') throw new Error('Async results are not supported.'); globalThis.__result = JSON.stringify(value);`;
      const result = context.evalCode(script, '/__synthia_runner.mjs', { type: 'module' });
      if (result.error) {
        const error = context.dump(result.error); result.error.dispose();
        throw new Error(error.message ?? String(error));
      }
      result.value.dispose();
      const value = context.getProp(context.global, '__result');
      try {
        const encoded = context.dump(value);
        if (typeof encoded !== 'string') throw new Error('Function must return a synchronous JSON value.');
        const output = JSON.parse(encoded);
        return output;
      } finally { value.dispose(); }
    } finally { context.dispose(); runtime.dispose(); }
  }
  async build({ goal, files, entry, exportName, tests, sourceIds = [], repairBudget = 2, previousFailure = null }) {
    if (typeof goal !== 'string' || !goal.trim() || goal.length > 12000 || !Array.isArray(tests) || !tests.length || tests.length > 30) throw new TypeError('A goal and 1..30 input/expected tests are required.');
    await this.indexFiles();
    const evidence = this.search(goal);
    const generated = !files && Boolean(this.coder);
    if (generated) {
      ({ files, entry, exportName } = await this.coder(structuredClone({ goal, evidence, tests, previousFailure })));
      sourceIds = [...new Set([...sourceIds, ...evidence.map(hit => hit.sourceId)])];
    }
    if (!files) throw new TypeError('Supply candidate modules or configure a coding adapter. Retrieval alone cannot write a new implementation.');
    const sourceSet = new Set(this.snapshot().sources.map(s => s.id));
    if (!Array.isArray(sourceIds) || sourceIds.some(id => !sourceSet.has(id))) throw new TypeError('Every source reference must exist locally.');
    const receipt = { id: randomUUID(), goal, at: new Date().toISOString(), sourceIds, checks: [], ok: false };
    try {
      for (const test of tests) {
        if (!test || !Object.hasOwn(test, 'expected')) throw new TypeError('Each check needs an expected output.');
        const output = await this.evaluate(files, entry, exportName, test.input);
        // Canonical comparison treats object key order as irrelevant.
        const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
        const passed = JSON.stringify(canonical(output)) === JSON.stringify(canonical(test.expected));
        receipt.checks.push({ input: test.input, expected: test.expected, output, passed });
      }
      receipt.ok = receipt.checks.every(check => check.passed);
    } catch (error) { receipt.error = error.message; }
    await this.mutate(state => {
      state.attempts.push(receipt);
      if (receipt.ok) {
        state.components.push({ ...receipt, files, entry, exportName, revision: digest(JSON.stringify(files)) });
        for (const [path, content] of Object.entries(files)) {
          state.sources.push({ id: digest(receipt.id + path), path: `/components/${receipt.id}${path}`, content,
            digest: digest(content), at: receipt.at, provenance: { kind: 'checked-component', componentId: receipt.id, goal, sourceIds } });
        }
      }
    });
    if (receipt.ok) this.mount(receipt);
    if (generated && !receipt.ok && Number.isInteger(repairBudget) && repairBudget > 0) {
      return this.build({ goal, tests, sourceIds, repairBudget: Math.min(2, repairBudget) - 1, previousFailure: receipt });
    }
    return receipt;
  }
  async run({ id, input }) {
    const component = this.snapshot().components.find(c => c.id === id);
    if (!component) throw new TypeError('Verified component not found.');
    return { id, output: await this.evaluate(component.files, component.entry, component.exportName, input) };
  }
}
