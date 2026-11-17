# Sensor-to-Scene Integration Contract

Status: deterministic adapter layer for existing observations. This is not a native sensor driver, a calibration system, or a live 3D renderer.

## Pipeline

1. Existing platform adapters acquire data only where the platform reports support and permission.
2. Each observation retains source/device identity, modality, capture timestamp, sequence, evidence class, uncertainty, units and raw evidence reference.
3. `observationsToSceneEvents` maps observations into the incident event contract. Missing capture times are passed through as invalid and quarantined by replay; arrival time is never substituted.
4. Explicit x/y/z coordinates are retained with their coordinate frame and floor. Only an explicitly aligned position with a frame is marked ALIGNED. Range-only values are never converted into bearings or world coordinates.
5. Observations without a registered position remain unregistered entities. A renderer must show them in an unlocated/uncertain rail, never at (0,0,0).
6. `buildSynchronizedSceneViews` reconstructs one snapshot and produces chief and helmet projections with the same synchronization key.

## Live integration requirements

- Connect actual native sensor callbacks and existing detection hooks to this adapter; do not fabricate sample data.
- Preserve source capture time and monotonic clock domain. Record clock offset and uncertainty when mapping to the incident clock.
- Calibrate device-to-building transforms from surveyed control points or a validated localization method. A coordinate-frame label alone is not calibration.
- Keep camera, IMU, GNSS, Wi-Fi RTT, UWB, thermal and mmWave capabilities distinct; platform support and permission are runtime facts, not assumed.
- Persist raw evidence and append-only normalized events. Version the adapter, geometry and reconstruction algorithm for reproducible replay.
- WIS and helmet consume the same incident snapshot. The helmet may filter by role, floor and latency budget, but must not independently estimate a different scene. Stale/offline states must be explicit.

## Safety and evidence

- MEASURED, DERIVED, INFERRED and PREDICTED remain distinct.
- Unknown or invalid timestamps are quarantined from time-based replay.
- No coordinate is invented from a range-only measurement.
- A marker without calibrated spatial registration is not rendered as a precise building location.
- Software tests establish contract behavior only. They do not establish physical accuracy, independent validation or operational readiness.
