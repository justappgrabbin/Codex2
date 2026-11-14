// src/engine/synthia.js
/**
 * SynthiaEngine v2: Phase 2 — Graph Topology, Mesh, Cross-Scale
 */
import { Derivation, nextDerivationId } from "../derivation/derivation.js";
import { ComplexityLedger } from "../derivation/ledger.js";
import { ReplayEngine } from "../derivation/replay.js";
import { RuntimeState } from "../core/state.js";
import { GraphTopologyBuilder } from "../graph/topology.js";
import { MeshRegistry } from "../graph/mesh.js";

export class SynthiaEngine {
  constructor({
    primitiveRegistry = new Map(),
    operatorRegistry,
    graphs,
    version = "0.2.0",
    grammarVersion = "phase2.0",
    operatorVersion = "phase2.0",
  }) {
    this.primitives = primitiveRegistry;
    this.operators = operatorRegistry;
    this.graphs = graphs;
    this.ledger = new ComplexityLedger();
    this.replayEngine = new ReplayEngine(this);
    this.version = version;
    this.grammarVersion = grammarVersion;
    this.operatorVersion = operatorVersion;
    this.useAddressing = true;
    this.useDimensions = true;
    this.runtimeStates = new Map();
    this.derivations = new Map();
    this.composites = new Map();

    // Phase 2 additions
    this.topologyBuilder = new GraphTopologyBuilder(graphs);
    this.meshRegistry = new MeshRegistry();
    this._meshCounter = 0;
  }

  execute(input, context = {}) {
    const derivationId = nextDerivationId();

    // Step 1: Decomposition
    const decomposition = this.decompose(input, context);
    this.ledger.record({ primitivesActivated: decomposition.primitives.length });

    // Record decomposition in graph topology
    if (typeof input === "string") {
      for (let i = 0; i < decomposition.primitives.length; i++) {
        this.topologyBuilder.recordDecomposition(
          input, decomposition.primitives[i], i, context
        );
      }
    }

    // Step 2: Primitive Resolution
    const primitives = this.resolve(decomposition, context);

    // Step 3: Operator Selection
    const selectedOperators = this.selectOperators(primitives, context);
    this.ledger.record({ operationsExecuted: selectedOperators.length });

    // Step 4: Topology Activation
    const topology = this.activateTopology(primitives, context);
    this.ledger.record({
      statesGenerated: topology.activatedStates.length,
      edgesTraversed: topology.traversedEdges,
    });

    // Step 5: Composition
    const result = this.compose({
      primitives,
      operators: selectedOperators,
      topology,
      context,
    });
    this.ledger.record({ statesGenerated: 1 });

    // Record composition in graph topology
    if (result && result.type === "composite" && selectedOperators.length > 0) {
      this.topologyBuilder.recordComposition(
        selectedOperators[0].id,
        primitives,
        { id: derivationId, ...result },
        context
      );
    }

    // Step 6: Create derivation
    const derivation = new Derivation({
      id: derivationId,
      input,
      decomposition: decomposition.steps,
      primitives: primitives.map(p => p.id),
      operators: selectedOperators.map(o => o.id),
      topology: topology.summary,
      result,
      context,
    });

    this.derivations.set(derivationId, derivation);

    // Auto-join to default mesh
    this._autoMesh(primitives, derivationId, context);

    return derivation;
  }

  decompose(input, context) {
    const steps = [];
    const foundPrimitives = [];

    if (typeof input === "string") {
      const chars = input.split("");
      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const primitive = this.findPrimitiveByIdentity(char, "grapheme") ||
                         this.findPrimitiveByIdentity(char, "phoneme") ||
                         this.findPrimitiveByIdentity(char, "sub-phonemic");
        if (primitive) {
          foundPrimitives.push(primitive);
          steps.push({
            position: i,
            input: char,
            primitiveId: primitive.id,
            identity: primitive.identity,
          });
        } else {
          steps.push({
            position: i,
            input: char,
            primitiveId: null,
            identity: char,
            note: "unregistered",
          });
        }
      }
    } else if (Array.isArray(input)) {
      for (let i = 0; i < input.length; i++) {
        const ref = input[i];
        const primitive = typeof ref === "string" ? this.primitives.get(ref) : ref;
        if (primitive) {
          foundPrimitives.push(primitive);
          steps.push({ position: i, primitiveId: primitive.id });
        }
      }
    } else if (input && typeof input === "object" && input.id) {
      const primitive = this.primitives.get(input.id);
      if (primitive) {
        foundPrimitives.push(primitive);
        steps.push({ position: 0, primitiveId: primitive.id });
      }
    }

    return { primitives: foundPrimitives, steps };
  }

  resolve(decomposition, context) {
    return decomposition.primitives;
  }

  selectOperators(primitives, context) {
    if (primitives.length === 0) return [];
    const scale = primitives[0].scale;
    const candidates = this.operators.findForScale(scale);
    const selected = [];
    for (const op of candidates) {
      if (op.arity <= primitives.length) {
        try {
          const testOperands = primitives.slice(0, op.arity);
          if (op.accepts(testOperands, context)) {
            selected.push(op);
          }
        } catch (e) {}
      }
    }
    return selected;
  }

  activateTopology(primitives, context) {
    const activatedStates = [];
    let traversedEdges = 0;

    for (const p of primitives) {
      if (!this.runtimeStates.has(p.id)) {
        this.runtimeStates.set(p.id, new RuntimeState(p.id, 0.5));
      }
      const state = this.runtimeStates.get(p.id);
      const prevActivation = state.activation;
      state.updateActivation(0.8, Date.now());
      activatedStates.push(p.id);

      // Record activation in topology
      this.topologyBuilder.recordActivation(p.id, 0.8, prevActivation, {
        timestamp: Date.now(),
      });

      if (this.graphs && this.graphs.dependency) {
        const edges = this.graphs.dependency.edgesFrom(p.id);
        traversedEdges += edges.length;
      }
    }

    return {
      activatedStates,
      traversedEdges,
      summary: { activatedStates, traversedEdges },
    };
  }

  compose({ primitives, operators, topology, context }) {
    if (operators.length === 0 || primitives.length < 2) {
      return {
        type: "primitive_set",
        members: primitives.map(p => ({ id: p.id, identity: p.identity })),
      };
    }

    const op = operators[0];
    const operands = primitives.slice(0, op.arity);

    try {
      const result = op.apply(operands, context);
      return {
        type: "composite",
        operator: op.id,
        result,
        operands: operands.map(o => o.id),
      };
    } catch (e) {
      return {
        type: "error",
        error: e.message,
        operator: op.id,
      };
    }
  }

  _autoMesh(primitives, derivationId, context) {
    // Auto-create local mesh for this derivation
    const meshName = `derivation:${derivationId}`;
    const mesh = this.meshRegistry.create(meshName, "local");
    for (const p of primitives) {
      mesh.join(p.id, { derivationId, scale: p.scale });
    }

    // If scale is known, also join to scale mesh
    if (primitives.length > 0) {
      const scale = primitives[0].scale;
      const scaleMesh = this.meshRegistry.get(`scale:${scale}`) ||
                       this.meshRegistry.create(`scale:${scale}`, "scale");
      for (const p of primitives) {
        scaleMesh.join(p.id, { derivationId });
      }
    }
  }

  findPrimitiveByIdentity(identity, scale) {
    for (const p of this.primitives.values()) {
      if (p.identity === identity && p.scale === scale) {
        return p;
      }
    }
    return null;
  }

  registerPrimitive(primitive) {
    this.primitives.set(primitive.id, primitive);
    return this;
  }

  registerComposite(composite) {
    this.composites.set(composite.id, composite);
    return this;
  }

  clone() {
    const cloned = new SynthiaEngine({
      primitiveRegistry: new Map(this.primitives),
      operatorRegistry: this.operators,
      graphs: this.graphs,
      version: this.version,
      grammarVersion: this.grammarVersion,
      operatorVersion: this.operatorVersion,
    });
    cloned.useAddressing = this.useAddressing;
    cloned.useDimensions = this.useDimensions;
    return cloned;
  }

  toJSON() {
    return {
      version: this.version,
      grammarVersion: this.grammarVersion,
      operatorVersion: this.operatorVersion,
      primitives: Array.from(this.primitives.values()).map(p => p.toJSON()),
      derivations: Array.from(this.derivations.values()).map(d => d.toJSON()),
      composites: Array.from(this.composites.values()).map(c => c.toJSON()),
      ledger: this.ledger.toJSON(),
      runtimeStates: Array.from(this.runtimeStates.values()).map(s => s.toJSON()),
      graphMetrics: this.topologyBuilder ? this.topologyBuilder.metrics() : {},
      meshes: this.meshRegistry ? this.meshRegistry.toJSON() : [],
    };
  }
}
