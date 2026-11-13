# Synthia Computer — build in progress

Latest work and remaining tasks: [tonight's additive memory/security handoff](docs/release/TONIGHT-STATUS.md). The downloadable ZIP remains the earlier checkpoint; the branch includes the newer source additions.

## Tested local continuity distribution

The resident Computer now includes persistent contextual capability resolution, source evidence/structural inspection, event-driven project observation and an approval-bound isolated build/test worker. The existing desktop exposes these through **Computer**. Start a packaged checkout with `Start-Synthia.cmd` or `sh start-synthia.sh` (Node 22+). See [setup, actual scope and limits](docs/release/START-HERE.md), [verification](docs/release/VERIFICATION.md) and [continuity checkpoint](docs/release/CONTINUITY.md). This is a working integration checkpoint; the full mission, Codex3 integration and functional Android release remain unfinished.

The [final requirements review](docs/release/REQUIREMENTS-REVIEW.md) explicitly identifies completed, partial and missing work for handoff.

This repository preserves and continues the original Computer implementation. **The requested coherent Computer is not complete.** This checkpoint recovers the existing source and dependencies; it is not a replacement specification or a claim that donor tests establish the whole system.

The earlier standalone Python file-library application was rejected and is not included here.

## Run the recovered Computer

```sh
git clone --recurse-submodules https://github.com/justappgrabbin/Codex2.git
cd Codex2
npm --prefix computer ci
npm --prefix computer/shell/kimi-linux ci
npm --prefix computer/shell/kimi-linux run build
SYNTHIA_PORT=8877 node computer/host/server.mjs
```

Open http://127.0.0.1:8877. Runtime data stays local. Keep this development server on loopback.

```sh
npm --prefix computer run test:reassembly
```

## Current integration

The resident Computer engine now also hosts the Generative structural-analysis tools, and execution reuses that engine. In Code Editor, choose **Analyze structure** to inspect text through the source recognizers and save an evidence receipt. See [the integration and its limits](docs/recovery/SHARED-ENGINE-2026-11-09.md).

```sh
npm --prefix computer run test:integration
```

## Learning, coding, and GitHub retrieval

The Import app now includes a persistent learning workspace, commit-pinned GitHub source retrieval, and a checked component shelf. A configured local coding model can generate and repair synchronous JavaScript modules using retrieved source and explicit acceptance checks. See [setup, supported behavior, and limits](computer/LEARNING.md). Model weights are not bundled, and universal semantic assembly remains unfinished.

## Source recovery

- Computer: `justappgrabbin/SynthAi`, commit `1db686e3e8355bd9016c27c7ed98c5be2af19d6e`, from `repair/android-computer-import-preservation-20261023`.
- Existing Computer donor: `justappgrabbin/Back-up-`, commit `1c45318a668de3bb3c54ae488b3d5f4109d1ba6b`, retained as the original submodule under `computer/donors/Back-up-`.
- Pinned source submodules (Generative structural analysis is now attached to the resident engine; Simlish remains a separately tested source candidate): `Simlish` at `239fbbd28194aa72b9f0db5800d685d492468d64` and `Generative-address-system` at `ce1704d5d53d5729b499463f7eeaf5dcd5091550`.

Recovered Computer source is retained with documented credential redactions in publication copies. Unredacted originals remain local. Root documentation, development exclusions, and the source submodule list are additive integration metadata. No private runtime state, personal files, installed dependencies, or raw private continuity documents are included. See `docs/recovery/PUBLICATION-REDACTIONS.json` for exact changed paths and integrity hashes. Hardcoded credentials and live Supabase project URLs were removed; optional external connections must be configured locally before use.

## Recovered baseline verification (previous checkpoint)

The recovered Computer passed 32 reassembly tests covering original preservation, duplicate/concurrent imports, execution identity, restart, and HTTP origin boundaries. Its original desktop shell built and opened in Chromium without page script errors. Source tests for the Generative assembly, execution spine, and live Simlish handoff were also executed separately. See `docs/recovery/STATUS.md` for limits.

## Remaining work

The original specification remains the target, including foundational neural behavior, full semantic addressing, one relational state space, dodecahedral computational structure, the semantic Swarm, and integration of suitable existing components. Source recovery and a running desktop do not satisfy those requirements on their own.
