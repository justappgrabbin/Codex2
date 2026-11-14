// src/operators/recurse.js
/**
 * o_recurse: apply an operator recursively to nested structures.
 * Mathematical mapping: recurse(o, X) -> o applied at each level of X
 */
import { Operator } from "../core/operator.js";

export function createRecurseOperator() {
  return new Operator({
    id: "o_recurse",
    arity: 2,
    accepts: (operands, context) => {
      // operands[0] = operator, operands[1] = composite with children
      return operands.length === 2 &&
             operands[0] && operands[0].apply &&
             operands[1] && (operands[1].children || Array.isArray(operands[1]));
    },
    transform: (operands, context) => {
      const op = operands[0];
      const target = operands[1];
      const children = target.children || (Array.isArray(target) ? target : [target]);

      const results = [];
      for (let i = 0; i < children.length; i += op.arity) {
        const chunk = children.slice(i, i + op.arity);
        if (chunk.length === op.arity) {
          try {
            results.push(op.apply(chunk, context));
          } catch (e) {
            results.push({ error: e.message, chunk });
          }
        }
      }

      return {
        operator: "o_recurse",
        innerOperator: op.id,
        input: target.id || target,
        results,
        resultCount: results.length,
        context: { ...context },
      };
    },
    invariants: ["recursion_depth_limited", "operator_preservation"],
    scales: ["morphemic", "lexical", "phrasal", "clausal", "automaton"],
    evidence: [],
  });
}
