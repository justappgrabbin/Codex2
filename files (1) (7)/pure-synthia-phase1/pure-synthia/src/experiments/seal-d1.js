import { writeFileSync, mkdirSync } from "node:fs";
import { contentHash } from "../core/hash.js";
import { buildFeatureRegistry, split, discoverySplit, testSplit, goldPhonemes } from "../datasets/d1-phonemes.js";
import { runReconstructionExperiment } from "./reconstruction.js";
import { runCompressionExperiment } from "./compression.js";
import { runAblationExperiment } from "./ablation.js";
import { assumptions, assumptionsManifestHash } from "./assumptions.js";

/**
 * Seals D1 as an immutable experimental artifact.
 *
 * "Immutable" here means: this script recomputes everything from the
 * frozen dataset/grammar rather than reading a previous run's output,
 * and the resulting manifest's own contentHash is included in the
 * artifact so any later modification is detectable (re-hashing would
 * no longer match manifestHash). It does not mean the file is
 * OS-level read-only — that's outside this repo's scope.
 *
 * TEST_COUNT below must be updated by hand if tests are added/removed
 * — it is not auto-discovered, and that limitation is disclosed
 * rather than silently assumed accurate (A-D1-06).
 */
const TEST_COUNT_AT_SEAL_TIME = 47;

export function sealD1() {
  // --- Dataset hash ---
  const datasetHash = contentHash({ discoverySplit, testSplit, goldPhonemes });

  // --- Grammar/operator hash ---
  const featureRegistry = buildFeatureRegistry();
  const featureDescriptors = featureRegistry
    .all()
    .map((p) => ({ id: p.id, identity: p.identity, scale: p.scale }))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const operatorDescriptors = [{ id: "o_bundle3", arity: 3, kind: "bundle" }];
  const grammarHash = contentHash({ features: featureDescriptors, operators: operatorDescriptors });

  // --- Run all three experiments fresh ---
  const reconstruction = runReconstructionExperiment();
  const compression = runCompressionExperiment();
  const ablation = runAblationExperiment();

  const artifactBody = {
    tier: "D1",
    sealedAt: "phase1-increment3", // logical checkpoint label, not a wall-clock timestamp (keeps the artifact content-deterministic)
    datasetHash,
    grammarHash,
    reconstruction: {
      hypothesis: reconstruction.hypothesis,
      discoverySplit: reconstruction.discoverySplit,
      testSplit: reconstruction.testSplit,
      metrics: reconstruction.metrics,
      discoveryDerivations: reconstruction.discoveryDerivations,
      results: reconstruction.results,
    },
    compression: {
      scheme: compression.scheme,
      raw: compression.raw,
      compressionGain: compression.compressionGain,
    },
    ablation: {
      performanceMetric: ablation.performanceMetric,
      performanceBaseline: ablation.performanceBaseline,
      results: ablation.results,
    },
    assumptions,
    assumptionsManifestHash: assumptionsManifestHash(),
    testCountAtSealTime: TEST_COUNT_AT_SEAL_TIME,
  };

  const manifestHash = contentHash(artifactBody);

  const sealed = Object.freeze({ ...artifactBody, manifestHash });
  return sealed;
}

export function writeSealedD1(outPath = "artifacts/D1-SEALED.json") {
  const sealed = sealD1();
  mkdirSync(new URL("../../artifacts", import.meta.url), { recursive: true });
  writeFileSync(new URL(`../../${outPath}`, import.meta.url), JSON.stringify(sealed, null, 2));
  return sealed;
}
