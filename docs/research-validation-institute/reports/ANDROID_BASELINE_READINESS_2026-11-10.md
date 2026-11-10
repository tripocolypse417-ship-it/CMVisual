# Android Native Baseline Readiness — 2026-11-10

**Record type:** Read-only Core diagnostic and engineering status snapshot  
**Snapshot time:** 2026-11-10T01:56:09Z (2026-11-09 19:56 America/Chicago)  
**Status:** `AWAITING_PHYSICAL_VALIDATION`; no physical accuracy result is asserted  
**Core project:** WaveRadar 2.0, Hatchable version 414  
**Purpose:** Record the current physical-baseline blockers without altering historical evidence or treating an old browser fingerprint as the user's newly reported handset.

## 1. Current Core diagnostics

The read-only `/api/system/diagnostics` endpoint returned HTTP 200 at 2026-11-10T01:56:07.704Z:

| Metric | Current value |
|---|---:|
| Historical observations | 4,021 |
| Observations tagged MEASURED by ingestion | 4,021 |
| Integrity-verified observations | 0 |
| Registered device records | 8 |
| Validated devices | 0 |
| Validation runs | 78 |
| Passed validation runs | 0 |
| Failed validation runs | 8 |
| Indeterminate validation runs | 70 |
| Unfinished validation runs | 0 |
| Latest observation | 2026-10-24T19:41:16.142Z |

Evidence inventory:

| Source / sensor family | Count |
|---|---:|
| `browser.imu` / `imu.motion` | 3,806 |
| `android.sensor-manager` / `imu.native-snapshot` | 215 |

The ingestion label `MEASURED` does not prove physical sensor truth. No observation in this inventory is integrity-verified. The stored Android-labelled records do not establish a fresh session from the user's newly reported phone.

## 2. Device registry recheck

A read-only query of the eight Core device records returned no identifiable new handset:

| Structured manufacturer | Structured model | OS version | Validation state | Last seen (UTC) |
|---|---|---|---|---|
| Google Chrome | Linux | Linux | UNVALIDATED | 2026-11-02T18:14:02Z |
| Unknown | Android | Android | UNVALIDATED | 2026-11-02T02:19:20Z |
| Unknown | Linux | Linux | UNVALIDATED | 2026-10-13T21:59:19Z |
| Test | Test | Test | UNVALIDATED | 2026-09-30T08:17:03Z |
| Test | Test | Test | UNVALIDATED | 2026-09-30T08:17:01Z |
| test | test | test | UNVALIDATED | 2026-09-30T08:13:17Z |
| Android | test | 14 | UNVALIDATED | 2026-09-30T08:10:30Z |
| Test | Android | 14 | UNVALIDATED | 2026-09-30T08:04:06Z |

The earlier Android 14 browser fingerprint is not a verified Moto G Play and must not be treated as the current handset. No device identifiers were included in this report. The current phone's exact make/model/build remains unknown to the Core registry.

## 3. Safety readiness

The read-only `/api/validation/safety-readiness` endpoint returned `release: NOT_AUTHORIZED`:

- Data integrity: `NOT_ESTABLISHED` — 0 verified measured observations.
- Sensor accuracy: `NOT_ESTABLISHED` — 0 passed runs and 8 failed runs.
- Sensor coverage: `PARTIAL` — 2 sensor families represented.
- Field reliability: `NO_RECENT_DEVICE_EVIDENCE` — 0 devices seen in the preceding 24 hours.
- Model validity: benchmarks exist, but independent held-out performance, leakage review, calibration, and subgroup analysis remain unestablished.
- Operational safety: `BLOCKED_PENDING_INDEPENDENT_RELEASE`.

Unknown remains unknown; no weighted score or software test can substitute for the critical physical and independent-review gates.

## 4. Canonical Android build and CI

The canonical CMVisual isolated Capacitor workflow builds package `com.waveradar.app.safetest` using `native/android/WaveRadarSensorsPlugin.java`. This is separate from the Hatchable Kotlin test application `com.waveradar.android.safetest`; evidence from the two build paths must not be combined.

The parent operator-run-sheet commit `c85d8887d07e7c6851561973861ce6fa2cb0cb6e` passed:
- Runtime Safety Check — run 42738210554.
- Code Quality Checks — run 42738210608.
- Isolated Android Test APK Build — run 42738210453.

The later spatial-pose freshness-guard commit `d375f4e52589560592c319db2f48f5959ec693a0` also passed all three workflows:
- Runtime Safety Check — run 42739041485.
- Code Quality Checks — run 42739041611.
- Isolated Android Test APK Build — run 42739041566.

**Signing limitation:** both inspected APK workflow logs show that `WAVERADAR_DEBUG_KEYSTORE_BASE64` is not configured. The builds therefore use runner-generated debug signing. Repeat-install/update compatibility is not established. Do not replace an existing installation, uninstall, or clear app data to work around a signature mismatch. The APK artifact is not evidence of device installation compatibility or physical accuracy.

## 5. Software guard added in the stacked PR

The new spatial-pose normalization guard requires:
- a named provider;
- a parseable provider observation timestamp;
- a valid capture/summary reference timestamp;
- no future-dated provider observation; and
- provider age no greater than the existing 5-second software freshness window.

Stale, future-dated, or unbounded `AVAILABLE` claims become `UNKNOWN`. This is a freshness guard only. The canonical Android plugin still reports spatial pose as `NOT_INSTRUMENTED`; no pose provider, absolute position, indoor localization, through-wall sensing, or victim localization is implemented or established by this change.

## 6. Research & Validation Lab status

The separate Validation Lab is live at v17 with 18 active API functions and zero reported errors in the preceding 24 hours. Its current database state remains:

- 2 draft scientific protocols and 9 retired QA templates.
- 4 suspended testers, 1 suspended researcher, and 1 suspended reviewer.
- 23 assignments, 12 QA-fixture evidence records, 7 review decisions, and 152 append-only audit events.
- No active real reviewer or tester. Project visibility remains personal, blocking external app-user onboarding until the owner changes it.

The v17 access/export recheck is documented separately in `LAB_ROLE_ISOLATION_EXPORT_RECHECK_2026-11-10.md`. Software access checks do not establish independent scientific review.

## 7. Required physical gates

Confirmatory accuracy collection remains blocked until:

1. The exact new handset make/model, Android release/build, security patch, and app/build identity are recorded from the device itself.
2. Existing app data is backed up and a controlled isolated-package installation plan is documented.
3. A fresh native runtime inventory distinguishes SensorManager availability, bridge state, per-sensor support, permission policy, listener registration, sample arrival, event timestamp, callback-entry timestamp, and pose-provider state.
4. A suitable independently calibrated reference instrument, valid calibration record, range, resolution, uncertainty, and raw export are available.
5. A rigid fixture, axis alignment/coordinate frame, and at least three clock-synchronization pairs are documented.
6. The parent protocol is preregistered before confirmatory results are viewed and approved by a qualified independent reviewer.

If calibrated reference equipment is unavailable, an instrumentation-only inventory/lifecycle session may proceed only under an explicitly limited scope. It cannot establish accuracy, absolute position, spatial pose, or operational readiness.

## 8. Preservation and disposition

- This snapshot used read-only diagnostics and SELECT queries.
- No observation, device record, validation run, enrollment token, Lab record, or recovery baseline was changed, deleted, relinked, or reclassified.
- Historical failures and indeterminate runs remain preserved.
- No physical handset session, APK installation, deployment, merge, or scientific validation was performed.

**Disposition:** `AWAITING_PHYSICAL_VALIDATION; CURRENT_HANDSET_IDENTITY_AND_INDEPENDENT_GROUND_TRUTH_MISSING`.
