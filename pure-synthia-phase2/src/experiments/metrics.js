// src/experiments/metrics.js
/**
 * Core measurements for Pure Synthia experiments.
 * Per Appendix H.8 — H.15.
 */
export class MetricsCollector {
  constructor() {
    this.records = [];
  }

  record(experimentId, metrics) {
    this.records.push({
      experimentId,
      timestamp: Date.now(),
      ...metrics,
    });
  }

  // Generation Accuracy: N_correct_generated / N_test
  generationAccuracy(correct, total) {
    return total > 0 ? correct / total : 0;
  }

  // Reconstruction Accuracy: Similarity(X, Compose(Decompose(X)))
  reconstructionAccuracy(original, reconstructed) {
    // Exact equality for symbolic domains
    return JSON.stringify(original) === JSON.stringify(reconstructed) ? 1 : 0;
  }

  // Novel Composition Rate: N_correct_not_stored / N_correct_outputs
  novelCompositionRate(correctNovel, correctTotal) {
    return correctTotal > 0 ? correctNovel / correctTotal : 0;
  }

  // Operator Reuse: |{s : o successfully operates at scale s}|
  operatorReuse(operator, successfulScales) {
    return successfulScales.length;
  }

  // Special-Case Burden: N_scale_specific_rules / N_successful_transformations
  specialCaseBurden(specificRules, successfulTransforms) {
    return successfulTransforms > 0 ? specificRules / successfulTransforms : 0;
  }

  // Compression Gain: 1 - (L(G) + L(X|G)) / L_direct(X)
  compressionGain(grammarLength, conditionalLength, directLength) {
    if (directLength === 0) return 0;
    return 1 - (grammarLength + conditionalLength) / directLength;
  }

  // Derivation Integrity: N_reproducible / N_generated
  derivationIntegrity(reproducible, total) {
    return total > 0 ? reproducible / total : 0;
  }

  summary() {
    return this.records;
  }

  toJSON() {
    return this.records;
  }
}
