import { bootstrapCurrentSynthiaSwarm } from '../vendor/pure-synthia-v0.4.0/src/synthia/swarm/bootstrap.mjs';
import { MemoryCheckpointStore } from '../vendor/pure-synthia-v0.4.0/src/synthia/swarm/checkpointStores.mjs';
import { IntegratedSynthiaSystem } from './integrated-synthia-system.mjs';
import { RelationalMesh } from './mesh/relational-mesh.mjs';
import { MeshFederation } from './mesh/mesh-federation.mjs';
import { SovereignStateSpaceRuntime, centerSlug } from './state-space/sovereign-state-space-runtime.mjs';
import { NineCenterBody, centerMeshId } from './state-space/nine-center-body.mjs';
import { ChannelMeshBody, NEURAL_ORGAN_SPECS } from './state-space/channel-mesh-body.mjs';
import { SynthiaRoleResolver } from './forms/synthia-role-resolver.mjs';
import { CENTER_NAMES } from '../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/merged/centers-channels.js';
import { safe } from './util.mjs';

function runnable(id, capabilities, run) {
  return { id, capabilities, run };
}

/**
 * The assembled organism. Pure Synthia supplies the living/process body; the
 * execution spine and all pipeline organs share its exact semantic engine.
 */
export class FederatedSynthia {
  static async create(options = {}) {
    const baseline = await bootstrapCurrentSynthiaSwarm({
      store: options.store ?? new MemoryCheckpointStore(),
      identity: options.identity,
      attachFoundry: options.attachFoundry !== false,
    });
    return new FederatedSynthia({ ...options, baseline });
  }

  constructor({ baseline, ...options } = {}) {
    if (!baseline?.synthia?.meshRuntime?.engine) throw new TypeError('FederatedSynthia requires the finished Pure Synthia baseline');
    this.baseline = baseline;
    this.swarm = baseline.swarm;
    this.synthia = baseline.synthia;
    this.physiology = baseline.physiology;
    this.worldPort = baseline.worldPort;
    this.capabilityBridge = baseline.capabilityBridge;
    this.baselineProcessCount = this.swarm.snapshot().processCount;
    this.federation = new MeshFederation({ id: 'synthia:mesh-of-meshes' });
    this.system = new IntegratedSynthiaSystem({
      ...options,
      engine: this.synthia.meshRuntime.engine,
      federation: this.federation,
    });
    this.roleResolver = new SynthiaRoleResolver();
    this.stateSpaceRuntime = new SovereignStateSpaceRuntime({
      stateSpace: this.system.addressResolver.stateSpace,
      seed: options.seed ?? 0x5117,
      gateCenterMap: options.gateCenterMap ?? null,
    });
    this.centerBody = new NineCenterBody({
      runtime: this.stateSpaceRuntime,
      resolver: this.system.addressResolver,
      federation: this.federation,
    });
    this.channelBody = new ChannelMeshBody({
      neural: this.synthia.neural,
      stateSpaceRuntime: this.stateSpaceRuntime,
      resolver: this.system.addressResolver,
      federation: this.federation,
      scientist: this.system.scientist,
    });
    this.#registerStateSpaceApp();
    this.contextMemory = new Map();
    this.localMeshes = this.#buildLocalMeshes();
    this.system.bindGrownToolHandler(({ id, automaton, spec }) =>
      this.centerBody.mountEmergentTool({ id, automaton, spec }));
    this.#connectFederation();
    this.#registerSwarmExtensions();
  }

  #remember(meshId, envelope, interpretation) {
    const entries = this.contextMemory.get(meshId) ?? [];
    entries.push(Object.freeze({ envelopeId: envelope.id, type: envelope.type, interpretation: safe(interpretation) }));
    this.contextMemory.set(meshId, entries);
    return entries.length;
  }

  #registerStateSpaceApp() {
    this.system.appRegistry.register({
      id: 'synthia-sovereign',
      name: 'Synthia State-Space Browser',
      aliases: ['kimi-synthia', 'sovereign-synthia', 'synthia-state-space', 'synthia-sovereign.html', 'sovereign.html'],
      kind: 'state-space-organism',
      singlePlayer: true,
      backendRequired: false,
      capabilities: ['execute', 'browse-state-space', 'five-levels', 'nine-centers', 'predict', 'chart', 'living-loop', 'media'],
      address: { dimension: 'Being', gate: 1 },
      provenance: {
        source: 'Kimi_Agent_Automata State Space Merge(1).zip',
        integration: 'all executable modules and textual sources mounted across nine center meshes',
      },
      execute: (artifact, context) => this.stateSpaceRuntime.execute(artifact.input ?? artifact.request ?? artifact, context),
    });
  }

  #buildLocalMeshes() {
    const organism = new RelationalMesh({ id: 'organism', dimension: 'Being' });
    organism.register(runnable('pure-synthia', ['process', 'physiology-context'], (input, context) =>
      this.synthia.process(String(input), { ...context, surface: context.surface ?? 'federated-organism' })), { defaultNode: true });
    organism.register(runnable('organism-outcome', ['consume-outcome'], async (input, context) => {
      const remembered = this.#remember('organism', context.federatedEnvelope, { accepted: input?.ok, strategy: input?.strategy ?? null });
      await this.physiology.observeOutcome({
        address: input?.canonicalAddress ?? context.address,
        source: 'mesh-federation',
        summary: input?.utterance ?? `${input?.strategy ?? 'task'}:${input?.ok !== false ? 'complete' : 'failed'}`,
        accepted: input?.ok !== false,
      });
      return { integrated: true, remembered, physiology: this.physiology.context() };
    }));

    const semantic = new RelationalMesh({ id: 'semantic', dimension: 'Space' });
    semantic.register(runnable('semantic-context', ['consume-context', 'relate'], (payload, context) => {
      const interpretation = {
        sourceMesh: context.federatedEnvelope.from.mesh,
        type: context.federatedEnvelope.type,
        strategy: payload?.strategy ?? null,
        addressed: Boolean(payload?.canonicalAddress ?? context.address),
      };
      const remembered = this.#remember('semantic', context.federatedEnvelope, interpretation);
      this.system.mesh.addEdge('knowledge', `mesh:${context.federatedEnvelope.from.mesh}`, 'mesh:semantic', 'federated-context-consumed', {
        envelopeId: context.federatedEnvelope.id,
        type: context.federatedEnvelope.type,
      });
      return { integrated: true, remembered, interpretation };
    }), { defaultNode: true });
    semantic.register(runnable('chat-pipeline', ['chat', 'relational-compose'], (input, context) =>
      this.system.chat(String(input), { ...context, relationalContext: context.relationalContext })));
    semantic.register(runnable('intent-orchestrator', ['infer-intent', 'route'], (input, context) =>
      this.system.route(input, { ...context, relationalContext: context.relationalContext })));
    semantic.register(runnable('semantic-population-coordinator', ['coordinate-population', 'propagate-state-packets'], (input, context) =>
      this.system.coordinatePopulation(input, { context })));
    for (const automaton of this.system.mesh.automata.values()) {
      if (semantic.nodes.has(automaton.id)) continue;
      semantic.register(automaton, { capabilities: automaton.capabilities ?? [] });
    }

    const execution = new RelationalMesh({ id: 'execution', dimension: 'Movement' });
    execution.register(runnable('execution-pipeline', ['execute', 'scale-resolve', 'strategy-select'], (artifact, context) =>
      this.system.executeArtifact(artifact, { ...context, relationalContext: context.relationalContext })), { defaultNode: true });
    execution.register(runnable('registered-app-runtime', ['execute-app', 'backendless-game'], (artifact, context) =>
      this.system.appRegistry.execute(artifact, context)));
    execution.register(runnable('universal-execution-bridge', ['external-runtime'], (artifact, context) =>
      this.system.execution.execute(artifact, context)));
    execution.register(runnable('exact-address-recall', ['commit-exact-address', 'recall-exact-address', 'sha256-proof'], (input) =>
      this.system.exactAddress(input.operation ?? 'snapshot', input)));

    const learning = new RelationalMesh({ id: 'learning', dimension: 'Evolution' });
    learning.register(runnable('learning-context', ['consume-context', 'evaluate-emergence'], (payload, context) => {
      const remembered = this.#remember('learning', context.federatedEnvelope, { kind: payload?.kind ?? context.federatedEnvelope.type });
      const emergence = this.system.detector.testEmergence({
        id: `federated-learning-${remembered}`,
        primitives: [context.federatedEnvelope.from.mesh, context.federatedEnvelope.to.mesh],
        operators: ['o_sequence'],
        output: { type: context.federatedEnvelope.type, payload: safe(payload) },
      });
      return { integrated: true, remembered, emergence };
    }), { defaultNode: true });
    learning.register(runnable('tool-synthesizer', ['synthesize-tool'], (input) => this.system.toolSynthesizer.checkTrigger(input)));
    learning.register(runnable('success-feedback', ['success-feedback'], (input) => this.system.successFeedback.observe(input)));
    learning.register(runnable('watering', ['water', 'train-words', 'resolve-gate'], (input, context) =>
      this.system.water(input?.text ?? input, context)));
    learning.register(runnable('piece-admission', ['admit', 'register-piece', 'resolve-address'], (input, context) =>
      this.system.admit(input?.piece ?? input, context)));
    learning.register(runnable('sentence-contact', ['contact', 'compose-sentence'], (input) =>
      this.system.contact(input.entityIdA, input.entityIdB, input.options ?? {})));
    learning.register(runnable('book-ingest', ['ingest-book', 'segment-source'], (input) => this.system.ingestBook(input)));
    learning.register(runnable('training-journal', ['inspect-training', 'rank-routes'], () => this.system.trainingSnapshot()));
    learning.register(runnable('anticipatory-memory', ['recall-precedent', 'contribute-public-precedent'], (input = {}) => {
      if (input.operation === 'recall') return this.system.anticipatoryMemory.recall(input.address ?? {});
      if (input.operation === 'contribute') return this.system.anticipatoryMemory.contribute(input.address ?? {}, input.data ?? {});
      return this.system.anticipatoryMemory.snapshot();
    }));

    const governance = new RelationalMesh({ id: 'governance', dimension: 'Design' });
    governance.register(runnable('governance-context', ['consume-context', 'govern'], (payload, context) => {
      const interpretation = {
        proposalRequired: Boolean(payload?.gap || payload?.proposal),
        userConsentRequired: payload?.flow === 'user',
        sourceMesh: context.federatedEnvelope.from.mesh,
      };
      const remembered = this.#remember('governance', context.federatedEnvelope, interpretation);
      return { integrated: true, remembered, interpretation, pending: this.system.proposals.pending().length };
    }), { defaultNode: true });
    governance.register(runnable('observation-engine', ['observe', 'propose'], (input) => this.system.observation.watch(input)));
    governance.register(runnable('proposal-ledger', ['accept', 'dismiss', 'rollback'], (input) => {
      if (input.operation === 'accept') return this.system.proposals.accept(input.proposalId, { actor: input.actor ?? 'user' });
      if (input.operation === 'dismiss') return this.system.proposals.dismiss(input.proposalId, input.reason, { actor: input.actor ?? 'user' });
      if (input.operation === 'rollback') return this.system.proposals.rollback(input.proposalId);
      return this.system.proposals.pending(input.flow, input.personId);
    }));

    const swarm = new RelationalMesh({ id: 'swarm', dimension: 'Being' });
    swarm.register(runnable('swarm-dispatch', ['dispatch', 'checkpoint', 'resume'], async (input) => {
      if (input.operation === 'checkpoint') return this.swarm.checkpoint(input.reason);
      if (input.operation === 'resume') return this.swarm.resumeRecovered(input.options);
      return this.swarm.submit(input.tasks ?? [], input.options);
    }), { defaultNode: true });

    const centerMeshes = this.centerBody.createMeshes();
    this.centerMeshes = Object.freeze(Object.fromEntries(centerMeshes));
    const namedCenterMeshes = Object.fromEntries(
      [...centerMeshes].map(([center, mesh]) => [`center${center.replaceAll(/[^a-z0-9]/gi, '')}`, mesh]),
    );
    const channelMeshes = this.channelBody.createMeshes();
    this.channelMeshes = Object.freeze(Object.fromEntries(channelMeshes));
    const namedChannelMeshes = Object.fromEntries(
      [...channelMeshes].map(([channel, mesh]) => [`channel${channel.replaceAll(/[^a-z0-9]/gi, '_')}`, mesh]),
    );
    for (const mesh of [
      organism,
      semantic,
      execution,
      learning,
      governance,
      swarm,
      ...centerMeshes.values(),
      ...channelMeshes.values(),
    ]) {
      this.#wireLocalCoordination(mesh);
      this.federation.register(mesh);
    }
    return Object.freeze({
      organism,
      semantic,
      execution,
      learning,
      governance,
      swarm,
      ...namedCenterMeshes,
      ...namedChannelMeshes,
    });
  }

  #wireLocalCoordination(mesh) {
    const ids = [...mesh.nodes.keys()];
    if (ids.length === 1) {
      mesh.connect(ids[0], ids[0], 'coordinates-local-processes', { mesh: mesh.id });
      return;
    }
    for (let index = 0; index < ids.length; index++) {
      mesh.connect(ids[index], ids[(index + 1) % ids.length], 'shares-relational-context', { mesh: mesh.id });
    }
  }

  #connectFederation() {
    const ids = [...this.federation.meshes.keys()];
    for (const from of ids) {
      for (const to of ids) {
        if (from !== to) this.federation.connect(from, to);
      }
    }
  }

  async #integrateCenters({ source, type, payload, address, parentId = null, relationalContext = {} }) {
    const gate = Number(address?.gate ?? payload?.canonicalAddress?.gate ?? 1);
    const centers = this.centerBody.centerForGate(gate);
    const primaryCenter = centers[0];
    const primary = await this.federation.transfer({
      from: source,
      to: { mesh: centerMeshId(primaryCenter), node: 'center-field' },
      type: `${type}-center-intake`,
      payload,
      relationalContext: {
        ...relationalContext,
        fiveLevelProjection: this.system.addressResolver.projectFiveLevels(gate),
      },
      address,
      provenance: { source: 'FederatedSynthia.center-integration', fiveLevelStateSpace: true },
      parentId,
    });
    const channels = await this.channelBody.propagate({
      fromCenter: primaryCenter,
      gate,
      payload,
      address,
      parentId: primary.envelope.id,
      relationalContext: {
        ...relationalContext,
        primaryCenter,
      },
    });
    return Object.freeze({ primaryCenter, centers, primary, channels });
  }

  #registerSwarmExtensions() {
    const extensions = [
      runnable('primitive-execution-pipeline', ['execute', 'scale-resolve', 'strategy-select'], (input, context) => this.system.executeArtifact(input, context)),
      runnable('sequential-chat-pipeline', ['chat', 'relational-compose'], (input, context) => this.system.chat(input, context)),
      runnable('semantic-population-coordinator', ['coordinate-population', 'propagate-state-packets'], (input, context) =>
        this.system.coordinatePopulation(input, { context })),
      runnable('intent-orchestrator', ['infer-intent', 'route'], (input, context) => this.system.route(input, context)),
      runnable('success-feedback-loop', ['success-feedback'], (input) => this.system.successFeedback.observe(input)),
      runnable('tool-synthesizer', ['synthesize-tool'], (input) => this.system.toolSynthesizer.checkTrigger(input)),
      runnable('proposal-governance', ['observe', 'accept-proposal', 'rollback'], (input) => this.localMeshes.governance.run('proposal-ledger', input)),
      runnable('registered-app-runtime', ['execute-app', 'backendless-game'], (input, context) => this.system.appRegistry.execute(input, context)),
      runnable('exact-address-recall', ['commit-exact-address', 'recall-exact-address', 'sha256-proof'], (input) =>
        this.system.exactAddress(input.operation ?? 'snapshot', input)),
      runnable('watering-intake', ['water', 'train-words', 'resolve-gate'], (input, context) => this.system.water(input?.text ?? input, context)),
      runnable('piece-admission', ['admit', 'register-piece', 'resolve-address'], (input, context) => this.system.admit(input?.piece ?? input, context)),
      runnable('sentence-contact', ['contact', 'compose-sentence'], (input) => this.system.contact(input.entityIdA, input.entityIdB, input.options ?? {})),
      runnable('book-ingest', ['ingest-book', 'segment-source'], (input) => this.system.ingestBook(input)),
      runnable('training-journal', ['inspect-training', 'rank-routes'], () => this.system.trainingSnapshot()),
      runnable('anticipatory-memory', ['recall-precedent', 'contribute-public-precedent'], (input = {}) => {
        if (input.operation === 'recall') return this.system.anticipatoryMemory.recall(input.address ?? {});
        if (input.operation === 'contribute') return this.system.anticipatoryMemory.contribute(input.address ?? {}, input.data ?? {});
        return this.system.anticipatoryMemory.snapshot();
      }),
      runnable('synthia-role-resolver', ['select-role', 'morph-configuration'], (input, context) => this.roleResolver.resolve(input, context)),
      runnable('state-space-browser', ['browse-state-space', 'search-knowledge', 'navigate-tools'], (input, context) => this.stateSpaceTask(input, context)),
      runnable('state-space-living-loop', ['tick', 'sense-vitals', 'endogenous-action'], (input, context) => this.stateSpaceRuntime.execute({ ...input, operation: input?.operation ?? 'tick' }, context)),
      runnable('five-level-state-space', ['Movement', 'Evolution', 'Being', 'Design', 'Space'], (input) => this.stateSpaceRuntime.fiveLevels(input?.gate ?? 1)),
      runnable('nine-center-body', ['coordinate-nine-centers', 'share-center-context'], () => this.centerBody.snapshot()),
      runnable('channel-mesh-body', ['coordinate-36-channels', 'share-channel-context', 'four-neural-organs'], () => this.channelBody.snapshot()),
      ...CENTER_NAMES.map((center) => runnable(
        `center-${centerSlug(center)}-coordinator`,
        ['coordinate-center', center, ...this.centerMeshes[center].snapshot().nodes.flatMap((node) => node.capabilities).slice(0, 24)],
        (input, context) => this.centerMeshes[center].run('center-field', input, context),
      )),
      ...this.channelBody.channelSpecs.map((spec) => runnable(
        `channel-${spec.id}-coordinator`,
        [
          'coordinate-channel',
          'five-dimensional-interaction',
          spec.id,
          ...NEURAL_ORGAN_SPECS.map((organ) => organ.id),
        ],
        (input, context) => this.channelMeshes[spec.id].run('channel-field', input, context),
      )),
    ];
    for (const target of extensions) {
      this.swarm.registerTarget(target, {
        id: target.id,
        group: 'integrated-mesh-organs',
        capabilities: target.capabilities,
        maxConcurrency: 1,
        metadata: { origin: 'Synthia-Integrated-Automata-v0.5.0', localMesh: true },
      });
    }
    this.extensionTargets = new Map(extensions.map((target) => [target.id, target]));
    this.extensionHands = Object.freeze(extensions.map((target) => Object.freeze({
      id: target.id,
      capabilities: Object.freeze([...target.capabilities]),
      independentlyCallable: typeof target.run === 'function',
    })));
    this.capabilityBridge.sync();
  }

  async chat(message, context = {}) {
    const organism = await this.localMeshes.organism.run('pure-synthia', message, { ...context, surface: 'conversation' });
    const cognition = await this.federation.transfer({
      from: { mesh: 'organism', node: 'pure-synthia' },
      to: { mesh: 'semantic', node: 'chat-pipeline' },
      type: 'chat-task',
      payload: String(message),
      relationalContext: {
        personId: context.personId ?? 'default-person',
        address: organism.output.address,
        addressKey: organism.output.addressKey,
        path: organism.output.path,
        summary: organism.output.summary,
        physiology: organism.output.physiology,
      },
      address: organism.output.address,
      provenance: { source: 'Pure-Synthia.process', localEventId: organism.event.id },
    });
    const response = cognition.receipt.output;
    const centers = await this.#integrateCenters({
      source: { mesh: 'semantic', node: 'chat-pipeline' },
      type: 'chat',
      payload: response,
      address: organism.output.address,
      parentId: cognition.envelope.id,
      relationalContext: {
        pipelineTrace: response.pipelineTrace,
        personId: context.personId ?? 'default-person',
        observerFrame: context.observerFrame ?? null,
      },
    });
    const learning = await this.federation.transfer({
      from: { mesh: 'semantic', node: 'chat-pipeline' }, to: 'learning', type: 'chat-outcome', payload: response,
      relationalContext: { pipelineTrace: response.pipelineTrace, personId: context.personId ?? 'default-person' },
      address: organism.output.address, parentId: cognition.envelope.id,
    });
    const governance = await this.federation.transfer({
      from: { mesh: 'semantic', node: 'chat-pipeline' }, to: 'governance', type: 'chat-outcome', payload: response,
      relationalContext: { personId: context.personId ?? 'default-person' },
      address: organism.output.address, parentId: cognition.envelope.id,
    });
    const returnFlow = await this.federation.transfer({
      from: { mesh: 'semantic', node: 'chat-pipeline' },
      to: { mesh: 'organism', node: 'organism-outcome' },
      type: 'felt-chat-outcome', payload: response,
      relationalContext: { learnedBy: learning.receipt.nodeId, governedBy: governance.receipt.nodeId },
      address: organism.output.address, parentId: cognition.envelope.id,
    });
    return { ...response, organism: safe(organism.output), federation: { cognition, centers, learning, governance, returnFlow } };
  }

  async executeArtifact(artifact, context = {}) {
    const cue = `execute ${artifact?.appId ?? artifact?.name ?? artifact?.originalName ?? artifact?.type ?? 'artifact'}`;
    const organism = await this.localMeshes.organism.run('pure-synthia', cue, { ...context, surface: 'execution' });
    const execution = await this.federation.transfer({
      from: { mesh: 'organism', node: 'pure-synthia' },
      to: { mesh: 'execution', node: 'execution-pipeline' },
      type: 'execution-task', payload: artifact,
      relationalContext: {
        personId: context.personId ?? 'default-person',
        organismAddress: organism.output.address,
        physiology: organism.output.physiology,
      },
      address: organism.output.address,
      provenance: { source: 'Pure-Synthia.process', localEventId: organism.event.id },
    });
    const response = execution.receipt.output;
    const centers = await this.#integrateCenters({
      source: { mesh: 'execution', node: 'execution-pipeline' },
      type: 'execution',
      payload: response,
      address: response.canonicalAddress ?? organism.output.address,
      parentId: execution.envelope.id,
      relationalContext: {
        strategy: response.strategy,
        scaleLadder: response.scaleLadder,
        fiveLevelProjection: response.fiveLevelProjection,
        observerFrame: context.observerFrame ?? null,
      },
    });
    const destinations = [];
    for (const target of ['learning', 'governance', 'semantic']) {
      destinations.push(await this.federation.transfer({
        from: { mesh: 'execution', node: 'execution-pipeline' }, to: target,
        type: 'execution-outcome', payload: response,
        relationalContext: { strategy: response.strategy, scaleLadder: response.scaleLadder },
        address: response.canonicalAddress, parentId: execution.envelope.id,
      }));
    }
    const returnFlow = await this.federation.transfer({
      from: { mesh: 'execution', node: 'execution-pipeline' },
      to: { mesh: 'organism', node: 'organism-outcome' },
      type: 'felt-execution-outcome', payload: response,
      relationalContext: { consumedByMeshes: destinations.map((item) => item.receipt.meshId) },
      address: response.canonicalAddress, parentId: execution.envelope.id,
    });
    return { ...response, organism: safe(organism.output), federation: { execution, centers, destinations, returnFlow } };
  }

  async #cultivate(node, payload, context = {}) {
    const cue = `cultivate ${node}`;
    const organism = await this.localMeshes.organism.run('pure-synthia', cue, { ...context, surface: 'cultivation' });
    const learning = await this.federation.transfer({
      from: { mesh: 'organism', node: 'pure-synthia' },
      to: { mesh: 'learning', node },
      type: 'cultivation-task',
      payload,
      relationalContext: {
        personId: context.personId ?? 'default-person',
        organismAddress: organism.output.address,
        physiology: organism.output.physiology,
      },
      address: organism.output.address,
      provenance: { source: 'Pure-Synthia.process', localEventId: organism.event.id },
    });
    const response = learning.receipt.output;
    const centers = await this.#integrateCenters({
      source: { mesh: 'learning', node },
      type: 'cultivation',
      payload: response,
      address: response.canonicalAddress ?? organism.output.address,
      parentId: learning.envelope.id,
      relationalContext: {
        operation: node,
        personId: context.personId ?? 'default-person',
        observerFrame: context.observerFrame ?? null,
      },
    });
    const destinations = [];
    for (const target of ['semantic', 'governance']) {
      destinations.push(await this.federation.transfer({
        from: { mesh: 'learning', node },
        to: target,
        type: 'cultivation-outcome',
        payload: response,
        relationalContext: { operation: node, personId: context.personId ?? 'default-person' },
        address: response.canonicalAddress ?? organism.output.address,
        parentId: learning.envelope.id,
      }));
    }
    const returnFlow = await this.federation.transfer({
      from: { mesh: 'learning', node },
      to: { mesh: 'organism', node: 'organism-outcome' },
      type: 'felt-cultivation-outcome',
      payload: response,
      relationalContext: { consumedByMeshes: destinations.map((entry) => entry.receipt.meshId) },
      address: response.canonicalAddress ?? organism.output.address,
      parentId: learning.envelope.id,
    });
    return { ...response, organism: safe(organism.output), federation: { learning, centers, destinations, returnFlow } };
  }

  async stateSpaceTask(input = {}, context = {}) {
    const operation = input?.operation ?? 'browse';
    const cue = `cultivate through state space ${operation}`;
    const organism = await this.localMeshes.organism.run('pure-synthia', cue, { ...context, surface: 'state-space-browser' });
    const target = this.centerBody.targetFor(input, organism.output.address?.gate ?? 1);
    const addressed = input.address ?? organism.output.address;
    const execution = await this.federation.transfer({
      from: { mesh: 'organism', node: 'pure-synthia' },
      to: { mesh: target.mesh, node: target.node },
      type: 'state-space-task',
      payload: input,
      relationalContext: {
        personId: context.personId ?? 'default-person',
        selectedCenter: target.center,
        selectedInstrument: target.node,
        fiveLevelProjection: this.system.addressResolver.projectFiveLevels(target.gate),
        physiology: organism.output.physiology,
      },
      address: addressed,
      provenance: { source: 'SynthiaRoleResolver/state-space-browser', localEventId: organism.event.id },
    });
    const stateSpaceOutput = execution.receipt.output;
    const response = Object.freeze({
      ok: stateSpaceOutput?.ok !== false,
      operation,
      form: 'state-space-browser',
      purpose: 'cultivation',
      backendUsed: false,
      center: target.center,
      gate: target.gate,
      instrumentId: target.node,
      output: safe(stateSpaceOutput),
      fiveLevelProjection: this.system.addressResolver.projectFiveLevels(target.gate),
    });
    const localCenterConsumption = await this.centerMeshes[target.center].run('center-field', response, {
      sourceMesh: target.mesh,
      type: 'state-space-outcome',
      address: addressed,
      relationalContext: { selectedInstrument: target.node, fiveLevelProjection: response.fiveLevelProjection },
    });
    const channelFlow = await this.channelBody.propagate({
      fromCenter: target.center,
      gate: target.gate,
      payload: response,
      address: addressed,
      parentId: execution.envelope.id,
      relationalContext: {
        selectedInstrument: target.node,
        observerFrame: context.observerFrame ?? null,
      },
    });
    const cultivation = this.system.cultivation.observe('state-space', response, {
      ...context,
      toolPath: ['state-space-browser', target.center, target.node, 'five-level-state-space', 'training-journal'],
    });
    const destinations = [];
    for (const destination of ['semantic', 'learning', 'governance']) {
      destinations.push(await this.federation.transfer({
        from: { mesh: target.mesh, node: target.node },
        to: destination,
        type: 'state-space-outcome',
        payload: { ...response, cultivation },
        relationalContext: {
          personId: context.personId ?? 'default-person',
          center: target.center,
          instrumentId: target.node,
          fiveLevelProjection: response.fiveLevelProjection,
        },
        address: addressed,
        parentId: execution.envelope.id,
      }));
    }
    const returnFlow = await this.federation.transfer({
      from: { mesh: target.mesh, node: target.node },
      to: { mesh: 'organism', node: 'organism-outcome' },
      type: 'felt-state-space-outcome',
      payload: response,
      relationalContext: { consumedByMeshes: destinations.map((entry) => entry.receipt.meshId) },
      address: addressed,
      parentId: execution.envelope.id,
    });
    return Object.freeze({
      ...response,
      cultivation,
      organism: safe(organism.output),
      federation: { execution, localCenterConsumption: safe(localCenterConsumption), channelFlow, destinations, returnFlow },
    });
  }

  /** Select a foreground Synthia role while every result remains cultivation. */
  async morph(task, context = {}) {
    const roleResolution = this.roleResolver.resolve(task, context);
    const role = roleResolution.primary;
    const operation = String(task?.operation ?? context.operation ?? '').toLowerCase();
    let result;
    if (role === 'execution-organ') {
      result = await this.executeArtifact(task?.artifact ?? task, context);
    } else if (role === 'state-space-browser') {
      result = await this.stateSpaceTask(task?.input ?? task, context);
    } else if (role === 'cultivation-learning') {
      if (operation === 'admit') result = await this.admit(task.piece ?? task, context);
      else if (operation === 'contact') result = await this.contact(task.entityIdA, task.entityIdB, task.options ?? {}, context);
      else if (operation === 'ingest-book') result = await this.ingestBook(task.spec ?? task, context);
      else if (operation === 'training' || operation === 'training-snapshot') result = { ok: true, training: this.trainingSnapshot() };
      else result = await this.water(task?.text ?? task, context);
    } else {
      result = await this.chat(typeof task === 'string' ? task : task?.message ?? task?.text ?? JSON.stringify(task), context);
    }
    return Object.freeze({
      ...result,
      identity: 'Synthia',
      cultivationPurpose: true,
      roleResolution,
    });
  }

  browseStateSpace(input = {}, context = {}) { return this.stateSpaceTask({ ...input, operation: input.operation ?? 'browse' }, context); }

  predict(state, options = {}, context = {}) { return this.stateSpaceTask({ operation: 'predict', state, options }, context); }

  chart(birthDate, birthTime, birthLocation = null, context = {}) {
    return this.stateSpaceTask({ operation: 'chart', birthDate, birthTime, birthLocation }, context);
  }

  tick(context = {}) { return this.stateSpaceTask({ operation: 'tick' }, context); }

  async water(text, context = {}) { return this.#cultivate('watering', { text }, context); }

  async admit(piece, context = {}) { return this.#cultivate('piece-admission', { piece }, context); }

  async contact(entityIdA, entityIdB, options = {}, context = {}) {
    return this.#cultivate('sentence-contact', { entityIdA, entityIdB, options }, context);
  }

  async ingestBook(spec, context = {}) { return this.#cultivate('book-ingest', spec, context); }

  trainingSnapshot() { return this.system.trainingSnapshot(); }

  instrument(id) { return this.system.instrument(id); }

  hands() {
    return Object.freeze({
      originalProcessHandsPreserved: this.baselineProcessCount,
      integratedHands: this.extensionHands,
      registeredLocalApps: this.system.appRegistry.list(),
      stateSpaceInstruments: this.stateSpaceRuntime.catalog(),
      nineCenters: this.centerBody.snapshot().centerMeshes,
      channelMeshes: this.channelBody.snapshot().channels,
      sharedNeuralOrgans: NEURAL_ORGAN_SPECS,
    });
  }

  /** Everything callable from the visible execution tray. */
  trayCatalog() {
    const entries = [
      ...this.extensionHands.map((hand) => ({
        kind: 'hand', id: hand.id, label: hand.id, capabilities: hand.capabilities,
      })),
      ...[...this.system.mesh.automata.values()].map((tool) => ({
        kind: 'semantic', id: tool.id, label: tool.id,
        capabilities: [...(tool.capabilities ?? [])],
      })),
      ...this.stateSpaceRuntime.catalog().map((instrument) => ({
        kind: 'state-space', id: instrument.id, label: instrument.id,
        center: instrument.center, gate: instrument.gate ?? null,
        capabilities: [...(instrument.capabilities ?? [])],
      })),
      ...this.system.appRegistry.list().map((app) => ({
        kind: 'registered-app', id: app.id, label: app.name,
        capabilities: [...app.capabilities], backendRequired: app.backendRequired,
      })),
      ...this.channelBody.channelSpecs.map((channel) => ({
        kind: 'channel', id: channel.id, label: `${channel.id} · ${channel.name}`,
        capabilities: ['coordinate-channel', 'five-dimensional-interaction'],
      })),
      ...CENTER_NAMES.map((center) => ({
        kind: 'center', id: center, label: center,
        capabilities: ['coordinate-center', 'share-relational-context'],
      })),
    ];
    return Object.freeze(entries.map((entry) => Object.freeze(entry)));
  }

  async executeTray({ kind, id, input = {}, context = {} } = {}) {
    if (!kind || !id) throw new TypeError('execution tray requires kind and id');
    let output;
    if (kind === 'hand') {
      const hand = this.extensionTargets.get(id);
      if (!hand) throw new Error(`unknown integrated hand: ${id}`);
      output = await hand.run(input, { ...context, surface: 'execution-tray' });
    } else if (kind === 'semantic') {
      const tool = this.system.instrument(id);
      if (!tool) throw new Error(`unknown semantic instrument: ${id}`);
      output = tool.run(input, { ...context, surface: 'execution-tray' });
    } else if (kind === 'state-space') {
      output = await this.stateSpaceRuntime.runInstrument(id, input, { ...context, surface: 'execution-tray' });
    } else if (kind === 'registered-app') {
      output = await this.executeArtifact({ appId: id, input }, { ...context, surface: 'execution-tray' });
    } else if (kind === 'channel') {
      const mesh = this.channelMeshes[id];
      if (!mesh) throw new Error(`unknown channel mesh: ${id}`);
      output = await mesh.run('channel-field', input, {
        ...context,
        address: context.address ?? { gate: Number(id.split('-')[0]), line: 1, dimension: 'Being' },
        relationalContext: context.relationalContext ?? {},
      });
    } else if (kind === 'center') {
      const mesh = this.centerMeshes[id];
      if (!mesh) throw new Error(`unknown center mesh: ${id}`);
      output = await mesh.run('center-field', input, { ...context, relationalContext: context.relationalContext ?? {} });
    } else {
      throw new RangeError(`unknown execution tray kind: ${kind}`);
    }
    return Object.freeze({
      ok: output?.ok !== false,
      kind,
      id,
      output: safe(output),
    });
  }

  wiringAudit() {
    const system = this.system.wiringAudit();
    const federation = this.federation.audit();
    const swarm = this.swarm.snapshot();
    const sameEngine = this.synthia.meshRuntime.engine === this.system.engine;
    const localCoordination = [...this.federation.meshes.values()]
      .every((mesh) => mesh.snapshot().edges.length > 0);
    const liveWorkerIds = new Set(swarm.workers.map((worker) => worker.id));
    const independentHands = this.extensionHands.every((hand) => hand.independentlyCallable && liveWorkerIds.has(hand.id));
    const stateSpaceManifest = this.stateSpaceRuntime.manifest();
    const centerSnapshot = this.centerBody.snapshot();
    const channelSnapshot = this.channelBody.snapshot();
    const stateSpaceCatalogIds = new Set(this.stateSpaceRuntime.catalog().map((entry) => entry.id));
    const mountedStateSpaceIds = new Set(
      Object.values(this.centerMeshes).flatMap((mesh) => [...mesh.nodes.keys()]),
    );
    const allStateSpaceInstrumentsMounted = [...stateSpaceCatalogIds].every((id) => mountedStateSpaceIds.has(id));
    const roleSnapshot = this.roleResolver.snapshot();
    const integrationChecks = {
      synthiaRoleResolver: typeof this.roleResolver?.resolve === 'function',
      allSynthiaIsCultivation: roleSnapshot.roles.every((role) => role.purpose === 'cultivation')
        && system.universalCultivation,
      stateSpaceBlended: this.system.addressResolver.stateSpace === this.stateSpaceRuntime.stateSpace,
      fiveLevelStateSpaceLive: stateSpaceManifest.fiveLevels.length === 5
        && this.system.addressResolver.projectFiveLevels(1).length === 5,
      nineCenterBody: centerSnapshot.centers === 9 && Object.keys(this.centerMeshes).length === 9,
      channelMeshBody: channelSnapshot.channelMeshes === 36 && Object.keys(this.channelMeshes).length === 36,
      canonicalGateGraph: channelSnapshot.gateNodes === 64 && channelSnapshot.graphSageLayers === 3,
      fourNeuralOrgans: channelSnapshot.neuralOrgans === 4 && channelSnapshot.baseNeuralForms.length === 4,
      dimensionRelativeChannelInteractions: channelSnapshot.dimensionalInteractionLevels === 5,
      differentiationInquiryLive: channelSnapshot.differentiationPointStatus === 'OPEN_QUESTION'
        && channelSnapshot.fixedDifferentiationBoundaries === false,
      higherScaleOppositeEquivalence: channelSnapshot.channelRelationModel?.name === 'opposite-equivalent'
        && channelSnapshot.channelRelationModel?.scope === 'higher-order-channel-composite'
        && channelSnapshot.channelRelationModel?.gatePrimitiveEquivalence === false
        && channelSnapshot.channelRelationModel?.identicalState === false
        && channelSnapshot.channelRelationModel?.canonicalArcAxis === false,
      neuralArchitectureFamilies: channelSnapshot.neuralArchitectureFamilies === 36,
      allCanonicalChannelsMounted: channelSnapshot.channels.every((channel) => this.channelMeshes[channel.id]?.nodes.size >= 7),
      channelKnowledgeInStateSpace: channelSnapshot.indexedChannelKnowledgeEntries === 360,
      centerToolEmergence: typeof this.centerBody?.mountEmergentTool === 'function',
      allStateSpaceInstrumentsMounted,
      stateSpaceSourceModules: stateSpaceManifest.executableSourceModules === 103,
      stateSpaceKnowledgeLoaded: stateSpaceManifest.knowledgeSources === 30
        && stateSpaceManifest.knowledgeCharacters > 0,
      stateSpaceBrowser: this.system.appRegistry.resolve({ appId: 'synthia-sovereign' })?.backendRequired === false,
      executionTray: typeof this.trayCatalog === 'function' && typeof this.executeTray === 'function'
        && this.trayCatalog().length > 0,
      frontScreenSurface: typeof this.chat === 'function' && typeof this.executeArtifact === 'function',
    };
    return Object.freeze({
      ...system,
      ...integrationChecks,
      ok: system.ok && federation.ok && sameEngine && localCoordination && independentHands
        && Object.values(integrationChecks).every(Boolean)
        && swarm.processCount >= this.baselineProcessCount,
      oneSemanticEngine: sameEngine,
      baselineProcessCount: this.baselineProcessCount,
      liveProcessCount: swarm.processCount,
      localMeshes: federation.localMeshes,
      meshOfMeshes: federation.ok,
      crossMeshContextConsumption: federation.transfers === federation.consumedTransfers,
      localMeshCoordination: localCoordination,
      independentHands,
      integratedHandCount: this.extensionHands.length,
      synthiaRoles: roleSnapshot.roles.length,
      activeRoleSelections: roleSnapshot.selections,
      stateSpaceManifest,
      centerBody: centerSnapshot,
      channelBody: channelSnapshot,
      federation,
    });
  }
}

export default FederatedSynthia;
