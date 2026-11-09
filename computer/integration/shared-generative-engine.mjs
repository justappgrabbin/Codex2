import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const DEFAULT_ROOT = fileURLToPath(new URL('../../sources/Generative-address-system/Synthia-Generative-Address-Morphology-Integrated-v0.2.1-RUNNABLE/', import.meta.url));
const attached = new WeakMap();

/**
 * Extend the Computer's LIVE legacy engine with the pinned Generative donor's
 * context hooks. No donor files, tool IDs, owned state, mesh, or engine are replaced.
 * Source prototype methods supply the implementation; this is not a second brain.
 */
export async function attachGenerativeAssembly(engine, { sourceRoot = DEFAULT_ROOT } = {}) {
  if (!engine?.mesh?.automata || !engine.toolsById || !engine.runtime)
    throw new TypeError('A live Computer semantic engine is required');
  const root = resolve(sourceRoot);
  const existing = attached.get(engine);
  if (existing) {
    if (existing.sourceRoot !== root) throw new Error('Engine already has a different Generative source authority');
    return existing.pending;
  }
  const pending = attach(engine, root);
  attached.set(engine, { sourceRoot: root, pending });
  try { return await pending; }
  catch (error) { attached.delete(engine); throw error; }
}

async function attach(engine, sourceRoot) {
  const root = resolve(sourceRoot);
  const load = relative => import(pathToFileURL(resolve(root, relative)).href);
  const prefix = 'authorities/execution-spine/src/pure-synthia/';
  const [{ Automaton }, { SynthiaAutomata }, { KleinContextRuntime }, { KleinContactLoop }, { SynthiaGenerativeAssembly }, { AutomataMesh }] = await Promise.all([
    load(prefix + 'automata/automaton.js'), load(prefix + 'engine/synthia.js'),
    load(prefix + 'engine/klein-context-runtime.js'), load(prefix + 'integration/language-contact-models.js'),
    load('src/index-generative.mjs'), load(prefix + 'mesh/mesh.js'),
  ]);
  const legacy = [...engine.mesh.automata.values()].filter(tool =>
    typeof tool.provideContext !== 'function' || typeof tool.observeRuns !== 'function');
  for (const tool of legacy) {
    if (typeof tool.run !== 'function' || typeof tool._recordStep !== 'function')
      throw new TypeError(`Unsupported legacy automaton interface: ${tool.id}`);
  }
  const changes = [];
  const define = (object, name, value) => {
    const previous = Object.getOwnPropertyDescriptor(object, name);
    changes.push(() => previous ? Object.defineProperty(object, name, previous) : delete object[name]);
    Object.defineProperty(object, name, { value, writable: true, configurable: true });
  };
  // The Generative constructor mounts source tools and ontology triples. Retain
  // the exact pre-attach maps so a failed mount leaves no half-installed organ.
  const originalTools = [...engine.tools];
  const maps = [engine.toolsById, engine.mesh.automata, engine.tripleStore._byKey];
  const savedMaps = maps.map(map => new Map(map));
  const projections = structuredClone(engine.mesh.projections);
  const sharedProvider = Object.getOwnPropertyDescriptor(engine, 'sharedStateProvider');
  const savedTransport = engine.mesh.transportConnections ? new Map(engine.mesh.transportConnections) : null;
  try {
    for (const tool of legacy) {
      define(tool, 'runObservers', new Set());
      define(tool, 'contextProviders', new Set());
      define(tool, 'provideContext', Automaton.prototype.provideContext);
      define(tool, 'observeRuns', Automaton.prototype.observeRuns);
      const originalRun = tool.run;
      define(tool, 'run', function(input, context = {}) {
        const probe = context.klein === true || context.kleinJoint === true;
        for (const provider of this.contextProviders) context = { ...context, ...provider(input, context) };
        const notify = result => {
          if (!probe) for (const observer of this.runObservers) observer(input, result, context);
          return result;
        };
        const failed = error => {
          if (!probe) for (const observer of this.runObservers)
            observer(input, { accepted: false, error: String(error?.message ?? error) }, context);
          throw error;
        };
        try {
          const result = originalRun.call(this, input, context);
          return result && typeof result.then === 'function' ? result.then(notify, failed) : notify(result);
        } catch (error) { return failed(error); }
      });
    }
    if (!engine.mesh.transportConnections) define(engine.mesh, 'transportConnections', new Map());
    if (!engine.mesh.connectTransport) define(engine.mesh, 'connectTransport', AutomataMesh.prototype.connectTransport);
    if (!engine.mesh.transportNeighbors) define(engine.mesh, 'transportNeighbors', AutomataMesh.prototype.transportNeighbors);
    if (!engine.klein) define(engine, 'klein', new KleinContextRuntime({ engine }));
    if (!engine.contactLoop) define(engine, 'contactLoop', new KleinContactLoop({ engine }));
    if (!engine.invoke) define(engine, 'invoke', SynthiaAutomata.prototype.invoke);
    if (!engine.contact) define(engine, 'contact', SynthiaAutomata.prototype.contact);
    const assembly = new SynthiaGenerativeAssembly({ synthiaOptions: { engine }, morphology: { weightsFile: null } });
    return Object.freeze({ assembly, engine, sourceRoot: root,
      compatibility: Object.freeze({ schema: 'synthia.shared-generative-engine.v1',
        sameEngine: assembly.engine === engine, adaptedTools: legacy.map(t => t.id),
        donorPolicy: 'prototype extension on live instances; original source files unchanged',
        addressPolicy: 'canonical validation unchanged; no semantic assignment inferred' }) });
  } catch (error) {
    engine.tools.splice(0, engine.tools.length, ...originalTools);
    maps.forEach((map, index) => { map.clear(); for (const [key, value] of savedMaps[index]) map.set(key, value); });
    engine.mesh.projections.clear();
    for (const [key, value] of projections) engine.mesh.projections.set(key, value);
    if (savedTransport) { engine.mesh.transportConnections.clear(); for (const [key, value] of savedTransport) engine.mesh.transportConnections.set(key, value); }
    if (sharedProvider) Object.defineProperty(engine, 'sharedStateProvider', sharedProvider);
    else delete engine.sharedStateProvider;
    for (const undo of changes.reverse()) undo();
    throw error;
  }
}
