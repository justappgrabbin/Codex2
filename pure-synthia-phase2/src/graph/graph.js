// src/graph/graph.js
/**
 * Graph: projection-specific topology for the five graph projections.
 * G = {G_K, G_C, G_P, G_T, G_D}
 * Neighbors are projection-specific: N_K(x) != N_C(x) != ...
 */
export class Graph {
  constructor(name) {
    this.name = name;
    this.nodes = new Map();     // stateId -> Set of edgeIds
    this.edges = new Map();     // edgeId -> edge object
    this._edgeCounter = 0;
  }

  addNode(stateId) {
    if (!this.nodes.has(stateId)) {
      this.nodes.set(stateId, new Set());
    }
    return this;
  }

  addEdge(from, to, relation, evidenceId = null, metadata = {}) {
    this.addNode(from);
    this.addNode(to);

    const edgeId = `edge:${this.name}:${++this._edgeCounter}`;
    const edge = {
      id: edgeId,
      from,
      to,
      graph: this.name,
      relation,
      evidenceId,
      metadata: { ...metadata },
      timestamp: Date.now(),
    };

    this.edges.set(edgeId, edge);
    this.nodes.get(from).add(edgeId);
    this.nodes.get(to).add(edgeId);

    return edge;
  }

  neighbors(stateId, direction = "out") {
    if (!this.nodes.has(stateId)) return [];
    const edgeIds = this.nodes.get(stateId);
    const result = [];
    for (const eid of edgeIds) {
      const edge = this.edges.get(eid);
      if (direction === "out" && edge.from === stateId) result.push(edge.to);
      if (direction === "in" && edge.to === stateId) result.push(edge.from);
      if (direction === "both") {
        result.push(edge.from === stateId ? edge.to : edge.from);
      }
    }
    return [...new Set(result)];
  }

  edgesFrom(stateId) {
    if (!this.nodes.has(stateId)) return [];
    return [...this.nodes.get(stateId)]
      .map(eid => this.edges.get(eid))
      .filter(e => e.from === stateId);
  }

  toJSON() {
    return {
      name: this.name,
      nodes: Array.from(this.nodes.keys()),
      edges: Array.from(this.edges.values()),
    };
  }

  static fromJSON(data) {
    const g = new Graph(data.name);
    for (const edge of data.edges) {
      g.addEdge(edge.from, edge.to, edge.relation, edge.evidenceId, edge.metadata);
    }
    return g;
  }
}

export class GraphProjectionSet {
  constructor() {
    this.knowledge = new Graph("knowledge");
    this.causal = new Graph("causal");
    this.phase = new Graph("phase");
    this.temporal = new Graph("temporal");
    this.dependency = new Graph("dependency");
  }

  all() {
    return [this.knowledge, this.causal, this.phase, this.temporal, this.dependency];
  }

  get(name) {
    return this[name] || null;
  }

  toJSON() {
    return {
      knowledge: this.knowledge.toJSON(),
      causal: this.causal.toJSON(),
      phase: this.phase.toJSON(),
      temporal: this.temporal.toJSON(),
      dependency: this.dependency.toJSON(),
    };
  }

  static fromJSON(data) {
    const gps = new GraphProjectionSet();
    gps.knowledge = Graph.fromJSON(data.knowledge);
    gps.causal = Graph.fromJSON(data.causal);
    gps.phase = Graph.fromJSON(data.phase);
    gps.temporal = Graph.fromJSON(data.temporal);
    gps.dependency = Graph.fromJSON(data.dependency);
    return gps;
  }
}
