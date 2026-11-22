# Android build progress — 2026-11-22

Base: integration/all-together-20261113. Branch: feature/android-permission-gate-20261122.

Implemented a new opt-in Android MCP permission boundary without modifying the resident execution engine, Majiki, or donor files. It requires explicit start, one-use approval for each allowlisted tool, and stop revokes approvals. Late results are discarded after stop; this does NOT cancel remote Android actions already issued. The host must still enforce Android permission prompts, authenticate the transport, and wire visible UI controls. No real screen/touch integration or APK is claimed.

Verification target: node --test computer/tests/android-permission-gate.test.mjs. GitHub Actions workflow and APK build still require Android project inspection. This branch deliberately does not claim working Qwen inference, weights, or device execution.
