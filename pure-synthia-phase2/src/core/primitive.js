// src/core/primitive.js
/**
 * Primitive: the foundational unit of Pure Synthia.
 * Mathematical mapping: p = (i, c, x, o, d, s, D, A, e)
 * Immutable. Learning creates new versioned records, never mutates history.
 */
export class Primitive {
  constructor({
    id,
    identity,
    contrast,
    position,
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

  toJSON() {
    return {
      id: this.id,
      identity: this.identity,
      contrast: this.contrast,
      position: this.position,
      operations: [...this.operations],
      dependencies: [...this.dependencies],
      scale: this.scale,
      candidateDimension: this.candidateDimension,
      candidateAddress: this.candidateAddress,
      evidence: [...this.evidence],
    };
  }

  static fromJSON(data) {
    return new Primitive(data);
  }
}
