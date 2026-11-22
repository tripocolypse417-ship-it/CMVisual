# WaveRadar isolated offline field-test APK — research-only

**Status:** experimental, independent installation. No life-safety or production claims. Created 2026-11-21.

## Why a second APK exists

The normal WaveRadar debug workflow sets WAVERADAR_HOSTED_URL. It launches a hosted WebView, so the normal APK is not proof of offline-first field operation. Previous update attempts also failed when debug signing identity changed between GitHub runners. Do not uninstall the existing app or clear its data to accommodate a debug build.

This test build uses a **different Android application ID, com.waveradar.fieldtest**, and **bundled local web assets**. It boots directly to a small test harness without Base44 login or network dependencies. It is intended to install alongside com.waveradar.app, not update it.

## What is actually tested

- Android packaging and launch with local assets, pending physical-device confirmation.
- Native Android SensorManager bridge snapshot and capability facts (real samples only when reported by the plugin).
- Manual test annotation and local capture.
- Append-only browser WebView IndexedDB originals with SHA-256 content checksums.
- Reopening the local journal after an ordinary Android process restart.
- Explicit offline/online UI status and manual export of originals.

**Storage boundary:** this build intentionally uses a *separate WebView IndexedDB*, not the authoritative encrypted native SQLite evidence journal designed for the main WaveRadar OS. This does not prove native evidence durability, Android power-failure resilience, authenticated Core sync, spatial accuracy, or WIS/HMD parity. It does not communicate with Core.

**Privacy boundary:** local captures may include sensor diagnostics or user-authored annotations. No automatic network transfer or clearing is implemented. Export is a deliberate user action.

## Build / first test

1. Open the GitHub Actions run for **WaveRadar Isolated Offline Field Test APK** on the new draft PR; confirm its Android Gradle job succeeds.
2. Download its artifact **WaveRadar-Isolated-Offline-FieldTest-apk** from that exact successful run and extract the ZIP.
3. Install the extracted APK as a *new* app called **WaveRadar Field Test**. Do not uninstall or update the original WaveRadar app. Do not disable Android security protections to force an install.
4. Turn mobile data and Wi-Fi off, open **WaveRadar Field Test**, and confirm the local screen loads. Record whether it opens; do not assume offline success from a green CI run.
5. Add one innocuous manual test annotation and, if actual native samples are reported, capture one sensor snapshot. Force-stop the test app via Android Settings, reopen, and confirm the original count and CHECKSUM_MATCH_ONLY status remain.
6. Prepare and preserve an export before any later experiment. Record phone, Android version, build run ID, event count before/after restart, and any errors. Never include personal notes publicly without review.

A future build may not update this *test* app if the GitHub runner's ephemeral debug signing certificate differs. A stable signing identity and documented version policy are still required for durable update testing.

## Acceptance status

- CI compilation: must be read from the actual workflow, not assumed.
- Physical install: pending user handset run.
- Cold offline launch: pending.
- Local journal persistence over process restart: pending.
- Native SQLite durability: not implemented by this harness.
- Network ingest / independent ground truth: unverified.

All claims of a working real-time spatial target, life support, or emergency navigation remain blocked.
