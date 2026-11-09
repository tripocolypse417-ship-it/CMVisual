# Android Native Baseline — Operator Run Sheet v1

**Protocol:** WR-ANDROID-NATIVE-BASELINE-001  
**Status:** Operator aid only. The parent protocol remains DRAFT until independently preregistered and approved.  
**Target:** Motorola moto g play (2024); record the exact hardware and Android build from the device at execution.  
**Purpose:** Make a fresh native-sensor inventory and independent-reference bench session repeatable, while preserving every raw artifact.

This run sheet does not supply acceptance thresholds, certify equipment, or authorize life-safety use. Do not begin confirmatory collection until the protocol lead has completed the preregistration record and an independent reviewer has approved the scope and thresholds.

## A. Stop/go preflight

Mark each item with its evidence reference. A blank item is a **STOP** for confirmatory accuracy collection; an instrumentation-only inventory may proceed if clearly labeled.

- [ ] Approved protocol version and preregistration timestamp recorded before viewing confirmatory results.
- [ ] Test operator and independent reference operator identified; reviewer is independent of both.
- [ ] Device owner authorized the test; personal data and unrelated app data are not part of the capture.
- [ ] Existing WaveRadar app data and local evidence backed up and backup location recorded before any install/update.
- [ ] APK artifact downloaded from the intended workflow; SHA-256, source commit, package ID, version name/code, and signing-certificate fingerprint recorded.
- [ ] Install plan explicitly states whether this is an isolated package or an update. Do not assume signature compatibility from a successful build.
- [ ] Device model, Android version/build, security patch, available storage, battery state, and test date/time recorded.
- [ ] Reference instrument make/model, serial/asset ID, calibration certificate, calibration validity, range, resolution, uncertainty, and raw-export format independently checked.
- [ ] Fixture is rigid; phone/reference relative motion and axis alignment are documented with uncertainty.
- [ ] Clock synchronization method, at least three planned synchronization pairs, acquisition-window bracketing, and uncertainty are documented.
- [ ] Sensor scope is selected from a fresh runtime inventory and locked in preregistration before confirmatory capture. Do not assume a gyroscope exists.
- [ ] Raw-data storage location, custodian, access list, and immutable/append-only handling are ready.
- [ ] No emergency response, hazardous atmosphere, bystander recording, or operational deployment is involved.

**STOP conditions:** missing/expired calibration evidence; unknown reference uncertainty; loose or undocumented mounting; inability to synchronize clocks; missing backup; unexpected package/signing identity; capture includes unapproved personal data; or protocol scope/thresholds were changed after inspecting results.

## B. Build-path identity and artifact selection

The canonical GitHub CI workflow `.github/workflows/android-isolated-test.yml` builds the isolated Capacitor test APK with package ID `com.waveradar.app.safetest`, using the native plugin at `native/android/WaveRadarSensorsPlugin.java` and the hosted WaveRadar workspace URL. This build loads its web interface from the hosted workspace and requires network connectivity; it does not validate an offline deployment. Record the exact workflow run, source commit, artifact name, APK digest, generated package ID, and signing-certificate fingerprint for the tested APK.

The WaveRadar 2.0 Hatchable project also contains a separate Kotlin Android application source under `public/native-android/app`, with package ID `com.waveradar.android.safetest` and version name `0.3.1-test`. This is not the APK produced by the canonical GitHub CI workflow. Do not treat results from one package or native implementation as validating the other. If the Kotlin application is selected as the test target, record it as a separate build path and run a separately scoped baseline.

## C. Installation and identity record

Record—not infer—the following:

| Field | Recorded value / evidence reference |
|---|---|
| Device manufacturer/model | |
| Hardware revision / SKU (if available) | |
| Android release / build fingerprint | |
| Security patch level | |
| App package ID | |
| App version name / code | |
| APK SHA-256 | |
| Source commit SHA | |
| Signing certificate SHA-256 | |
| Install type (fresh isolated / update / other) | |
| Existing app data backup reference | |
| Operator pseudonymous ID | |
| Independent reference operator ID | |
| Independent reviewer ID | |
| Protocol version / preregistration record | |

If the package cannot be installed without replacing an existing app, stop. Do not uninstall the existing app, clear its storage, or attempt a signature downgrade as a workaround. Preserve the install error and current device state.

## D. Fresh runtime inventory — before accuracy collection

Start a new capture session. Do not import prior samples or replay data into it.

For every sensor exposed by the Android runtime, preserve the complete raw capability response and record:

| Sensor type | Runtime support | Sensor identity/vendor/version | Min delay / reporting mode if exposed | Registration state | Sample-arrival state |
|---|---|---|---|---|---|
| Accelerometer | | | | | |
| Gyroscope | | | | | |
| Magnetometer | | | | | |
| Rotation vector | | | | | |
| Gravity | | | | | |
| Barometer / pressure | | | | | |
| Ambient light | | | | | |
| Proximity | | | | | |

Use SUPPORTED, UNSUPPORTED, or UNKNOWN from the actual native API. A failed bridge call is not proof of unsupported hardware.

Keep these fields separate for every poll:

- Native SensorManager availability.
- Native bridge-call state and error detail.
- Per-sensor capability.
- Listener registration outcome.
- Sample arrival (ARRIVED / no sample / error state).
- Android event timestamp (SensorEvent.timestamp, elapsed-realtime nanoseconds).
- Native callback-entry elapsed-realtime timestamp.
- Wall-clock receive time and any estimated timestamp basis.
- Per-sensor sequence number.
- Native Android sensor permission policy.
- Browser/Web motion permission state.
- Spatial-pose provider state.

The current expected spatial-pose state is NOT_INSTRUMENTED unless a separately implemented pose provider is actually queried. Do not substitute accelerometer, gravity, rotation-vector, camera, or browser permission status.

After inventory, preregister the exact required comparison channels. If the gyro is not supported, an accelerometer-only study may be selected before confirmatory collection; do not change scope after seeing the results.

## E. Capture sequence

Use the parent protocol for the full method and timing. Record start/end times, session IDs, operator actions, and deviations for each phase.

1. **Stationary baseline:** secure the phone/reference assembly; record the stationary interval and environmental conditions.
2. **Six-face static sequence:** use the preregistered six orthogonal orientations and hold duration. Record fixture orientation and reference output for each hold.
3. **Controlled angular motion:** only if a calibrated rate/tilt fixture and suitable reference channel are available. Record fixture commands and independent reference samples.
4. **Lifecycle check:** pause and resume once; preserve all polls and the exact listener re-registration result.
5. **End capture:** stop normally, export the complete session, and verify the export is readable without modifying the original.
6. **Repeat:** repeat only the preregistered number of trials. Never discard a failed or inconvenient run; create a linked deviation record.

If no calibrated reference instrument is available, perform only the clearly labeled **instrumentation-only inventory/lifecycle session**. Do not create a reference artifact with guessed values, identity transform, invented uncertainty, or copied sample values.

## F. Clock and coordinate controls

- Record at least three synchronization pairs spanning the capture interval; use a documented common trigger/pulse or other justified method.
- Preserve the reference logger's original monotonic timestamps and Android SensorEvent.timestamp values exactly.
- Use the Android event timestamp for alignment, not a wall-clock estimate or callback receive time.
- Preserve callback-entry time separately; compute delivery latency only when both monotonic timestamps exist and are ordered.
- Record the measured reference-to-phone axis transform and how it was established. A mathematically orthonormal matrix alone does not prove physical alignment.
- Analyzer interpolation is allowed only between bracketing reference samples within the preregistered maximum gap. No extrapolation is permitted.
- Preserve synchronization uncertainty and fixture alignment uncertainty; do not replace unknown uncertainty with zero.

## G. Evidence custody and export

Create a new evidence package; never overwrite raw files.

Required package contents:

1. Original WaveRadar session export, byte-for-byte.
2. Original reference logger export, byte-for-byte.
3. SHA-256 digest for each original file, calculated at intake.
4. Separate normalized reference derivative, clearly linked to the original digest.
5. APK metadata and source commit.
6. Protocol and preregistration record.
7. Calibration certificate and instrument metadata references.
8. Fixture drawing/photo without people or unrelated personal data, coordinate transform, and uncertainty.
9. Clock synchronization pairs, method, and uncertainty.
10. Operator log, deviations, exclusions, and custody/access history.
11. Analyzer version, command, output report, and output digest.
12. Independent reviewer decision as a new append-only record.

A SHA-256 digest detects byte changes relative to a known digest; it does not prove who created the file, that the instrument was calibrated, or that the measurement is true. Keep original raw files read-only and store corrections/normalizations as linked derivatives.

## H. Analysis review checklist

- [ ] QA fixtures and documentation examples are excluded from experimental eligibility.
- [ ] Native manager and bridge states are complete and acceptable for every included poll.
- [ ] Capability and registration are explicitly confirmed for each required channel.
- [ ] Sample arrival, sequence, vector, and event timestamp are valid.
- [ ] Repeated UI polls are deduplicated by native sequence; conflicting duplicates are excluded and reported.
- [ ] Sequence/timestamp regressions and all missing intervals are reported.
- [ ] Clock mapping remains within observed synchronization-pair bounds; no extrapolated samples.
- [ ] Reference interpolation gap is within the preregistered limit.
- [ ] Coordinate transform and uncertainty are supported by fixture evidence.
- [ ] Calibration certificate, instrument identity, validity, and uncertainty are independently checked.
- [ ] Per-channel metrics, denominators, exclusions, uncertainty, and protocol deviations are reported.
- [ ] No automatic pass/fail or validation promotion is inferred from a computed comparison.

## I. Disposition vocabulary

Use only a disposition supported by the evidence:

- **INSTRUMENTATION_ONLY / ACCURACY_NOT_EVALUATED** — native inventory/lifecycle was recorded without suitable independent reference measurements.
- **INCOMPLETE / NOT_COMPUTABLE** — required metadata, synchronization, frame, or matched samples are missing.
- **EXPLORATORY_COMPARISON_ONLY** — analysis can run, but one or more preregistration, calibration, uncertainty, lifecycle, or custody gates are not established.
- **COMPUTED_COMPARISON_PENDING_INDEPENDENT_REVIEW** — numerical comparison completed; no validation pass is implied.
- **CANDIDATE_FOR_INDEPENDENT_REVIEW_NOT_VERIFIED** — required technical gates appear complete; the custodian/reviewer must still authenticate the source artifacts and method.
- **REJECTED_WITH_RECORDED_REASON** — a reviewer decision supported by a linked, append-only explanation. Never delete the rejected run.

No disposition in this run sheet establishes spatial pose, absolute position, indoor localization, through-wall sensing, human presence, victim localization, or life-safety readiness.

## J. Session closeout

- [ ] Original WaveRadar export preserved and digest recorded.
- [ ] Original reference export preserved and digest recorded, or explicitly recorded as not available.
- [ ] All failed, incomplete, and excluded polls/runs retained.
- [ ] Analyzer output saved to a new path; no input overwritten.
- [ ] Custody handoff recorded.
- [ ] Reviewer assigned independently; test operator did not review own run.
- [ ] Next action and unresolved blockers recorded.

**Operator note:** This run sheet is a procedural aid, not a substitute for the approved protocol, equipment manuals, calibration evidence, institutional review, or independent reviewer judgment.
