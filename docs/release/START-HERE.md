# Synthia local Computer — continuity integration checkpoint

This package extends the existing Codex2 Computer. It is a runnable local source distribution, not a native installer or a completed general-purpose autonomous computer.

Final construction qualification remains open: the environment ran out of disk during the last combined security/interruption regression. Earlier real-execution receipts are included, but are not claimed as final-source qualification. See VERIFICATION.md and REQUIREMENTS-REVIEW.md before relying on construction; core import/research can be used independently.

## Start

Install Node.js 22 or newer. Extract the ZIP to a writable folder. On Windows, double-click `Start-Synthia.cmd`. On Linux/macOS run `sh start-synthia.sh`. Open http://127.0.0.1:8765. Stop with Ctrl+C in the launcher terminal. The ZIP includes the built original desktop; startup needs no npm installation or account.

Use **Computer** in the desktop dock. Import project text files or a directory under Projects. For ZIPs, use the existing Import app, then enter its admitted `/home/user/Imports/<archive-name>/` prefix in Computer → Projects. The preserved archive remains in the original VFS; project copies retain original paths and a separate immutable source checkpoint within the SAME StateStore. Limits: 250 project files, 200,000 characters/file, 2.8 MB total text. Binary ZIP intake remains governed by the original admission limits.

Research shows exact evidence, manifest dependencies, TODOs, JSON findings and missing exact-path relative imports. Each changed project also receives a real structural-analysis receipt from the resident Generative engine. This inspection is bounded static analysis, not complete language/dependency resolution. Conventional missing `dist/` and `build/` imports are labeled possible outputs; only actual commands can establish their production.

Capabilities retain identities and explain DEFERRED, BLOCKED, UNVERIFIED, FAILED_VERIFICATION or ACTIVE applicability. Source/security validity are separate from usefulness. Dependency changes never bypass source review or verification. ACTIVE means eligible in its recorded scope; a successful isolated build does not authorize host execution.

Planner accepts an evidence-backed goal and up to eight explicit file changes as a JSON array, for example `[{"path":"src/settings.mjs","content":"export const currency = '$';\n"}]`. Review the source snapshot, changes, dependency evidence and plan digest, then approve or deny. Approval permits one isolated local build and test. It grants no publishing, host modification, network, payment or account actions. The worker does not synthesize arbitrary repairs from natural language. Provide the actual bounded change; retained source evidence helps identify it.

## Isolated construction

Install Docker with a local Linux-container daemon, then run `node scripts/prepare-worker.mjs` once to retrieve the pinned Node image. The application checks availability and reports a blocker if the daemon/image is unavailable. Core import/research still work. Image: `node@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee`.

Projects must declare `build` and `test` scripts in package.json. The worker copies the approved source snapshot into a disposable container, runs `npm run build && npm test`, and captures real output, exit status, input digest and approval. Runtime limits: no network, 256 MB memory, one CPU, 64 PIDs, non-root, read-only root/source, dropped capabilities, 100 MB work tmpfs, 60-second in-container timeout and 65-second parent timeout. Container source never receives host credentials or the Docker socket. Imported code runs only inside that boundary.

No dependency installation occurs during execution. The qualified workflow supports projects whose dependencies are present in the pinned base image, including dependency-free Node applications. Projects needing npm packages must remain blocked until an explicitly reviewed offline dependency/image mechanism is implemented. The manifest inventory does not claim packages are installed.

The inherited Code Editor/Import JavaScript Run path now uses the same container boundary through a sandbox adapter while retaining the original semantic execution pipeline. Its former host-evaluation fallback is disabled. Without Docker, code execution returns an actionable unavailable result; it does not run on the host. Wasm execution is deferred until a separately qualified isolated Wasm adapter is supplied. Plain data/JSON interpretation remains source data processing.

The current worker admits a JSON source bundle with patched source and verification receipt through the Computer's existing artifact registry. It does **not** export compiled dist files. A zero exit code proves the recorded scripts exited zero; assess the actual tests for behavioral coverage. Originals and resident working source are never overwritten by a successful job. There is no automatic promotion, destructive action, retry, push or publication. Interrupted jobs become INTERRUPTED on restart and require investigation and a new approved plan.

Linux x86-64 was qualified here. The Windows launcher and Docker named-pipe path are provided but were not run on Windows. Docker Desktop/WSL mount compatibility still needs a Windows device test. Android cannot use this Docker worker locally; see ANDROID.md.

## Persistence and backup

The launcher stores data in `local-data/`, or `SYNTHIA_DATA_DIR` when configured. It contains the resident StateStore checkpoint and event history. Back up this folder while the Computer is stopped. Do not share it as part of a release: it contains imported source and user approvals. The release ZIP has no session data. Use a single local Computer process per data directory; multi-process checkpoint writers are not supported.

ProjectWorkspace events trigger observation; boot reconciles each project against its saved digest cursor. There is no host-wide filesystem watcher or blind polling daemon. Externally edited repository folders must be reimported; automatic host folder synchronization is not implemented. Original sources and revision evidence remain retained. The checkpoint writer publishes complete JSON atomically; power-loss fsync durability is not promised.

Activity and Inbox expose real actions and results. Use Refresh observed state to update views. Artifacts can be inspected/downloaded; standalone index.html source has an opaque sandbox preview with network access disabled. This is a source preview, not proof of compiled application behavior. OS notifications, an app-level background Start/Stop toggle and a general compiled application preview remain outstanding. Local chat retains the original semantic engine and handles project/capability/work status with accurate boundaries; external research and unrestricted coding conversation are unavailable.

## Rebuild and verify

For a fresh Git checkout: `git clone --recurse-submodules https://github.com/justappgrabbin/Codex2.git`. The ZIP contains pinned runtime donor source already, so Git/submodule initialization is unnecessary for ZIP startup. For the changed desktop run:

```sh
npm --prefix computer/shell/kimi-linux ci
npm --prefix computer/shell/kimi-linux run build
npm run test:computer
```

Optional original ephemeris tests need Python 3 with `pip install -r requirements-optional.txt`. Put that environment's `python3` on PATH. It is not needed for ordinary project research or the construction fixture.

Some preserved regression tests execute JavaScript artifacts and therefore now require the pinned Docker worker even without the optional Docker scenario flag. This intentional boundary closes the inherited host-evaluation path; do not re-enable it to make tests run without isolation.

Full Linux acceptance, after preparing Docker:

```sh
SYNTHIA_DOCKER_TEST=1 SYNTHIA_PROOF_PATH=/tmp/synthia-proof.json npm run test:computer
```

Without the flag the two real-Docker scenarios are explicitly skipped, not reported as qualified. This implementation was verified using Node 22.16.0; the managed Node 24.22.1 runtime initially hit a native assertion. See VERIFICATION.md for exact results and limits.

The desktop lockfile pins dependencies. DONORS.json pins recovered implementation files and hashes. SOURCE-INVENTORY.json distinguishes discovered paths from verified behavior. FILES.json inside the packaged ZIP records included-file digests and excluded original archives; all excluded originals remain untouched in the development checkout. The packaging script omits unreviewed nested archives and binaries not needed by this local runtime. No new redistribution license is asserted: see LICENSE-PROVENANCE.md before any public release.
