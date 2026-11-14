# Pure Synthia — Phase 1

Implements the Appendix I.18 build order:

```
Primitive -> Operator -> o_bundle -> o_sequence -> Composite
-> Derivation -> Ledger -> Replay
```

Nothing under `Graphs -> Addresses -> Dimensions -> Meshes -> CrossScaleAutomata`
is implemented here — per §I.18, that only starts once Phase 1 clears the
H.16 gate below.

## Run

```
npm test
```

32 tests, 0 dependencies (uses Node's built-in `node:test`, `node:assert`,
and `node:crypto` only — no network, no external packages, per §18's
pure-JS/no-backend constraint).

## What's here vs. what Appendix H.16 actually requires

The H.16 Phase-1 gate lists ten things. Honest status:

| # | H.16 requirement | Status here |
|---|---|---|
| 1 | Feature representation | ✅ `Primitive` (Appendix A features can be loaded as `Primitive` instances) |
| 2 | `o_bundle` | ✅ order-insensitive, arity-configurable, identity-preserving |
| 3 | `o_sequence` | ✅ order-sensitive, positional |
| 4 | Deterministic decomposition/composition | ⚠️ composition is deterministic; automatic *decomposition* of raw input into primitives is **not** implemented — `execute()` currently takes explicit `primitiveIds`, not raw text. Real decomposition is a discovery-phase problem, not a data-structure problem, and shouldn't be faked. |
| 5 | Held-out reconstruction | ✅ `experiments/reconstruction.js` + `datasets/d1-phonemes.js` — real 8/2 discovery/test split, real Acc computed (see ASSUMPTIONS.md) |
| 6 | Unseen-composition test | ✅ same experiment: held-out derivations checked against a genuine StoredSolutions set built from the discovery run, not asserted by construction — real NCR computed |
| 7 | Complexity-ledger collection | ✅ `derivation/ledger.js`, wired into `execute()` |
| 8 | Compression comparison | ✅ `experiments/compression.js` — real numbers on frozen D1 split: CG = **-0.6** (loss, not gain, at this scale — see ASSUMPTIONS.md) |
| 9 | Operator ablation | ✅ `experiments/ablation.js` — real `AblationImpact` for operator removal, all 8 feature primitives, and the canonicalization mechanism (substitute for position ablation, D1 has no sequence task — see A-D1-05) |
| 10 | Deterministic replay | ✅ `derivation/replay.js`, including a test that deliberately catches a non-deterministic operator |

**D1 is sealed.** `artifacts/D1-SEALED.json` is a deterministic snapshot
(dataset hash, grammar/operator hash, reconstruction metrics + derivations,
compression raw numbers, ablation results, full assumptions list, test
count) — re-running `sealD1()` reproduces the identical `manifestHash`.
All ten H.16 gate items now have either a real result or an explicitly
disclosed, scoped substitution. See `ASSUMPTIONS.md` for every raw number
and every non-spec decision behind them.

## Layout

```
src/
  core/         primitive.js, operator.js, composite.js, hash.js
  operators/    bundle.js, sequence.js
  derivation/   ledger.js, derivation.js, replay.js
  engine/       synthia.js
  datasets/     d1-phonemes.js
  experiments/  reconstruction.js, compression.js, ablation.js, seal-d1.js, assumptions.js
test/           one file per module, node:test
artifacts/      D1-SEALED.json — sealed, deterministic D1 artifact
ASSUMPTIONS.md  provenance log, raw results, evidence states (Appendix B-style)
```
