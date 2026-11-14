import { RelationalMesh } from '../mesh/relational-mesh.mjs';
import {
  CENTERS as SOURCE_CENTERS,
  CENTER_NAMES,
  channelPartners,
} from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/merged/centers-channels.js';
import {
  centerSlug,
} from './sovereign-state-space-runtime.mjs';
import { safe } from '../util.mjs';

// Integration roles only; they do not replace or reinterpret the canonical
// gate-to-center data carried by the supplied state-space package.
const CENTER_DIMENSION = Object.freeze({
  Head: 'Movement',
  Ajna: 'Design',
  Throat: 'Space',
  G: 'Being',
  Heart: 'Being',
  Solar: 'Evolution',
  Spleen: 'Design',
  Sacral: 'Movement',
  Root: 'Evolution',
});

function meshId(center) {
  return `center:${centerSlug(center)}`;
}

function firstGate(value, fallback = 1) {
  const candidates = [
    value?.gate,
    value?.address?.gate,
    value?.canonicalAddress?.gate,
    value?.state?.ben,
    value?.output?.gate,
    value?.output?.address?.gate,
    value?.result?.gate,
  ];
  const gate = candidates.map(Number).find((entry) => Number.isInteger(entry) && entry >= 1 && entry <= 64);
  return gate ?? fallback;
}

function runnable(id, capabilities, run, address = null) {
  return { id, capabilities, address, run };
}

/**
 * Nine real local meshes. Each center has a context-consuming field plus the
 * Kimi automata and package-module instruments placed there. Center-to-center
 * information follows canonical channel partners and carries all five level
 * projections with it.
 */
export class NineCenterBody {
  constructor({ runtime, resolver, federation } = {}) {
    if (!runtime?.catalog) throw new TypeError('NineCenterBody requires SovereignStateSpaceRuntime');
    if (!resolver?.projectFiveLevels) throw new TypeError('NineCenterBody requires the five-level resolver');
    if (!federation?.transfer) throw new TypeError('NineCenterBody requires MeshFederation');
    this.runtime = runtime;
    this.centerGates = runtime.centerGates;
    this.resolver = resolver;
    this.federation = federation;
    this.meshes = new Map();
    this.memory = new Map(CENTER_NAMES.map((center) => [center, []]));
    this.activations = [];
    this.emergentTools = new Map();
    this.emergenceHistory = [];
    this.packageCatalog = runtime.catalog();
  }

  createMeshes() {
    if (this.meshes.size) return this.meshes;
    for (const center of CENTER_NAMES) {
      const mesh = new RelationalMesh({
        id: meshId(center),
        dimension: CENTER_DIMENSION[center],
        address: {
          center,
          gates: [...this.centerGates[center]],
          sourceGateClaims: [...SOURCE_CENTERS[center]],
          status: 'canonical-human-design-center',
        },
      });
      mesh.register(runnable('center-field', ['consume-context', 'hold-five-level-state', 'coordinate-tools'],
        (payload, context) => this.consume(center, payload, context), {
          center,
          gates: [...this.centerGates[center]],
          sourceGateClaims: [...SOURCE_CENTERS[center]],
        }), { defaultNode: true });

      for (const instrument of this.packageCatalog) {
        const placements = instrument.centers ?? [instrument.center];
        if (!placements.includes(center)) continue;
        mesh.register(runnable(
          instrument.id,
          instrument.capabilities,
          (input, context) => this.runtime.runInstrument(instrument.id, input, context),
          instrument.gate ? { center, gate: instrument.gate, dimension: instrument.dimension ?? null } : { center },
        ));
      }
      this.meshes.set(center, mesh);
    }
    return this.meshes;
  }

  consume(center, payload, context = {}) {
    if (!this.memory.has(center)) throw new Error(`unknown center: ${center}`);
    const gate = firstGate(payload, firstGate(context.address, this.centerGates[center][0]));
    const record = Object.freeze({
      id: `center-activation-${this.activations.length + 1}`,
      sequence: this.activations.length + 1,
      center,
      gate,
      sourceMesh: context.federatedEnvelope?.from?.mesh ?? context.sourceMesh ?? null,
      envelopeId: context.federatedEnvelope?.id ?? null,
      type: context.federatedEnvelope?.type ?? context.type ?? 'local-context',
      fiveLevels: this.resolver.projectFiveLevels(gate),
      scaleLadder: safe(context.relationalContext?.scaleLadder ?? payload?.scaleLadder ?? null),
      payload: safe(payload),
    });
    this.memory.get(center).push(record);
    this.activations.push(record);
    return Object.freeze({
      integrated: true,
      center,
      gate,
      activationId: record.id,
      fiveLevels: record.fiveLevels,
      localMemorySize: this.memory.get(center).length,
    });
  }

  centerForGate(gate) {
    return this.runtime.centersForGate(gate);
  }

  /**
   * Place a validated, governed grown automaton into every applicable center.
   * The placement retains the complete bit-to-automaton scale claim and the
   * five live state-space levels; rollback removes live nodes but not history.
   */
  mountEmergentTool({ id, automaton, spec = {} } = {}) {
    if (!id || typeof automaton?.run !== 'function') throw new TypeError('emergent center tool requires a runnable automaton');
    if (this.emergentTools.has(id)) throw new Error(`emergent tool already mounted in body: ${id}`);
    this.createMeshes();
    const gate = firstGate(spec, 1);
    const centers = this.runtime.centersForGate(gate);
    const nodeId = `grown:${id}`;
    const capabilities = [...new Set(['emergent-tool', ...(spec.capabilities ?? automaton.capabilities ?? [])])];
    const scalePath = Object.freeze(['bit', 'byte', 'structure', 'artifact', 'automaton']);
    for (const center of centers) {
      const mesh = this.meshes.get(center);
      mesh.register(runnable(
        nodeId,
        capabilities,
        (input, context) => automaton.run(input, context),
        {
          center,
          gate,
          dimension: spec.dimension ?? CENTER_DIMENSION[center],
          scale: 'automaton',
          scalePath,
        },
      ));
      mesh.connect('center-field', nodeId, 'cultivates-emergent-tool', { gate, scalePath });
      mesh.connect(nodeId, 'center-field', 'returns-relational-context', { gate, scalePath });
    }
    const placement = Object.freeze({
      id,
      nodeId,
      gate,
      centers: Object.freeze([...centers]),
      capabilities: Object.freeze(capabilities),
      dimension: spec.dimension ?? null,
      fiveLevels: this.resolver.projectFiveLevels(gate),
      scalePath,
      provenance: Object.freeze({
        origin: 'ToolSynthesizer',
        evidence: Object.freeze([...(spec.evidence ?? [])]),
        primitivePattern: safe(spec.primitivePattern ?? null),
      }),
      status: 'mounted',
      sequence: this.emergenceHistory.length + 1,
    });
    this.emergentTools.set(id, placement);
    this.emergenceHistory.push(placement);
    let undone = false;
    return {
      ...placement,
      undo: () => {
        if (undone) return { unmounted: false, id, reason: 'already_unmounted' };
        for (const center of centers) {
          const mesh = this.meshes.get(center);
          mesh.nodes.delete(nodeId);
          mesh.edges = mesh.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
        }
        this.emergentTools.delete(id);
        const record = Object.freeze({
          ...placement,
          status: 'unmounted',
          sequence: this.emergenceHistory.length + 1,
        });
        this.emergenceHistory.push(record);
        undone = true;
        return { unmounted: true, id, nodeId, centers: [...centers], historySequence: record.sequence };
      },
    };
  }

  targetFor(input = {}, fallbackGate = 1) {
    const explicitId = input.instrumentId
      ?? (input.toolId ? `kimi-tool:${input.toolId}` : null);
    let instrument = explicitId ? this.packageCatalog.find((entry) => entry.id === explicitId) : null;
    if (!instrument) {
      const operationMap = {
        chart: 'human-design-chart',
        predict: 'lawful-prediction',
        lattice: 'lawful-prediction',
        grid: 'lawful-prediction',
        'reading-path': 'lawful-prediction',
        tick: 'state-space-living-loop',
        'living-state': 'state-space-living-loop',
        'verify-episodes': 'state-space-living-loop',
        'five-levels': 'five-level-state-space',
        'knowledge-search': 'state-space-knowledge',
        'knowledge-document': 'state-space-knowledge',
      };
      const id = operationMap[input.operation] ?? 'state-space-browser';
      instrument = this.packageCatalog.find((entry) => entry.id === id);
    }
    const gate = firstGate(input, fallbackGate);
    const center = instrument?.center ?? this.runtime.centersForGate(gate)[0];
    return Object.freeze({
      center,
      mesh: meshId(center),
      node: instrument?.id ?? 'center-field',
      gate,
      instrument: safe(instrument),
    });
  }

  async propagate({ fromCenter, gate, payload, address = null, parentId = null, relationalContext = {} } = {}) {
    const normalizedGate = firstGate({ gate }, 1);
    const sourceMesh = meshId(fromCenter);
    const targetCenters = new Set(this.runtime.centersForGate(normalizedGate));
    for (const partnerGate of channelPartners(normalizedGate)) {
      for (const center of this.runtime.centersForGate(partnerGate)) targetCenters.add(center);
    }
    targetCenters.delete(fromCenter);
    const transfers = [];
    for (const center of targetCenters) {
      transfers.push(await this.federation.transfer({
        from: { mesh: sourceMesh, node: 'center-field' },
        to: { mesh: meshId(center), node: 'center-field' },
        type: 'center-channel-context',
        payload,
        relationalContext: {
          ...relationalContext,
          sourceCenter: fromCenter,
          sourceGate: normalizedGate,
          channelPartners: channelPartners(normalizedGate),
          fiveLevels: this.resolver.projectFiveLevels(normalizedGate),
        },
        address: address ?? { gate: normalizedGate },
        provenance: { source: 'NineCenterBody.propagate', canonicalChannelData: true },
        parentId,
      }));
    }
    return Object.freeze(transfers);
  }

  snapshot() {
    return Object.freeze({
      centers: CENTER_NAMES.length,
      names: CENTER_NAMES,
      gates: safe(this.centerGates),
      sourceGateClaims: safe(SOURCE_CENTERS),
      activations: this.activations.length,
      packageInstruments: this.packageCatalog.length,
      emergentTools: Object.freeze([...this.emergentTools.values()].map((entry) => safe(entry))),
      emergenceHistory: this.emergenceHistory.length,
      centerMeshes: Object.freeze([...this.meshes.entries()].map(([center, mesh]) => Object.freeze({
        center,
        mesh: mesh.id,
        instruments: mesh.nodes.size - 1,
        memories: this.memory.get(center).length,
      }))),
    });
  }
}

export { CENTER_DIMENSION, meshId as centerMeshId };
export default NineCenterBody;
