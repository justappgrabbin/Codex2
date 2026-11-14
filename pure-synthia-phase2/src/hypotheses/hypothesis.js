// src/hypotheses/hypothesis.js
/**
 * Hypothesis Registry: formal hypothesis tracking per Appendix B.
 * H_i = (claim, null, metric, test, threshold, evidence, status)
 * No module should contain logic equivalent to candidateMapping.isTrue = true
 */
export const HYPOTHESIS_STATUS = Object.freeze([
  "unobserved",
  "observed",
  "inferred",
  "hypothesized",
  "tested",
  "supported",
  "rejected",
  "inconclusive",
]);

export class Hypothesis {
  constructor({
    id,
    claim,
    nullHypothesis,
    metric,
    test,
    threshold,
    evidence = [],
    status = "hypothesized",
  }) {
    this.id = id;
    this.claim = claim;
    this.nullHypothesis = nullHypothesis;
    this.metric = metric;
    this.test = test;
    this.threshold = threshold;
    this.evidence = [...evidence];
    this.status = status;
  }

  addEvidence(evidenceId, supports = true) {
    this.evidence.push({ evidenceId, supports, timestamp: Date.now() });
  }

  evaluate(result) {
    // Compare result against threshold, update status
    if (result >= this.threshold) {
      this.status = "supported";
    } else if (result <= this.threshold * 0.5) {
      this.status = "rejected";
    } else {
      this.status = "inconclusive";
    }
    return this.status;
  }

  toJSON() {
    return {
      id: this.id,
      claim: this.claim,
      nullHypothesis: this.nullHypothesis,
      metric: this.metric,
      test: this.test,
      threshold: this.threshold,
      evidence: this.evidence,
      status: this.status,
    };
  }

  static fromJSON(data) {
    return new Hypothesis(data);
  }
}

export class HypothesisRegistry {
  constructor() {
    this.hypotheses = new Map();
    this.initializeCoreHypotheses();
  }

  initializeCoreHypotheses() {
    // H1 — Recursive Generativity
    this.register(new Hypothesis({
      id: "H1",
      claim: "A finite primitive vocabulary P and finite operator vocabulary O can generate valid higher-order structures that were not explicitly stored.",
      nullHypothesis: "Successful generation requires dedicated representations whose stored complexity grows with target structure complexity.",
      metric: "novelCompositionRate",
      test: "unseen_composition",
      threshold: 0.7,
    }));

    // H2 — Cross-Scale Operator Invariance
    this.register(new Hypothesis({
      id: "H2",
      claim: "At least some discovered operators retain structurally equivalent behavior when operands are replaced by objects from another scale.",
      nullHypothesis: "Each scale requires unrelated special-case operators.",
      metric: "operatorReuse",
      test: "cross_scale_holdout",
      threshold: 0.5,
    }));

    // H3 — Address Utility
    this.register(new Hypothesis({
      id: "H3",
      claim: "Canonical recursive addresses provide measurable advantages over control-address systems.",
      nullHypothesis: "Canonical addressing provides no advantage over arbitrary labels.",
      metric: "addressPerformanceDelta",
      test: "address_ablation",
      threshold: 0.1,
    }));

    // H4 — Dimensional Correspondence
    this.register(new Hypothesis({
      id: "H4",
      claim: "Candidate mappings involving Movement, Evolution, Being, Design, and Space explain measurable structure better than alternatives.",
      nullHypothesis: "Dimensional mappings fail to outperform reasonable alternative mappings.",
      metric: "mappingPerformanceDelta",
      test: "dimensional_evaluation",
      threshold: 0.1,
    }));

    // H5 — Compression
    this.register(new Hypothesis({
      id: "H5",
      claim: "Reusable primitives and operators provide shorter representation of observed structures without unacceptable loss.",
      nullHypothesis: "Generated structures require essentially as much stored information as direct representation.",
      metric: "compressionGain",
      test: "compression_test",
      threshold: 0.15,
    }));

    // H6 — Candidate Numerical Laws
    this.register(new Hypothesis({
      id: "H6",
      claim: "Proposed numerical relationships (e.g., W(g,l) = g^l) correlate with measurable runtime quantities.",
      nullHypothesis: "Proposed numerical relationships are coincidences without generalization.",
      metric: "numericalCorrelation",
      test: "runtime_measurement",
      threshold: 0.6,
    }));
  }

  register(hypothesis) {
    this.hypotheses.set(hypothesis.id, hypothesis);
    return this;
  }

  get(id) {
    return this.hypotheses.get(id) || null;
  }

  list() {
    return Array.from(this.hypotheses.values());
  }

  byStatus(status) {
    return this.list().filter(h => h.status === status);
  }

  toJSON() {
    return this.list().map(h => h.toJSON());
  }

  static fromJSON(data) {
    const reg = new HypothesisRegistry();
    reg.hypotheses.clear();
    for (const h of data) {
      reg.register(Hypothesis.fromJSON(h));
    }
    return reg;
  }
}
