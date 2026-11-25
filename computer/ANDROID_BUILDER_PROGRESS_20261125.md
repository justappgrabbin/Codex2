# 2026-11-25 Android build continuation

Read existing progress and both workflows. The existing APK workflow only triggered on the reassembly branch. Added an equivalent push-triggered workflow on the existing autonomous builder branch in commit 81d33480bb966fd37100345706a3d5d3288d1f9b. It uses the existing native host, pinned Node mobile runtime, Gradle build, integration tests and APK artifact upload. No donor or resident source changed. Build result pending verification.

Important next repair: mobile-entry.mjs sets resident port 8765, which is also the hardcoded Android MCP endpoint in trident-mcp-glue.mjs. Inspect native host and MCP service configuration before assigning separate ports. Do not claim working screen/touch or Qwen inference until tested on device.
