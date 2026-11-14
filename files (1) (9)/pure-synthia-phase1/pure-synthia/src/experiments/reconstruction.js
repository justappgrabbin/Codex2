import { OperatorRegistry } from "../core/operator.js";
import { createBundleOperator } from "../operators/bundle.js";
import { SynthiaEngine } from "../engine/synthia.js";
import { buildFeatureRegistry, split } from "../datasets/d1-phonemes.js";

/**
 * runReconstructionExperiment()
 *
 * Implements H.16 items 5 (held-out reconstruction) and 6 (unseen
 * composition test), scoped to the D1 tier, per H-D1-01's hypothesis
 * (assumptions.js).
 *
 * Protocol (mirrors §H.1's Experimental Principle):
 *   1. "Discovery": run o_bundle3 over every discovery-split phoneme's
 *      gold features. Record each derivation's content hash into a
 *      StoredSolutions set — this is the *only* legitimate way a
 *      solution becomes "stored" (§15).
 *   2. "Test": run the identical o_bundle3 operator over each held-out
 *      phoneme's gold features. The engine is never told which
 *      phoneme it is composing — only the three feature ids, which
 *      is exactly the information a real decomposition step would
 *      hand it.
 *   3. Score: Acc (§H.8), NCR (§H.8), and explicitly check no test
 *      derivation hash collides with a StoredSolutions hash.
 *
 * Returns a manifest-shaped object (§H.15) rather than just a number,
 * so a failing run is inspectable, not just a boolean.
 */
export function runReconstructionExperiment() {
  const primitives = buildFeatureRegistry();
  const operators = new OperatorRegistry();
  operators.register(createBundleOperator({ id: "o_bundle3", arity: 3 }));
  const engine = new SynthiaEngine({ primitiveRegistry: primitives, operatorRegistry: operators });

  const { discovery, test } = split();

  // --- Step 1: discovery run, builds StoredSolutions ---
  const storedSolutions = new Set();
  const discoveryDerivations = [];
  for (const item of discovery) {
    const { derivation } = engine.execute({ operatorId: "o_bundle3", primitiveIds: item.features });
    storedSolutions.add(derivation.id);
    discoveryDerivations.push({ id: item.id, derivationId: derivation.id });
  }

  // --- Step 2: test run over held-out phonemes ---
  const results = test.map((item) => {
    const { derivation } = engine.execute({ operatorId: "o_bundle3", primitiveIds: item.features });

    const generatedMemberIds = derivation.output.members.map((m) => m.stateId).sort();
    const expectedMemberIds = [...item.features].sort();
    const structurallyCorrect =
      generatedMemberIds.length === expectedMemberIds.length &&
      generatedMemberIds.every((id, i) => id === expectedMemberIds[i]);

    const wasStored = storedSolutions.has(derivation.id);

    return {
      id: item.id,
      derivationId: derivation.id,
      structurallyCorrect,
      wasStored, // must be false for a genuine unseen-composition pass
      genuinelyUnseen: structurallyCorrect && !wasStored,
    };
  });

  // --- Step 3: score (§H.8) ---
  const nTest = results.length;
  const nCorrect = results.filter((r) => r.structurallyCorrect).length;
  const nCorrectNotStored = results.filter((r) => r.genuinelyUnseen).length;

  const metrics = {
    generationAccuracy: nTest === 0 ? null : nCorrect / nTest, // Acc, §H.8
    novelCompositionRate: nCorrect === 0 ? null : nCorrectNotStored / nCorrect, // NCR, §H.8
  };

  return {
    hypothesis: "H-D1-01",
    dataset: "D1-phonemes",
    discoverySplit: discovery.map((d) => d.id),
    testSplit: test.map((d) => d.id),
    discoveryDerivations,
    results,
    metrics,
    // §H.15 manifest fields
    grammarVersion: "phase1.0",
    operators: ["o_bundle3"],
    controls: [], // none run yet — flat-lookup/random-grammar controls are the next increment, not this one
  };
}
