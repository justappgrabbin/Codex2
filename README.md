# Synthia Computer — build in progress

This repository preserves and continues the original Computer implementation. **The requested coherent Computer is not complete.** This checkpoint recovers the existing source and dependencies; it is not a replacement specification or a claim that donor tests establish the whole system.

The earlier standalone Python file-library application was rejected and is not included here.

## Run the recovered Computer

```sh
git clone --recurse-submodules https://github.com/justappgrabbin/Codex2.git
cd Codex2
npm --prefix computer/shell/kimi-linux ci
npm --prefix computer/shell/kimi-linux run build
SYNTHIA_PORT=8877 node computer/host/server.mjs
```

Open http://127.0.0.1:8877. Runtime data stays local. Keep this development server on loopback.

```sh
npm --prefix computer run test:reassembly
```

## Source recovery

- Computer: `justappgrabbin/SynthAi`, commit `1db686e3e8355bd9016c27c7ed98c5be2af19d6e`, from `repair/android-computer-import-preservation-20261023`.
- Existing Computer donor: `justappgrabbin/Back-up-`, commit `1c45318a668de3bb3c54ae488b3d5f4109d1ba6b`, retained as the original submodule under `computer/donors/Back-up-`.
- Additional recovered candidates, pinned as source submodules rather than falsely claimed integrated: `Simlish` at `239fbbd28194aa72b9f0db5800d685d492468d64` and `Generative-address-system` at `ce1704d5d53d5729b499463f7eeaf5dcd5091550`.

Tracked original Computer files are preserved. Root documentation, development exclusions, and the source submodule list are additive integration metadata. No private runtime state, personal files, installed dependencies, or raw private continuity documents are included.

## Verified at this checkpoint

The recovered Computer passed 32 reassembly tests covering original preservation, duplicate/concurrent imports, execution identity, restart, and HTTP origin boundaries. Its original desktop shell built and opened in Chromium without page script errors. Source tests for the Generative assembly, execution spine, and live Simlish handoff were also executed separately. See `docs/recovery/STATUS.md` for limits.

## Remaining work

The original specification remains the target, including foundational neural behavior, full semantic addressing, one relational state space, dodecahedral computational structure, the semantic Swarm, and integration of suitable existing components. Source recovery and a running desktop do not satisfy those requirements on their own.
