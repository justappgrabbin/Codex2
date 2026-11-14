import { Operator } from "../core/operator.js";
import { Primitive } from "../core/primitive.js";
import { Composite } from "../core/composite.js";

/**
 * o_sequence — ordered composition (§I.6).
 *
 * o_sequence(A, B) != o_sequence(B, A) unless an independently
 * discovered symmetry demonstrates otherwise (§C.4). Position is
 * part of the generated state, not incidental UI metadata.
 */
export const o_sequence = new Operator({
  id: "o_sequence",
  arity: 2,
  scales: [],
  accepts(operands) {
    return operands.every((x) => x instanceof Primitive || x instanceof Composite);
  },
  transform(operands) {
    return {
      operator: "o_sequence",
      kind: "sequence",
      members: operands.map((state, position) => ({
        position,
        stateId: state.id,
      })),
    };
  },
});
