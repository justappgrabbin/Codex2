import { Ledger } from "../derivation/ledger.js";
import { buildDerivation } from "../derivation/derivation.js";
import { deriveCompositeId, Composite } from "../core/composite.js";

const ENGINE_VERSION = "0.1.0";

/**
 * Phase-1 SynthiaEngine (§I.12, scoped).
 *
 * The full spec's execute() pipeline is
 *   Input -> Decomposition -> Primitive Resolution -> Operator Selection
 *   -> Topology Activation -> Composition -> Transformation -> Output -> Evaluation
 *
 * Phase 1 does not yet implement automatic decomposition/operator-selection
 * over raw input (that is real NLP/discovery work, later in the roadmap —
 * §I.18 puts Datasets/Experiments/Metrics/Ablation *after* this baseline).
 * This engine implements the part of the pipeline Phase 1's gate (H.16)
 * actually requires: given explicit primitive ids and an explicit operator,
 * deterministically compose them and produce a complete Δ(Y).
 */
export class SynthiaEngine {
  constructor({ primitiveRegistry, operatorRegistry, grammarVersion = "phase1.0", operatorVersion = "phase1.0" }) {
    this.primitives = primitiveRegistry;
    this.operators = operatorRegistry;
    this.grammarVersion = grammarVersion;
    this.operatorVersion = operatorVersion;
  }

  /**
   * execute({ operatorId, primitiveIds, context }) -> { derivation, composite }
   *
   * Deterministic: no Math.random/Date.now anywhere in this path (I.3's
   * determinism requirement). Recursion depth is 1 for a single operator
   * application; composing a Composite's id back in as an operand for a
   * further application is how deeper recursion (D_r > 1) is achieved.
   */
  execute({ operatorId, primitiveIds, context = {} }) {
    const ledger = new Ledger();

    // Primitive Resolution
    const operands = primitiveIds.map((id) => this.primitives.get(id));
    ledger.recordPrimitiveActivation(operands.length);

    // Operator Selection (explicit in Phase 1; discovery is a later phase)
    const operator = this.operators.get(operatorId);

    // Composition / Transformation
    const output = operator.apply(operands, context);
    ledger.recordOperation(1);
    ledger.setRecursionDepth(1);

    const compositeId = deriveCompositeId({
      scale: output.kind,
      children: primitiveIds,
      operatorId,
      context,
    });

    const derivation = buildDerivation({
      engineVersion: ENGINE_VERSION,
      grammarVersion: this.grammarVersion,
      operatorVersion: this.operatorVersion,
      input: { primitiveIds, operatorId, context },
      primitiveIds,
      operatorId,
      relations: [],
      context,
      transforms: [output.kind],
      output,
      ledger: ledger.snapshot(),
    });

    ledger.recordStateGenerated(1);

    const composite = new Composite({
      id: compositeId,
      scale: output.kind,
      children: primitiveIds,
      operatorId,
      context,
      derivationId: derivation.id,
    });

    return { derivation, composite, ledger: ledger.snapshot() };
  }
}
