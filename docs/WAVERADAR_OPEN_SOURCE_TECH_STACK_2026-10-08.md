# WaveRadar Open-Source / Open-Standards Technology Map — 2026-10-08

## Goal

Use mature open standards and open-source building blocks wherever they improve interoperability, reproducibility, cost, or technical credibility.

## Spatial / 3D

### 3D Tiles + glTF
Use for streamable building, point-cloud, photogrammetry and heterogeneous 3D content. 3D Tiles is an OGC community standard and supports metadata, interaction and hierarchical streaming.

### Cesium ecosystem
Use selectively for desktop/command visualization and large geospatial datasets. Keep the core data model vendor-neutral.

### OpenXR
Reserve as the hardware/display abstraction for future helmet/goggle deployments.

## Sensor / IoT interoperability

### OGC SensorThings API
Use as the external interoperability model for Things, Sensors, Datastreams, Observations, Locations and Features of Interest.

WaveRadar's internal evidence contract remains authoritative; SensorThings is the interoperable exchange boundary.

### OGC API family
Use OGC API - Features, Tiles and related standards for geospatial services where appropriate.

## Robotics / spatial research

Evaluate:
- ROS 2 for robotics/external sensor integration
- OpenVINS / VINS-Fusion class visual-inertial research
- ORB-SLAM-family research for offline/experimental mapping
- Open3D for point-cloud/geometry processing
- RTAB-Map for RGB-D/visual SLAM research
- OpenCV for vision primitives

These should live behind adapters. Do not make the phone app depend on a robotics stack just to run.

## Edge AI

Prefer:
- ONNX-compatible models
- TensorFlow Lite / LiteRT-compatible mobile inference where appropriate
- Android NNAPI / hardware acceleration where available
- MediaPipe-class on-device perception where it provides validated capability
- quantized models for constrained devices

Model selection is subordinate to measured performance, thermal load, latency, and validation.

## Mapping / geodata

Prefer:
- GeoJSON
- GeoPackage
- OpenStreetMap-derived data where licensing/attribution requirements are satisfied
- public elevation/building datasets where provenance and update date are recorded
- locally captured building geometry for indoor deployments

External data is tagged ENVIRONMENTAL; it is not silently treated as live sensor measurement.

## Communications

Design a transport abstraction supporting:
- WebSocket
- MQTT
- local Wi-Fi
- peer-to-peer / nearby-device transports where available
- store-and-forward synchronization

Every message carries sequence/time/session identifiers and can be replayed.

## Advanced sensing research

Adapters should be prepared for:
- Wi-Fi RTT
- UWB
- mmWave radar
- thermal
- LiDAR/depth
- acoustic arrays
- RF/CSI
- wearable physiology

Experimental adapters must expose capability, raw measurement metadata, uncertainty and validation state. They must not fabricate geometry.

## Data and replay

The canonical event record should be append-oriented and replayable:

`eventId, sessionId, deviceId, timestamp, sensorFamily, modality, frameId, value, unit, location, uncertainty, evidenceClass, state, provenance, modelVersion`

Maintain immutable capture sessions plus derived indexes.

## New high-value capability: Evidence Graph

Treat every operational conclusion as a graph:

`measurement → derivation → corroboration/conflict → inference → prediction → outcome`

This lets an operator ask:
- Why is this target here?
- Which sensors support it?
- What disagrees?
- How old is the evidence?
- What prediction model generated the route?
- Was the prediction later correct?

## New high-value capability: Capability Negotiation

Every device advertises:
- available sensor families
- supported spatial/ranging functions
- sampling limits
- permissions
- accuracy/uncertainty metadata
- compute budget
- battery/thermal state
- software/model versions

The federation engine then assigns sensing roles without assuming every phone is identical.

## New high-value capability: Graceful degradation ladder

1. full multimodal spatial mode
2. camera + IMU mode
3. camera-only mode
4. sensor/map mode
5. 2D map mode
6. evidence/replay mode

The user should never see a blank screen merely because one advanced subsystem fails.
