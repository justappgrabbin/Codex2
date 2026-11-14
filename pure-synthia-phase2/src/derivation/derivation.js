// src/derivation/derivation.js
/**
 * Derivation: inspectable provenance for every output.
 * Mathematical mapping: Delta(Y) = (I, P, O, R, C, T, Y, E)
 * The derivation is the primary result; the generated value is contained within it.
 */
export class Derivation {
  constructor({
    id,
    input,
    decomposition,
    primitives,
    operators,
    topology,
    result,
    context,
    timestamp = Date.now(),
    evaluation = null,
  }) {
    this.id = id;
    this.input = input;
    this.decomposition = decomposition;
    this.primitives = primitives;
    this.operators = operators;
    this.topology = topology;
    this.result = result;
    this.context = { ...context };
    this.timestamp = timestamp;
    this.evaluation = evaluation;
  }

  toJSON() {
    return {
      id: this.id,
      input: this.input,
      decomposition: this.decomposition,
      primitives: this.primitives,
      operators: this.operators,
      topology: this.topology,
      result: this.result,
      context: this.context,
      timestamp: this.timestamp,
      evaluation: this.evaluation,
    };
  }

  static fromJSON(data) {
    return new Derivation(data);
  }
}

let _derivationCounter = 0;
export function nextDerivationId() {
  return `derivation:${++_derivationCounter}`;
}
