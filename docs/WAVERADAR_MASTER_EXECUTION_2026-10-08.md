# WaveRadar Master Execution Baseline — 2026-10-08

## North-star product

WaveRadar is an Android-first, evidence-gated spatial operational-awareness platform.

**First deployment:** firefighter / emergency-response situational awareness.

**Core promise:** build the clearest available local/world model from real observations, preserve provenance and uncertainty, coordinate multiple observers, and clearly distinguish:
- MEASURED — direct sensor observation
- DERIVED — mathematical result from measured data
- ENVIRONMENTAL — authoritative external context
- INFERRED — model interpretation
- PREDICTED — forecast
- GROUND_TRUTH — operator-entered reference
- UNKNOWN / CONFLICT / STALE — explicitly unresolved states

WaveRadar must never claim that an ordinary phone can see through walls. Experimental RF/CSI/mmWave/thermal/ranging capabilities remain isolated adapters until validated.

## Current source of truth

Repository: `tripocolypse417-ship-it/CMVisual`

The repository currently contains:
- Base44-compatible React/Vite application
- Capacitor Android configuration
- native Android sensor and Wi-Fi RTT bridges
- evidence/data contract
- sensor network/federation primitives
- trajectory/hazard prediction engine
- Physical Validation workflow
- Admin/command surface
- target locking, spatial/floorplan, replay and evidence UI components
- recovery/error-boundary safeguards
- commercial, funding, pilot and validation documentation

## Architecture decision

Do **not** restart the product.

Use this pipeline everywhere:

`SENSOR → OBSERVATION → QUALITY/PROVENANCE → FUSION → WORLD MODEL → TRACK → DERIVATION → INFERENCE/PREDICTION → OPERATOR DISPLAY`

Every stage preserves:
`source, deviceId, timestamp, coordinate frame, uncertainty, evidence class, validation state, model version`.

### World model

The world model is a time-aware spatial graph:
- static geometry: building/floor/room/door/stair/obstacle
- dynamic entities: responders, subjects, vehicles, moving hazards
- observations: sensor events
- relationships: observed-by, near, inside, blocked-by, route-to
- coordinate frames and transforms
- historical snapshots and replay

Use open geospatial formats where practical:
- glTF / 3D Tiles for streamable 3D
- GeoJSON for feature exchange
- OGC SensorThings for sensor observations
- OGC API family for geospatial services
- MQTT/WebSocket-compatible event transport
- SQLite/GeoPackage-style offline storage where appropriate

## Operator experience

### Field View
One screen:
- live camera
- spatial/3D overlay
- compact radar/map
- selected target
- route/hazard cue
- sensor integrity indicator
- expandable evidence drawer

Do not overwhelm the user with raw telemetry by default.

### Incident Command
- team positions and tracks
- building/world model
- target and hazard layers
- sensor health
- stale/conflict indicators
- shared views
- replay/timeline
- ability to send a selected operational view to another display

### Review / Training
Training and historical data are visually and semantically isolated from live data.

## Target workflow

1. Detect a person/object from available sensors.
2. Assign a stable track ID; do not treat it as identity.
3. Allow operator lock.
4. Fuse independent observations without erasing provenance.
5. Render a spatial skeleton/keypoint view only where pose evidence exists.
6. Show measured position separately from predicted trajectory.
7. Generate route suggestions only from actual mapped geometry and known constraints.
8. Show uncertainty/conflicts.
9. Record later observations and compare them to predictions.
10. Preserve the evidence chain for audit/replay.

## Sensor expansion ladder

### Tier A — phone-only
Camera, IMU, magnetometer, barometer, GNSS when permitted, light/proximity, microphone-derived environmental features when explicitly enabled.

### Tier B — native spatial/ranging
ARCore motion/depth where supported, Wi-Fi RTT, Bluetooth ranging, UWB where supported.

### Tier C — cooperative phones
Cross-device visual observations, landmarks, handoff, coverage, ranging and team localization where supported.

### Tier D — external validated sensors
Thermal/IR, mmWave, dedicated UWB, LiDAR/depth, environmental sensors, firefighter wearables/physiology.

### Tier E — research adapters
RF/CSI, acoustic arrays, passive RF environmental features, experimental multimodal sensing.

No tier upgrades truth automatically. A new sensor creates a new evidence source; validation determines what it can legitimately support.

## Cutting-edge research direction

Build WaveRadar as a **sensor-agnostic evidence engine**, not a single-sensor gimmick.

High-value research tracks:
1. multimodal visual + inertial SLAM
2. cooperative multi-phone mapping
3. uncertainty-aware multi-target tracking
4. dynamic occupancy / traversability maps
5. thermal + RGB fusion
6. mmWave/UWB/ranging adapters
7. acoustic localization
8. RF/CSI research adapter
9. edge AI model execution with hardware-aware fallback
10. learned depth / segmentation / pose where validated
11. time-synchronized replay and counterfactual testing
12. digital-twin interoperability
13. eventual specialized helmet/display integration
14. optional future quantum optimization research for routing/fusion — never required for the core product

## Safety and truth firewall

Never:
- fabricate sensor readings
- fabricate human targets
- turn simulation into live data
- call inference measured
- claim unsupported through-wall human detection
- infer identity, intent, dangerousness, personality, gender, mental state, or neural state from ordinary sensor signatures
- present an unvalidated model as operationally proven

Always:
- retain conflicts
- expose stale data
- preserve uncertainty
- retain provenance
- version models
- support replay
- compare predictions with later ground truth
- fail to UNKNOWN when evidence is insufficient

## Validation program

Priority order:
1. sensor ingestion integrity
2. device capability detection
3. timestamp/clock quality
4. coordinate-frame alignment
5. track continuity
6. cross-sensor agreement/conflict
7. replay determinism
8. prediction calibration
9. route/obstacle correctness
10. human-operator task performance
11. failure injection and recovery
12. multi-device federation

Minimum controlled cases:
- stationary reference
- known straight-line motion
- known turns
- known distance markers
- camera occlusion
- sensor loss
- stale packets
- conflicting sensors
- device rotation
- multi-phone alignment
- replay vs live equivalence

## Performance strategy

The previous freezes and blank screens make resilience a first-class feature.

Rules:
- advanced 3D is optional, never boot-critical
- WebGL failure falls back to 2D spatial mode
- camera failure falls back to sensor/map mode
- unavailable hardware is reported, not simulated
- expensive inference runs off the UI thread where possible
- rendering quality adapts to device load
- recordings/replay are chunked
- every network feature has an offline/local path where practical
- safe mode remains available

## Commercial sequence

1. prove phone-only sensing and validation
2. controlled firefighter evaluation
3. demonstrate command + field shared view
4. quantify track continuity, localization error, latency, stale/conflict detection and operator task performance
5. convert successful evaluation to paid pilot
6. expand into SAR, industrial safety, construction, utilities, robotics and research
7. pursue government R&D only with validated capability boundaries

## Definition of done

WaveRadar is not considered operationally proven until:
- a real Android device produces real sensor records
- records survive the evidence contract
- validation cases have measured outcomes
- live UI remains usable under sensor loss
- replay reproduces recorded behavior
- prediction error is quantified
- multi-device alignment is demonstrated
- no unsupported sensing claim is required for the demo

## Immediate priority

**Physical validation is the gating item.**

Everything else should be developed around making that validation easier, more reproducible and more impressive — not around inventing additional simulated capability.
