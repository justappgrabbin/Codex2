# Synthia Consciousness Swarm — additive executable layer v0.1.1

**Scope:** implementation of selected causal-graph, particle, composition, formation and provenance contracts *using* the uploaded Consciousness Swarm v3.0 demo and the October 17–18 connected Google Doc as references. This is **not** a replacement of SWARM-OS or the existing Synthia Computer, and it is **not** an Android APK.

## What is implemented (JavaScript only, no backend, network, GPU, LLM, or Web Worker required)

1. **One X / multiple views:** Movement, Evolution, Being, Design act as four perspectives. Space is derived from the same node, its relations and/or the collective formation; it is not a separately booted fifth agent. Shadows are constraint names, not four additional autonomous agents.
2. **64-gate anchor matrix:** all 64 rows directly extracted from the user's supplied document, with associated base, name, archetype, anchor, zodiac, house. The matrix is included in `src/gate-matrix.mjs`; tests check its completeness.
3. **Rule O:** gate/line/color/tone/base validation, tone×color compatibility, base×tone resonance weights, line 1–6 traversals, preserved named anchors. Where an anchor is not actually present in its listed dimension chain, the result marks `bridge-proposed-not-source-attested` instead of pretending the original graph supplied that edge. Siding/gift is left explicitly *undetermined*, not silently asserted.
4. **Recursive primitive and composition ledger:** typed atomic nodes, registered executable operators, scaled compositions, constituent edges, complete recursive decompositions and causal event lineage. Vowels `I A E U O` and `M` use only correspondences stated in the user's document. Unknown letters are *not* given invented dimensional identities.
5. **Movement and sound observation:** a movement event can record sound present, sound absent or sound unknown distinctly. Geometry direction constraints are `UP`, `HORIZONTAL`, `DIAGONAL`, `FREE`, `STILL`.
6. **Formation mechanics from the demo:** actual Legendre moment measurements, numerical finite-difference moment-gradient control, per-particle target attraction, constrained motion, and measurable before/after errors.
7. **Distributed estimation and transport recovery:** mass-conserving push-sum with dropped packets retained by the sender, deterministic loss schedules, and new transport-only links when a participant is deactivated. The removed node's semantic identity and event history remain intact.
8. **Host bridge:** `connectToComputer(runtime)` or `mountConsciousnessService(runtime)` delegates canonical address, relation, and real automata capability execution to the already-existing ComputerRuntime services. It does *not* contain `eval`, `Function`, a fake sandbox, or a substitute ATO/Klein engine.
9. **Persistence:** serializable snapshot/restore of nodes, edges, active geometry, transport, and append-only events, plus a bridge method for storing snapshots in the existing Computer StateStore.

## Local execution

```bash
npm test     # Node.js 20+; 17 tests
npm run demo # word composition, 80 shape-control iterations, lossy push-sum, gate traversal
```

## Connect to the existing Synthia Computer (without overwriting donors)

The currently inspected host source is `justappgrabbin/SynthAi` default branch, files `computer/ComputerRuntime.mjs`, `computer/services/address-service.mjs`, `computer/services/automata-engine.mjs`, `computer/events/event-emitter.mjs`. They expose the precise methods used by `src/computer-bridge.mjs`.

Copy this addon directory into your **cloned working source tree** (do not edit originals), then in the existing host boot path, *after* its actual `ComputerRuntime.boot()` finishes, import:

```js
import { mountConsciousnessService } from './path-to-addon/src/computer-bridge.mjs';

const bridge = mountConsciousnessService(existingBootedComputerRuntime);
const { primitive, address, provider } = await bridge.resolveAndIngest({ arcSecond: 12345 });
const execution = await bridge.execute('actual-advertised-capability', { /* real input */ });
```

The example above requires a real capability name and address accepted by the recovered Computer providers. No new capability is registered or faked. `mountConsciousnessService` adds exactly **one** service to the host registry and rejects a duplicate; the existing donor systems remain untouched.

**Host integration status:** the bridge was tested with a contract-compatible fixture, **not** with the complete real Computer source tree or Android WebView. Therefore it is `PRESENT + LOCALLY TESTED`, but **NOT YET HOST-WIRED/PHONE-VERIFIED**. This artifact deliberately does not claim that an APK exists or that arbitrary morphing, local LLMs or photorealistic rendering have been integrated.

## Source lineage

- `Consciousness Swarm v3.0` user-uploaded demo: extracted and analyzed. Its mathematical/multiobjective and nine-position claims informed this repair layer; no unsafe `new Function()` sandbox was copied.
- `Consciousness Causal Graph Construction Specification & Master Architecture`, [user's connected Google Doc](https://docs.google.com/document/d/1pRXTJGn5gwZvYuX2NQwKinM72HM2pU8arUS7KKK-nh0/edit): source of the exact 64-gate mapping and compatibility rules.
- `Synthia: Architecture and Nested State-Space Neural Field (combined, 2026-10-10)`, connected Drive: source of the four active viewpoints, Space as emergent, canonical address fields, and append-only lineage requirement.
- Current Computer source on GitHub: source of contract names and the Computer service registry integration seam.

## Deliberately unresolved (rather than filled with inventions)

- Exact dimension + D/M/S + Color/Tone/Base -> arc formula, including sign conventions and provider reconciliation.
- Axiom / axis / axion / axon identities and the full primitive alphabet beyond established letter correspondences.
- Deterministic, specified mapping of every symbolic color to a visual RGB color or every character to a geometric shape.
- Complete existing ATO/Klein/Tool Factory execution integration, actual app boot wiring, production persistence and APK.
- Empirical support for Human Design's proposed relationships. All causal archetypes in this package are treated as symbolic hypotheses.

These are documented as open requirements, not represented by placeholders or fabricated results.

## v0.1.1 continuity gate — existing Computer StateStore, no silent reset

- The adapter now reads the existing `runtime.state.get('consciousness-swarm.snapshot')` **before** registering the service and resumes it with `ConsciousnessSwarm.restore`. Previously the bridge always constructed a new empty swarm when mounted without an explicit instance.
- The bridge refuses to mount over a corrupt checkpoint, and refuses a competing caller-supplied blank swarm when a saved snapshot exists. It will not erase history to make boot appear successful.
- `persistSnapshot()` writes to the existing host StateStore, reads it back, and emits a provenance event. A same-process readback does **not** certify durability across restart.
- The existing ComputerRuntime's default `MemoryPersistence` cannot survive a fresh-process restart. The bridge now explicitly rejects it when `persistSnapshot()` is invoked. Use the host's already-existing persistent adapter, e.g. `LocalStoragePersistence` in a compatible browser context; do not invent a second storage architecture.
- Independent OS-process test: the actual `StateStore` implementation from GitHub blob `09f61a7f40a6d98565a2ba796e31841c726e60c5` is copied **only into test/host-reference/**. Two Node processes use a real local disk-backed persistence adapter and verify preserved node IDs, event sequence progression and saved composition. This tests source-level continuity, **not** a full Computer or Android boot.
- `npm test` now runs 21 automated tests. No backend or LLM required.

**Still open:** real Computer boot-path mounting; real address-provider and automata gateway with recovered donor packages; phone entry, user interaction, and Android APK test. This package does not claim those milestones.
