# WaveRadar Phone-First Sensing Roadmap

## Principle
The first sensing platform is the Android phone. External hardware is optional and is added only when it provides a capability the phone cannot validate.

The network is a distributed sensor array of phones, not a collection of interchangeable magic sensors.

## Phase 1 — Phone-only
Primary: rear camera; IMU; magnetometer; barometer when available; ambient light/proximity when available; GPS when permitted; microphone-derived environmental features only when explicitly enabled.

Software: camera object/person observations, visual tracking, pose estimation where supported, camera-motion compensation using IMU, local scene/landmark map, evidence-first target tracking, trajectory prediction, replay and validation.

## Phase 1.5 — Phone collective
Multiple phones contribute independent observations. Preserve device ID, sensor family/type, timestamp, coordinate frame, measurement, uncertainty, evidence class, and world-model anchor. Fusion preserves provenance; agreement does not automatically turn inference into measurement.

Potential capabilities: cooperative visual coverage, shared landmarks, cross-device target handoff, dead-zone coverage, obstacle confirmation, distributed motion estimation, and team-member localization where supported.

## Phase 2 — Native spatial/ranging capabilities
Prioritize Android/AOSP capabilities: ARCore camera + motion tracking; ARCore Depth where supported; Android ranging; UWB; Wi-Fi RTT; Bluetooth ranging.

## Phase 3 — Experimental sensing
Research candidates behind replaceable sensor adapters: Wi-Fi channel-state-information sensing, passive RF environmental features, acoustic localization, multi-phone microphone arrays, magnetic-field anomaly mapping, thermal/IR attachments, mmWave/UWB modules, specialized depth cameras, wearable physiology sensors, and building telemetry.

## Phase 4 — High-end external sensing
Dedicated UWB anchors, mmWave radar, LiDAR/depth hardware, thermal cameras, industrial environmental sensors, and specialized firefighter/wearable sensors.

## Data truth model
MEASURED = direct hardware observation.
DERIVED = mathematical computation from measured data.
ENVIRONMENTAL = authoritative external context.
PREDICTED = model output.
GROUND_TRUTH_OPERATOR_MARKER = human-entered reference.
UNKNOWN = insufficient evidence.

## Safety boundary
WaveRadar should never claim that a phone camera, Wi-Fi, Bluetooth, or ordinary phone sensors can see through walls. Experimental methods remain experimental until independently validated.

## Research rule
Prefer open standards, open-source implementations, reproducible papers/datasets, and Android/AOSP APIs. Experimental technology enters the architecture as a replaceable adapter without changing the world-model contract.
