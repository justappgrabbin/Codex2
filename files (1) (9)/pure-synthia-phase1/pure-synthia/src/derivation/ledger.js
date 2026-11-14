/**
 * Complexity Ledger — L = (N_p, N_s, N_e, N_o, D_r, A_c, T_c)  [§13 / I.13]
 *
 * Mutable accumulator used *during* a single engine execution; the
 * engine flushes an immutable snapshot into the derivation record
 * (Appendix D) at the end of the run.
 */
export class Ledger {
  primitivesActivated = 0;
  statesGenerated = 0;
  edgesTraversed = 0;
  operationsExecuted = 0;
  recursionDepth = 0;
  activeAutomata = 0;
  transitionCount = 0;

  recordPrimitiveActivation(n = 1) {
    this.primitivesActivated += n;
  }

  recordStateGenerated(n = 1) {
    this.statesGenerated += n;
  }

  recordEdgeTraversed(n = 1) {
    this.edgesTraversed += n;
  }

  recordOperation(n = 1) {
    this.operationsExecuted += n;
  }

  setRecursionDepth(depth) {
    this.recursionDepth = Math.max(this.recursionDepth, depth);
  }

  snapshot() {
    return Object.freeze({
      primitivesActivated: this.primitivesActivated,
      statesGenerated: this.statesGenerated,
      edgesTraversed: this.edgesTraversed,
      operationsExecuted: this.operationsExecuted,
      recursionDepth: this.recursionDepth,
      activeAutomata: this.activeAutomata,
      transitionCount: this.transitionCount,
    });
  }
}
