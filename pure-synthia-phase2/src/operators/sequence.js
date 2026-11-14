// src/operators/sequence.js
/**
 * o_sequence: ordered composition with positional index.
 * Mathematical mapping: o_sequence(A, B) != o_sequence(B, A)
 * Position is part of the generated state, not UI metadata.
 */
import { Operator } from "../core/operator.js";

export function createSequenceOperator() {
  return new Operator({
    id: "o_sequence",
    arity: 2,
    accepts: (operands, context) => {
      // Sequences can combine primitives or composites across compatible scales
      return operands.length === 2;
    },
    transform: (operands, context) => {
      const members = operands.map((op, idx) => ({
        position: idx,
        stateId: op.id,
        identity: op.identity || op.id,
      }));
      return {
        operator: "o_sequence",
        members,
        scale: `composite_${Math.max(...operands.map(o => {
          const s = String(o.scale);
          const m = s.match(/composite_(\d+)/);
          return m ? parseInt(m[1]) : 0;
        })) + 1}`,
        context: { ...context },
      };
    },
    positionalRule: "order_preserving",
    invariants: ["order_sensitivity", "position_embedding"],
    scales: ["phonemic", "morphemic", "lexical", "phrasal", "clausal"],
    evidence: [],
  });
}
