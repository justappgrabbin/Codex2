import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  FederatedSynthia,
  Primitive,
  runD1Benchmark,
  runD2Benchmark,
  runD3Benchmark,
} from '../src/index.mjs';

const authorities = {
  '01-SynthAI-Exact-Address-Recall-PATCH.zip': 'feb74171d99a011307f8b497247ae732e02fd9cbdc0f0e32aea9d65444f23468',
  '02-synthia-core-v1.0.0.zip': '22944ae853ca73dc7ac5c1b9cdf06af6e560b7dab6140975b3df3f610a5d7095',
  '03-Synthia-Codex-Provider-Runtime-v0.1.1.zip': '1def70a163b159a05851465b0cdec49b4c62a2356b1ec4e526554cbbbc91e9c0',
  '04-Pure-Synthia-Trainable-Assembly-v0.4.2.zip': 'cee899ef720a0e1776f525c959b6e12404a74dd3b4547da7caf34dff5febcc46',
  '05-Synthia-Universal-Execution-Spine-v0.4.0.zip': '4b407881be4324860d09e3c743b5d518d35b8f0daa0831545a6c7e2b3c62c6af',
  '06-Kimi_Agent_Automata-State-Space-Merge-1-.zip': 'fa3344dac6f8c4b2e838b9146ca5c6d339e1fc4ec0bb7aa15c3259724beff3fd',
};

for (const [name, expected] of Object.entries(authorities)) {
  const bytes = await readFile(new URL(`../authorities/originals/${name}`, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, name);
}

for (const report of [runD1Benchmark(), runD2Benchmark(), runD3Benchmark()]) {
  assert.equal(report.reproduction.status, 'match');
  assert.equal(report.reproduction.mismatchCount, 0);
}

const synthia = await FederatedSynthia.create();
const chat = await synthia.chat('The player moves toward the goal.', { personId: 'verify-person' });
assert.equal(chat.pipelineTrace.length, 7);
assert.ok(chat.pipelineTrace.every((entry) => entry.consumed));

const internal = await synthia.executeArtifact({ name: 'verify.json', content: '{"ok":true}' }, { personId: 'verify-person' });
assert.equal(internal.strategy, 'internal');
assert.equal(internal.bridgeUsed, false);
const livePrimitives = synthia.system.addressResolver.descend({ name: 'verify-live.json', content: '{"ok":true}' });
assert.ok(livePrimitives.every((primitive) => primitive instanceof Primitive));
assert.ok(internal.scaleLadder[0].primitives.every((primitive) => primitive.scale === 'bit'));
assert.equal(internal.fiveLevelProjection.length, 5);

const originalLog = console.log;
console.log = () => {};
let game;
try {
  game = await synthia.executeArtifact({
    appId: 'gamegan',
    input: { operation: 'generate-frame', action: 1, seed: 2 },
  }, { personId: 'verify-person' });
} finally {
  console.log = originalLog;
}
assert.equal(game.strategy, 'internal');
assert.equal(game.bridgeUsed, false);
assert.equal(game.backendUsed, false);

const stateSpace = await synthia.morph({ operation: 'five-levels', gate: 1 }, { personId: 'verify-person' });
assert.equal(stateSpace.roleResolution.primary, 'state-space-browser');
assert.equal(stateSpace.fiveLevelProjection.length, 5);
assert.ok(stateSpace.federation.channelFlow.every((entry) =>
  entry.intake.receipt.consumed && entry.delivery.receipt.consumed));

const channelField = synthia.channelBody.snapshot();
assert.equal(channelField.channelMeshes, 36);
assert.equal(channelField.gateNodes, 64);
assert.equal(channelField.graphSageLayers, 3);
assert.equal(channelField.neuralOrgans, 4);
assert.equal(channelField.baseNeuralForms.length, 4);
assert.equal(channelField.neuralArchitectureFamilies, 36);
assert.equal(channelField.dimensionalInteractionLevels, 5);
assert.equal(channelField.fixedDifferentiationBoundaries, false);
assert.equal(channelField.channelRelationModel.name, 'opposite-equivalent');
assert.equal(channelField.channelRelationModel.scope, 'higher-order-channel-composite');
assert.equal(channelField.channelRelationModel.gatePrimitiveEquivalence, false);
assert.equal(channelField.channelRelationModel.canonicalArcAxis, false);
assert.equal(channelField.indexedChannelKnowledgeEntries, 360);

const sovereign = await synthia.executeArtifact({
  appId: 'synthia-sovereign',
  input: { operation: 'predict', state: { ben: 25, lines: [7, 7, 7, 9, 7, 7] } },
}, { personId: 'verify-person' });
assert.equal(sovereign.strategy, 'internal');
assert.equal(sovereign.bridgeUsed, false);
assert.equal(sovereign.backendUsed, false);

const audit = synthia.wiringAudit();
assert.equal(audit.ok, true);
assert.equal(audit.oneSemanticEngine, true);
assert.equal(audit.meshOfMeshes, true);
assert.equal(audit.crossMeshContextConsumption, true);
assert.equal(audit.localMeshCoordination, true);
assert.equal(audit.independentHands, true);
assert.equal(audit.allSynthiaIsCultivation, true);
assert.equal(audit.fiveLevelStateSpaceLive, true);
assert.equal(audit.nineCenterBody, true);
assert.equal(audit.channelMeshBody, true);
assert.equal(audit.canonicalGateGraph, true);
assert.equal(audit.fourNeuralOrgans, true);
assert.equal(audit.dimensionRelativeChannelInteractions, true);
assert.equal(audit.differentiationInquiryLive, true);
assert.equal(audit.higherScaleOppositeEquivalence, true);
assert.equal(audit.neuralArchitectureFamilies, true);
assert.equal(audit.allCanonicalChannelsMounted, true);
assert.equal(audit.channelKnowledgeInStateSpace, true);
assert.equal(audit.allStateSpaceInstrumentsMounted, true);
assert.equal(audit.localMeshes, 51);
assert.equal(audit.federation.links, 2550);
assert.equal(audit.liveProcessCount, 113);
assert.equal(audit.integratedHandCount, 66);
assert.equal(audit.meshCoordinator, true);
assert.ok(audit.meshCoordinatorRuns > 0);
assert.equal(audit.exactAddressRecall, true);
assert.equal(audit.anticipatoryMemory, true);
assert.equal(audit.executionTray, true);
assert.equal(audit.frontScreenSurface, true);

console.log(JSON.stringify({
  status: 'PASS',
  authorityArchives: Object.keys(authorities).length,
  sealedScaleBenchmarks: ['D1', 'D2', 'D3'],
  baselineProcesses: synthia.baselineProcessCount,
  liveProcesses: synthia.swarm.snapshot().processCount,
  integratedHands: synthia.hands().integratedHands.map((hand) => hand.id),
  localMeshes: audit.localMeshes,
  channelMeshes: channelField.channelMeshes,
  neuralOrgans: channelField.neuralOrgans,
  dimensionalInteractionLevels: channelField.dimensionalInteractionLevels,
  crossMeshTransfers: audit.federation.transfers,
  chatStages: chat.pipelineTrace.map((entry) => entry.stage),
  execution: {
    jsonStrategy: internal.strategy,
    gameganStrategy: game.strategy,
    gameganBackendUsed: game.backendUsed,
    stateSpaceStrategy: sovereign.strategy,
    stateSpaceBackendUsed: sovereign.backendUsed,
  },
  wiringAudit: audit,
}, null, 2));
