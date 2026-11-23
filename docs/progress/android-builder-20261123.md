# Android builder continuation — 2026-11-23

Base: integration/all-together-20261113. Working branch: feature/android-mcp-consent-adapter-20261123.

## Changes in this checkpoint
- Added computer/services/android-consent-adapter.mjs: an opt-in, fail-closed permission boundary for screen observation and touch. Owner must start it, request approval for exact action arguments, and supply the one-time approval ID. Stop clears pending approvals; results arriving after stop are discarded.
- Added three node:test regression tests for refusal, one-time approval, revocation, and expiry.
- Added push-triggered scoped GitHub Actions workflow to execute tests on Node 22.
- No donor, Majiki, resident engine, Android MCP implementation, or preexisting workflow was replaced.

## Important limitations
- This is a reusable consent boundary, not yet wired to the actual Android MCP transport or visible Android start/stop UI.
- A stopped in-flight transport may have already performed a touch. This boundary discards the result but does not guarantee physical cancellation; the transport must implement abort and the device must honor it.
- The available source fetch for computer/services/trident-mcp-glue.mjs shows a separate Trident MCP service. Its current tool list does not expose Android eyes/hands.
- No local Qwen weights/runtime, installable APK, or device test was verified in this checkpoint.
- CI outcome must be checked independently; a pushed workflow is not a passed test.

## Next engineering step
Locate the original Android-mcp transport implementation and connect it through this adapter with explicit owner-visible per-action confirmation and a persistent stop control; test actual transport cancellation, then package and sign the original Android application without changing its installed identity.
