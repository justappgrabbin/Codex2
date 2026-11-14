// Become pipeline — the owner's order, built only from their existing engines:
//   1 ingest            automata v0.5.1 normalizer (15 languages, binaries, containers, models)
//   2 five pieces       PrimitiveReducer + FiveFieldCompiler (v0.5.1)  + dimensional reading (below)
//   3 analyze           Morph MIR RelationshipMapper: behaviors, relationships, purpose
//   4 execute           UniversalExecutionBridge with the module runtime registered first
//   5 record + address  13-field ExecutionAddressResolver + ontological integrity address (v0.5.1)
//   6 morph the backend if it did not run: the bridge's own synthesis path (requirements ->
//                       Monte Carlo rule search -> AutoWriter -> retry) and its last-resort rebuild
//   7 become            Morph MIR semantic rebuild (JS reconstruction, verified) and, when the
//                       rebuild itself runs, that is what the swarm becomes
// Dimension key (owner, fixed): Who=Space, What=Evolution, Where=Being, When=Movement, Why=Design.
import { normalizeArtifact, PrimitiveReducer, FiveFieldCompiler, OntologicalAddressSigner } from './vendor/automata-v0.5.1/index.mjs';
import { UniversalExecutionBridge } from '../engines/unified-execution-spine/src/pure-synthia/integration/universal-execution-bridge.js';
import { ExecutionAddressResolver } from '../engines/unified-execution-spine/src/execution-address-resolver.mjs';
import { MorphMemoryEngine } from '../donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/UPGRADES/vendor/morph-mir-system/lib/morphMemoryEngine.js';
import { createModuleRuntime } from './module-runtime.mjs';
import { lowerSource } from './lowerer.mjs';
import { requirementOf, MODES } from './equivalence.mjs';

export const STAGES = Object.freeze(['ingest', 'five', 'analyze', 'swarm', 'execute', 'address', 'morph-backend', 'become']);
export const DIMENSION_KEY = Object.freeze({ Who: 'Space', What: 'Evolution', Where: 'Being', When: 'Movement', Why: 'Design' });

// Morph MIR behavior tags -> the dimension they belong to. PROVISIONAL working rule
// (what the behavior does): Movement = acts in time, Evolution = transforms,
// Being = holds matter/state, Design = gives form/decides, Space = connects.
export const BEHAVIOR_DIMENSION = Object.freeze({
  'asynchronous-work': 'Movement', 'event-flow': 'Movement', 'timers': 'Movement', 'animation': 'Movement', 'loop': 'Movement',
  'arithmetic-transform': 'Evolution', 'json-transform': 'Evolution', 'stochastic-search': 'Evolution', 'returns-value': 'Evolution', 'mutation': 'Evolution',
  'persistence': 'Being', 'memory': 'Being', 'file-io': 'Being', 'collection-state': 'Being', 'state': 'Being',
  'rendering': 'Design', 'validation': 'Design', 'conditional-logic': 'Design', 'styling': 'Design',
  'network-io': 'Space', 'graph-processing': 'Space', 'messaging': 'Space', 'routing': 'Space',
});

const nameOf = f => f.path || f.name;
const textOf = f => typeof f.text === 'string' ? f.text : typeof f.content === 'string' ? f.content : '';
const safe = v => { try { return JSON.parse(JSON.stringify(v, (k, x) => typeof x === 'function' ? undefined : x instanceof Map ? Object.fromEntries(x) : x)); } catch { return String(v); } };

// Tags Morph MIR attaches to almost every file carry little signal; count them lightly.
export const GENERIC_BEHAVIOR = Object.freeze({ 'returns-value': 0.1, 'arithmetic-transform': 0.2, 'conditional-logic': 0.2 });

export function dimensionsOf(behaviors = [], relationships = {}) {
  const w = { Movement: 0, Evolution: 0, Being: 0, Design: 0, Space: 0 };
  for (const b of behaviors) { const d = BEHAVIOR_DIMENSION[b]; if (d) w[d] += GENERIC_BEHAVIOR[b] ?? 1; }
  // connections count toward Space, but softly (capped) so they don't drown what the file itself does
  w.Space += Math.min(1, 0.1 * ((relationships.outgoing?.length || 0) + (relationships.incoming?.length || 0)));
  const ranked = Object.entries(w).sort((a, b) => b[1] - a[1]);
  return { weights: w, leading: ranked[0][1] ? ranked[0][0] : null, provisional: true };
}

export class BecomePipeline {
  constructor({ packages = {}, onStage = null, liveScreen = false } = {}) {
    this.liveScreen = liveScreen; // false in Node/workers; the page passes true
    this.runtime = createModuleRuntime({ packages });
    this.bridge = new UniversalExecutionBridge({ runtimeAdapters: [this.runtime] });
    this.backend = new UniversalExecutionBridge(); // no registered runtimes: its own synthesis path
    this.resolver = new ExecutionAddressResolver();
    this.mir = new MorphMemoryEngine();
    this.reducer = new PrimitiveReducer(); this.compiler = new FiveFieldCompiler(); this.signer = new OntologicalAddressSigner();
    this.onStage = onStage;
  }
  emit(file, stage, data) { this.onStage?.({ file, stage, data }); }

  /** files: [{path|name, text|content|bytes}] — one project. */
  async run(files, { execute = true, become = true } = {}) {
    const started = Date.now();
    const artifacts = files.map((f, i) => ({ id: `f${i}`, name: nameOf(f), originalName: nameOf(f), originalContent: textOf(f), content: textOf(f), bytes: f.bytes, metadata: { path: nameOf(f) } }));
    // 3 (project scale): relationships need every file, so map the project once.
    const code = artifacts.filter(a => /\.(m?[jt]sx?|cjs|py)$/i.test(a.name));
    const graph = this.mir.relationshipMapper.mapProject(code);
    const nodeOf = new Map(graph.nodes.map(n => [n.id, n]));
    const out = [];
    for (const a of artifacts) out.push(await this.runOne(a, { graph, nodeOf, artifacts, execute, become }));
    return { schema: 'synthia.become.v1', files: out, project: { files: artifacts.length, codeFiles: code.length, edges: graph.edges.length, ms: Date.now() - started },
      summary: summarize(out) };
  }

  async runOne(a, { graph, nodeOf, artifacts, execute, become }) {
    const rec = { file: a.name, stages: {} };
    // 1 ingest
    const normalized = await normalizeArtifact({ name: a.name, content: a.bytes ? undefined : a.content, bytes: a.bytes });
    rec.kind = normalized.kind; rec.stages.ingest = { kind: normalized.kind, bytes: normalized.bytes?.length ?? a.content.length }; this.emit(a.name, 'ingest', rec.stages.ingest);
    // 2 five pieces
    let fieldMap = null;
    try { const red = await this.reducer.reduce(normalized); fieldMap = this.compiler.compile(red);
      rec.stages.five = { fields: Object.fromEntries(Object.entries(fieldMap.fields || {}).map(([k, v]) => [k, v.length])), fingerprint: red.fingerprint ?? fieldMap.fingerprint ?? null };
    } catch (e) { rec.stages.five = { error: String(e.message) }; }
    this.emit(a.name, 'five', rec.stages.five);
    // 3 analyze
    const node = nodeOf.get(a.id);
    if (node) {
      const rel = graph.neighborhoods[a.id] || { incoming: [], outgoing: [], collaborators: [] };
      rec.stages.analyze = { language: node.language, purpose: node.purpose, behaviors: node.behaviors, symbols: (node.symbols || []).map(s => s.name).slice(0, 40),
        relationships: { incoming: rel.incoming.length, outgoing: rel.outgoing.length, collaborators: rel.collaborators.map(id => artifacts.find(x => x.id === id)?.name).filter(Boolean) },
        dimensions: dimensionsOf(node.behaviors, rel) };
    } else rec.stages.analyze = { note: 'not code; kept as data/markup/asset', dimensions: dimensionsOf([], {}) };
    this.emit(a.name, 'analyze', rec.stages.analyze);
    // 3b native swarm: which functions L lowers onto the ORIGINAL SWARM-OS kernel, which stay latent
    if (node && /\.(m?[jt]sx?|cjs)$/i.test(a.name)) {
      try { const low = lowerSource(a.content, a.name);
        rec.stages.swarm = { mode: MODES.SWARM, engine: 'SWARM-OS RecursivePrimitiveKernel (original)', native: low.formations.map(f => ({ name: f.name, units: f.steps.length })),
          latent: low.skipped.map(x => ({ name: x.name, requires: requirementOf(x.reason) })), total: low.total };
      } catch (e) { rec.stages.swarm = { mode: MODES.LATENT, error: String(e.message) }; }
      this.emit(a.name, 'swarm', rec.stages.swarm);
    }
    // 4 execute — REFERENCE execution (original code via the bridge). Never reported as swarm.
    const siblings = artifacts.filter(x => x !== a).map(x => ({ name: x.name, content: x.content }));
    let exec = null;
    // Code that needs a screen (DOM / React) runs in the live page frame, not headless.
    const needsScreen = /\b(document|window)\.|\bReactDOM\b|from ['"]react-dom|createRoot\(/.test(a.content) || /\.(tsx|jsx)$/i.test(a.name);
    rec.needsScreen = needsScreen;
    if (execute && node && needsScreen && this.liveScreen === false) { rec.stages.execute = { ok: false, path: 'deferred-to-live-frame', requirements: ['screen'] }; this.emit(a.name, 'execute', rec.stages.execute); }
    else if (execute && node) {
      exec = await this.bridge.execute({ name: a.name, content: a.content }, { files: siblings, analysis: rec.stages.analyze, behavioralContract: { purpose: node.purpose, behaviors: node.behaviors } });
      rec.stages.execute = { mode: MODES.REFERENCE, ok: !!exec.ok, path: exec.path, engine: exec.result?.engine, stdout: (exec.result?.stdout || []).slice(0, 20), requirements: exec.result?.requirements || exec.requirements?.required || [], error: exec.result?.stderr?.[0] || exec.firstError || null };
      this.emit(a.name, 'execute', rec.stages.execute);
    }
    // 5 record + address
    const decomposition = this.resolver.descend({ name: a.name, content: a.content });
    const resolved = this.resolver.resolve({ artifact: { name: a.name, content: a.content }, execution: exec ? safe({ ok: exec.ok, path: exec.path, kind: exec.kind }) : { ok: false, path: 'not-executed' }, decomposition });
    const onto = fieldMap ? await this.signer.sign({ fingerprint: rec.stages.five.fingerprint, fieldMap, execution: exec ? safe({ ok: exec.ok, path: exec.path, kind: rec.kind }) : {}, artifact: { name: a.name, kind: rec.kind } }) : null;
    rec.stages.address = { canonical: resolved.address, key: resolved.key, basis: resolved.derivation?.basis, ontological: onto?.id ?? null };
    this.emit(a.name, 'address', rec.stages.address);
    // 6 morph the backend — only when the module runtime could not run it
    if (exec && !exec.ok && rec.stages.execute?.path !== 'deferred-to-live-frame') {
      const back = await this.backend.execute({ name: a.name, content: a.content }, { analysis: rec.stages.analyze });
      rec.stages['morph-backend'] = { mode: MODES.REFERENCE, ok: !!back.ok, path: back.path, stdout: (back.result?.stdout || []).slice(0, 20), firstError: back.firstError || null };
      this.emit(a.name, 'morph-backend', rec.stages['morph-backend']);
      if (back.ok) rec.ran = 'morphed-backend';
    } else if (exec?.ok) rec.ran = /synthesis|fallback|learned/.test(exec.path) ? 'morphed-backend' : 'native';
    // 7 become — rebuild from understanding when it still has not run
    if (become && node && !rec.ran && rec.stages.execute?.path !== 'deferred-to-live-frame') {
      try {
        const artifact = await this.mir.analyzeArtifact({ ...a });
        const rb = await this.mir.semanticRebuildArtifact(artifact, [artifact], { graph });
        const res = rb?.regenerationResult || rb?.result || rb;
        const codeText = res.code || '';
        let runs = null;
        if (codeText) { const t = await this.bridge.execute({ name: a.name.replace(/\.\w+$/, '') + '.rebuilt.mjs', content: codeText }, { files: siblings }); runs = { ok: !!t.ok, path: t.path, stdout: (t.result?.stdout || []).slice(0, 10), requirements: t.result?.requirements || [] }; }
        rec.stages.become = { mode: MODES.REFERENCE, strategy: res.strategy, confidence: res.confidence, missing: res.missing || [], code: codeText.slice(0, 20000), runs };
        if (runs?.ok) rec.ran = 'became';
      } catch (e) { rec.stages.become = { error: String(e.message) }; }
      this.emit(a.name, 'become', rec.stages.become);
    }
    rec.outcome = rec.ran || (rec.stages.execute?.path === 'deferred-to-live-frame' ? 'live-frame' : node ? 'understood-only' : 'held-as-data');
    return rec;
  }
}

function summarize(files) {
  const count = k => files.filter(f => f.outcome === k).length;
  const lead = { Movement: 0, Evolution: 0, Being: 0, Design: 0, Space: 0 };
  for (const f of files) { const d = f.stages.analyze?.dimensions?.leading; if (d) lead[d]++; }
  let swarmFns = 0, latentFns = 0; for (const f of files) { swarmFns += f.stages.swarm?.native?.length || 0; latentFns += f.stages.swarm?.latent?.length || 0; }
  return { swarm: { nativeFunctions: swarmFns, latentFunctions: latentFns, engine: 'SWARM-OS RecursivePrimitiveKernel (original)' },
    reference: 'outcomes below are REFERENCE executions of the original code, used for comparison only',
    liveFrame: count('live-frame'), native: count('native'), morphedBackend: count('morphed-backend'), became: count('became'), understoodOnly: count('understood-only'), data: count('held-as-data'), leadingDimension: lead };
}
export default BecomePipeline;
