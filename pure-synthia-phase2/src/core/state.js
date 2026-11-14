// src/core/state.js
/**
 * RuntimeState: activation tracking for a state in the engine.
 * Activation is continuous: alpha_a(t) in [0,1]
 * States can become dormant without destroying learned topology.
 */
export class RuntimeState {
  constructor(stateId, activation = 0) {
    this.stateId = stateId;
    this.activation = Math.max(0, Math.min(1, activation));
    this.history = [];
  }

  updateActivation(nextActivation, timestamp = Date.now()) {
    this.history.push({
      timestamp,
      previous: this.activation,
      next: nextActivation,
    });

    this.activation = Math.max(0, Math.min(1, nextActivation));
  }

  toJSON() {
    return {
      stateId: this.stateId,
      activation: this.activation,
      history: [...this.history],
    };
  }

  static fromJSON(data) {
    const rs = new RuntimeState(data.stateId, data.activation);
    rs.history = data.history || [];
    return rs;
  }
}
