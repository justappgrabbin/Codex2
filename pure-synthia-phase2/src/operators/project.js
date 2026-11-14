// src/operators/project.js
/**
 * o_project: project a composite onto a specific dimension or scale.
 * Mathematical mapping: project(X, dimension) -> X^(D_j)
 * Per §8: X^(D_j) = T_{i->j}(X^(D_i))
 */
import { Operator } from "../core/operator.js";

export function createProjectOperator() {
  return new Operator({
    id: "o_project",
    arity: 2,
    accepts: (operands, context) => {
      // operands[0] = composite or primitive, operands[1] = dimension string
      return operands.length === 2 &&
             typeof operands[1] === "string" ||
             (operands[1] && operands[1].identity);
    },
    transform: (operands, context) => {
      const target = operands[0];
      const dimension = typeof operands[1] === "string" ? operands[1] : operands[1].identity;
      return {
        operator: "o_project",
        original: target.id || target,
        dimension,
        projection: {
          identity: target.identity || target,
          dimension,
          scale: target.scale || "unknown",
          candidateDimension: dimension,
        },
        context: { ...context },
      };
    },
    invariants: ["identity_preservation", "dimension_tagging"],
    scales: ["phonemic", "morphemic", "lexical", "phrasal", "clausal", "automaton"],
    evidence: [],
  });
}
