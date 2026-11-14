// src/experiments/cross-scale.js
/**
 * Cross-Scale Transfer Experiments (Appendix H.3.4, H.6)
 * Tests whether operators discovered at one scale transfer to another.
 * R_{s_i} ≅ R_{s_j}
 */

export class CrossScaleExperiment {
  constructor(engine) {
    this.engine = engine;
    this.transferResults = [];
  }

  // Test operator transfer from sourceScale to targetScale
  async testTransfer(operatorId, sourceScale, targetScale, testCases) {
    const operator = this.engine.operators.get(operatorId);
    if (!operator) {
      return { operatorId, sourceScale, targetScale, success: false, reason: "operator_not_found" };
    }

    const results = [];
    let successCount = 0;

    for (const testCase of testCases) {
      try {
        // Attempt to apply operator at target scale without modification
        const adapted = this._adaptOperands(testCase.operands, targetScale);
        const result = operator.apply(adapted, testCase.context || {});

        const success = this._validateResult(result, testCase.expected);
        results.push({ testCase: testCase.id, success, result });
        if (success) successCount++;
      } catch (error) {
        results.push({ testCase: testCase.id, success: false, error: error.message });
      }
    }

    const transferRate = testCases.length > 0 ? successCount / testCases.length : 0;
    const record = {
      operatorId,
      sourceScale,
      targetScale,
      successCount,
      totalTests: testCases.length,
      transferRate,
      invariant: transferRate >= 0.5, // threshold for cross-scale invariance
      results,
      timestamp: Date.now(),
    };

    this.transferResults.push(record);

    // Record in graph topology if available
    if (this.engine.topologyBuilder) {
      this.engine.topologyBuilder.recordCrossScale(
        operatorId, sourceScale, targetScale, transferRate >= 0.5
      );
    }

    return record;
  }

  // Run full cross-scale battery across all operator/scale pairs
  async runFullBattery(scalePairs, testCaseMap) {
    const battery = [];
    for (const op of this.engine.operators.list()) {
      for (const [source, target] of scalePairs) {
        if (source === target) continue;
        const testCases = testCaseMap[`${op.id}:${target}`] || testCaseMap[target] || [];
        if (testCases.length > 0) {
          const result = await this.testTransfer(op.id, source, target, testCases);
          battery.push(result);
        }
      }
    }
    return battery;
  }

  // Summary statistics
  summary() {
    const invariantOps = new Set();
    const failedOps = new Set();

    for (const r of this.transferResults) {
      if (r.invariant) invariantOps.add(r.operatorId);
      else failedOps.add(r.operatorId);
    }

    return {
      totalTransfers: this.transferResults.length,
      invariantTransfers: this.transferResults.filter(r => r.invariant).length,
      invariantOperators: Array.from(invariantOps),
      failedOperators: Array.from(failedOps),
      averageTransferRate: this.transferResults.reduce((a, r) => a + r.transferRate, 0) /
        (this.transferResults.length || 1),
    };
  }

  _adaptOperands(operands, targetScale) {
    // Phase 2 adaptation: wrap operands with target scale metadata
    return operands.map(op => ({
      ...op,
      scale: targetScale,
      _adapted: true,
    }));
  }

  _validateResult(result, expected) {
    if (!result || !expected) return false;
    // Loose validation for Phase 2
    return result.operator === expected.operator ||
           (result.members && expected.members && result.members.length === expected.members.length);
  }

  toJSON() {
    return {
      transferResults: this.transferResults,
      summary: this.summary(),
    };
  }
}
