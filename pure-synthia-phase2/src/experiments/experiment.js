// src/experiments/experiment.js
/**
 * Experimental Runner: per Appendix H.
 * E(S, X) = Q(S(X))
 * Every experiment records: id, hypothesis, dataset, split, configuration, seed, grammarVersion, metrics, derivations, result
 */
import { MetricsCollector } from "./metrics.js";

export class Experiment {
  constructor({
    id,
    hypothesis,
    dataset,
    split = { discovery: 0.6, validation: 0.2, test: 0.2 },
    configuration,
    seed = 42,
    grammarVersion = "phase1.0",
    controls = [],
    metrics = [],
  }) {
    this.id = id;
    this.hypothesis = hypothesis;
    this.dataset = dataset;
    this.split = split;
    this.configuration = configuration;
    this.seed = seed;
    this.grammarVersion = grammarVersion;
    this.controls = controls;
    this.metrics = metrics;
    this.results = new Map();
    this.derivations = [];
    this.metricsCollector = new MetricsCollector();
    this.status = "pending";
    this.startTime = null;
    this.endTime = null;
  }

  async run(engine, testFn) {
    this.status = "running";
    this.startTime = Date.now();

    try {
      // Run on discovery split
      const discoveryResults = [];
      for (const item of this.dataset.discovery || []) {
        const derivation = engine.execute(item.input, item.context || {});
        discoveryResults.push(derivation);
      }

      // Run on validation split
      const validationResults = [];
      for (const item of this.dataset.validation || []) {
        const derivation = engine.execute(item.input, item.context || {});
        validationResults.push(derivation);
      }

      // Run on test split (fixed grammar)
      const testResults = [];
      for (const item of this.dataset.test || []) {
        const derivation = engine.execute(item.input, item.context || {});
        testResults.push(derivation);
      }

      // Evaluate metrics
      const metricResults = testFn ? testFn(testResults) : this.defaultMetrics(testResults);

      this.results.set("discovery", discoveryResults);
      this.results.set("validation", validationResults);
      this.results.set("test", testResults);
      this.results.set("metrics", metricResults);

      this.status = "completed";
    } catch (error) {
      this.status = "failed";
      this.results.set("error", error.message);
    }

    this.endTime = Date.now();
    return this.manifest();
  }

  defaultMetrics(testResults) {
    const total = testResults.length;
    const successful = testResults.filter(r => r.result && r.result.type !== "error").length;
    return {
      generationAccuracy: total > 0 ? successful / total : 0,
      totalDerivations: total,
      successfulCompositions: successful,
    };
  }

  manifest() {
    return {
      version: this.grammarVersion,
      dataset: this.dataset.name || "unnamed",
      split: this.split,
      grammar: this.configuration,
      operators: this.configuration.operators || [],
      controls: this.controls,
      metrics: this.metrics,
      results: Object.fromEntries(this.results),
      duration: this.endTime - this.startTime,
      status: this.status,
    };
  }

  toJSON() {
    return this.manifest();
  }
}

export class ExperimentRunner {
  constructor() {
    this.experiments = new Map();
  }

  register(experiment) {
    this.experiments.set(experiment.id, experiment);
    return this;
  }

  async run(experimentId, engine, testFn) {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error(`Experiment ${experimentId} not found`);
    return exp.run(engine, testFn);
  }

  list() {
    return Array.from(this.experiments.values());
  }
}
