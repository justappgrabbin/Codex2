# SWARM-OS — Pass 04: use the existing answer key (2026-10-17)

**This ZIP is an additive copy of `SWARM-OS-Zhouyi-structural-pass-03.zip`, NOT a replacement for the user's system.** Its existing files are preserved byte-for-byte. Originals in the user's Library/Drive are untouched.

## Source authority, in actual order

1. `swarm-state-space-foundation.zip` — existing tested finite address hierarchy. Its `state-space.mjs` is copied without edits to `source/verified-foundation-address.mjs`.
2. `semantic-dna-swarm (1).html` in Google Drive (file ID `1VaDdlmpLpTFMaXEdPHZrUsVnGvSHCoU_`) — supplied King Wen/Fu Xi **64-entry lookup** and donor-defined `soundFor`, `colorFor` formulas. Exact source map copied into `source/king-wen-fuxi-map.mjs` with a bijection check. Sound/color field rules are referenced in `source/positioned-state-space.mjs` with their source parameters, not replaced with sampled defaults.
3. `SWARM-OS-Zhouyi-structural-pass-03.zip` — unchanged runtime, recursive VM, `zhouyi-state.mjs`, reversible perspective operations, execution adapter, and trimodal source files.
4. User's four Drive specifications: [Causal Graph](https://docs.google.com/document/d/1dvrTl85zB43BXGK0H8n2YsJr-lZ5zFrzWl2bWvijKkk/edit), [Isohuman](https://docs.google.com/document/d/1rv0P2PRmAHXL4gPC5sPGRhVKcp0J8zM2x1QRF7F14tw/edit), [Proportion of Perspective](https://docs.google.com/document/d/13bUu3Ya5PFaqv61BdQCTb40gDXowPW0m/edit), [Graph working notes](https://docs.google.com/document/d/1pRXTJGn5gwZvYuX2NQwKinM72HM2pU8arUS7KKK-nh0/edit).

## What this checkpoint actually does

- **Positions**: validated bijective index for all 64 × 6 × 6 × 6 × 5 = **69,120** micro positions. Index is not incorrectly treated as a King Wen/Fu Xi number.
- **Transition identities**: 64 exact binary states, all 384 individual line flips, all 4,096 moving-mask applications; gates resolve through the user's 64-value King Wen/Fu Xi answer-key table rather than fabricated sequential gate mappings.
- **Perspective**: computes a reversible view via existing six-position perspective transforms. It preserves original positional identity and independently exposes new apparent gate/line plus contextual house, axis and dimension.
- **Qualitative expressions**: deterministic sound & color rules from `semantic-dna-swarm (1).html` and existing polygon calculation from `tri-modal-expression.mjs`. Each exposes provenance. These are source-defined *computational* projections, not experimentally confirmed laws of color, sound, geometry or DNA.
- **History**: append-only in-memory ledger, checkpoint export and strict deterministic restore/continuity check.
- **All executions**: pure Node/main-thread JS; no server, worker or external LLM. This is a usable JS module, not an APK or integrated phone computer.

## Verification

From this folder:

```sh
node --test tests/*.test.mjs
node bin/inspect-state-space.mjs
```

Test run this pass: **31/31 pass** (23 inherited tests plus 8 new tests). Foundation's original `node test.mjs` separately passed exhaustive 69,120 address round trips. A full runtime build on Android and any claims about external scientific phenomena have not been tested.

## Boundaries that must remain visible

- The foundation's angle index uses **sequential bins anchored at zero**; it does not implement a validated Human Design wheel order/ephemeris. House 1..12 in your graph documents and eight *trigram houses* in the Kimi donor are **distinct** conventions. No blending or silent conversion.
- Source sound rule uses `rhythmicSlot = house - 1` and was originally annotated as an 8-beat cycle in the donor; with a 12-house contextual address, `house > 8` yields larger slots. This mismatch is deliberately exposed, not silently clamped or fixed by invention.
- Dimension is an **observer context** here, not proof that the five field operators are already fully executing. Space is not installed as an extra independent physical layer.
- `colorFor` yields HSL channels and layer semantics; `expressPrimitive` yields a polygon; both are design projections as defined by existing source, not source-validated universal shape/color/sound identities.
- The graph spec's 64 gate archetype/house/axis table, 13 filters, 9 sections, 26×4 primitive families, nested dimensional operators, chart-provenance, Bantu and DNA correspondence, and full semantic/execution mesh remain their **own real components**; they are not falsely claimed wired by this ZIP.
- No pre-existing component, document, package, or donor archive was deleted. No placeholder modules and no invented category mappings have been inserted.
