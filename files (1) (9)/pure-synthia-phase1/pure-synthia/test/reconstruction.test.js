import { test } from "node:test";
import assert from "node:assert/strict";
import { runReconstructionExperiment } from "../src/experiments/reconstruction.js";

/**
 * Pre-registered thresholds (§H.5 discipline: fixed BEFORE reading
 * results, not adjusted after). Written into this test before the
 * experiment file above was ever executed against these numbers.
 *
 *   generationAccuracy   >= 1.0   (both held-out phonemes must
 *                                   reconstruct structurally correctly
 *                                   — anything less on a 2-item test
 *                                   set means the mechanism is broken,
 *                                   not "mostly working")
 *   novelCompositionRate == 1.0   (every correct output must be
 *                                   genuinely unstored — a partial
 *                                   score here would mean the
 *                                   StoredSolutions check itself is
 *                                   broken, since discovery and test
 *                                   sets are disjoint by construction)
 */
const THRESHOLD_ACC = 1.0;
const THRESHOLD_NCR = 1.0;

test("held-out reconstruction experiment meets pre-registered thresholds (H.16 #5, #6 / H.5)", () => {
  const manifest = runReconstructionExperiment();

  assert.equal(manifest.discoverySplit.length, 8);
  assert.equal(manifest.testSplit.length, 2);
  assert.deepEqual(manifest.testSplit, ["g", "v"]);

  // Report actual numbers regardless of pass/fail — this assertion
  // message is what "honest reporting" looks like if it ever fails.
  const { generationAccuracy, novelCompositionRate } = manifest.metrics;

  assert.ok(
    generationAccuracy >= THRESHOLD_ACC,
    `generationAccuracy ${generationAccuracy} fell below pre-registered threshold ${THRESHOLD_ACC}`,
  );
  assert.ok(
    novelCompositionRate >= THRESHOLD_NCR,
    `novelCompositionRate ${novelCompositionRate} fell below pre-registered threshold ${THRESHOLD_NCR}`,
  );
});

test("no held-out derivation id collides with a discovery derivation id (structural non-storage check)", () => {
  const manifest = runReconstructionExperiment();
  const storedIds = new Set(manifest.discoveryDerivations.map((d) => d.derivationId));
  for (const r of manifest.results) {
    assert.equal(storedIds.has(r.derivationId), false, `${r.id}'s derivation matched a stored discovery derivation`);
  }
});

test("held-out phonemes reconstruct their exact gold feature set, not a superset/subset", () => {
  const manifest = runReconstructionExperiment();
  for (const r of manifest.results) {
    assert.equal(r.structurallyCorrect, true, `${r.id} did not reconstruct its gold feature bundle`);
  }
});
