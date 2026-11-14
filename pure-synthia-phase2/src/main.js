// src/main.js
/**
 * Pure Synthia — Phase 2 Entry Point
 * Graphs → Addresses → Dimensions → Meshes → Cross-Scale Automata
 */
import { Primitive } from "./core/primitive.js";
import { Composite } from "./core/composite.js";
import { CanonicalAddress } from "./core/address.js";
import { Evidence } from "./core/evidence.js";
import { GraphProjectionSet } from "./graph/graph.js";
import { GraphTopologyBuilder } from "./graph/topology.js";
import { MeshRegistry } from "./graph/mesh.js";
import { OperatorRegistry } from "./operators/registry.js";
import { SynthiaEngine } from "./engine/synthia.js";
import { AddressEvaluator } from "./engine/address-evaluator.js";
import { DimensionalEvaluator } from "./engine/dimensional-evaluator.js";
import { HypothesisRegistry } from "./hypotheses/hypothesis.js";
import { Experiment, ExperimentRunner } from "./experiments/experiment.js";
import { MetricsCollector } from "./experiments/metrics.js";
import { ControlSystem, AblationStudy } from "./experiments/controls.js";
import { CrossScaleExperiment } from "./experiments/cross-scale.js";
import { SynthiaStorage } from "./storage/indexed-db.js";
import { SyntheticDataset } from "./datasets/synthetic.js";
import { LinguisticDataset } from "./datasets/linguistic.js";
import { ComputationalDataset } from "./datasets/computational.js";

export {
  Primitive,
  Composite,
  CanonicalAddress,
  Evidence,
  GraphProjectionSet,
  GraphTopologyBuilder,
  MeshRegistry,
  OperatorRegistry,
  SynthiaEngine,
  AddressEvaluator,
  DimensionalEvaluator,
  HypothesisRegistry,
  Experiment,
  ExperimentRunner,
  MetricsCollector,
  ControlSystem,
  AblationStudy,
  CrossScaleExperiment,
  SynthiaStorage,
  SyntheticDataset,
  LinguisticDataset,
  ComputationalDataset,
};

// Phase 2 convenience factory
export function createPhase2Engine() {
  const graphs = new GraphProjectionSet();
  const operators = new OperatorRegistry();
  const engine = new SynthiaEngine({
    primitiveRegistry: new Map(),
    operatorRegistry: operators,
    graphs,
  });
  return engine;
}

// Bootstrap with phonological primitives (Phase 1) + Phase 2 features
export function bootstrapPhonologicalPrimitives(engine) {
  const features = [
    { id: "f.voice", identity: "voiced", contrast: "[±voice]", position: "manner-independent", scale: "sub-phonemic" },
    { id: "f.voiceless", identity: "voiceless", contrast: "[±voice]", position: "manner-independent", scale: "sub-phonemic" },
    { id: "f.place.lab", identity: "labial", contrast: "[place=labial]", position: "articulation-point", scale: "sub-phonemic" },
    { id: "f.place.alv", identity: "alveolar", contrast: "[place=alveolar]", position: "articulation-point", scale: "sub-phonemic" },
    { id: "f.place.vel", identity: "velar", contrast: "[place=velar]", position: "articulation-point", scale: "sub-phonemic" },
    { id: "f.manner.stop", identity: "stop", contrast: "[manner=stop]", position: "manner", scale: "sub-phonemic" },
    { id: "f.manner.fric", identity: "fricative", contrast: "[manner=fricative]", position: "manner", scale: "sub-phonemic" },
    { id: "f.manner.nas", identity: "nasal", contrast: "[manner=nasal]", position: "manner", scale: "sub-phonemic" },
  ];

  for (const f of features) {
    engine.registerPrimitive(new Primitive(f));
  }

  const phonemes = [
    { id: "phoneme.p", identity: "/p/", scale: "phonemic", features: ["f.place.lab", "f.manner.stop", "f.voiceless"] },
    { id: "phoneme.b", identity: "/b/", scale: "phonemic", features: ["f.place.lab", "f.manner.stop", "f.voice"] },
    { id: "phoneme.t", identity: "/t/", scale: "phonemic", features: ["f.place.alv", "f.manner.stop", "f.voiceless"] },
    { id: "phoneme.d", identity: "/d/", scale: "phonemic", features: ["f.place.alv", "f.manner.stop", "f.voice"] },
    { id: "phoneme.k", identity: "/k/", scale: "phonemic", features: ["f.place.vel", "f.manner.stop", "f.voiceless"] },
    { id: "phoneme.m", identity: "/m/", scale: "phonemic", features: ["f.place.lab", "f.manner.nas", "f.voice"] },
    { id: "phoneme.n", identity: "/n/", scale: "phonemic", features: ["f.place.alv", "f.manner.nas", "f.voice"] },
  ];

  for (const p of phonemes) {
    engine.registerPrimitive(new Primitive({
      id: p.id,
      identity: p.identity,
      contrast: "phoneme",
      position: "onset",
      scale: p.scale,
      dependencies: p.features,
    }));
  }

  return engine;
}

// Register candidate dimensions from Appendix J
export function bootstrapDimensions(evaluator) {
  const dimensions = [
    {
      id: "D1",
      macroName: "Movement",
      macroChain: ["Energy", "Creation", "Seeing", "Landscape", "Environment"],
      microName: "Individuality",
      microChain: ["Activity", "Reaction", "Limitation", "Perspective", "Relation"],
      keynote: "I Define",
    },
    {
      id: "D2",
      macroName: "Evolution",
      macroChain: ["Gravity", "Memory", "Taste", "Love", "Light"],
      microName: "The Mind",
      microChain: ["Character", "Separation", "Nature", "Integration", "Spirit"],
      keynote: "I Remember",
    },
    {
      id: "D3",
      macroName: "Being",
      macroChain: ["Matter", "Matter", "Touch", "Sex", "Survival"],
      microName: "The Body",
      microChain: ["Biology", "Chemistry", "Objectivity", "Geometry", "Trajectory"],
      keynote: "I Am",
    },
    {
      id: "D4",
      macroName: "Design",
      macroChain: ["Structure", "Progress", "Smelt", "Life", "Art"],
      microName: "The Ego",
      microChain: ["Homo Sapiens", "Growth", "Decay", "Continuity", "Manifestation"],
      keynote: "I Design",
    },
    {
      id: "D5",
      macroName: "Space",
      macroChain: ["Form", "Illusion", "Hearing", "Music", "Freedom"],
      microName: "Personality",
      microChain: ["Type", "Fantasy", "Subjectivity", "Rhythm", "Timing"],
      keynote: "I Think",
    },
  ];

  for (const d of dimensions) {
    evaluator.registerCandidate(d);
  }

  return evaluator;
}

// Default export: fully bootstrapped Phase 2 engine
export default function initPureSynthia() {
  const engine = createPhase2Engine();
  bootstrapPhonologicalPrimitives(engine);
  return engine;
}
