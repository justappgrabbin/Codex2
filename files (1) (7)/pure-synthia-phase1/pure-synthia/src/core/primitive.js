/**
 * Primitive — p = (i, c, x, o, d, s, D, A, e)  [Appendix C.1 / I.2]
 *
 * Immutable by construction. Learning does not mutate historical
 * primitive records; revised evidence must create a new versioned
 * Primitive instance (see hypotheses/registry.js in later phases).
 */
export class Primitive {
  constructor({
    id,
    identity,
    contrast = null,
    position = null,
    operations = [],
    dependencies = [],
    scale,
    candidateDimension = null,
    candidateAddress = null,
    evidence = [],
  }) {
    if (!id || !identity || !scale) {
      throw new TypeError("Primitive requires id, identity, and scale.");
    }

    this.id = id;
    this.identity = identity;
    this.contrast = contrast;
    this.position = position;
    this.operations = Object.freeze([...operations]);
    this.dependencies = Object.freeze([...dependencies]);
    this.scale = scale;
    this.candidateDimension = candidateDimension;
    this.candidateAddress = candidateAddress;
    this.evidence = Object.freeze([...evidence]);

    Object.freeze(this);
  }
}

/**
 * Simple in-memory registry. Primitives are looked up by id;
 * re-registering an existing id is rejected rather than silently
 * overwritten, to protect provenance (Appendix D).
 */
export class PrimitiveRegistry {
  #store = new Map();

  register(primitive) {
    if (!(primitive instanceof Primitive)) {
      throw new TypeError("PrimitiveRegistry only accepts Primitive instances.");
    }
    if (this.#store.has(primitive.id)) {
      throw new Error(`Primitive "${primitive.id}" is already registered.`);
    }
    this.#store.set(primitive.id, primitive);
    return primitive;
  }

  get(id) {
    const p = this.#store.get(id);
    if (!p) throw new RangeError(`Unknown primitive id "${id}".`);
    return p;
  }

  has(id) {
    return this.#store.has(id);
  }

  all() {
    return [...this.#store.values()];
  }

  /** Produces a new registry with `id` removed — for ablation (Appendix E). */
  withoutPrimitive(id) {
    const next = new PrimitiveRegistry();
    for (const p of this.#store.values()) {
      if (p.id !== id) next.register(p);
    }
    return next;
  }
}
