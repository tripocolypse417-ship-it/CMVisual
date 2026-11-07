# Android Native Sensor Reference Comparison — v1

**Status:** Analysis utility; not a calibration procedure or validation approval.  
**Protocol:** `WR-ANDROID-NATIVE-BASELINE-001` (draft until preregistered and approved).  
**Analyzer:** `scripts/analyze-android-reference.mjs`  
**Input schema:** `waveradar.independent-reference-imu.v1`.

## Purpose and boundaries

This offline utility compares Android accelerometer and gyroscope event samples with a separately logged reference IMU. It exists so a physical baseline can be analyzed reproducibly after a real reference instrument, rigid fixture, clock synchronization, and independent evidence custody are available.

It does not collect data, calibrate either instrument, certify a witness, authenticate a certificate, choose acceptance thresholds, or issue pass/fail decisions. Synthetic test fixtures exercise the code only; they are not WaveRadar measurements.

## Required reference artifact

The reference artifact is a separate JSON file. Keep the instrument's original native export unchanged and preserve its original file hash. Convert it to this normalized envelope only as an additional derivative; never replace the raw logger file.

```json
{
  "schema": "waveradar.independent-reference-imu.v1",
  "qaFixture": true,
  "preregistration": {
    "protocolId": "WR-ANDROID-NATIVE-BASELINE-001",
    "protocolVersion": "1",
    "preregisteredAt": "2026-11-03T12:00:00.000Z"
  },
  "measurementWindow": {
    "startedAt": "2026-11-03T12:05:00.000Z",
    "endedAt": "2026-11-03T12:10:00.000Z"
  },
  "instrument": {
    "makeModel": "Reference IMU make/model",
    "assetId": "LAB-ASSET-001",
    "calibrationStatus": "CALIBRATED",
    "calibrationEvidenceRef": "custody://calibration-certificate-001",
    "calibrationDate": "2026-01-01T00:00:00.000Z",
    "calibrationValidThrough": "2027-01-01T00:00:00.000Z",
    "calibrationCertificateSha256": "<64-character SHA-256 hex digest>",
    "standardUncertainty": {
      "accelerometerMps2": { "x": 0.01, "y": 0.01, "z": 0.01 },
      "gyroscopeRadPerSec": { "x": 0.001, "y": 0.001, "z": 0.001 }
    }
  },
  "clockSync": {
    "method": "documented common trigger / pulse method",
    "pairs": [
      {
        "referenceTimestampNs": "1000000000",
        "androidElapsedRealtimeNanos": "2000000000",
        "uncertaintyNs": "100000"
      },
      {
        "referenceTimestampNs": "2000000000",
        "androidElapsedRealtimeNanos": "3000000000",
        "uncertaintyNs": "100000"
      },
      {
        "referenceTimestampNs": "3000000000",
        "androidElapsedRealtimeNanos": "4000000000",
        "uncertaintyNs": "100000"
      }
    ]
  },
  "coordinateFrame": {
    "referenceToWaveRadarRotationMatrix": [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ]
  },
  "analysis": {
    "maxInterpolationGapNs": "20000000",
    "requiredSensors": ["accelerometer", "gyroscope"]
  },
  "referenceSamples": [
    {
      "timestampNs": "1000000000",
      "accelerometerMps2": [0.0, 0.0, 9.80665],
      "gyroscopeRadPerSec": [0.0, 0.0, 0.0]
    }
  ]
}
```

The JSON example is deliberately marked `qaFixture: true`. It is a documentation fixture only and must never be submitted as a real instrument record. For a real collection, create a new artifact from the approved protocol, remove the QA marker only after replacing every placeholder with verified instrument, calibration, clock, fixture, and custody information, and preserve the original instrument export unchanged. The numbers above are format examples only. They are not prescribed clock offsets, uncertainties, sample values, or acceptance limits. Replace the identity matrix only with a measured, documented reference-to-phone coordinate transform. Do not assume co-mounted instruments are perfectly aligned without documenting fixture alignment and uncertainty.

### Required field meaning

- `referenceTimestampNs`: monotonic nanoseconds from the reference logger's documented clock.
- `androidElapsedRealtimeNanos`: the paired Android `SensorEvent.timestamp` clock value, not wall-clock milliseconds. Align WaveRadar samples using `sampleArrival.timestampElapsedRealtimeNanos`; do not substitute `measurementTimestamp` or its `timestampBasis` label.
- `uncertaintyNs`: measured uncertainty for that synchronization pair.
- `referenceToWaveRadarRotationMatrix`: right-handed orthonormal transform from reference IMU axes into the WaveRadar phone sensor frame.
- `maxInterpolationGapNs`: preregistered maximum bracketing interval. The analyzer does not extrapolate.
- `standardUncertainty`: per-axis standard uncertainty in the stated channel units, copied from the instrument's documented calibration evidence.
- `requiredSensors`: an explicit preregistered subset of `accelerometer` and/or `gyroscope`. Set this only after the fresh device inventory establishes which channels are supported and registered. If omitted, both channels remain the default analysis scope, but the result cannot become a review candidate until the scope is explicitly declared.

### Sensor lifecycle and channel scope

The analyzer reports, separately for each channel and polling record, the native SensorManager state, native bridge-call state, capability, listener registration, and sample-arrival state. A numeric `ARRIVED` sample does not silently fill in missing capability, registration, manager, or bridge metadata. A record contributes a comparison event only when the manager is `AVAILABLE`, the native bridge call is `OK`, capability is `SUPPORTED`, registration is `REGISTERED`, and the sample is `ARRIVED` / `MEASURED` with valid sequence, timestamp, and vector data. A missing or contradictory manager/bridge/capability/registration state is counted and excluded. Any such lifecycle mismatch prevents that channel from becoming a review candidate for the capture; it is not silently discarded from diagnostics.

The preregistered `requiredSensors` list controls which channels are required for the overall comparison. An explicitly unsupported gyroscope can be reported as `NOT_IN_REQUIRED_ANALYSIS_SCOPE` while an accelerometer-only study proceeds, provided that accelerometer-only scope was set before collection. Unsupported sensors are not treated as failed measurements. Do not change the required channel set after inspecting confirmatory results; create a new protocol version instead.

The report also keeps these device-level observations separate:

- Native Android SensorManager availability.
- Native SensorManager runtime-permission policy (`NOT_REQUIRED`, `GRANTED`, or `UNKNOWN`).
- Browser/Web motion permission state.
- Spatial-pose provider state, including `NOT_INSTRUMENTED`.

Browser motion permission does not substitute for native SensorManager permission state. Spatial-pose availability is not required for an accelerometer/gyroscope bench comparison and is never inferred from those sensors.

A calibration metadata envelope is only a candidate for review. The certificate, asset identity, validity dates, uncertainty, witness independence, and custody must be checked by an independent evidence custodian.

## Run the analyzer

Use a copy of the exported WaveRadar JSON and a separately preserved normalized reference artifact. Choose a new output path; the CLI refuses to overwrite an existing file.

```bash
node scripts/analyze-android-reference.mjs \
  --waveradar ./evidence/waveradar-android-baseline.json \
  --reference ./evidence/reference-imu-normalized.json \
  --out ./analysis/android-reference-comparison-v1.json
```

The report records SHA-256 digests of the exact two input files. The two input files are read-only; the report is written as a new artifact.

## Analysis method

1. Fit an affine mapping from reference monotonic time to Android elapsed-realtime using at least three strictly increasing synchronization pairs.
2. Report clock drift, fit residuals, declared synchronization uncertainty, and invalid pair counts. A good mathematical fit does not prove that the physical synchronization procedure was correct.
3. **Do not extrapolate the clock mapping.** Android event timestamps outside the first-to-last observed synchronization-pair range are excluded as `CLOCK_MAPPING_OUTSIDE_SYNC_PAIR_RANGE`. Place documented synchronization events so the preregistered acquisition window is bracketed; if it is not, the affected samples remain unmatched.
4. Require a right-handed orthonormal 3×3 coordinate transform. A valid matrix does not prove that the fixture was physically aligned correctly.
5. Extract only `ARRIVED`, `MEASURED` samples with a raw `timestampElapsedRealtimeNanos` value from Android `SensorEvent.timestamp`, finite 3-axis values, and a valid native sample sequence. Preserve `timestampBasis` separately: the current baseline may label the display measurement timestamp `WALL_CLOCK_ESTIMATE_FROM_ELAPSED_REALTIME`, while the raw monotonic event timestamp remains in `timestampElapsedRealtimeNanos`.
6. Deduplicate repeated UI polling records by native `sampleSequence`; exclude conflicting duplicate sequences. Report sequence gaps and non-monotonic event timestamps.
7. Linearly interpolate reference values only between bracketing reference samples whose gap is at or below the preregistered limit. No extrapolation is performed.
8. Report per-axis bias, sample standard deviation of error, RMSE, 95th-percentile absolute error, maximum absolute error, and vector RMSE for accelerometer and gyroscope separately.

No automatic pass/fail threshold is embedded. A reviewer must interpret denominators, gaps, uncertainty, clock residuals, alignment, lifecycle-state completeness, required channel scope, exclusions, and protocol deviations against thresholds fixed before confirmatory data collection. Each channel has its own `accuracyEvidenceStatus`; the top-level status is a candidate only when every preregistered required channel is eligible.

## Output dispositions

- `COMPUTED_COMPARISON_PENDING_INDEPENDENT_REVIEW`: numerical comparisons were computable; this is not a validation pass.
- `NOT_COMPUTABLE_WITH_CURRENT_SYNC_OR_FRAME_METADATA`: required clock mapping or coordinate transform was unavailable or invalid.
- `CANDIDATE_FOR_INDEPENDENT_REVIEW_NOT_VERIFIED`: all required metadata gates were present. The independent custodian and reviewer still must authenticate source artifacts and method.
- `INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY`: one or more preregistration, required-scope, calibration, uncertainty, synchronization, native manager/bridge/capability/registration lifecycle, sequence-integrity, native permission-policy, or matched-sample conditions were not established.
- `NOT_IN_REQUIRED_ANALYSIS_SCOPE` (per channel): the channel was intentionally excluded from the preregistered comparison scope; this is not a finding that the sensor failed.

## QA fixture guard

The input envelope may carry `qaFixture: true` at the artifact level or on an individual sample (or `evidenceClass: "QA_FIXTURE"`). When any explicit QA-fixture marker is present, numerical comparisons may still be computed for software testing, but `accuracyEvidenceStatus` is forced to `INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY`. The report lists the marker locations. This is a guardrail, not a cryptographic authenticity check: unmarked synthetic or mislabeled inputs cannot be identified reliably by this analyzer alone.

## Explicit exclusions

This utility does not analyze magnetometer, rotation vector, gravity, barometer, light, proximity, camera, GNSS, Wi-Fi RTT, UWB, spatial pose, or position. It cannot establish indoor localization, room-scale reconstruction, through-wall sensing, human presence, victim detection/localization, or life-safety readiness.
