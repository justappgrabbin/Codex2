// src/engine/address-evaluator.js
/**
 * AddressEvaluator: tests whether canonical addresses provide measurable
 * advantages over control-address systems (H3).
 * Controls: random, shuffled, flat, reduced.
 */
import { CanonicalAddress } from "../core/address.js";

export class AddressEvaluator {
  constructor() {
    this.results = [];
  }

  // Generate control addresses
  generateControl(address, type) {
    switch (type) {
      case "random":
        return this._randomAddress();
      case "shuffled":
        return this._shuffledAddress(address);
      case "flat":
        return new CanonicalAddress({ gate: address.gate });
      case "reduced":
        return new CanonicalAddress({
          planetaryDimension: address.planetaryDimension,
          gate: address.gate,
          line: address.line,
        });
      default:
        return address;
    }
  }

  // Evaluate retrieval performance: how quickly can we find related primitives?
  evaluateRetrieval(primitives, addressFn, testQueries) {
    const index = this._buildIndex(primitives, addressFn);
    let totalScore = 0;

    for (const query of testQueries) {
      const target = addressFn(query);
      const related = this._findRelated(index, target);
      const score = this._scoreRetrieval(related, query.expected);
      totalScore += score;
    }

    return totalScore / testQueries.length;
  }

  // Evaluate compression: does addressing reduce description length?
  evaluateCompression(primitives, addressFn) {
    const directSize = this._estimateDirectSize(primitives);
    const addressedSize = this._estimateAddressedSize(primitives, addressFn);
    return directSize > 0 ? 1 - addressedSize / directSize : 0;
  }

  // Evaluate generative performance: can addresses predict composition?
  evaluateGenerative(primitives, addressFn, testCompositions) {
    let correct = 0;
    for (const test of testCompositions) {
      const predicted = this._predictFromAddresses(test.inputs, addressFn);
      if (this._matchPrediction(predicted, test.expected)) correct++;
    }
    return testCompositions.length > 0 ? correct / testCompositions.length : 0;
  }

  // Full H3 evaluation
  evaluateH3(primitives, candidateAddressFn, testQueries, testCompositions) {
    const controls = ["random", "shuffled", "flat", "reduced"];
    const results = {
      candidate: {},
      controls: {},
    };

    // Candidate
    results.candidate.retrieval = this.evaluateRetrieval(primitives, candidateAddressFn, testQueries);
    results.candidate.compression = this.evaluateCompression(primitives, candidateAddressFn);
    results.candidate.generative = this.evaluateGenerative(primitives, candidateAddressFn, testCompositions);

    // Controls
    for (const controlType of controls) {
      const controlFn = (p) => this.generateControl(candidateAddressFn(p), controlType);
      results.controls[controlType] = {
        retrieval: this.evaluateRetrieval(primitives, controlFn, testQueries),
        compression: this.evaluateCompression(primitives, controlFn),
        generative: this.evaluateGenerative(primitives, controlFn, testCompositions),
      };
    }

    // Compute deltas
    results.deltas = {};
    for (const metric of ["retrieval", "compression", "generative"]) {
      results.deltas[metric] = {};
      for (const controlType of controls) {
        results.deltas[metric][controlType] = results.candidate[metric] - results.controls[controlType][metric];
      }
    }

    this.results.push(results);
    return results;
  }

  _buildIndex(primitives, addressFn) {
    const index = new Map();
    for (const p of primitives) {
      const addr = addressFn(p);
      const key = this._addressKey(addr);
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(p);
    }
    return index;
  }

  _findRelated(index, target) {
    const key = this._addressKey(target);
    return index.get(key) || [];
  }

  _scoreRetrieval(found, expected) {
    const foundSet = new Set(found.map(f => f.id));
    const expectedSet = new Set(expected);
    const intersection = new Set([...foundSet].filter(x => expectedSet.has(x)));
    return expectedSet.size > 0 ? intersection.size / expectedSet.size : 0;
  }

  _estimateDirectSize(primitives) {
    // Each primitive needs full identity storage
    return primitives.length * 50; // rough bytes per primitive
  }

  _estimateAddressedSize(primitives, addressFn) {
    // Addressed primitives can be referenced by address
    const uniqueAddresses = new Set();
    for (const p of primitives) {
      uniqueAddresses.add(this._addressKey(addressFn(p)));
    }
    return uniqueAddresses.size * 20 + primitives.length * 10;
  }

  _predictFromAddresses(inputs, addressFn) {
    // Simple prediction: shared address components suggest composability
    const addresses = inputs.map(addressFn);
    const shared = this._sharedComponents(addresses);
    return { shared, confidence: shared.length / (addresses[0] ? Object.keys(addresses[0]).length : 1) };
  }

  _matchPrediction(predicted, expected) {
    // Loose matching for Phase 2
    return predicted.confidence > 0.3;
  }

  _sharedComponents(addresses) {
    if (addresses.length === 0) return [];
    const keys = Object.keys(addresses[0]);
    return keys.filter(k => addresses.every(a => a[k] === addresses[0][k] && a[k] != null));
  }

  _addressKey(addr) {
    if (!addr) return "null";
    return `${addr.planetaryDimension || "?"}:${addr.gate || "?"}:${addr.line || "?"}`;
  }

  _randomAddress() {
    return new CanonicalAddress({
      gate: Math.floor(Math.random() * 64) + 1,
      line: Math.floor(Math.random() * 6) + 1,
      color: Math.floor(Math.random() * 6) + 1,
    });
  }

  _shuffledAddress(address) {
    const fields = {};
    const keys = Object.keys(address).filter(k => address[k] != null);
    const values = keys.map(k => address[k]).sort(() => Math.random() - 0.5);
    keys.forEach((k, i) => { fields[k] = values[i]; });
    return new CanonicalAddress(fields);
  }
}
