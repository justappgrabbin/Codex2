import { contentHash } from "./hash.js";

/**
 * Composite — X = o(X_1, ..., X_n | C)  [Appendix C.3 / I.3]
 *
 * A composite records its children (by reference/id, not by copy)
 * and the derivation that produced it, so it can itself become an
 * operand for a subsequent operator without losing provenance.
 */
export class Composite {
  constructor({ id, scale, children, operatorId, context = {}, derivationId }) {
    if (!id || !scale || !operatorId || !derivationId) {
      throw new TypeError(
        "Composite requires id, scale, operatorId, and derivationId.",
      );
    }
    if (!Array.isArray(children) || children.length === 0) {
      throw new TypeError("Composite requires at least one child.");
    }

    this.id = id;
    this.scale = scale;
    this.children = Object.freeze([...children]);
    this.operatorId = operatorId;
    this.context = Object.freeze({ ...context });
    this.derivationId = derivationId;

    Object.freeze(this);
  }
}

/**
 * Deterministic composite id: a content hash of everything that
 * defines the composite except the (not-yet-known) derivationId.
 * Two runs with identical scale/children/operator/context always
 * produce the same composite id — required for D.1 replay.
 */
export function deriveCompositeId({ scale, children, operatorId, context }) {
  return `composite:${contentHash({ scale, children, operatorId, context })}`;
}
