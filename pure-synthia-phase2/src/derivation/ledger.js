// src/derivation/ledger.js
/**
 * Complexity Ledger: measurable tuple for every execution.
 * Mathematical mapping: L = (N_p, N_s, N_e, N_o, D_r, A_c, T_c)
 * primitives activated, states generated, edges traversed, operations executed,
 * recursion depth, active automata, transition count.
 */
export class ComplexityLedger {
  constructor() {
    this.reset();
  }

  reset() {
    this.primitivesActivated = 0;
    this.statesGenerated = 0;
    this.edgesTraversed = 0;
    this.operationsExecuted = 0;
    this.recursionDepth = 0;
    this.activeAutomata = 0;
    this.transitionCount = 0;
    this.history = [];
  }

  record(delta) {
    const entry = {
      timestamp: Date.now(),
      ...delta,
    };
    this.history.push(entry);

    if (delta.primitivesActivated) this.primitivesActivated += delta.primitivesActivated;
    if (delta.statesGenerated) this.statesGenerated += delta.statesGenerated;
    if (delta.edgesTraversed) this.edgesTraversed += delta.edgesTraversed;
    if (delta.operationsExecuted) this.operationsExecuted += delta.operationsExecuted;
    if (delta.recursionDepth != null) this.recursionDepth = Math.max(this.recursionDepth, delta.recursionDepth);
    if (delta.activeAutomata != null) this.activeAutomata = delta.activeAutomata;
    if (delta.transitionCount) this.transitionCount += delta.transitionCount;
  }

  snapshot() {
    return {
      primitivesActivated: this.primitivesActivated,
      statesGenerated: this.statesGenerated,
      edgesTraversed: this.edgesTraversed,
      operationsExecuted: this.operationsExecuted,
      recursionDepth: this.recursionDepth,
      activeAutomata: this.activeAutomata,
      transitionCount: this.transitionCount,
    };
  }

  toJSON() {
    return {
      current: this.snapshot(),
      history: this.history,
    };
  }

  static fromJSON(data) {
    const ledger = new ComplexityLedger();
    ledger.history = data.history || [];
    const c = data.current || {};
    ledger.primitivesActivated = c.primitivesActivated || 0;
    ledger.statesGenerated = c.statesGenerated || 0;
    ledger.edgesTraversed = c.edgesTraversed || 0;
    ledger.operationsExecuted = c.operationsExecuted || 0;
    ledger.recursionDepth = c.recursionDepth || 0;
    ledger.activeAutomata = c.activeAutomata || 0;
    ledger.transitionCount = c.transitionCount || 0;
    return ledger;
  }
}
