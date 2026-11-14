// src/derivation/replay.js
/**
 * Deterministic Replay: given equivalent initial state, input, context,
 * grammar version, and operator set, reproduce the same derivation.
 * Hash(Delta_original) == Hash(Delta_replayed)
 */
export class ReplayEngine {
  constructor(synthiaEngine) {
    this.engine = synthiaEngine;
  }

  captureState() {
    return {
      engineVersion: this.engine.version || "0.1.0",
      grammarVersion: this.engine.grammarVersion || "phase1.0",
      operatorVersion: this.engine.operatorVersion || "phase1.0",
      primitiveCount: this.engine.primitives.size,
      operatorCount: this.engine.operators.list().length,
    };
  }

  createReplayRecord(input, context, derivation) {
    return {
      engineState: this.captureState(),
      input,
      context: { ...context },
      derivation: derivation.toJSON(),
      capturedAt: Date.now(),
    };
  }

  async replay(record) {
    // Deterministic replay: re-execute with same input and context
    // In a full implementation, this would restore exact engine state
    const result = this.engine.execute(record.input, record.context);
    return {
      original: record.derivation,
      replayed: result.toJSON(),
      match: JSON.stringify(record.derivation) === JSON.stringify(result.toJSON()),
    };
  }

  hashDerivation(derivation) {
    // Simple deterministic hash for comparison
    const str = JSON.stringify(derivation.toJSON());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
}
