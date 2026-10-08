# WaveRadar Beyond-Current-State Expansion Plan — 2026-10-08

## Strategic thesis

WaveRadar should not compete as another thermal viewer, indoor tracker, AR helmet, or command dashboard. Its differentiator should be an evidence-gated **spatial operating system for emergency response** that can ingest heterogeneous sensors, construct a time-aware world model, reason over uncertainty, coordinate people/devices/robots, and present only what the evidence supports.

Existing public work shows the problem is still fragmented:
- NIST FRST targets indoor first-responder tracking.
- DHS/NIST work demonstrates value in helmet visualization and command views.
- Research has demonstrated combinations of thermal, inertial, and mmWave sensing in smoke-filled environments.
- Recent Carnegie Mellon FireSense work combines thermal + radar + SLAM and shares a real-time map to command.

WaveRadar should unify these classes without pretending unsupported capability is real.

## Capabilities to add or investigate

### 1. Cooperative spatial mesh
Treat every phone, responder, wearable, vehicle, robot, thermal camera, UWB anchor, and external sensor as a temporary node in one incident graph.

- peer-to-peer/local network discovery
- capability negotiation
- clock offset estimation
- shared coordinate frames
- cooperative localization
- store-and-forward when connectivity fails
- automatic confidence reduction when nodes disagree

### 2. Opportunistic sensing
Use whatever is already present rather than requiring a fixed sensor package.

Potential inputs:
- camera / visual features
- IMU
- GNSS
- magnetometer
- barometer / altitude changes
- ambient light
- microphone/acoustic features
- Wi-Fi RTT where supported
- Bluetooth ranging where supported
- UWB where supported
- AR depth
- thermal
- mmWave
- external LiDAR/depth
- wearables and PASS/physiological telemetry
- robot/drone observations

A missing sensor must produce UNKNOWN, not synthetic replacement data.

### 3. Acoustic spatial awareness
A future adapter can turn multiple microphones into evidence about sound direction/events:
- alarms
- voices
- impact events
- breaking glass
- machinery
- distress calls

Never infer a person's identity, intent, or medical state from audio alone. Report acoustic event + estimated direction/uncertainty.

### 4. Environmental hazard layer
Fuse validated environmental measurements into the world model:
- temperature
- heat trend
- smoke/particulate measurements when available
- CO/CO2 and other gas sensors when available
- pressure
- structural/environmental telemetry

The system should model **hazard fields and trends**, not merely show isolated sensor numbers.

### 5. Dynamic traversability
Replace a static route with a continuously updated traversability graph.

Edges should carry:
- distance
- estimated travel time
- observed obstruction
- heat/environmental constraints
- visibility confidence
- recent traffic
- uncertainty
- last observation time

Routes should become UNKNOWN or unsafe when evidence expires.

### 6. Temporal world model
Every spatial fact gets a time interval.

This enables:
- rewind
- before/after comparison
- incident reconstruction
- last-known-safe route
- stale-target detection
- change detection
- post-incident evidence export
- training replay

### 7. Predictive layer with calibration
Prediction remains downstream from measurements.

Potential outputs:
- short-horizon trajectory
- route degradation
- sensor dropout risk
- stale-track warning
- likely map change
- responder convergence/conflict warnings

Every prediction must expose horizon, confidence/calibration state, model version, evidence inputs, and outcome comparison when available.

### 8. Human-centered command intelligence
Instead of flooding the incident commander with telemetry:
- prioritize actionable changes
- surface conflicts
- surface missing evidence
- surface responder isolation
- surface route degradation
- allow one-click sharing of a selected operational view
- keep detailed evidence one layer deeper

### 9. Robot/drone handoff
WaveRadar should be able to ingest observations from robots/drones rather than owning the robot stack.

Longer-term:
- send robot to inspect an UNKNOWN region
- request thermal/radar scan
- request map refresh
- return the resulting observation with provenance

This creates an **active sensing loop**: UNKNOWN -> task sensor -> new evidence -> updated world model.

### 10. Open digital-twin interoperability
Use open formats/standards where practical:
- OGC SensorThings / Connected Systems
- OGC 3D Tiles
- GeoJSON / GeoPackage-style offline data
- glTF
- ROS 2 adapters
- OpenXR
- standard WebSocket/MQTT-compatible transports

The internal evidence contract remains authoritative.

### 11. Evidence graph
For every important operational fact:

MEASUREMENT -> DERIVATION -> CORROBORATION/CONFLICT -> INFERENCE -> PREDICTION -> OUTCOME

This is a major differentiator because it makes the system auditable instead of being a black-box AI.

### 12. Capability passport
Every device should advertise:
- sensors
- hardware limitations
- permissions
- sampling rate
- uncertainty
- compute capacity
- battery/thermal state
- model versions
- validation status

The incident automatically selects the strongest **validated** configuration available.

### 13. Uncertainty-aware visualization
Do not merely color-code confidence. Encode:
- freshness
- uncertainty radius/volume
- evidence class
- sensor agreement
- predicted vs measured
- unavailable vs not observed

A responder should understand "what do we actually know?" within seconds.

### 14. Offline-first emergency mode
The system must continue functioning when:
- internet is absent
- cloud is unavailable
- cellular is weak
- GPS is denied
- one sensor dies
- rendering hardware is overloaded

Use local storage, queued synchronization, replay, and graceful rendering fallback.

## Competitive lesson

NIST's first-responder work shows indoor tracking remains difficult. DHS's C-THRU work demonstrates the value of a helmet display + command display + thermal/edge visualization. TRX/NEON demonstrates the value of indoor/outdoor personnel tracking and command visualization. FireSense demonstrates the value of thermal + radar + SLAM shared to command.

The strategic gap is the **integration layer**:
one evidence model, one world model, multiple sensors, multiple devices, multiple responders, multiple representations, and explicit truth boundaries.

## Product architecture

SENSOR
-> OBSERVATION
-> QUALITY / TIME / FRAME / PROVENANCE
-> SENSOR FUSION
-> SPATIAL WORLD MODEL
-> TRACK / HAZARD / ROUTE
-> INFERENCE
-> PREDICTION
-> OPERATOR DISPLAY
-> OUTCOME
-> VALIDATION / CALIBRATION
-> MODEL + SENSOR IMPROVEMENT

## New operating principle

The system should actively seek better evidence.

If an important region is UNKNOWN and a connected sensor/robot can inspect it, WaveRadar may recommend or request that observation. This creates a closed-loop **sense -> understand -> act -> verify** architecture.

## Absolute priority order

1. Physical Android sensor validation.
2. Stable coordinate/time synchronization.
3. Deterministic replay.
4. Multi-device cooperative localization.
5. Dynamic traversability and route safety.
6. Environmental hazard fusion.
7. External thermal/mmWave/UWB/depth adapters.
8. Active sensing/robot handoff.
9. Open interoperability endpoints.
10. OpenXR/HMD presentation.
11. Quantified field trials.
12. Commercial/pilot deployment.

## Non-negotiable truth boundary

WaveRadar must never:
- fabricate measurements
- turn simulation into live evidence
- label inference as measurement
- claim ordinary phones can see through walls
- present an estimated body reconstruction as measured anatomy
- infer identity, intent, dangerousness, personality, gender, mental state, or neural state from ordinary sensor data
- hide stale/conflicting evidence

When evidence is insufficient, the correct output is UNKNOWN.

## North-star capability

The long-term goal is not "see through walls."

It is:

**Build the best continuously updated, evidence-ranked operational picture possible from every validated source available — and tell the responder exactly where the picture is strong, weak, stale, or unknown.**

That architecture can support firefighters first and later police, EMS, industrial rescue, disaster response, maritime rescue, security, robotics, and other high-consequence environments without changing the core evidence model.
