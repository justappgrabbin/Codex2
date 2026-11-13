# Synthia handoff — work stopped at owner's request

Branch: `integration/unified-continuity-20261113` in `justappgrabbin/Codex2`.
Foundation: local/public checkpoint `001007d22af758f9cff2cb0b0ab8c27bcf510047`, followed by the additive memory/security commit containing this report. Main is unchanged. The supplied cumulative specification was used only as guidance for unresolved questions, not to replace established code or meanings.

## Done

- Existing Codex2 Computer, desktop, semantic engine, automata identities and pinned donor source remain the foundation. Original source archives and history are preserved.
- Persistent contextual capability inventory, dependency deferral/reactivation, research evidence, source revision checkpoints, guarded construction proposals/approvals, real execution receipts and artifact-registry integration were added in the earlier checkpoint.
- Existing desktop exposes projects, research, capabilities, planner, activity, inbox and artifacts. Standalone HTML source preview uses an opaque sandbox. Local launchers and the earlier ZIP exist.
- Legacy JavaScript execution has an isolated adapter with host evaluation disabled. Docker execution remains desktop-oriented; it is not a working Android execution boundary.
- Tonight's addition connects the donor swarm's **existing** checkpoint get/put/delete contract to the **resident StateStore**, replacing its memory-only backing when used by the Computer. Prior checkpoint versions are retained; delete records a tombstone. Original donor files are untouched.
- Conversation completion now checkpoints donor state. Concurrent gateway initialization/operations are serialized. `memoryStatus()` reports which original worker contracts can restore state and which remain observational; it explicitly does not claim complete learned-state coverage. Recovery does not automatically replay actions.
- Optional AES-256-GCM persistence was added for the same StateStore and original event grammar. Random nonces and domain-bound authentication protect checkpoint namespaces and journal records. Existing plaintext mode remains the default. No automatic data migration occurs.
- An owner-only random key-file creation utility refuses to overwrite an existing key and never prints its value. Encrypted startup refuses to create a plaintext replacement if its key is omitted, and refuses automatic conversion of existing plaintext data.

## Verified

Tonight: **4 tests passed, zero failed, zero skipped** in `computer/tests/memory-security-additions.test.mjs`; raw evidence: `evidence/memory-security-additions.tap`.

1. Concurrent checkpoint revisions and deletion history remain in the resident StateStore.
2. Encrypted checkpoints/journals survive restart; wrong keys, altered ciphertext and ciphertext moved between namespaces are rejected.
3. An actual original donor worker's ownedState survives **separate Computer processes**, while the existing semantic engine remains the authority. This proves that restoration contract, not general neural learning.
4. The actual encrypted HTTP host retains imported content and chat across process restart, and refuses missing-key plaintext fallback.

The entire combined suite was **not** rerun after tonight's addition. Earlier checkpoints passed 64 tests and real construction/restart scenarios. Final earlier Docker requalification hit the environment's 8 GB disk limit; a later non-Docker selection passed 61 tests with two Docker skips and one Docker-dependent original test omitted. These are different source checkpoints/evidence scopes; do not combine them into a claim of complete final qualification. See VERIFICATION.md.

## Use the optional encrypted mode

Plaintext startup continues to work as before. To opt in with a NEW private directory:

```sh
node scripts/create-state-key.mjs ./local-data/security/state.key
SYNTHIA_DATA_DIR=./local-data/encrypted SYNTHIA_STATE_KEY_FILE=./local-data/security/state.key node scripts/start-local.mjs
```

Set those same environment variables through Windows environment settings/PowerShell when using the Windows launcher. Keep the key backed up separately and private. Losing it prevents decryption; recovery/rotation are not implemented. Do not publish the key or data directory. POSIX key permissions are checked; Windows ACL qualification remains open.

This encrypts the selected checkpoint and journal files only. It does not encrypt browser caches/localStorage, exported artifacts, source checkouts or construction temporary files. It does not authenticate the HTTP API or provide encrypted peer communication. Individual journal authentication does not prove resistance to deleting/reordering complete valid records or rolling back entire files. Do not describe it as complete personal-state security.

## Needs finishing

1. **Final combined regression and Docker qualification:** rerun with adequate free disk, the pinned image, legacy host-file sentinel and actual-running-container interruption tests. Preserve failure evidence and verify the final package again.
2. **Complete memory coverage:** add source-specific restore adapters for organs that only expose observational snapshots, including remaining neural/grammar/morph state. Define checkpoint consistency and archival policy, power-loss durability and multiple-process ownership. Do not claim that names/snapshots alone prove restoration.
3. **Complete security:** authenticated local API access, Android Keystore/key recovery/rotation, protected temporary/export/browser data, verified least-privilege MCP tool identities, end-to-end peer encryption and rollback-resistant history where required. Existing loopback origin checks are not authentication against other local applications.
4. **Construction:** fuller PR44/PR72 adapters, automatic reviewable repair proposals, offline dependencies, compiled-output export and broader language/runtime support. Current explicit patches and verified source bundles are bounded functionality, not unrestricted application generation.
5. **Android:** preserve the existing Node/JNI application/package identity and installed data. Add/test foreground-service lifecycle, one-button controls, notifications and an Android-appropriate execution boundary. A secondary Linux VM is **not required by the design**, and Docker is not presumed to run on an ordinary phone. No functional APK was produced or device-tested. Do not uninstall the owner's installation to bypass a signing mismatch.
6. **Adaptive integration and research:** Codex3 remains independently runnable and separately tested, not resident-integrated. Full dual adaptation, Pareto swarm behavior, chart provisioning, encrypted independent personal spaces and world integration remain incomplete. Undefined mappings/HE/BHANTUGH/frame mathematics remain open; the new document does not supply missing proofs or executable contracts.
7. **Application/distribution:** host-folder observation, OS notifications, general compiled previews, lifecycle UI, Windows/device qualification and remaining provenance/license review.

## Distribution and GitHub

The existing downloadable ZIP is the **earlier `001007d` package**. Tonight's additions are source changes on the branch; the ZIP was deliberately not rebuilt after the owner asked to stop. For the latest source, use the updated GitHub branch. No APK, installer, main-branch merge or public release upload was created. The branch push is authorized; further implementation is paused.

Next session should start from this report, inspect the branch's exact HEAD and run the scoped/full tests appropriate to the work. Add to the established Computer; do not replace it with a new project or treat proposed research as verified behavior.
