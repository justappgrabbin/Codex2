import { Operator } from "../core/operator.js";
import { Primitive } from "../core/primitive.js";

/**
 * o_bundle — simultaneous feature composition (§I.5).
 *
 * o_bundle(p_1, ..., p_n) -> X
 *
 * Bundling is *simultaneous*, not ordered: bundling {voice, place, manner}
 * means the same phoneme regardless of the order the features were listed
 * in. The transform therefore canonicalizes member order (sorted by id)
 * so that permuted-but-identical inputs produce an identical generated
 * representation — the operator-level analogue of commutativity.
 *
 * All constituent identities are preserved in full (never collapsed into
 * an opaque label), per §I.5's requirement.
 */
export function createBundleOperator({ id = "o_bundle", arity } = {}) {
  if (!Number.isInteger(arity) || arity < 1) {
    throw new TypeError("createBundleOperator requires an integer arity >= 1.");
  }

  return new Operator({
    id,
    arity,
    scales: [],
    accepts(operands) {
      return operands.every((p) => p instanceof Primitive);
    },
    transform(operands) {
      const members = [...operands]
        .map((p) => ({ stateId: p.id, identity: p.identity, contrast: p.contrast }))
        .sort((a, b) => (a.stateId < b.stateId ? -1 : a.stateId > b.stateId ? 1 : 0));

      return {
        operator: id,
        kind: "bundle",
        members,
      };
    },
  });
}
