// src/operators/bundle.js
/**
 * o_bundle: simultaneous feature composition.
 * Mathematical mapping: o_bundle(p_1, ..., p_n) -> X
 * Preserves identities of all constituents rather than replacing with opaque label.
 */
import { Operator } from "../core/operator.js";

export function createBundleOperator() {
  return new Operator({
    id: "o_bundle",
    arity: 2,
    accepts: (operands, context) => {
      // All operands must be primitives or composites at the same scale
      if (operands.length < 2) return false;
      const scale = operands[0].scale;
      return operands.every(op => op.scale === scale);
    },
    transform: (operands, context) => {
      // Return a bundle descriptor that preserves all constituent identities
      const members = operands.map((op, idx) => ({
        position: idx,
        stateId: op.id,
        identity: op.identity,
        contrast: op.contrast,
      }));
      return {
        operator: "o_bundle",
        members,
        scale: operands[0].scale,
        context: { ...context },
      };
    },
    invariants: ["constituent_identity_preservation", "scale_uniformity"],
    scales: ["sub-phonemic", "phonemic", "morphemic", "lexical"],
    evidence: [],
  });
}
