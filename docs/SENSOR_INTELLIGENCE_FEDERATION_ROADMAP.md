# WaveRadar Sensor Intelligence & Federation Roadmap

Status: design proposal; not a claim that these capabilities are implemented or validated.

## Objective
Make every participating device a trustworthy sensor node that can contribute evidence, learn its own limitations, and share useful calibration/reliability knowledge with other authorized nodes. Improve the shared world model without allowing one bad sensor, stale packet, or incorrect inference to contaminate the network.

## Core design principle
**Share evidence and versioned knowledge, not unquestioned conclusions.** A sensor's intelligence is its capability profile, calibration, health history, environmental context, and validated error model. Peers may use this information to weight evidence, but must retain provenance and independently check consistency. Never relabel a model output as a physical measurement.

## Proposed node model
- Versioned profile: pseudonymous device ID, app/build version, protocol/schema version.
- Per-sensor hardware/API capability, permission, availability, calibration, sample rate, dropped samples, clock offset/drift, latency, battery/thermal state when available, and upload queue depth.
- Reliability by modality and operating envelope based on measured ground-truth tests, including sample count and uncertainty rather than one opaque trust score.
- Spatial coordinate frame, pose quality, model/firmware hashes, and provenance.
- Do not share raw biometrics, audio, video, or personal identifiers by default.

## Evidence packet contract
Every packet should carry schemaVersion, eventId, sessionId, pseudonymous deviceId, sequenceNumber, observedAt, receivedAt, clock-quality estimate, age/staleness, modality, sensorId, units, value, coordinate frame, evidenceClass, uncertainty/covariance when meaningful, quality flags, calibration/profile version, provenance/input event IDs/model version, integrity/authentication metadata, deduplication key, and consent/policy scope.
Reject or quarantine malformed values, impossible timestamps, replayed packets, unsupported units, unbounded uncertainty, and schema mismatches. Missing data stays missing; never fill unsupported metrics with plausible-looking defaults.

## Fusion and peer communication
1. Local-first sampling, monotonic timestamps, safe local buffering, and canonical normalization.
2. Quality gate: availability, age, calibration, sequence, plausible ranges, uncertainty, and permissions.
3. Authenticated encrypted transport, per-device enrollment/revocation, retry with exponential backoff, bounded queues, deduplication, and acknowledgements. Uploads must be idempotent.
4. Time alignment: estimate clock offset/drift; preserve event time and server receive time. Do not treat devices as simultaneous unless synchronization quality is known.
5. Spatial alignment: keep coordinate frames explicit; fuse positions only when frames and pose quality are compatible.
6. Robust fusion using validated per-modality uncertainty and reliability; detect outliers/disagreement; preserve lineage for each fused result.
7. Conflict handling: retain competing hypotheses and label conflict. Majority vote must not erase a reliable minority sensor.
8. Store raw observations separately from tracks, map features, hazards, and predictions. Every world-model claim must trace back to source events.
9. Offline mode: bounded encrypted local storage, visible queue status, and duplicate-safe sync when connectivity returns.

## How nodes learn and share intelligence
- Learn calibration/error distributions only from explicit, quality-controlled ground-truth sessions.
- Track reliability by modality and operating envelope with minimum sample thresholds and uncertainty.
- Share signed/versioned profile updates with aggregate calibration statistics, sample counts, scope, and validation status—not hidden model weights or raw private data by default.
- Receiving nodes check sender, version, scope, age, and compatibility; updates remain untrusted proposals until validated.
- Bound updates, compare with local checks, rate-limit changes, retain rollback history, and isolate suspicious nodes to resist poisoning and drift.
- Shared learning may adjust reliability weights; it must not silently change measurements or upgrade inference to measurement.
- Any learned change affecting alerts/navigation must be replay-tested on held-out ground-truth data and approved before operational use.

## Sensor coverage strategy
- Stage A: phone accelerometer, gyroscope, rotation vector, magnetometer, barometer, light, proximity, camera, and GNSS only when supported and permitted. Capability and live sample availability are separate states.
- Stage B: cooperative ranging; Wi-Fi RTT only with compatible phone and access points, UWB only on compatible hardware, and BLE/Wi-Fi discovery with explicit limitations. Nearby phones are not automatically accurate ranging anchors.
- Stage C: external thermal, gas/smoke, physiology, or dedicated radar adapters, each with calibration and certification status.
- Stage D: visual-inertial odometry/AR depth where supported, reporting drift and uncertainty. Phone IMU alone is not reliable absolute positioning.
- Stage E: validated multimodal fusion only after time alignment, calibration, repeatable ground-truth evaluation, and failure-mode testing.

## Security, privacy, and safety
- Authenticated device identity or short-lived signed credentials; encrypted transport; least-privilege enrollment and revocation.
- Do not share MAC addresses or stable hardware identifiers unless essential, authorized, and reviewed.
- Minimize retention; encrypt local queues; make recording state visible; define team membership and incident access.
- Threat-model spoofed sensors, replay, Sybil devices, poisoned calibration, compromised phones, clock manipulation, and network partitions.
- If evidence is stale, conflicting, unsupported, or low quality, show uncertainty/unknown—not a confident route or person location.
- The prototype is not life-safety equipment until independently tested and certified for intended use.

## Acceptance tests before calling federation reliable
- Unit tests for schema validation, timestamps, stale data, uncertainty, deduplication, and evidence-class preservation.
- Replay tests with packet loss, reordering, duplication, delay, offline recovery, and clock drift.
- Fault injection for impossible values, stale samples, conflicting positions, malformed payloads, and rapid calibration changes.
- Cross-device calibration using known distances/poses and documented ground truth.
- Track packet delivery/latency, sample loss, clock error, position-error distribution, false positives/negatives, calibration drift, conflict rate, and uncertainty calibration.
- End-to-end Android tests on actual target phones and explicit records of unsupported hardware.
- Block validated status until required ground-truth thresholds are met.

## Immediate engineering order
1. Add a sensor inventory/health screen showing supported, permission denied, available, receiving samples, stale, or unavailable as distinct states.
2. Verify the native bridge is registered and called from the web app; test sample age, timestamp monotonicity, and lifecycle pause/resume.
3. Validate the versioned observation envelope end-to-end.
4. Implement authenticated, idempotent, retryable ingest and an observable offline queue.
5. Add clock/pose quality and modality-specific calibration records.
6. Implement meaningful cross-device measurement agreement and conflict display before automatic fusion.
7. Add peer-learned reliability profiles only with signed versions, holdout evaluation, rollback, and poisoning resistance.
8. Run repeatable ground-truth trials before responder navigation or life-safety claims.

## Current gaps to verify
- The native bridge exposes sensor snapshots and optional Wi-Fi RTT, but app-side invocation and end-to-end ingestion must be demonstrated.
- The current Wi-Fi RTT path can return responder MAC addresses; minimize or pseudonymize them before persistence/federation.
- The current agreement helper compares timestamps for same-family observations rather than measurement values, locations, and uncertainty. Timestamp proximity alone is not sensor agreement and must not be a fusion confidence score.
- Successful debug APK compilation does not prove permissions, hardware availability, upload, or field accuracy.
- Hosted backend and Base44-backed web app are separate systems; contracts, authentication, retention, and identifiers need explicit integration tests.
