# Assumptions & Provenance Log — Phase 1, Increment 2

Machine-readable source of truth: `src/experiments/assumptions.js`
(`assumptionsManifestHash()` gives a content hash of this exact list,
per Appendix D's provenance discipline).

Every design decision in this increment that is not already fixed by
the specification (Abstract–Appendix J) is logged here, with an
evidence state from Appendix B's chain.

| id | kind | claim | evidence state |
|---|---|---|---|
| A-D1-01 | assumed | D1 tier = 10-phoneme subset, fixed arity 3 (place, manner, voicing) | assumed |
| A-D1-02 | assumed | Voicing modeled as two mutually-exclusive primitives (`f.voice` / `f.voiceless`), not one binary-valued feature | assumed |
| A-D1-03 | assumed | Discovery/test split = `{p,b,t,d,k,m,n,f}` / `{g,v}`, chosen (not derived) to satisfy H.5 | assumed |
| H-D1-01 | hypothesized → **tested** | Bundling held-out phonemes' known component features via `o_bundle` reproduces gold structure with zero collision against stored discovery derivations | **tested — result below** |
| A-D1-04 | assumed | H.9 encoding scheme: `L_direct` = fixed-width code over the 10 observed phonemes; `L(G)` = operator-identity bits (0, since only 1 operator) + a flat 4-bit arity field; `L(X\|G)` = fixed-width code over unordered 3-of-8 feature combinations (`C(8,3)=56`) | assumed, fixed before computing result |
| A-D1-05 | assumed | D1's `o_bundle` has no position/order dependency by design (§I.5) — no genuine "position information" ablation is possible on this tier. Substituted an ablation of the order-*canonicalization* mechanism instead, scored on a separate order-invariance metric, not folded into `generationAccuracy` | assumed, disclosed substitution |
| A-D1-06 | assumed | `TEST_COUNT_AT_SEAL_TIME` in `seal-d1.js` is a hand-set constant, not auto-discovered from the test runner | assumed, known limitation |

## H.9 compression result (D1, full 10-item split, raw numbers)

```
L_direct(X)        = 40 bits   (10 items × 4 bits/item, alphabet size 10)
L(G)                = 4 bits    (0 bits operator-id + 4 bits arity field)
L(X|G)              = 60 bits   (10 items × 6 bits/item, C(8,3)=56 combinations)
L(G) + L(X|G)        = 64 bits
compressionGain (CG) = 1 - 64/40 = -0.6
```

**Raw result: CG is negative.** Under this fixed, disclosed encoding scheme, the grammar+residual encoding costs *more* bits (64) than the flat direct encoding (40) on this 10-item D1 split — i.e., no compression, in fact a loss, at this scale. Interpretation deferred to the main response; the numbers above are reported as computed, not adjusted to fit an expected outcome.

## H.12 ablation result (D1, `generationAccuracy` baseline = 1.0 unless noted)

| Component removed | Performance(S⁻ˣ) | AblationImpact |
|---|---|---|
| `o_bundle3` (the only operator) | 0.0 | **1.0** |
| `f.voice` | 0.0 | **1.0** |
| `f.place.vel` | 0.5 | 0.5 |
| `f.manner.stop` | 0.5 | 0.5 |
| `f.place.lab` | 0.5 | 0.5 |
| `f.manner.fric` | 0.5 | 0.5 |
| `f.place.alv` | 1.0 | 0.0 |
| `f.manner.nas` | 1.0 | 0.0 |
| `f.voiceless` | 1.0 | 0.0 |
| canonicalization step (order-invariance metric, baseline 1.0) | 0.0 | **1.0** |

Raw pattern: impact is exactly proportional to how many of the 2 held-out targets (`g`, `v`) use that feature — 0, 1, or 2 of them — which is the expected/mechanical result given the frozen dataset, not a surprising empirical finding. `f.voice` and the operator itself are the only single points of total failure. Three features show zero measured impact *on this metric*, because neither held-out target happens to use them — that is a property of this specific 2-item test split (A-D1-03), not a claim those features are unimportant in general.

## D1 sealed artifact

`artifacts/D1-SEALED.json`, manifestHash `7714d633d691145e239e37e7dbbcde0da165b73e90552405e5a459c77f3bafcf`. Contains: dataset hash, grammar/operator hash, reconstruction metrics + derivations, compression raw numbers, ablation results, the full assumptions list, and the test count at seal time (47). `sealD1()` is deterministic — re-running it reproduces the identical manifestHash (tested in `seal-d1.test.js`).


```
generationAccuracy:    1.0   (2/2 held-out phonemes structurally correct)
novelCompositionRate:  1.0   (2/2 correct outputs, 0 matched a stored discovery derivation)
```

Per Appendix B's evidence-state discipline, this moves H-D1-01 from
`hypothesized` to `tested`, with result **supported** — on this small,
hand-built D1 split. This is *not* evidence for H1/H2 (§B.1/B.2) at
any scale beyond features→phonemes; extrapolating it upward without
running the corresponding L2+ experiment would be exactly the kind of
unearned generalization Appendix H.16's gate exists to prevent.

## What this increment does NOT claim

- Does not run the H.7 baseline controls (flat-lookup, random-grammar,
  shuffled-structure) against this result yet — so "Pure Synthia beat
  a control" is not yet a claim this increment makes, only "Pure
  Synthia produced a correct, unstored output."
- Does not touch Appendix J. No dimensional/keynote correspondence was
  read, referenced, or used anywhere in this increment's code or data.
- The negative CG result above is D1-scale only (n=10, k=3, |F|=8).
  §19's falsification criterion #4 anticipates this at small scale;
  it does not by itself falsify H5 (§B.5) at the scale H5 is actually
  claimed for, but it is also not evidence *for* H5 yet either — it's
  a neutral/negative data point at this tier, reported as such.
