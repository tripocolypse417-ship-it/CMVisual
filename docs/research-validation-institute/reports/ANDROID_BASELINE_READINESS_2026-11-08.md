# Android Native Baseline Readiness — 2026-11-08

**Record type:** Read-only software and workflow readiness snapshot  
**Status:** Physical baseline not collected; no accuracy result is asserted  
**Core project:** WaveRadar 2.0, Hatchable project version 414  
**Snapshot time:** 2026-11-09T00:57:23.980Z (2026-11-08 18:57:23 America/Chicago)  
**Purpose:** Preserve the current blocker state and prevent historical, synthetic, or mismatched-build evidence from being mistaken for a fresh Motorola baseline.

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

The API explicitly states that the ingestion-schema label `MEASURED` does not prove physical sensor truth. No observation in this inventory is integrity-verified, and the inventory does not establish a fresh Motorola moto g play (2024) capture paired with independent ground truth.

The separate safety-readiness endpoint returned **`release: NOT_AUTHORIZED`**. Its critical gates remain:

- Data integrity: NOT_ESTABLISHED (0 verified measured observations).
- Sensor accuracy: NOT_ESTABLISHED (0 passed runs; 8 failed runs).
- Sensor coverage: PARTIAL (2 sensor families in the stored evidence).
- Field reliability: NO_RECENT_DEVICE_EVIDENCE (0 devices seen in the preceding 24 hours).
- Model validity: benchmark runs exist, but protocol review and independent held-out performance evidence remain required.
- Operational safety: BLOCKED_PENDING_INDEPENDENT_RELEASE.

The 78 historical runs remain unchanged. The status inventory contains 8 FAILED and 70 INDETERMINATE runs, with no PASS. These records are preserved as historical evidence; no record was deleted, relinked, or reclassified during this snapshot.

## 2. Device identity and capability limits

The current device registry has eight records, but none identifies the target hardware as a verified **Motorola moto g play (2024)**. The latest Android-labelled registry entry reports manufacturer `Unknown` and model `Android`; that is not sufficient to establish the target phone's identity.

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

The last verified CI run before the latest code/test edits passed all three workflows: Runtime Safety Check, Code Quality Checks, and Isolated Android Test APK Build. The new spatial-pose regression assertions were added after that run; their CI result must be checked separately before treating the new commit as verified.

No PR was merged. No deployment was made.

## 6. Research & Validation Lab readiness

The separate Lab remains at deployed version 15 with 17 active API functions. The function inventory reported zero errors in the preceding 24 hours.

A read-only database audit found:

- 2 scientific protocol templates, both `draft`: Android Native Sensor Fresh Baseline and Wi-Fi BFI/CSI feasibility.
- 9 retired QA-only lab templates.
- 1 reviewer, 4 testers, and 1 researcher; all are suspended synthetic/QA identities.
- 0 active reviewer scopes.
- 23 assignments, all attached to retired QA labs; the two scientific draft protocols have no assignments.
- 12 evidence records (3 MEASURED, 8 SIMULATED, 1 UNKNOWN); all 12 are explicitly marked `source_metadata.qa_fixture=true`.
- 7 review decisions and 138 append-only audit events.

Role checks returned 401 for an anonymous reviewer-package request and 403 for a signed-in non-reviewer attempting package/export. These confirm negative access gates. A successful in-scope independent reviewer package/export path and cross-lab denial cannot be fully re-established with the current database state because no active independent reviewer or active scientific lab assignment exists.

All QA records remain preserved and excluded from scientific eligibility. No evidence, assignment, review decision, or audit event was changed during this audit.

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
