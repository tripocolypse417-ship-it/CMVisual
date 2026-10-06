# WaveRadar Daredevil Vision — Finalized Implementation Spec

## Goal
WaveRadar's advanced operator view is a cinematic spatial overlay inspired by a Daredevil visual effect: a locked target is represented as a person/skeleton with movement history while surrounding obstructions are rendered as translucent spatial layers.

The visual effect is a presentation layer. It must follow the evidence state supplied by the sensing pipeline and must never convert an inference into a measured fact.

## Operator experience
1. Point the phone toward the target area.
2. Select a detected person/object.
3. Lock the observation track.
4. Keep the lock associated with that stable track while the camera remains aligned.
5. Render the person as a spatial/skeleton overlay when pose landmarks are available.
6. Show movement history and predicted movement separately.
7. Render obstruction/wall layers translucently where spatial geometry exists.
8. Expand Raw/Evidence View for timestamps, source device, sensor type, uncertainty, and underlying measurements.

## Evidence states
- MEASURED — direct validated sensor observation.
- DERIVED — mathematical result from measurements.
- INFERRED — model interpretation.
- EXPERIMENTAL — research sensing such as RF/CSI with incomplete validation.
- UNCONFIRMED — insufficient supporting evidence.
- NO DATA — no reliable observation.

## Sensor strategy
### Phone-first
Camera, IMU, location when permitted, barometer/light/proximity where available, and other supported Android sensors provide the initial evidence stream.

### Cooperative phones
Participating phones advertise capabilities and contribute independent observations. Each observation retains device ID, sensor family/type, timestamp, coordinate frame, uncertainty, and evidence class.

### Native ranging
Use Wi-Fi RTT and other supported native ranging hardware only when the device actually supplies a measurement. UWB/Bluetooth/radar/depth/thermal adapters can be added independently.

### Experimental wall-vision research
RF/CSI and related open-source research can be connected through isolated experimental adapters. Experimental output is never presented as exact human-through-wall measurement without validation.

## Human visualization
The current 3D wall-vision renderer already contains articulated human geometry and a camera-pose keypoint rendering path. The finalized presentation should prioritize the skeleton/keypoint overlay for locked people, retain a clear target-lock indicator, and show the movement trail behind the target.

## Validation rule
More sensors or more phones do not automatically increase truth. Confidence should increase only when independent observations, validated ground truth, provenance, uncertainty, and cross-device agreement support the conclusion.

## Immediate implementation sequence
1. Keep the current evidence-first architecture.
2. Preserve the existing target lock and stable track IDs.
3. Strengthen the locked-person skeleton presentation in WallVisionScene.
4. Connect camera pose landmarks to the locked target display.
5. Keep movement trails and trajectory predictions visually distinct.
6. Surface Wi-Fi RTT measurements as measured ranging observations when available.
7. Add experimental RF/CSI adapters without fabricating target positions.
8. Add Raw/Evidence View with source, timestamp, uncertainty, and evidence class.
9. Validate predictions against later observations and record trajectory error.
10. Continue optimizing Android performance to avoid the previous freeze/download/build problems.

## Current build status
As of October 6, 2026, the public tripocolypse417-ship-it/CMVisual repository's Android workflow run #48 completed successfully and produced a WaveRadar-debug-apk artifact. The latest successful commit also fixed a remaining unsafe detection-map path in EnvironmentMap.
