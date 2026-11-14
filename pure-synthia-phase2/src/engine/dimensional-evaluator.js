// src/engine/dimensional-evaluator.js
/**
 * DimensionalEvaluator: tests whether candidate dimensional mappings
 * explain measurable structure better than alternatives (H4).
 * Per Appendix J, CandidateDimension records are weaker than Primitives.
 */
export class DimensionalEvaluator {
  constructor() {
    this.candidateDimensions = new Map();
    this.alternativeMappings = [];
  }

  // Register a candidate dimension (from Appendix J)
  registerCandidate(dimension) {
    this.candidateDimensions.set(dimension.id, dimension);
    return this;
  }

  // Generate alternative mappings by permuting dimensions
  generateAlternatives() {
    const dims = Array.from(this.candidateDimensions.values());
    const alternatives = [];

    // Null model: random assignment
    alternatives.push({
      id: "random",
      name: "Random Mapping",
      mapping: () => dims[Math.floor(Math.random() * dims.length)],
    });

    // Null model: single dimension only
    alternatives.push({
      id: "single",
      name: "Single Dimension",
      mapping: () => dims[0],
    });

    // Permuted: swap macro/micro pairs
    if (dims.length >= 2) {
      alternatives.push({
        id: "permuted",
        name: "Permuted Dimensions",
        mapping: (idx) => dims[(idx + 1) % dims.length],
      });
    }

    this.alternativeMappings = alternatives;
    return alternatives;
  }

  // Evaluate predictive power of a mapping on a dataset
  evaluatePredictive(mappingFn, dataset) {
    let correct = 0;
    for (const item of dataset) {
      const predicted = mappingFn(item.index);
      const actual = item.expectedDimension;
      if (predicted.id === actual) correct++;
    }
    return dataset.length > 0 ? correct / dataset.length : 0;
  }

  // Evaluate generative power: does the mapping produce coherent compositions?
  evaluateGenerative(mappingFn, compositionTests) {
    let coherent = 0;
    for (const test of compositionTests) {
      const dims = test.inputs.map(i => mappingFn(i));
      const coherence = this._measureCoherence(dims);
      if (coherence > test.threshold) coherent++;
    }
    return compositionTests.length > 0 ? coherent / compositionTests.length : 0;
  }

  // Evaluate transformation consistency: does T_i->j preserve structure?
  evaluateTransformConsistency(mappingFn, transformTests) {
    let consistent = 0;
    for (const test of transformTests) {
      const fromDim = mappingFn(test.from);
      const toDim = mappingFn(test.to);
      const expected = test.expectedRelation;
      const actual = this._inferRelation(fromDim, toDim);
      if (actual === expected) consistent++;
    }
    return transformTests.length > 0 ? consistent / transformTests.length : 0;
  }

  // Full H4 evaluation
  evaluateH4(dataset, compositionTests, transformTests) {
    const alternatives = this.generateAlternatives();
    const results = {
      candidate: {},
      alternatives: {},
    };

    // Candidate mapping (using registered dimensions in order)
    const candidateFn = (idx) => Array.from(this.candidateDimensions.values())[idx % this.candidateDimensions.size];
    results.candidate = {
      predictive: this.evaluatePredictive(candidateFn, dataset),
      generative: this.evaluateGenerative(candidateFn, compositionTests),
      transformConsistency: this.evaluateTransformConsistency(candidateFn, transformTests),
    };

    // Alternative mappings
    for (const alt of alternatives) {
      results.alternatives[alt.id] = {
        predictive: this.evaluatePredictive(alt.mapping, dataset),
        generative: this.evaluateGenerative(alt.mapping, compositionTests),
        transformConsistency: this.evaluateTransformConsistency(alt.mapping, transformTests),
      };
    }

    // Deltas
    results.deltas = {};
    for (const metric of ["predictive", "generative", "transformConsistency"]) {
      results.deltas[metric] = {};
      for (const altId of Object.keys(results.alternatives)) {
        results.deltas[metric][altId] = results.candidate[metric] - results.alternatives[altId][metric];
      }
    }

    return results;
  }

  _measureCoherence(dimensions) {
    // Simple coherence: shared properties across dimensions
    if (dimensions.length < 2) return 1.0;
    const shared = new Set();
    const first = dimensions[0];
    if (!first) return 0;
    for (const key of Object.keys(first)) {
      if (dimensions.every(d => d && d[key] === first[key])) {
        shared.add(key);
      }
    }
    return shared.size / Object.keys(first).length;
  }

  _inferRelation(dimA, dimB) {
    if (!dimA || !dimB) return "unknown";
    if (dimA.id === dimB.id) return "identity";
    if (dimA.macroName === dimB.macroName) return "same_macro";
    if (dimA.keynote === dimB.keynote) return "same_keynote";
    return "unrelated";
  }
}
