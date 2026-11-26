# 2026-11-26 Android build continuation

Previous APK run 45652461450 failed before Gradle: 34 passed, 1 failed (reassembly-ingest-e2e). Resident run 45652460996: 106 passed, 7 failed; logs show unavailable pinned Docker worker, unavailable penta ephemeris, and missing model weights. No APK artifact. Resident evidence artifact 15040507674.

Fetched the actual isolated-legacy-sandbox and construction-worker sources. The worker requires a locally present pinned image and runs with --pull=never. Commit 1374eaf86797a0f513072fe1e0d6c7d3ce76b1e7 provisions that exact image before the existing Android integration gate and adds APK signature verification. No tests disabled or host execution fallback introduced. Build triggered by branch push; result not yet verified. Docker on CI is not an Android execution backend. Port collision and native device qualification remain open.
