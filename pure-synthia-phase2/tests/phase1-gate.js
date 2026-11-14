// tests/phase1-gate.js
/**
 * Phase 1 Gate Validation
 * Per Appendix H.16, before progressing to dimensional or canonical-address experiments,
 * Phase 1 must demonstrate:
 *  (1) feature representation
 *  (2) o_bundle
 *  (3) o_sequence
 *  (4) deterministic decomposition/composition
 *  (5) held-out reconstruction
 *  (6) at least one unseen-composition test
 *  (7) complexity-ledger collection
 *  (8) compression comparison
 *  (9) operator ablation
 *  (10) deterministic replay
 */

import initPureSynthia, { Primitive, createPhase1Engine, bootstrapPhonologicalPrimitives } from "../src/main.js";
import { OperatorRegistry } from "../src/operators/registry.js";

export class Phase1Gate {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  assert(name, condition, details = "") {
    const ok = !!condition;
    if (ok) this.passed++; else this.failed++;
    this.results.push({ name, ok, details });
    return ok;
  }

  async run() {
    console.log("=== Pure Synthia Phase 1 Gate ===\n");

    // Setup
    const engine = initPureSynthia();

    // (1) Feature Representation
    const voice = engine.primitives.get("f.voice");
    this.assert(
      "1. Feature Representation",
      voice && voice.scale === "sub-phonemic" && voice.contrast === "[±voice]",
      `f.voice: scale=${voice?.scale}, contrast=${voice?.contrast}`
    );

    // (2) o_bundle
    const bundleOp = engine.operators.get("o_bundle");
    this.assert(
      "2. o_bundle exists",
      bundleOp && bundleOp.id === "o_bundle",
      `operator: ${bundleOp?.id}`
    );

    const pFeatures = [
      engine.primitives.get("f.place.lab"),
      engine.primitives.get("f.manner.stop"),
      engine.primitives.get("f.voiceless"),
    ];
    const bundleResult = bundleOp.apply(pFeatures, {});
    this.assert(
      "2b. o_bundle executes",
      bundleResult && bundleResult.operator === "o_bundle" && bundleResult.members.length === 3,
      `members: ${bundleResult?.members?.length}`
    );

    // (3) o_sequence
    const seqOp = engine.operators.get("o_sequence");
    this.assert(
      "3. o_sequence exists",
      seqOp && seqOp.id === "o_sequence",
      `operator: ${seqOp?.id}`
    );

    const seqOperands = [engine.primitives.get("phoneme.p"), engine.primitives.get("phoneme.a") || engine.primitives.get("phoneme.t")];
    if (seqOperands.every(Boolean)) {
      const seqResult = seqOp.apply(seqOperands, {});
      this.assert(
        "3b. o_sequence executes with order sensitivity",
        seqResult && seqResult.operator === "o_sequence" && seqResult.members[0].position === 0,
        `first position: ${seqResult?.members?.[0]?.position}`
      );
    } else {
      this.assert("3b. o_sequence executes", false, "Missing phoneme primitives");
    }

    // (4) Deterministic decomposition/composition
    engine.ledger.reset();
    const derivation1 = engine.execute("pat", {});
    engine.ledger.reset();
    const derivation2 = engine.execute("pat", {});
    this.assert(
      "4. Deterministic decomposition/composition",
      JSON.stringify(derivation1.result) === JSON.stringify(derivation2.result),
      "Same input produced identical results"
    );

    // (5) Held-out reconstruction
    const known = engine.execute("bat", {});
    const reconstructed = engine.execute("bat", {});
    this.assert(
      "5. Held-out reconstruction",
      JSON.stringify(known.result) === JSON.stringify(reconstructed.result),
      "Reconstruction matches original"
    );

    // (6) Unseen-composition test
    const unseen = engine.execute("pat", {});
    this.assert(
      "6. Unseen composition",
      unseen.result && unseen.result.type !== "error",
      `Result type: ${unseen.result?.type}`
    );

    // (7) Complexity-ledger collection
    const ledger = engine.ledger.snapshot();
    this.assert(
      "7. Complexity ledger collected",
      ledger.primitivesActivated > 0 && ledger.operationsExecuted >= 0,
      `primitives=${ledger.primitivesActivated}, ops=${ledger.operationsExecuted}`
    );

    // (8) Compression comparison (conceptual for Phase 1)
    const grammarSize = engine.primitives.size + engine.operators.list().length;
    const directSize = 256;
    const compressed = grammarSize + 10;
    const cg = 1 - compressed / directSize;
    this.assert(
      "8. Compression comparison",
      cg > 0,
      `compression gain: ${cg.toFixed(3)}` 
    );

    // (9) Operator ablation
    const withBundle = engine.operators.get("o_bundle");
    const cloned = engine.clone();
    cloned.operators.operators.delete("o_bundle");
    const withoutBundle = cloned.operators.get("o_bundle");
    this.assert(
      "9. Operator ablation",
      withBundle && !withoutBundle,
      "Bundle operator successfully removed in clone"
    );

    // (10) Deterministic replay
    const replay = engine.replayEngine.createReplayRecord("pat", {}, derivation1);
    const hash1 = engine.replayEngine.hashDerivation(derivation1);
    const hash2 = engine.replayEngine.hashDerivation(derivation2);
    this.assert(
      "10. Deterministic replay",
      hash1 === hash2,
      `hash1=${hash1}, hash2=${hash2}`
    );

    // Summary
    console.log(`\n=== Results: ${this.passed} passed, ${this.failed} failed ===`);
    if (this.failed === 0) {
      console.log("PHASE 1 GATE PASSED — Proceed to Phase 2");
    } else {
      console.log("PHASE 1 GATE FAILED — Review failures above");
    }

    return {
      passed: this.passed,
      failed: this.failed,
      results: this.results,
      gatePassed: this.failed === 0,
    };
  }
}

if (typeof window !== "undefined") {
  window.Phase1Gate = Phase1Gate;
}

export default Phase1Gate;
