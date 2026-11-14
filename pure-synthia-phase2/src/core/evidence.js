// src/core/evidence.js
/**
 * Evidence tracking for primitives, operators, and hypotheses.
 * Evidence states: unobserved → observed → inferred → hypothesized → tested → {supported, rejected, inconclusive}
 */
export const EVIDENCE_STATES = Object.freeze([
  "unobserved",
  "observed",
  "inferred",
  "hypothesized",
  "tested",
  "supported",
  "rejected",
  "inconclusive",
]);

export class Evidence {
  constructor({
    id,
    kind = "observed",
    source,
    supports = [],
    contradicts = [],
    experimentId = null,
    timestamp = Date.now(),
    notes = "",
  }) {
    if (!id || !source) {
      throw new TypeError("Evidence requires id and source.");
    }
    this.id = id;
    this.kind = kind;
    this.source = source;
    this.supports = Object.freeze([...supports]);
    this.contradicts = Object.freeze([...contradicts]);
    this.experimentId = experimentId;
    this.timestamp = timestamp;
    this.notes = notes;
    Object.freeze(this);
  }

  toJSON() {
    return {
      id: this.id,
      kind: this.kind,
      source: this.source,
      supports: [...this.supports],
      contradicts: [...this.contradicts],
      experimentId: this.experimentId,
      timestamp: this.timestamp,
      notes: this.notes,
    };
  }
}
