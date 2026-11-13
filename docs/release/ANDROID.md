# Android readiness

The existing `computer/android` implementation is preserved. `MainActivity.java` loads `computer-node` and `node` native libraries, extracts packaged runtime assets into private storage, launches Node from a Java thread and presents the loopback Computer in a WebView. This is stronger than a WebView alone. Its current manifest declares INTERNET and an Activity; it has no foreground Service, background-task scheduling or notification permission/lifecycle implementation.

Gradle targets SDK 35, minSDK 26 and arm64-v8a/x86_64, with a JNI/CMake bridge. `prepare-node.py`, `prepare-assets.py`, native source, and the existing APK workflow are retained. Tasker/device-action components were not located in the current Codex2 tracked-path inventory; no device permission contract is asserted from their names in other sources.

No adb, compatible device or Android emulator was available in this environment. No APK was generated or labeled functional in this pass. Existing upstream APKs are not acceptance evidence for these changes.

Exact remaining qualification:

1. Acquire and validate the existing node-mobile libraries, Android SDK/NDK and Gradle toolchain; build the actual JNI application with the changed runtime assets.
2. Implement a permission-controlled foreground Service with user-visible notification and Start/Stop, lifecycle-safe Node ownership, Android background restrictions, persisted task checkpoints and recovery after process death.
3. Keep storage/file-picker access scoped. Validate local HTTP origin enforcement, WebView uploads, artifact downloads and notification permission behavior on supported Android versions.
4. Choose and test a construction boundary. The qualified local Docker worker requires a Linux container daemon and is unavailable on ordinary Android. Do not run imported Node scripts directly in the app UID. A separately authorized desktop worker connection needs authentication, transport security and its own device tests; that remote contract has not been added.
5. Install on a real compatible device or explicitly qualified emulator. Test cold start, import, two-way chat, journal, background/restart, permission denial, inbox and artifact delivery. Only then call an APK functional.

The desktop remains usable while these capabilities are deferred. Codex3's active-page agents also do not supply an Android background service.
