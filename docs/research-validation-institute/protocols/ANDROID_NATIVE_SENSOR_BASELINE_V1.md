# Android Native Sensor Baseline — Independent Ground-Truth Protocol v1

**Status:** Draft protocol; not preregistered and not executed  
**Protocol ID:** WR-ANDROID-NATIVE-BASELINE-001  
**Target test device:** Motorola Moto G Play (2024), Android 14 (record exact build at test time)  
**Implementation under test:** WaveRadar isolated Android native-baseline build from PR #41  
**Primary objective:** Establish which native Android sensors are present, register successfully, emit valid samples, and preserve their timing/provenance. Accuracy is a separate experiment requiring independent reference instrumentation.

## 1. Claims this protocol can and cannot test

This protocol can establish, for the tested device/build/session:

- Android SensorManager availability and the device-reported sensor inventory.
- Per-sensor support and listener-registration state.
- Whether valid numeric samples arrive, their sequence counters, event timestamps, receive timestamps, and observed polling history.
- Whether the app's standard Android SensorManager path is available without a runtime motion-sensor permission request.
- Whether a spatial-pose provider was actually queried. In the current build, pose remains NOT_INSTRUMENTED.

This protocol does **not** establish:

- Absolute position, indoor localization, room-scale 3D reconstruction, or a spatial pose.
- Sensor accuracy merely because numeric samples arrive.
- Through-wall sensing, human presence, victim detection, or victim localization.
- General performance across Android devices, manufacturers, firmware, buildings, or environmental conditions.
- Operational or life-safety readiness.

A tape-measure distance/bearing comparison is useful for a separate spatial-reference experiment. It does not independently calibrate an accelerometer, gyroscope, magnetometer, or Android rotation-vector sensor.

## 2. Preregistration requirements

Before confirmatory collection, the protocol lead must record and lock:

1. Exact claim and sensor modalities under test.
2. Device model, hardware revision if available, Android build, app package/version/code, native bridge version, and source commit.
3. Reference-instrument make/model, asset identifier, calibration certificate, calibration date, traceability, resolution, and uncertainty.
4. Mounting geometry, coordinate-frame convention, axis mapping, sign convention, and alignment procedure.
5. Clock synchronization method and measured clock offset/uncertainty.
6. Test conditions, sequence, duration, sample-rate targets, exclusions, and missing-data rules.
7. Primary metrics and acceptance thresholds, with rationale tied to the intended non-safety-critical use.
8. Planned repetitions and sample-size rationale.
9. Tester, independent reference operator, independent reviewer, conflicts, and safety/privacy approvals.

Do not tune thresholds after inspecting confirmatory results. If a protocol change is necessary, create a new version and preserve the prior version and all affected runs.

## 3. Independent reference equipment

For motion-sensor accuracy, use an independent calibrated reference instrument—not the WaveRadar phone's own sensors.

Preferred equipment:

- A calibrated reference IMU/data logger with documented accelerometer and gyroscope uncertainty.
- A rigid fixture that mounts the reference IMU and test phone without relative movement.
- A calibrated tilt/rotation table or equivalent fixture with known angular positions/rates.
- A synchronized logger or common trigger where available.
- A surveyed or calibrated heading reference for magnetometer experiments, used away from ferrous structures and current-carrying equipment.

For environmental sensors, use independent reference instruments appropriate to the quantity:

| WaveRadar sensor | Suitable independent reference |
|---|---|
| Accelerometer | Calibrated reference accelerometer / IMU and controlled fixture |
| Gyroscope | Calibrated angular-rate reference / rate table |
| Magnetometer | Calibrated magnetic-field reference or surveyed heading setup |
| Rotation vector | Independent reference attitude from calibrated IMU / motion-capture fixture |
| Gravity | Reference IMU plus known static fixture orientation |
| Barometer | Calibrated pressure reference |
| Ambient light | Calibrated photometer |
| Proximity | Traceable distance reference and controlled target geometry |

A consumer phone, uncalibrated compass, manually estimated movement, or the WaveRadar output itself is not independent ground truth. If a suitable reference instrument is unavailable, label the run **instrumentation-only / accuracy not evaluated**.

## 4. Test environment and safety

- Conduct bench testing in a controlled, non-emergency environment.
- Do not conduct tests in an active fireground, hazardous atmosphere, or occupied building under emergency conditions.
- Secure the phone and reference instrument to a rigid fixture. Do not hand-wave the device through space and call the resulting path ground truth.
- Record temperature, magnetic interference, vibration, fixture orientation, and relevant environmental conditions.
- Do not collect bystander audio, video, biometrics, or identity data.
- Back up existing app data before installing or changing any test package. The isolated package is intended to avoid overwriting the production package, but install compatibility must still be verified on the actual device.

## 5. Capture sequence

### A. Fresh-session inventory and lifecycle

1. Record the APK artifact, commit SHA, package name, app version, Android release/build, manufacturer/model, and test operator.
2. Start a new session with no prior session data imported into the run.
3. Query capabilities once and preserve the complete capability response.
4. Record each sensor's support state, registration state, and sample-history state separately.
5. Capture for at least 60 seconds while the phone remains stationary on the fixture.
6. Pause and resume the app once; capture the lifecycle transition and whether listeners are re-registered.
7. Stop and export the complete session.

Do not infer UNSUPPORTED from a failed bridge call. A bridge failure is UNKNOWN unless the native API explicitly reports otherwise.

### B. Static orientation sequence

Use a documented six-face fixture sequence where practical:

1. Place the phone in each of the six orthogonal orientations.
2. Hold each position stationary for a preregistered duration.
3. Record the reference IMU vector and fixture orientation at each position.
4. Preserve all raw WaveRadar samples, reference samples, mounting offsets, and clock metadata.

Analyze axis mapping, bias, noise, scale, cross-axis response, and repeatability separately. A gravity-magnitude sanity check is not a substitute for calibrated vector comparison.

### C. Controlled angular motion

1. Mount phone and reference IMU rigidly on the same fixture.
2. Use preregistered angular positions and rates within the reference instrument's calibrated range.
3. Include stationary intervals before and after each movement.
4. Record the fixture command/position, independent reference angular rate, WaveRadar gyroscope samples, rotation-vector samples, and any dropped or stale intervals.
5. Do not calculate a WaveRadar position trajectory from gyroscope integration and label it measured position.

### D. Timestamp and sequence integrity

For each sensor, retain:

- Android SensorEvent.timestamp in elapsed-realtime nanoseconds.
- Callback-entry SystemClock.elapsedRealtimeNanos() captured by the native listener.
- Wall-clock callback receive time and the derivation of any wall-clock estimate.
- Per-sensor sequence counter incremented on each native callback.
- Poll/capture time and sample index.
- Reference logger timestamp and measured synchronization uncertainty.

The event timestamp and callback-entry timestamp use the same Android monotonic clock. Where both are present and callback time is not earlier than event time, calculate callback delivery latency as (callbackElapsedRealtimeNanos - eventElapsedRealtimeNanos) / 1,000,000. Preserve missing or negative-order cases as unavailable/invalid; do not substitute wall-clock subtraction.

Compare sequence and event-timestamp order only within the same capture session. Report sequence regressions, repeated polling snapshots, event-timestamp regressions, and observed event-time deltas. A sequence increase between two polling snapshots means native callbacks occurred between the snapshots but were not individually retained by the polling export; it is **not** evidence that Android dropped those callbacks.

Calculate clock offset, drift, timestamp skew, inter-sample intervals, gaps, duplicate sequence values, and monotonicity only where the captured clocks and raw records support the calculation. Do not compare wall-clock timestamps as though they share the same clock basis without a measured synchronization transformation.

The current UI's polling capture count is **not** the native sensor event rate. Report polling snapshots, per-sensor sequence counters, and observed event-time deltas separately; do not infer an event rate from the polling interval.

### E. Permission and spatial-pose separation

- Record the native Android SensorManager permission policy separately from browser motion permission state.
- Standard SensorManager motion/environment sensors being available does not imply camera, location, Wi-Fi, Bluetooth, UWB, ARCore, or spatial-pose permissions.
- Query spatial pose only when a real pose provider is integrated and instrumented. Until then preserve NOT_INSTRUMENTED; do not substitute gravity, rotation vector, camera availability, or WebXR support.

## 6. Analysis plan

Report per sensor and per condition; do not collapse the results into one blended score.

Required outputs, where the reference instrument supports them:

- Valid sample count and missing-sample fraction.
- Per-axis bias, standard deviation, RMSE, and 95th-percentile absolute error.
- Scale and cross-axis error where the fixture permits estimation.
- Gyroscope bias and angular-rate error.
- Heading/attitude error only when an independent reference attitude is available.
- Timestamp offset, drift, jitter, and sample-gap distribution.
- Registration success/failure and lifecycle recovery.
- Repeatability across runs.
- Reference-instrument uncertainty and propagated comparison uncertainty.
- All exclusions, invalid runs, failures, and deviations.

Report confidence intervals or uncertainty intervals and denominators. A threshold must be preregistered; this document intentionally does not invent a pass threshold before the intended measurement use and reference-instrument capability are agreed.

## 7. Evidence package

The export must include:

- Protocol ID/version and preregistration timestamp.
- Source commit, APK artifact reference, package/version, native bridge version, and device/platform metadata.
- Raw WaveRadar capture records and capability responses.
- Independent reference instrument metadata and calibration certificate reference.
- Raw reference data artifact ID and cryptographic digest when supplied by the evidence custodian.
- Fixture geometry, coordinate frames, alignment transform, and uncertainty.
- Clock synchronization method and offset/uncertainty.
- Per-sensor support, registration, sample-arrival, timestamp, and permission states.
- Raw event and callback elapsed-realtime nanosecond timestamps, per-sensor sequence counters, callback-delivery latency where computable, and monotonicity/repeat/regression summaries.
- Spatial-pose status, including NOT_INSTRUMENTED when applicable.
- Analysis code/version, metrics, deviations, exclusions, and reviewer decisions.
- Custody/access log and all corrections as linked new records.

A local artifact reference is not a file upload, a verified hash, or tamper-evident chain of custody. The current client-side reference capture is a review intake aid only. The server-side evidence custodian must verify and preserve the actual artifact before it can be accepted as independent evidence.

## 8. Review and disposition

An independent reviewer must verify:

- The reference operator is independent of the WaveRadar test operator.
- Instrument identity, calibration status, calibration validity period, and uncertainty.
- The raw reference artifact matches its declared digest and timestamp.
- The fixture and coordinate-frame alignment are reproducible.
- The analysis follows the preregistered method.
- Exclusions and deviations are justified and preserved.
- Conclusions stay within the tested device/build/condition envelope.

Allowed outcomes: SUPPORTED_WITHIN_TEST_ENVELOPE, PARTIALLY_SUPPORTED, NOT_SUPPORTED, INCONCLUSIVE, or INVALID_TEST_WITH_REASON.

A complete client-side record remains UNVERIFIED and NOT_REVIEWED. No client action may promote it to a validated capability. A successful instrumentation baseline is not an accuracy pass or operational release approval.
