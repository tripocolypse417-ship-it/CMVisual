# Android Native Baseline Readiness — 2026-11-08

**Record type:** Read-only software and workflow readiness snapshot  
**Status:** Physical baseline not collected; no accuracy result is asserted  
**Core project:** WaveRadar 2.0, Hatchable project version 414  
**Snapshot time:** 2026-11-09T00:57:23.980Z (2026-11-08 18:57:23 America/Chicago)  
**Purpose:** Preserve the current blocker state and prevent historical, synthetic, or mismatched-build evidence from being mistaken for a fresh baseline on the user's currently reported Android handset.

## 1. Core diagnostic snapshot

The read-only `/api/system/diagnostics` endpoint returned HTTP 200 and reported:

| Metric | Snapshot |
|---|---:|
| Historical observations | 4,021 |
| Observations tagged MEASURED by ingestion | 4,021 |
| Integrity-verified observations | 0 |
| Registered device records | 8 |
| Validated devices | 0 |
| Validation runs | 78 |
| Passed validation runs | 0 |
| Unfinished validation runs | 0 |

The latest observation timestamp was **2026-10-24T19:41:16.142Z**. The evidence inventory contained:

| Source / sensor type | Count |
|---|---:|
| `browser.imu` / `imu.motion` | 3,806 |
| `android.sensor-manager` / `imu.native-snapshot` | 215 |

The API explicitly states that the ingestion-schema label `MEASURED` does not prove physical sensor truth. No observation in this inventory is integrity-verified, and the inventory does not establish a fresh capture from the user's new phone paired with independent ground truth.

The separate safety-readiness endpoint returned **`release: NOT_AUTHORIZED`**. Its critical gates remain:

- Data integrity: NOT_ESTABLISHED (0 verified measured observations).
- Sensor accuracy: NOT_ESTABLISHED (0 passed runs; 8 failed runs).
- Sensor coverage: PARTIAL (2 sensor families in the stored evidence).
- Field reliability: NO_RECENT_DEVICE_EVIDENCE (0 devices seen in the preceding 24 hours).
- Model validity: benchmark runs exist, but protocol review and independent held-out performance evidence remain required.
- Operational safety: BLOCKED_PENDING_INDEPENDENT_RELEASE.

The 78 historical runs remain unchanged. The status inventory contains 8 FAILED and 70 INDETERMINATE runs, with no PASS. These records are preserved as historical evidence; no record was deleted, relinked, or reclassified during this snapshot.

## 2. Device identity and capability limits

A fresh device-registry inspection on 2026-11-09 found eight records. One Android 14 browser fingerprint has a user-agent string naming `moto g play - 2024`, but its structured fields remain manufacturer `Unknown`, model `Android`, validation state `UNVALIDATED`, and last-seen time 2026-11-02T02:19:20.175Z. This is historical metadata, not a verified current-device identity. The user has reported a new phone, but no matching new handset record is present. Do not assume the prior Moto fingerprint is the current test target.

The capability snapshot inventory contains records for camera, geolocation, motion, and spatial pose. The most recent reported states include:

- Camera: `PERMISSION_GRANTED`.
- Geolocation: `DECLARED_SUPPORTED`.
- Motion: `DECLARED_SUPPORTED`.
- Spatial pose: `UNAVAILABLE`.

These are device-reported capability states, not calibration or validation results. They do not establish that a listener registered successfully, that a fresh sample arrived during a new session, or that a spatial-pose provider is available.

No current physical handset session was operated in this run. The authorized remote Android device interface reports zero connected devices (one free device slot is available). This means the target phone was not remotely accessible through that interface; it does not imply the user does not physically possess the phone.

## 3. Authentication interpretation

Read-only access-tier checks were performed against the deployed Core endpoints:

| Check | Result | Interpretation |
|---|---:|---|
| Public request to user-only device status | 401 | Expected access gate |
| Signed-in app-user request to device status using a deliberately nonexistent probe ID | 200 | User route works; probe is not registered to that synthetic test user |
| Signed-in app-user capability registry | 200 | Route works; synthetic test user has no device records |
| Signed-in app-user recovery endpoint | 200 | Route works; synthetic test user has no validation runs |
| Signed-in app-user metrics request without run ID | 400 | Expected input validation |

Additional read-only/negative enrollment checks returned:

| Check | Result | Interpretation |
|---|---:|---|
| Public enrollment-token request | 401 | Expected user-authentication gate |
| Signed-in request to issue a token for a deliberately unowned probe device | 404 `OWNED_DEVICE_NOT_FOUND` | Ownership check blocks token issuance |
| Signed-in claim with an invalid prior credential | 409 `PRIOR_ENROLLMENT_TOKEN_INVALID_OR_EXPIRED` | Claim stops before migration |
| Device ingest without a bearer token | 401 `DEVICE_TOKEN_REQUIRED` | Expected device-token gate |
| Device ingest with an invalid bearer token | 401 `DEVICE_TOKEN_INVALID_OR_EXPIRED` | Expected token-validation gate |

The device enrollment-token table contained 33 records before and after these checks. No token was issued, no ownership was changed, and no observation or validation record was created.

A 401 produced by running a user-only route without an app end-user identity is not evidence of a broken enrollment token. The signed-in test-user path succeeded. The actual owner account's device binding, token issuance, and physical handset authorization remain unverified because no authenticated session from the target phone was available.

## 4. Android build-path identity

There are two distinct Android implementation paths and their results must not be conflated.

### Canonical GitHub CI isolated Capacitor test APK

The repository workflow `.github/workflows/android-isolated-test.yml` builds an isolated APK with:

- Package ID: `com.waveradar.app.safetest`.
- Hosted workspace: `https://waveradar-20.hatchable.site/workspace/`.
- Native sensor plugin source: `native/android/WaveRadarSensorsPlugin.java`.
- Build source: the exact CMVisual commit used by the workflow run.

The workflow builds a separate test package; it does not update the existing `com.waveradar.app` package. The artifact's exact SHA-256 and signing-certificate fingerprint must be recorded at intake. A successful CI build does not prove installation or update compatibility on the target phone.

### Separate Hatchable Kotlin Android application source

The WaveRadar 2.0 Hatchable project also contains a Kotlin Android source tree at `public/native-android/app`, with:

- Package ID: `com.waveradar.android.safetest`.
- Version name: `0.3.1-test`.
- Capture implementation: `SensorCapture.kt`.

This is not the APK produced by the canonical GitHub CI workflow. Its current `SensorCapture.start()` calls `registerListener` but does not preserve the Boolean registration result per sensor; its measurement records preserve the Android event monotonic timestamp and wall-clock observation time, but do not currently include the same per-sensor callback-entry timestamp and sequence instrumentation present in the canonical repository's Capacitor plugin.

Therefore, baseline results from the GitHub CI APK apply only to that exact package and plugin. If the Kotlin application is selected for testing, it requires a separate build identity and a separately scoped instrumentation review before confirmatory capture.

## 5. Canonical repository changes and CI status

PR #63 remains open, draft, and unmerged:

https://github.com/tripocolypse417-ship-it/CMVisual/pull/63

The PR now includes:

- The Android operator run sheet.
- The enrollment ownership hardening review.
- This read-only readiness snapshot.
- A regression guard that refuses to report spatial-pose state `AVAILABLE` unless a named provider source and valid observation timestamp are supplied.

The PR head `09b3923349dafaeb3e1ea0cea6ade95a60d44cd7` passed all three GitHub workflows on 2026-11-09: Runtime Safety Check (run 42544147533), Code Quality Checks (42544147508), and Isolated Android Test APK Build (42544147495). This verifies the CI build and repository tests for that commit only; it does not establish APK installation compatibility or physical sensor accuracy.

No PR was merged. No deployment was made.

## 6. Research & Validation Lab readiness

The separate Lab is now deployed at version 16 with 18 active API functions. The latest function inventory reported zero runtime errors in the preceding 24 hours.

A read-only database audit found:

- 2 scientific protocol templates, both `draft`: Android Native Sensor Fresh Baseline and Wi-Fi BFI/CSI feasibility.
- 9 retired QA-only lab templates.
- 1 reviewer, 4 testers, and 1 researcher; all are suspended synthetic/QA identities after the controlled test.
- 0 active reviewers; one retained scope row is attached only to a retired QA lab.
- 23 assignments, all attached to retired QA labs; the two scientific draft protocols have no assignments.
- 12 evidence records (3 MEASURED, 8 SIMULATED, 1 UNKNOWN); all 12 are explicitly marked `source_metadata.qa_fixture=true`.
- 7 review decisions and 150 append-only audit events.

Controlled API-only role/isolation testing temporarily activated one synthetic QA identity and two retired QA labs, then restored every role to suspended and both labs to retired. Results: tester assignment list returned only three assignments for that tester; own evidence GET returned 200 and another tester's evidence returned 404; researcher GET returned four own submissions; reviewer queue returned two explicitly scoped assignments and excluded self-review/unscoped records; a scoped retired-lab archive returned six records; unscoped export returned 404; self-review and conflict-of-interest checks returned 403; suspended reviewer export returned 403. A canonical QA payload recomputed to a matching digest. A missing-digest QA record was blocked from a verified decision with 409 and no decision/audit count change. Retired protocols remained absent from the active review queue and new review-package route.

The successful reviewer path used only a synthetic QA identity and does not establish a real independent reviewer. All QA identities are again suspended, both QA labs are retired, and no scientific protocol was activated. Original evidence and review decisions were not changed; 12 append-only admin audit events were added to record the temporary activation and restoration operations. QA fixtures remain excluded from scientific eligibility.

## 7. Blocking inputs for a defensible physical baseline

Confirmatory collection remains blocked until all of the following are available:

1. The exact intended CI APK artifact, its SHA-256, package ID, source commit, and signing-certificate fingerprint.
2. A backed-up target phone and a controlled installation plan; do not uninstall or clear existing app data to work around a signature mismatch.
3. A fresh runtime inventory from the actual Motorola device, preserving support, permission policy, registration outcome, sample arrival, event timestamp, callback-entry timestamp, and spatial-pose provider state separately.
4. An independent calibrated reference instrument appropriate to the claimed measurement, with valid calibration, range, resolution, uncertainty, and raw export.
5. A rigid documented fixture, axis transform, and at least three clock synchronization pairs spanning the capture.
6. Preregistered scope and thresholds plus an independent reviewer who is not the operator.

If the reference instrument is unavailable, only an explicitly labelled instrumentation-only inventory/lifecycle session may proceed. It cannot establish sensor accuracy, position, spatial pose, through-wall sensing, victim localization, or operational readiness.

## 8. Next actions

1. Check CI for the latest PR #63 commit and inspect the isolated APK install-note artifact to verify whether persistent signing was actually used.
2. Obtain authorized access to the physical target phone, then record a fresh runtime inventory before any confirmatory run.
3. Secure the independent reference instrument and fixture; otherwise stop at instrumentation-only.
4. Activate the approved scientific Lab protocol only after preregistration, and onboard a real independent reviewer before testing the positive reviewer/export path.
5. Preserve all original observations, failed/incomplete runs, QA fixtures, and audit history.

**Disposition:** `AWAITING_PHYSICAL_VALIDATION`. This document records software readiness and blockers only; it is not a physical measurement report or validation result.
