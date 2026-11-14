# Pure Synthia — Phase 2 Implementation

> A Recursive Generative State Calculus for Cross-Scale Automata
> Browser-native, deterministic, experimentally grounded.

## Phase 2: Graphs → Addresses → Dimensions → Meshes → Cross-Scale Automata

Phase 2 extends the Phase 1 baseline with:

- **Five Graph Projections** — Knowledge, Causal, Phase, Temporal, Dependency edges auto-generated from engine operations
- **Multi-Scale Meshes** — M(x) = {M_local, M_personal, M_value, M_scale, M_group} with qualified packet propagation
- **Address Evaluation** — H3 testing: candidate canonical addresses vs. random/shuffled/flat/reduced controls
- **Dimensional Evaluation** — H4 testing: 5-dimensional mappings vs. null models
- **Cross-Scale Transfer** — H2 testing: operator invariance across linguistic and computational scales
- **Dataset Generation** — Synthetic formal, linguistic, and computational datasets with discovery/validation/test splits
- **Additional Operators** — `o_project`, `o_transform`, `o_recurse` for projection, transformation, and recursive application

## Architecture

```
pure-synthia/
├── src/
│   ├── core/              # Primitive, Composite, Operator, Address, State, Evidence
│   ├── operators/         # o_bundle, o_sequence, o_project, o_transform, o_recurse
│   ├── engine/            # SynthiaEngine v2 with topology + mesh wiring
│   ├── graph/
│   │   ├── graph.js       # Five graph projections
│   │   ├── topology.js    # Auto-edge generation from operations
│   │   └── mesh.js        # Multi-scale mesh registry
│   ├── derivation/        # Derivation, Ledger, Replay
│   ├── hypotheses/        # H1–H6 formal registry
│   ├── experiments/       # Runner, Metrics, Controls, Ablation, Cross-Scale
│   ├── datasets/          # Synthetic, Linguistic, Computational
│   ├── storage/           # IndexedDB persistence
│   └── main.js            # Bootstrap with Phase 2 factories
├── tests/
│   └── phase1-gate.js     # Phase 1 validation suite
└── index.html             # Phase 2 Laboratory UI
```

## Quick Start

```bash
# Serve locally (required for ES modules)
python3 -m http.server 8000
# Open http://localhost:8000
```

## Laboratory Tabs

| Tab | Function |
|---|---|
| **⚡ Execute** | Phase 1 operations: decompose, compose, inspect derivations |
| **◈ Graph Topology** | Inspect 5 projections, metrics, neighborhoods, export JSON |
| **⌖ Address Eval** | H3: Candidate addresses vs. controls |
| **◐ Dimensions** | H4: 5-dimensional mapping vs. null models |
| **↻ Cross-Scale** | H2: Operator transfer across scales |
| **📊 Datasets** | Generate synthetic/linguistic/computational data |
| **🔬 Experiments** | Phase 1 gate, ablation studies, manifest export |

## Hypotheses Under Test

| ID | Claim | Phase 2 Component |
|---|---|---|
| H1 | Recursive generativity | Execute tab, datasets |
| H2 | Cross-scale operator invariance | Cross-Scale tab |
| H3 | Canonical address utility | Address Eval tab |
| H4 | Dimensional correspondence | Dimensions tab |
| H5 | Compression | Metrics collector |
| H6 | Numerical law correlation | Ledger measurements |

## Design Principles (unchanged from Phase 1)

- **Deterministic** — Hash-verified replay
- **Inspectable** — Every output carries complete provenance
- **Falsifiable** — Explicit null hypotheses for every claim
- **Ablation-ready** — Any component removable for impact measurement
- **Backend-free** — Browser-native only

## Phase 2 Implementation Order (Appendix I.18)

```
Phase 1: Primitive → Operator → o_bundle → o_sequence → Composite → Derivation → Ledger → Replay → Dataset → Experiment → Metrics → Ablation
Phase 2: Graphs → Addresses → Dimensions → Meshes → CrossScaleAutomata
```

Phase 2 is now complete through Cross-Scale Automata testing infrastructure.
