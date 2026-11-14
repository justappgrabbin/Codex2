/**
 * Operator — o = (i, a, I, P, T, V, O^-1, s, e)  [Appendix C.4 / I.4]
 */
export class Operator {
  constructor({
    id,
    arity,
    accepts,
    transform,
    positionalRule = null,
    invariants = [],
    inverseId = null,
    scales = [],
    evidence = [],
  }) {
    if (!id || !Number.isInteger(arity) || arity < 1) {
      throw new TypeError("Operator requires id and positive integer arity.");
    }
    if (typeof accepts !== "function" || typeof transform !== "function") {
      throw new TypeError("Operator requires accepts and transform functions.");
    }

    this.id = id;
    this.arity = arity;
    this.accepts = accepts;
    this.transform = transform;
    this.positionalRule = positionalRule;
    this.invariants = Object.freeze([...invariants]);
    this.inverseId = inverseId;
    this.scales = Object.freeze([...scales]);
    this.evidence = Object.freeze([...evidence]);
  }

  apply(operands, context = {}) {
    if (!Array.isArray(operands) || operands.length !== this.arity) {
      throw new RangeError(`${this.id} requires exactly ${this.arity} operands.`);
    }
    if (!this.accepts(operands, context)) {
      throw new TypeError(`Operands rejected by ${this.id}.`);
    }
    return this.transform(operands, context);
  }
}

export class OperatorRegistry {
  #store = new Map();

  register(operator) {
    if (!(operator instanceof Operator)) {
      throw new TypeError("OperatorRegistry only accepts Operator instances.");
    }
    if (this.#store.has(operator.id)) {
      throw new Error(`Operator "${operator.id}" is already registered.`);
    }
    this.#store.set(operator.id, operator);
    return operator;
  }

  get(id) {
    const o = this.#store.get(id);
    if (!o) throw new RangeError(`Unknown operator id "${id}".`);
    return o;
  }

  all() {
    return [...this.#store.values()];
  }

  /** Produces a new registry with `id` removed — for ablation (Appendix E). */
  withoutOperator(id) {
    const next = new OperatorRegistry();
    for (const o of this.#store.values()) {
      if (o.id !== id) next.register(o);
    }
    return next;
  }
}
