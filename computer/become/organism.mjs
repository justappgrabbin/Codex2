// Genotype = tools. Phenotype = apps the swarm builds from those tools.
//
// Genotype: every function / class / component the become pipeline understood is
//   registered as a tool (file, export name, purpose, leading dimension, state).
//   A tool is 'expressible' when its file loads, 'needs-screen' when it needs a page,
//   'latent' when it is missing something (its needs are listed).
//   Calling tools in sequence records crossings in the owner's relational mesh
//   (pure-synthia EmergentChannels): a crossing used 3 times is promoted and the
//   channel itself becomes a new composite tool in the genotype.
// Phenotype: build(entry) expresses an app — it loads the entry's dependencies
//   first (depth-first import order), each piece moving genotype -> phenotype only
//   after it actually executes. A piece that fails stays in the genotype with its need.
import { EmergentChannels } from '../engines/unified-execution-spine/src/pure-synthia/mesh/channels.js';
import { linkModules, importsOf } from './module-runtime.mjs';

const textOf = f => typeof f.text === 'string' ? f.text : typeof f.content === 'string' ? f.content : '';
const nameOf = f => f.path || f.name;

export class Genotype {
  constructor({ files = [], packages = {}, screen = false } = {}) {
    this.files = new Map(files.filter(f => textOf(f)).map(f => [nameOf(f), textOf(f)]));
    this.packages = packages; this.screen = screen;
    this.channels = new EmergentChannels();
    this.tools = new Map(); this.modules = new Map(); this.history = []; this.last = null;
  }

  /** Register every understood symbol of a become-pipeline result as a tool. */
  fromPipeline(result) {
    for (const f of result.files) {
      const a = f.stages.analyze; if (!a?.symbols) continue;
      const state = f.outcome === 'native' || f.outcome === 'became' || f.outcome === 'morphed-backend' ? 'expressible'
        : f.outcome === 'live-frame' ? (this.screen ? 'expressible' : 'needs-screen') : 'latent';
      for (const name of a.symbols) this.tools.set(`${f.file}#${name}`, {
        id: `${f.file}#${name}`, file: f.file, name, purpose: a.purpose, dimension: a.dimensions?.leading ?? null,
        state, needs: f.stages.execute?.requirements ?? [], source: f.outcome === 'became' ? 'rebuilt' : 'original',
        rebuilt: f.outcome === 'became' ? f.stages.become.code : null,
      });
    }
    return this;
  }

  list(filter = {}) { return [...this.tools.values()].filter(t => !filter.state || t.state === filter.state); }

  async load(file, { rebuilt = null } = {}) {
    if (this.modules.has(file)) return this.modules.get(file);
    const files = new Map(this.files); let entry = file;
    if (rebuilt) { entry = file.replace(/\.\w+$/, '') + '.rebuilt.mjs'; files.set(entry, rebuilt); }
    const g = linkModules(entry, files, { packages: this.packages });
    if (g.missing.length || g.external.length) {
      const needs = [...g.missing.map(m => `file:${m.spec}`), ...g.external.map(p => `package:${p}`)];
      const e = new Error('needs ' + needs.join(', ')); e.needs = needs; throw e;
    }
    const mod = await import(/* @vite-ignore */ g.url);
    this.modules.set(file, mod); return mod;
  }

  /** Call a tool (or a promoted channel). Sequential calls record crossings. */
  async call(toolId, ...args) {
    if (toolId.startsWith('channel:')) {
      const [a, b] = toolId.slice(8).split('~');
      if (!this.channels.emergentCapability(a, b)) throw new Error(`${toolId} has not been promoted`);
      return this.call(b, await this.call(a, ...args));
    }
    const t = this.tools.get(toolId); if (!t) throw new Error(`no tool ${toolId}`);
    if (t.state === 'latent') throw Object.assign(new Error(`${toolId} is latent: needs ${t.needs.join(', ')}`), { needs: t.needs });
    const mod = await this.load(t.file, { rebuilt: t.rebuilt });
    const fn = mod[t.name] ?? (t.name === 'default' ? mod.default : undefined);
    const value = typeof fn === 'function' ? await fn(...args) : fn;
    if (this.last && this.last !== toolId) {
      const c = this.channels.recordCrossing(this.last, toolId);
      if (c.promoted && !this.tools.has(`channel:${c.a}~${c.b}`)) {
        const cap = this.channels.emergentCapability(c.a, c.b);
        this.tools.set(cap.id, { id: cap.id, file: null, name: cap.id, purpose: cap.description, dimension: 'Space', state: 'expressible', needs: [], source: 'emergent-channel', tools: cap.tools });
      }
    }
    this.last = toolId; this.history.push({ tool: toolId, at: this.history.length });
    return value;
  }
  endComposition() { this.last = null; }
}

export class Phenotype {
  constructor(genotype, { onExpress = null } = {}) { this.g = genotype; this.onExpress = onExpress; this.expressed = []; this.latent = []; }

  /** Dependencies first (depth-first over local imports), entry last. */
  order(entry) {
    const seen = new Set(), out = [];
    const visit = f => { if (seen.has(f)) return; seen.add(f); for (const d of importsOf(f, this.g.files)) visit(d); out.push(f); };
    visit(entry); return out;
  }

  /** Express an app: each piece moves genotype -> phenotype only after it executes. */
  async build(entry) {
    for (const file of this.order(entry)) {
      const tools = this.g.list().filter(t => t.file === file);
      const rebuilt = tools.find(t => t.rebuilt)?.rebuilt ?? null;
      try {
        const mod = await this.g.load(file, { rebuilt });
        const step = { file, exports: Object.keys(mod), tools: tools.map(t => t.id), source: rebuilt ? 'rebuilt' : 'original' };
        this.expressed.push(step); for (const t of tools) t.state = 'expressible';
        this.onExpress?.({ phase: 'expressed', ...step });
      } catch (e) {
        const step = { file, needs: e.needs ?? [String(e.message)] };
        this.latent.push(step); this.onExpress?.({ phase: 'latent', ...step });
      }
    }
    return { entry, built: this.latent.length === 0, expressed: this.expressed, latent: this.latent };
  }
}
export default { Genotype, Phenotype };
