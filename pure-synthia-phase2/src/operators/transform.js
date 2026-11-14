// src/operators/transform.js
/**
 * o_transform: apply a registered transformation rule.
 * Mathematical mapping: transform(X, rule) -> Y where Y = F(X, C)
 */
import { Operator } from "../core/operator.js";

export function createTransformOperator() {
  return new Operator({
    id: "o_transform",
    arity: 2,
    accepts: (operands, context) => {
      // operands[0] = state, operands[1] = transformation rule
      return operands.length === 2 &&
             (operands[1] && (operands[1].rule || typeof operands[1] === "function"));
    },
    transform: (operands, context) => {
      const target = operands[0];
      const rule = operands[1];
      const ruleFn = typeof rule === "function" ? rule : rule.transform;
      const result = ruleFn ? ruleFn(target, context) : target;

      return {
        operator: "o_transform",
        original: target.id || target,
        rule: rule.id || "anonymous",
        result: result.id || result,
        context: { ...context },
      };
    },
    invariants: ["rule_applicability"],
    scales: ["sub-phonemic", "phonemic", "morphemic", "lexical", "automaton"],
    evidence: [],
  });
}
