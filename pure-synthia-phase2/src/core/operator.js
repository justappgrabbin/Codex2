// src/core/operator.js
/**
 * Operator: executable transformation with constraints.
 * Mathematical mapping: o = (i, a, I, P, T, V, O^{-1}, s, e)
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
      throw new TypeError(
        "Operator requires accepts and transform functions.",
      );
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
      throw new RangeError(
        `${this.id} requires exactly ${this.arity} operands.`,
      );
    }

    if (!this.accepts(operands, context)) {
      throw new TypeError(`Operands rejected by ${this.id}.`);
    }

    return this.transform(operands, context);
  }

  toJSON() {
    return {
      id: this.id,
      arity: this.arity,
      positionalRule: this.positionalRule,
      invariants: [...this.invariants],
      inverseId: this.inverseId,
      scales: [...this.scales],
      evidence: [...this.evidence],
    };
  }
}
