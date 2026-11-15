# WaveRadar Sensor, Scanner & World Model Technology Register

**Prepared:** 2026-10-30  
**Status:** Research taxonomy and architecture guidance; not a claim that any listed sensor is integrated, available, or validated in WaveRadar.

## 1. Architecture rule

Every sensor, scanner, dataset, operator input, or model output is an observation source. It must enter through a versioned adapter and a common evidence envelope. No scanner writes directly into the World Model. No single sensor is required for the whole system to function.

Each adapter reports separately: hardware present; OS/driver/API support; permission state; calibration state; runtime readiness; sample arrival; sample freshness; data quality; and validation status. Capability is not measurement, measurement is not accuracy, and accuracy is not operational safety.

## 2. Scanner and sensing technology families

| Family | Technologies / examples | Potential contribution | Main constraints and failure modes |
|---|---|---|---|
| Visible optical | RGB camera, wide/telephoto, low-light, high-frame-rate, global-shutter, stereo camera | Scene imagery, object detection, visual features, operator view, stereo depth | Smoke, darkness, glare, occlusion, motion blur, heat, lens contamination, exposure and focus limits |
| Infrared / thermal | LWIR thermal cameras, MWIR thermal cameras, near-IR, short-wave IR, multispectral and hyperspectral imaging | Heat patterns, hot surfaces, temperature-related scene cues, material/spectral signatures | Thermal saturation, emissivity/reflection, glass effects, range/resolution limits, calibration; thermal imaging does not establish a person behind an opaque wall |
| Depth / optical ranging | Time-of-flight, structured light, active stereo, passive stereo, flash depth, RGB-D | Surface distance, local geometry, obstacle shape, room reconstruction | Reflective/absorptive surfaces, ambient light, range limits, smoke/particles, calibration, device-specific APIs |
| Laser scanning | Spinning LiDAR, solid-state LiDAR, flash LiDAR, terrestrial laser scanner, handheld/mobile LiDAR | Dense point clouds, geometry, mapping, obstacle and surface models | Cost, size, eye-safety, scan motion, reflective/transparent surfaces, occlusion, sparse returns through smoke or dust |
| Radar | FMCW radar, mmWave radar, UWB radar, short-range radar, imaging radar | Range, velocity, motion, coarse geometry, possible non-line-of-sight research | Multipath, clutter, material dependence, antenna geometry, regulatory limits, ambiguity; presence inference requires controlled ground truth |
| Radio / wireless | Wi-Fi RTT, Wi-Fi CSI, Bluetooth RSSI, Bluetooth AoA/AoD, UWB ranging/anchors, cellular positioning, RFID | Range or proximity constraints, anchor-based location, channel-state changes, device/network context | Requires compatible radios, anchors/responders, driver/API access, calibration, line-of-sight/multipath characterization; ordinary Android apps may not expose CSI |
| Inertial / orientation | Accelerometer, gyroscope, magnetometer/e-compass, IMU, sensor hub | Motion, angular rate, orientation constraints, dead reckoning input | Bias, drift, vibration, magnetic disturbance, timestamp skew; accelerometer alone is not absolute position or full 6-DoF pose |
| Environmental / altitude | Barometer, temperature, humidity, pressure, particulate/smoke, air velocity | Floor-change clues, environmental context, conditions and sensor health | Calibration, lag, placement, pressure changes, contamination; barometric altitude is not a reliable floor identifier without context |
| Gas / chemical / safety | CO, HCN, O2, H2S, VOC, combustible-gas, electrochemical, photoionization, radiation | Hazard detection and atmosphere monitoring | Sensor-specific response time, cross-sensitivity, poisoning, calibration, consumables, certification and PPE integration; must not be replaced by camera/AI guesses |
| Acoustic / ultrasound | Microphone arrays, beamforming, passive acoustic event detection, ultrasonic ranging | Alarm/speech/event cues, direction estimates, active ranging in suitable environments | Reverberation, machinery/fire noise, attenuation, privacy, synchronization, uncertain source localization |
| Position / navigation | GNSS multi-constellation, A-GNSS, RTK, PPK, inertial navigation, surveyed fiducials, optical markers | Outdoor position, absolute references, localization constraints | GNSS weak/unavailable indoors, multipath, coordinate datum errors, drift, marker visibility and survey quality |
| Building / site context | IFC/BIM, CAD, floor plans, GIS, CityGML, IndoorGML, survey control, utility plans | Prior geometry, room/door/shaft semantics, navigation graph, hazard and asset context | Stale or incomplete plans, wrong datum/scale, renovations, access restrictions, uncertain as-built alignment |
| Human / operator input | Manual markers, voice reports, team status, incident command annotations, measured tape/survey references | Ground truth, corrections, task context, shared incident state | Human error, delayed reports, ambiguous coordinates, training and attribution requirements |
| Model-derived sensing | Computer vision, segmentation, depth estimation, tracking, occupancy inference, prediction, SLAM | Derived/inferred/predicted scene structure and hypotheses | Domain shift, smoke/low-light degradation, model uncertainty, compute load, false positives; never relabel model output as measured |

## 3. Shared World Model domains

Use one canonical model for field view, command center, admin, replay, and research. Initial entity domains:

- Building, site, floor, room, zone, doorway, stairwell, corridor, shaft, and navigable connection.
- Surface, point cloud, mesh, obstacle, traversable region, boundary, and occlusion.
- Hazard, environmental condition, equipment, asset, exit, refuge, and route segment.
- Person/presence hypothesis, team member, device, sensor, and operator annotation.
- Observation, derived feature, inference, prediction, conflict, unavailable capability, and validation result.

Every entity has a stable ID, entity type, schema version, version/revision, coordinate reference, geometry/semantics, update time, source-event lineage, uncertainty, and status. Geometry must not lose its source or coordinate transform when converted between representations.

## 4. Canonical observation envelope

Minimum fields at the ingestion boundary:

- `eventId`, `sessionId`, `deviceId`, `sourceId`, `adapterId`, `adapterVersion`, `schemaVersion`, sequence number.
- `observedAt`, `receivedAt`, source clock quality, timestamp uncertainty, and synchronization method.
- modality, sensor family, sensor model/serial where lawful, firmware/driver/API version, capability state.
- coordinate frame, transform/calibration IDs, reference datum, units, and measurement value.
- evidence class: `MEASURED`, `DERIVED`, `INFERRED`, `PREDICTED`, `SIMULATED`, `UNKNOWN`, `UNAVAILABLE`.
- observation state: `CURRENT`, `STALE`, `HISTORICAL`, `QUARANTINED`, `CONFLICT`, `UNVALIDATED`, `UNKNOWN`, `UNAVAILABLE`.
- confidence (when statistically meaningful), uncertainty and its definition, quality flags, raw evidence reference/digest, and provenance/parent event IDs.

Missing values remain missing. `UNAVAILABLE` is not numeric zero. A receive timestamp is not a substitute for a measurement timestamp. Unknown coordinate frames are not silently transformed. Conflicting sources are retained as conflicts until an explicit method resolves them.

## 5. Fusion pipeline

1. Discover capability and permissions without claiming that a measurement exists.
2. Capture raw observation and immutable metadata; hash raw payloads where applicable.
3. Validate schema, units, timestamp, clock quality, sensor state, and calibration.
4. Align time and coordinate frames with documented transforms and uncertainty.
5. Apply modality-specific processing: image features, point-cloud registration, radar tracking, RF ranging, inertial filtering, environmental thresholds, or operator reference.
6. Associate observations only when temporal/spatial gates and provenance permit; preserve disagreement and alternatives.
7. Update versioned World Model entities with source-event lineage and uncertainty.
8. Deliver role-specific views and synchronized replay from the same versioned model.
9. Keep model-derived outputs separate from raw measured observations; corrections create new attributed events.
10. Promote a capability only after independent validation, safety review, and explicit versioned approval.

## 6. Open standards and formats to prefer

| Standard / format | Use | Why it belongs in the architecture |
|---|---|---|
| OGC SensorThings API 1.1 | Sensor metadata and observation exchange | Vendor-neutral, geospatially enabled observation model; optional transport/import-export, not the canonical WaveRadar evidence contract |
| OGC IndoorGML 2.0 | Indoor spaces and navigation topology | Represents indoor spaces, connectivity, and navigation networks; useful for routing and room/door relationships |
| buildingSMART IFC 4.3 | Building/infrastructure BIM exchange | Vendor-neutral open standard for machine-readable built-asset descriptions |
| OGC CityGML 3.0 | 3D city/building semantic model | Reusable semantic/geometric model for buildings and urban context |
| OGC 3D Tiles 1.1 | Streaming large 3D scenes, BIM/CAD-derived content, photogrammetry, point clouds | Suitable delivery/visualization layer for large command-center scenes; not a database or sensor-fusion algorithm |
| LAS 1.4 / LAZ 1.4 | LiDAR point-cloud exchange and lossless compression | Open formats for point-cloud transfer across hardware and processing tools |
| GeoJSON | 2D vector feature exchange | Simple interchange for site boundaries, routes, markers, and map features; preserve 3D/CRS limitations explicitly |
| glTF | Runtime 3D asset delivery | Efficient rendering format for meshes/materials; keep semantic and provenance data in sidecar/model records |

## 7. Open-source engine candidates — not selected

- RTAB-Map: RGB-D, stereo, and LiDAR graph-based SLAM. Its permissive BSD route depends on building OpenCV without the nonfree module; review exact build configuration and dependencies.
- Open3D: point-cloud processing, reconstruction, registration, and visualization under MIT. Better suited initially to research/edge/command-side processing than a low-end phone runtime.
- ORB-SLAM3: visual, visual-inertial, RGB-D, and multi-map SLAM under GPLv3. Legal review is required before distributing it as part of a proprietary product.
- OpenVINS: filter-based visual-inertial estimation under GPLv3. Requires a suitable calibrated camera/IMU stream; legal and hardware feasibility review first.

Do not add any of these merely because they are open source. Benchmark runtime, battery, heat, latency, memory, failure behavior, calibration, Android compatibility, maintenance, dependencies, and licensing on representative hardware.

## 8. Device-specific baseline: Moto G Play (2024)

Motorola's official published sensor list names accelerometer, proximity, ambient light, sensor hub, e-compass, and barometer; it does not list a gyroscope. Google’s current ARCore supported-device table does not contain an exact Moto G Play (2024) model entry. This does not prove a specific hardware failure, but ARCore-certified motion tracking should not be a required test assumption for this handset.

Use the handset for camera pipeline, enumerated sensors, GPS/network context, UI, local queue, evidence integrity, and offline shell tests. Enumerate the actual sensor list at runtime. Treat gyro as unknown until observed. Treat native AR pose as unavailable unless a supported provider supplies real samples. Visual feature tracking may be evaluated experimentally, with drift and uncertainty reported; it is not automatically a validated pose source.

## 9. Validation gates by technology

- Capability gate: hardware/API/permission/registration/sample arrival are separately demonstrated.
- Calibration gate: sensor calibration and coordinate transform are recorded and repeatable.
- Bench gate: known inputs, controlled distances/angles/materials, repeatable collection.
- Ground-truth gate: independent reference matched to the specific claim.
- Environment gate: relevant smoke, heat, dust, moisture, vibration, lighting, obstruction, multipath, and network conditions.
- Statistical gate: preregistered metrics, sample-size rationale, uncertainty intervals, failure analysis, and repeatability.
- Independent review gate: reviewer independence, conflicts, deviations, immutable evidence package.
- Operational gate: human factors, fail-safe/abstention, cybersecurity, privacy, interoperability, and department approval.

## 10. Standards and project references

- OGC SensorThings: https://www.ogc.org/standards/sensorthings/
- OGC IndoorGML: https://www.ogc.org/standards/indoorgml/
- buildingSMART IFC: https://www.buildingsmart.org/standards/bsi-standards/industry-foundation-classes/
- OGC CityGML: https://www.ogc.org/standards/citygml/
- OGC 3D Tiles: https://www.ogc.org/standards/3DTiles/
- OGC LAS / LAZ: https://www.ogc.org/standards/las/
- RTAB-Map: https://introlab.github.io/rtabmap/
- Open3D: https://www.open3d.org/
- ORB-SLAM3: https://github.com/UZ-SLAMLab/ORB_SLAM3
- OpenVINS: https://docs.openvins.com/
- Google ARCore supported devices: https://developers.google.com/ar/devices
- Motorola Moto G Play (2024) specifications: https://en-us.support.motorola.com/app/answers/detail/a_id/177738/~/specifications--moto-g-play-%25282024%2529

## 11. Explicit limitations

This register is a research taxonomy and architecture guide. It does not establish that WaveRadar has any thermal, LiDAR, radar, UWB, Wi-Fi CSI, gas, acoustic, through-wall, or other advanced sensing capability. It does not establish any sensor accuracy, victim detection, building mapping performance, certification, deployment, or rescue outcome. Each capability requires its own adapter, hardware proof, controlled protocol, independent ground truth, and promotion decision.
