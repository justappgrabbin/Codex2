import { RelationalMesh } from '../mesh/relational-mesh.mjs';
import { safe } from '../util.mjs';
import { CANONICAL_CHANNELS } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/merged/centers-channels.js';
import {
  createComposition,
  ARCHITECTURE_FAMILY_IDS,
} from '../../vendor/pure-synthia-v0.4.0/src/synthia/neural/architectureModulation.mjs';
import { getChannelName } from '../../vendor/pure-synthia-v0.4.0/src/synthia/neural/generativeChannelField.mjs';
import { DIMENSIONS } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/constants.js';
import { DIMENSION_CHAINS, projectDimension } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/dimensions.js';

export const NEURAL_BASE_FORMS = Object.freeze([
  'mlp',
  'conv1d-net',
  'rnn-net',
  'attention-net',
]);

export const NEURAL_ORGAN_SPECS = Object.freeze([
  Object.freeze({ property: 'connectionField', id: 'perspective-connection-field' }),
  Object.freeze({ property: 'generativeChannels', id: 'generative-channel-field' }),
  Object.freeze({ property: 'humanDesignGNN', id: 'human-design-gnn' }),
  Object.freeze({ property: 'neuralArchitecture', id: 'neural-architecture-generator' }),
]);

export const DIMENSION_INTERACTION_STATUS = 'PROJECT_HYPOTHESIS';
export const DIFFERENTIATION_POINT_STATUS = 'OPEN_QUESTION';

// The baseline name table predates three canonical Integration channels.
// These names are present in the supplied Kimi compendium and are added only
// at the integration layer so the preserved donor remains byte-exact.
export const CHANNEL_NAME_ADDITIONS = Object.freeze({
  '10-34': 'Exploration',
  '10-57': 'Perfected Form',
  '20-57': 'Brainwave',
});

export const CHANNEL_RELATION_MODEL = Object.freeze({
  name: 'opposite-equivalent',
  scope: 'higher-order-channel-composite',
  emergesAfter: 'distinct-gate-primitives-compose',
  gatePrimitiveEquivalence: false,
  equivalence: 'shared-higher-order-channel-state',
  opposition: 'composite-polarity',
  identicalState: false,
  globalBinaryComplement: false,
  canonicalArcAxis: false,
});

function pairKey(a, b) {
  return `${Math.min(a, b)}-${Math.max(a, b)}`;
}

function channelMeshId(a, b) {
  return `channel:${pairKey(a, b)}`;
}

// These are analogies carried by the supplied MRNN corpus, not identity
// claims: a Human Design channel behaves like a processing architecture; it
// is not declared to literally be that neural network.
const CHANNEL_ANALOGUES = Object.freeze({
  '4-63': ['understanding', 'Deep Feed Forward', 'DAG deduction'],
  '17-62': ['understanding', 'Restricted Boltzmann Machine', 'bipartite energy'],
  '18-58': ['understanding', 'Hopfield network', 'attractor evaluation'],
  '16-48': ['understanding', 'Sparse Autoencoder', 'sparse latent skill'],
  '9-52': ['understanding', 'Extreme Learning Machine', 'fixed projection focus'],
  '5-15': ['understanding', 'Kohonen/SOM', 'self-organizing rhythm'],
  '7-31': ['understanding', 'CNN/DCN', 'hierarchical leadership features'],
  '42-53': ['sensing', 'Deep Belief Network', 'layered development'],
  '30-41': ['sensing', 'RNN/LSTM', 'temporal desire'],
  '35-36': ['sensing', 'Sequence-to-sequence', 'experience transition'],
  '47-64': ['sensing', 'Autoencoder/Transformer encoder', 'compression and resolution'],
  '11-56': ['sensing', 'Generative language model', 'story and concept'],
  '29-46': ['sensing', 'Reinforcement learner', 'embodied discovery path'],
  '13-33': ['sensing', 'Episodic memory network', 'archive and retrieval'],
  '3-60': ['knowing', 'Liquid State Machine', 'reservoir mutation pulse'],
  '24-61': ['knowing', 'Neural Turing Machine', 'external-memory awareness'],
  '23-43': ['knowing', 'Deconvolutional network', 'insight unpacking'],
  '28-38': ['knowing', 'Generative adversarial network', 'adversarial struggle'],
  '20-57': ['knowing', 'Echo State Network', 'immediate reservoir awareness'],
  '39-55': ['knowing', 'GRU', 'gated emotional processing'],
  '12-22': ['knowing', 'Variational Autoencoder', 'latent social openness'],
  '2-14': ['knowing', 'RBF network', 'radial direction'],
  '1-8': ['knowing', 'Attention network', 'salience broadcast'],
  '10-34': ['integration', 'Actor-Critic', 'agency and action'],
  '25-51': ['integration', 'Spiking/shock network', 'threshold disruption'],
  '10-20': ['integration', 'Direct policy network', 'identity expression'],
  '20-34': ['integration', 'Motor policy network', 'instant action'],
  '34-57': ['integration', 'Sensorimotor network', 'survival response'],
  '10-57': ['integration', 'Adaptive control network', 'behavior refinement'],
  '21-45': ['ego-defense', 'Resource allocation network', 'control and resources'],
  '26-44': ['ego-defense', 'Memory-prediction network', 'pattern transmission'],
  '32-54': ['ego-defense', 'Evolutionary optimizer', 'ambition and selection'],
  '37-40': ['ego-defense', 'Game-theory network', 'exchange and contract'],
  '6-59': ['ego-defense', 'Boundary-crossing network', 'fusion and intimacy'],
  '27-50': ['ego-defense', 'Caretaking regulator', 'maintenance and preservation'],
});

function runnable(id, capabilities, run, address = null) {
  return { id, capabilities, address, run };
}

function signalFor(payload) {
  if (payload?.ok === false || payload?.result?.ok === false) return 0;
  const score = Number(payload?.score ?? payload?.quality ?? payload?.confidence ?? 1);
  return Math.max(0, Math.min(1, Number.isFinite(score) ? score : 1));
}

function activeDimensionFor(payload, context = {}) {
  const candidate = context.address?.dimension
    ?? context.relationalContext?.dimension
    ?? payload?.canonicalAddress?.dimension
    ?? payload?.address?.dimension
    ?? 'Being';
  return DIMENSIONS.includes(candidate) ? candidate : 'Being';
}

function dimensionWeightFor(dimension, context = {}) {
  const candidate = Number(context.relationalContext?.observerFrame?.dimensionWeights?.[dimension] ?? 1);
  return Number.isFinite(candidate) ? Math.max(0, Math.min(2, candidate)) : 1;
}

function vectorDistance(left = [], right = []) {
  const width = Math.max(left.length, right.length, 1);
  let squared = 0;
  for (let index = 0; index < width; index++) {
    const delta = Number(left[index] ?? 0) - Number(right[index] ?? 0);
    squared += delta * delta;
  }
  return Math.sqrt(squared / width);
}

function measureDifferentiation(interactions) {
  const dimensionPairs = [];
  for (let leftIndex = 0; leftIndex < interactions.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < interactions.length; rightIndex++) {
      const left = interactions[leftIndex];
      const right = interactions[rightIndex];
      dimensionPairs.push(Object.freeze({
        from: left.dimension,
        to: right.dimension,
        terminalDistance: vectorDistance(left.result?.terminal, right.result?.terminal),
        byNeuralForm: Object.freeze(Object.fromEntries(NEURAL_BASE_FORMS.map((form, index) => {
          const nodeId = `node-${index + 1}-${form}`;
          return [form, vectorDistance(left.result?.outputs?.[nodeId], right.result?.outputs?.[nodeId])];
        }))),
      }));
    }
  }
  const networkTransitions = interactions.map((interaction) => Object.freeze({
    dimension: interaction.dimension,
    transitions: Object.freeze(NEURAL_BASE_FORMS.slice(1).map((form, index) => {
      const prior = NEURAL_BASE_FORMS[index];
      return Object.freeze({
        from: prior,
        to: form,
        distance: vectorDistance(
          interaction.result?.outputs?.[`node-${index + 1}-${prior}`],
          interaction.result?.outputs?.[`node-${index + 2}-${form}`],
        ),
      });
    })),
  }));
  const rankedCandidates = [
    ...dimensionPairs.map((pair) => ({
      kind: 'dimension',
      from: pair.from,
      to: pair.to,
      distance: pair.terminalDistance,
    })),
    ...networkTransitions.flatMap((entry) => entry.transitions.map((transition) => ({
      kind: 'neural-form',
      dimension: entry.dimension,
      ...transition,
    }))),
  ].sort((left, right) => right.distance - left.distance);
  return Object.freeze({
    status: DIFFERENTIATION_POINT_STATUS,
    threshold: null,
    fixedBoundaries: false,
    claim: 'qualities vary across neural forms and dimensions; meaningful differentiation points remain to be learned',
    dimensionPairs: Object.freeze(dimensionPairs),
    networkTransitions: Object.freeze(networkTransitions),
    rankedCandidates: Object.freeze(rankedCandidates),
  });
}

/**
 * Thirty-six first-class channel meshes derived from the 64-gate graph.
 * Every channel coordinates two gate endpoints and the four preserved neural
 * organs over one shared state. Every activation is evaluated from all five
 * dimensional perspectives and one addressed perspective is selected for the
 * current interaction. The Human Design behavior/NN relationship is explicitly
 * a revisable analogy, never an identity assertion.
 */
export class ChannelMeshBody {
  constructor({ neural, stateSpaceRuntime, resolver, federation, scientist = null } = {}) {
    if (!stateSpaceRuntime?.centersForGate) throw new TypeError('ChannelMeshBody requires the live state-space runtime');
    if (!resolver?.projectFiveLevels) throw new TypeError('ChannelMeshBody requires the five-level resolver');
    if (!federation?.transfer) throw new TypeError('ChannelMeshBody requires MeshFederation');
    for (const spec of NEURAL_ORGAN_SPECS) {
      if (typeof neural?.[spec.property]?.call !== 'function') throw new TypeError(`ChannelMeshBody requires ${spec.id}`);
    }
    this.neural = neural;
    this.stateSpaceRuntime = stateSpaceRuntime;
    this.resolver = resolver;
    this.federation = federation;
    this.scientist = scientist;
    this.meshes = new Map();
    this.memory = new Map();
    this.compositions = new Map();
    this.differentiationQuestions = new Map();
    this.indexedChannelKnowledge = new Set();
    this.history = [];
    this.channelSpecs = Object.freeze(CANONICAL_CHANNELS.map(([gateA, gateB], index) => {
      const analogue = CHANNEL_ANALOGUES[pairKey(gateA, gateB)] ?? null;
      return Object.freeze({
        id: pairKey(gateA, gateB),
        mesh: channelMeshId(gateA, gateB),
        gateA,
        gateB,
        name: CHANNEL_NAME_ADDITIONS[pairKey(gateA, gateB)] ?? getChannelName(gateA, gateB),
        centers: Object.freeze([
          this.stateSpaceRuntime.centersForGate(gateA)[0],
          this.stateSpaceRuntime.centersForGate(gateB)[0],
        ]),
        circuit: analogue?.[0] ?? 'source-unresolved',
        neuralAnalogue: analogue?.[1] ?? null,
        nativeBehavior: analogue?.[2] ?? null,
        analogueClaimStatus: analogue ? 'PROJECT_HYPOTHESIS' : 'OPEN_QUESTION',
        relationModel: CHANNEL_RELATION_MODEL,
        sequence: index + 1,
      });
    }));
  }

  createMeshes() {
    if (this.meshes.size) return this.meshes;
    for (const spec of this.channelSpecs) {
      this.#indexChannelKnowledge(spec);
      const mesh = new RelationalMesh({
        id: spec.mesh,
        dimension: 'five-dimensional',
        address: {
          channel: spec.id,
          gates: [spec.gateA, spec.gateB],
          centers: [...spec.centers],
          dimensions: DIMENSIONS,
          relationModel: CHANNEL_RELATION_MODEL,
          neuralAnalogue: spec.neuralAnalogue,
          analogueClaimStatus: spec.analogueClaimStatus,
        },
      });
      mesh.register(runnable(
        `gate:${spec.gateA}`,
        ['gate-state', 'five-level-state', 'channel-endpoint'],
        (input, context) => this.observeGate(spec, spec.gateA, input, context),
        { gate: spec.gateA, center: spec.centers[0] },
      ));
      mesh.register(runnable(
        'channel-field',
        ['consume-channel-context', 'coordinate-neural-organs', 'three-layer-message-passing'],
        (input, context) => this.consume(spec, input, context),
        { channel: spec.id, gates: [spec.gateA, spec.gateB] },
      ), { defaultNode: true });
      mesh.register(runnable(
        `gate:${spec.gateB}`,
        ['gate-state', 'five-level-state', 'channel-endpoint'],
        (input, context) => this.observeGate(spec, spec.gateB, input, context),
        { gate: spec.gateB, center: spec.centers[1] },
      ));
      for (const organSpec of NEURAL_ORGAN_SPECS) {
        const organ = this.neural[organSpec.property];
        mesh.register(runnable(
          organSpec.id,
          organ.metadata?.capabilities ?? ['neural-organ'],
          (input) => organ.call(input),
          { sharedOrgan: true, sourceAddress: safe(organ.address ?? null) },
        ));
        mesh.connect('channel-field', organSpec.id, 'coordinates-neural-organ', { channel: spec.id });
        mesh.connect(organSpec.id, 'channel-field', 'returns-neural-context', { channel: spec.id });
      }
      mesh.connect(`gate:${spec.gateA}`, 'channel-field', 'enters-channel-composition', {
        channel: spec.id, relationModel: CHANNEL_RELATION_MODEL,
      });
      mesh.connect('channel-field', `gate:${spec.gateB}`, 'projects-higher-order-opposite-equivalence', {
        channel: spec.id, relationModel: CHANNEL_RELATION_MODEL,
      });
      mesh.connect(`gate:${spec.gateB}`, 'channel-field', 'enters-channel-composition', {
        channel: spec.id, relationModel: CHANNEL_RELATION_MODEL,
      });
      mesh.connect('channel-field', `gate:${spec.gateA}`, 'projects-higher-order-opposite-equivalence', {
        channel: spec.id, relationModel: CHANNEL_RELATION_MODEL,
      });
      this.meshes.set(spec.id, mesh);
      this.memory.set(spec.id, []);
    }
    return this.meshes;
  }

  channelsForGate(gate) {
    const normalized = Number(gate);
    return Object.freeze(this.channelSpecs.filter((spec) => spec.gateA === normalized || spec.gateB === normalized));
  }

  observeGate(spec, gate, payload, context = {}) {
    return Object.freeze({
      channel: spec.id,
      gate,
      center: this.stateSpaceRuntime.centersForGate(gate)[0],
      fiveLevels: this.resolver.projectFiveLevels(gate),
      payload: safe(payload),
      relationalContext: safe(context.relationalContext ?? null),
      observed: true,
    });
  }

  #composition(spec) {
    if (!this.compositions.has(spec.id)) {
      this.compositions.set(spec.id, createComposition(
        `channel-${spec.id}-four-form-field`,
        NEURAL_BASE_FORMS,
      ));
    }
    return this.compositions.get(spec.id);
  }

  #indexChannelKnowledge(spec) {
    if (this.indexedChannelKnowledge.has(spec.id)) return;
    const stateSpace = this.stateSpaceRuntime.stateSpace;
    for (const dimension of DIMENSIONS) {
      const sourceId = `channel-knowledge:${spec.id}:${dimension}:gate-${spec.gateA}`;
      const targetId = `channel-knowledge:${spec.id}:${dimension}:gate-${spec.gateB}`;
      const analogue = spec.neuralAnalogue
        ? `${spec.neuralAnalogue} is retained only as a project hypothesis for ${spec.nativeBehavior}`
        : 'the neural-network analogue remains an open question';
      const epistemic = `No neural identity is asserted, differentiation thresholds are unknown, and interaction is evaluated from the ${dimension} perspective.`;
      stateSpace.dimensions[dimension].addWord(spec.gateA, {
        id: sourceId,
        text: `${spec.name}: Gate ${spec.gateA} and Gate ${spec.gateB} remain distinct gate-scale primitives; their composition produces an opposite-equivalent relationship at the higher channel scale. ${analogue}. ${epistemic}`,
        relation: 'higher-scale-channel-composite-source',
      });
      stateSpace.dimensions[dimension].addWord(spec.gateB, {
        id: targetId,
        text: `${spec.name}: Gate ${spec.gateB} composes with Gate ${spec.gateA}; opposite equivalence belongs to the resulting higher-order channel state, not either gate primitive. This is not global binary complement or canonical arcAxis. ${analogue}. ${epistemic}`,
        dependsOn: [sourceId],
        relation: 'higher-scale-opposite-equivalent-composite',
      });
    }
    this.indexedChannelKnowledge.add(spec.id);
  }

  #recordDifferentiationEvidence(spec, differentiation) {
    if (!this.scientist?.question || !this.scientist?.evidence) return null;
    if (!this.differentiationQuestions.has(spec.id)) {
      const question = this.scientist.question(
        `Where do channel ${spec.id} interaction qualities meaningfully differentiate across neural forms and dimensions?`,
        {
          hypothesis: 'Variation exists across the field; differentiation boundaries are not yet known.',
          method: 'Accumulate dimension-pair and neural-form output distances without imposing a threshold.',
          address: { channel: spec.id, gates: [spec.gateA, spec.gateB] },
          source: ['ChannelMeshBody', 'user speculative formulation'],
        },
      );
      this.differentiationQuestions.set(spec.id, question.id);
    }
    const questionId = this.differentiationQuestions.get(spec.id);
    this.scientist.evidence(questionId, {
      source: `channel:${spec.id}:dimension-neural-measurement`,
      relevance: 0.5,
      data: safe(differentiation),
    });
    return questionId;
  }

  async consume(spec, payload, context = {}) {
    const gate = [spec.gateA, spec.gateB].includes(Number(context.address?.gate))
      ? Number(context.address.gate)
      : spec.gateA;
    const signal = signalFor(payload);
    const line = Math.max(1, Math.min(6, Number(context.address?.line ?? payload?.canonicalAddress?.line ?? 1)));
    const activeDimension = activeDimensionFor(payload, context);
    const connection = await this.neural.connectionField.call({ operation: 'observe', address: { gate }, signal });
    const generativeA = await this.neural.generativeChannels.call({
      operation: 'observe', gate: spec.gateA, delta: signal > 0 ? 1 : 0,
      description: `channel ${spec.id} context`, evidence: context.federatedEnvelope?.id ?? null,
    });
    const generativeB = await this.neural.generativeChannels.call({
      operation: 'observe', gate: spec.gateB, delta: signal > 0 ? 1 : 0,
      description: `channel ${spec.id} context`, evidence: context.federatedEnvelope?.id ?? null,
    });
    const graph = await this.neural.humanDesignGNN.call({
      operation: 'infer',
      placements: [
        { planet: 'Sun', stream: 'body', gate: spec.gateA, line },
        { planet: 'Earth', stream: 'design', gate: spec.gateB, line },
      ],
    });
    // The same channel is not assumed to interact identically at every level.
    // Run the preserved four-form composition once per dimension, with the
    // canonical dimensional projection and an optional observer-relative
    // weight supplied by the future Human Design/economic-state provider.
    // No birth/activation/economic equation is invented here: the frame is a
    // typed seam and the supplied values remain provenance for later testing.
    const dimensionInteractions = [];
    for (const [dimensionIndex, dimension] of DIMENSIONS.entries()) {
      const observerWeight = dimensionWeightFor(dimension, context);
      const result = await this.neural.neuralArchitecture.call({
        operation: 'run',
        composition: this.#composition(spec),
        input: [
          spec.gateA / 64,
          spec.gateB / 64,
          signal * observerWeight * (0.75 + line / 24),
          dimensionIndex / (DIMENSIONS.length - 1),
        ],
      });
      dimensionInteractions.push(Object.freeze({
        dimension,
        projection: safe(projectDimension({
          identity: `channel:${spec.id}`,
          channel: spec.id,
          gates: [spec.gateA, spec.gateB],
        }, null, dimension)),
        chain: DIMENSION_CHAINS[dimension],
        observerWeight,
        result: safe(result),
      }));
    }
    const activeInteraction = dimensionInteractions.find((entry) => entry.dimension === activeDimension);
    const differentiation = measureDifferentiation(dimensionInteractions);
    const differentiationQuestionId = this.#recordDifferentiationEvidence(spec, differentiation);
    const record = Object.freeze({
      id: `channel-activation-${this.history.length + 1}`,
      sequence: this.history.length + 1,
      channel: spec.id,
      name: spec.name,
      gates: Object.freeze([spec.gateA, spec.gateB]),
      centers: spec.centers,
      circuit: spec.circuit,
      neuralAnalogue: spec.neuralAnalogue,
      nativeBehavior: spec.nativeBehavior,
      analogueClaimStatus: spec.analogueClaimStatus,
      neuralIdentityClaim: false,
      relationModel: CHANNEL_RELATION_MODEL,
      dimensionInteractionClaimStatus: DIMENSION_INTERACTION_STATUS,
      activeDimension,
      activeInteraction,
      dimensionInteractions: Object.freeze(dimensionInteractions),
      differentiation,
      differentiationQuestionId,
      observerFrame: safe(context.relationalContext?.observerFrame ?? null),
      baseForms: NEURAL_BASE_FORMS,
      graphSageLayers: 3,
      fiveLevels: Object.freeze({
        [spec.gateA]: this.resolver.projectFiveLevels(spec.gateA),
        [spec.gateB]: this.resolver.projectFiveLevels(spec.gateB),
      }),
      scaleLadder: safe(context.relationalContext?.scaleLadder ?? payload?.scaleLadder ?? null),
      neural: safe({ connection, generativeA, generativeB, graph, neuralComposition: activeInteraction?.result ?? null }),
      payload: safe(payload),
      envelopeId: context.federatedEnvelope?.id ?? null,
      consumed: true,
    });
    this.memory.get(spec.id).push(record);
    this.history.push(record);
    return record;
  }

  async propagate({ fromCenter, gate, payload, address = null, parentId = null, relationalContext = {} } = {}) {
    const flows = [];
    for (const spec of this.channelsForGate(gate)) {
      const partnerGate = spec.gateA === Number(gate) ? spec.gateB : spec.gateA;
      const partnerCenter = this.stateSpaceRuntime.centersForGate(partnerGate)[0];
      const intake = await this.federation.transfer({
        from: { mesh: `center:${String(fromCenter).toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`, node: 'center-field' },
        to: { mesh: spec.mesh, node: 'channel-field' },
        type: 'gate-to-channel-context',
        payload,
        relationalContext: {
          ...relationalContext,
          channel: spec.id,
          sourceGate: Number(gate),
          partnerGate,
          fiveLevels: this.resolver.projectFiveLevels(Number(gate)),
          relationModel: CHANNEL_RELATION_MODEL,
        },
        address: address ?? { gate: Number(gate) },
        provenance: { source: 'ChannelMeshBody.propagate', canonicalChannel: true },
        parentId,
      });
      const delivery = await this.federation.transfer({
        from: { mesh: spec.mesh, node: 'channel-field' },
        to: { mesh: `center:${String(partnerCenter).toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`, node: 'center-field' },
        type: 'channel-to-harmonic-gate-context',
        payload: { source: safe(payload), channelResult: intake.receipt.output },
        relationalContext: {
          ...relationalContext,
          channel: spec.id,
          sourceGate: Number(gate),
          partnerGate,
          sourceCenter: fromCenter,
          targetCenter: partnerCenter,
          fiveLevels: this.resolver.projectFiveLevels(partnerGate),
          relationModel: CHANNEL_RELATION_MODEL,
        },
        address: { ...(address ?? {}), gate: partnerGate },
        provenance: { source: 'ChannelMeshBody.propagate', canonicalChannel: true },
        parentId: intake.envelope.id,
      });
      flows.push(Object.freeze({ spec, intake, delivery }));
    }
    return Object.freeze(flows);
  }

  snapshot() {
    const neuralSnapshot = {
      connectionField: this.neural.connectionField.snapshot(),
      generativeChannels: this.neural.generativeChannels.snapshot(),
      humanDesignGNN: this.neural.humanDesignGNN.snapshot(),
      neuralArchitecture: this.neural.neuralArchitecture.snapshot(),
    };
    return Object.freeze({
      channelMeshes: this.meshes.size,
      canonicalChannels: this.channelSpecs.length,
      gateNodes: 64,
      graphSageLayers: 3,
      dimensionalInteractionLevels: DIMENSIONS.length,
      dimensionalInteractionStatus: DIMENSION_INTERACTION_STATUS,
      differentiationPointStatus: DIFFERENTIATION_POINT_STATUS,
      fixedDifferentiationBoundaries: false,
      channelRelationModel: CHANNEL_RELATION_MODEL,
      differentiationQuestions: this.differentiationQuestions.size,
      indexedChannelKnowledgeEntries: this.indexedChannelKnowledge.size * DIMENSIONS.length * 2,
      neuralOrgans: NEURAL_ORGAN_SPECS.length,
      baseNeuralForms: NEURAL_BASE_FORMS,
      neuralArchitectureFamilies: ARCHITECTURE_FAMILY_IDS.length,
      mappedNeuralAnalogues: this.channelSpecs.filter((spec) => spec.neuralAnalogue).length,
      unresolvedNeuralAnalogues: this.channelSpecs.filter((spec) => !spec.neuralAnalogue).map((spec) => spec.id),
      activations: this.history.length,
      channels: Object.freeze(this.channelSpecs.map((spec) => Object.freeze({
        ...safe(spec),
        memories: this.memory.get(spec.id)?.length ?? 0,
        nodes: this.meshes.get(spec.id)?.nodes.size ?? 0,
      }))),
      neural: safe(neuralSnapshot),
    });
  }
}

export { CHANNEL_ANALOGUES, pairKey as channelKey, channelMeshId, measureDifferentiation };
export default ChannelMeshBody;
