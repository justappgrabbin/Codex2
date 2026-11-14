// src/graph/topology.js
/**
 * GraphTopologyBuilder: automatically constructs edges in the five projections
 * based on engine operations. Every decomposition, composition, and activation
 * generates traceable edges with evidence.
 */
import { GraphProjectionSet } from "./graph.js";

export class GraphTopologyBuilder {
  constructor(graphs, evidenceRegistry) {
    this.graphs = graphs;
    this.evidence = evidenceRegistry || { create: () => null };
    this._edgeCounter = 0;
  }

  // Record that primitive A was decomposed from input string at position p
  recordDecomposition(input, primitive, position, context = {}) {
    const evidenceId = this._nextEvidenceId("decomposition");

    // Knowledge: input contains primitive
    this.graphs.knowledge.addEdge(
      `input:${input}`,
      primitive.id,
      "contains",
      evidenceId,
      { position, inputLength: input.length }
    );

    // Temporal: decomposition happened in sequence
    if (position > 0) {
      this.graphs.temporal.addEdge(
        `input:${input}:pos${position - 1}`,
        `input:${input}:pos${position}`,
        "precedes",
        evidenceId
      );
    }

    return evidenceId;
  }

  // Record that operator o composed primitives into composite
  recordComposition(operatorId, operands, result, context = {}) {
    const evidenceId = this._nextEvidenceId("composition");

    // Dependency: result depends on each operand
    for (const op of operands) {
      const opId = typeof op === "string" ? op : op.id;
      this.graphs.dependency.addEdge(
        result.id || result,
        opId,
        "depends_on",
        evidenceId,
        { operator: operatorId }
      );
    }

    // Causal: operator caused the transformation
    this.graphs.causal.addEdge(
      operatorId,
      result.id || result,
      "produces",
      evidenceId,
      { operandCount: operands.length }
    );

    // Knowledge: result is-a composite
    this.graphs.knowledge.addEdge(
      result.id || result,
      `operator:${operatorId}`,
      "generated_by",
      evidenceId
    );

    return evidenceId;
  }

  // Record state activation with continuous value
  recordActivation(stateId, activation, previousActivation, context = {}) {
    const evidenceId = this._nextEvidenceId("activation");

    // Phase: activation level
    this.graphs.phase.addEdge(
      stateId,
      `activation:${activation.toFixed(3)}`,
      "has_phase",
      evidenceId,
      { previous: previousActivation }
    );

    // Temporal: activation history
    this.graphs.temporal.addEdge(
      `${stateId}:t${context.timestamp || Date.now() - 1}`,
      `${stateId}:t${context.timestamp || Date.now()}`,
      "activates_to",
      evidenceId,
      { from: previousActivation, to: activation }
    );

    return evidenceId;
  }

  // Record cross-scale relationship: operator R at scale s1 also at s2
  recordCrossScale(operatorId, scale1, scale2, success, context = {}) {
    const evidenceId = this._nextEvidenceId("cross-scale");

    this.graphs.knowledge.addEdge(
      `operator:${operatorId}:scale:${scale1}`,
      `operator:${operatorId}:scale:${scale2}`,
      success ? "transfers_to" : "fails_at",
      evidenceId,
      { operator: operatorId, success }
    );

    return evidenceId;
  }

  // Record mesh membership
  recordMeshMembership(stateId, meshType, meshId, context = {}) {
    const evidenceId = this._nextEvidenceId("mesh");

    this.graphs.knowledge.addEdge(
      stateId,
      `mesh:${meshType}:${meshId}`,
      "belongs_to",
      evidenceId,
      { meshType }
    );

    return evidenceId;
  }

  // Build neighborhood summary for a state across all projections
  neighborhoodSummary(stateId) {
    return {
      knowledge: this.graphs.knowledge.neighbors(stateId, "both"),
      causal: this.graphs.causal.neighbors(stateId, "both"),
      phase: this.graphs.phase.neighbors(stateId, "both"),
      temporal: this.graphs.temporal.neighbors(stateId, "both"),
      dependency: this.graphs.dependency.neighbors(stateId, "both"),
    };
  }

  // Compute graph metrics
  metrics() {
    const projections = this.graphs.all();
    const result = {};
    for (const g of projections) {
      const nodes = g.nodes.size;
      const edges = g.edges.size;
      const avgDegree = nodes > 0 ? (edges * 2) / nodes : 0;
      result[g.name] = { nodes, edges, avgDegree: avgDegree.toFixed(2) };
    }
    return result;
  }

  _nextEvidenceId(kind) {
    return `evidence:${kind}:${++this._edgeCounter}`;
  }
}
