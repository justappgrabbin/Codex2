// src/experiments/controls.js
/**
 * Control and ablation systems per Appendix E and H.7.
 * S^{-p_i}, S^{-o_i}, S^{-A}, S^{-D}, S^{-G_k}
 */
export class ControlSystem {
  constructor(synthiaEngine) {
    this.base = synthiaEngine;
  }

  // Flat Lookup: storage-heavy baseline
  flatLookup(input, storedResults) {
    const key = JSON.stringify(input);
    return storedResults.get(key) || null;
  }

  // Frequency Baseline: predicts using empirical frequencies, no recursion
  frequencyBaseline(components, frequencies) {
    return components
      .map(c => ({ component: c, score: frequencies.get(c) || 0 }))
      .sort((a, b) => b.score - a.score);
  }

  // Random Grammar: same grammar size, randomized rule relationships
  randomGrammar(grammar) {
    const shuffled = { ...grammar };
    // Shuffle rule relationships while preserving structure size
    const rules = Object.entries(shuffled);
    for (let i = rules.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rules[i], rules[j]] = [rules[j], rules[i]];
    }
    return Object.fromEntries(rules);
  }

  // Shuffled Structure: preserves primitives, permutes positional/relational info
  shuffledStructure(composite) {
    const shuffled = JSON.parse(JSON.stringify(composite));
    if (shuffled.members) {
      shuffled.members = shuffled.members.sort(() => Math.random() - 0.5);
    }
    return shuffled;
  }
}

export class AblationStudy {
  constructor(synthiaEngine) {
    this.base = synthiaEngine;
    this.results = new Map();
  }

  // Remove primitive p_i
  withoutPrimitive(primitiveId) {
    const modified = this.base.clone();
    modified.primitives.delete(primitiveId);
    return modified;
  }

  // Remove operator o_i
  withoutOperator(operatorId) {
    const modified = this.base.clone();
    modified.operators.operators.delete(operatorId);
    return modified;
  }

  // Remove canonical addressing
  withoutAddressing() {
    const modified = this.base.clone();
    modified.useAddressing = false;
    return modified;
  }

  // Remove dimensional correspondence
  withoutDimensions() {
    const modified = this.base.clone();
    modified.useDimensions = false;
    return modified;
  }

  // Remove graph projection G_k
  withoutGraphProjection(projectionName) {
    const modified = this.base.clone();
    if (modified.graphs) {
      modified.graphs[projectionName] = null;
    }
    return modified;
  }

  runAblation(componentName, testFn, metricFn) {
    const baseline = metricFn(testFn(this.base));
    const modified = this.getModifiedEngine(componentName);
    const ablated = metricFn(testFn(modified));
    const impact = baseline - ablated;
    this.results.set(componentName, { baseline, ablated, impact });
    return { componentName, baseline, ablated, impact };
  }

  getModifiedEngine(componentName) {
    if (componentName.startsWith("primitive:")) {
      return this.withoutPrimitive(componentName.replace("primitive:", ""));
    }
    if (componentName.startsWith("operator:")) {
      return this.withoutOperator(componentName.replace("operator:", ""));
    }
    if (componentName === "addressing") return this.withoutAddressing();
    if (componentName === "dimensions") return this.withoutDimensions();
    if (componentName.startsWith("graph:")) {
      return this.withoutGraphProjection(componentName.replace("graph:", ""));
    }
    return this.base;
  }

  summary() {
    return Object.fromEntries(this.results);
  }
}
