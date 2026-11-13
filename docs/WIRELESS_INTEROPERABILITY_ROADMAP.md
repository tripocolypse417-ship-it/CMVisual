# WaveRadar Wireless Interoperability and Experimental Technology Roadmap

**Status:** Architecture proposal and research backlog. No new radio capability is validated by this document.
**Scope:** WaveRadar OS, WIS command center, firefighter/robot/drone interfaces, and the Research & Validation Lab.
**Constraints:** Prefer open standards, open-source tooling, no-cost evaluation paths, local-first operation, and reversible integration.

## 1. Objective and operating principle

WaveRadar should connect heterogeneous radios, networks, sensors, gateways, robots, drones, and external infrastructure through one capability-aware interoperability layer. It must not depend on one carrier, radio vendor, cloud provider, phone model, or autonomous-agent platform.

Keep two planes distinct:
- **Connectivity plane:** discovers devices and transports data over available wired and wireless links.
- **Evidence and capability plane:** determines what a source actually measured, its provenance, calibration, uncertainty, freshness, coordinate/time reference, and eligibility for a specific operational use.

A successful connection is not proof of sensing capability. RSSI is not a reliable distance measurement. A radio reflection is not automatically a person, victim, wall map, or life sign. All inferences retain their method, limitations, uncertainty, and independent validation state.

## 2. Ranked technology portfolio

| Priority | Technology | WaveRadar role | Adoption posture |
|---|---|---|---|
| P0 | Wi-Fi 6/6E/7, Ethernet, cellular, Bluetooth LE | Immediate multi-link transport, local discovery, sensor gateways, fallback connectivity | Integrate through supported OS/network APIs; discover capability at runtime |
| P0 | IEEE 802.11bf Wi-Fi sensing (CSI/BFI and supported procedures) | Research-grade motion/presence cues and environmental context | Build a lab adapter and reproducible harness; no victim-detection or through-wall claim without independent evidence |
| P0 | UWB secure ranging (IEEE 802.15.4z-capable hardware) | Local range/coordinate references for tagged personnel, equipment, robots, and anchors | High-value controlled pilot; require surveyed anchors, NLOS detection, and ground truth |
| P1 | Bluetooth Core 6.x Channel Sounding | Short-range secure fine ranging between compatible wearables, tags, phones, and anchors | Optional adapter; use PBR/RTT and quality indicators; never silently substitute RSSI |
| P1 | Private 5G / 5G-Advanced, RedCap, sidelink and network positioning | Incident-area connectivity, device-to-device links, sensor backhaul, potential positioning | Integrate when carrier/private infrastructure exists; preserve local-first operation |
| P1 | Wi-Fi HaLow (802.11ah) | Longer-range, lower-power telemetry for fixed environmental sensors | Prototype for low-rate sensors, not video or high-throughput payloads |
| P1 | Wi-Fi mesh / Bluetooth LE Mesh / Thread | Local resilient sensor and gateway networking | Interoperate through gateways; explicitly model hops, congestion, and partitions |
| P2 | Wi-Fi 8 (802.11bn) | Future high-reliability multi-AP/peer coordination and robotics networking | Track draft and silicon maturity; no production dependency or procurement assumption yet |
| P2 | Cellular Integrated Sensing and Communication (ISAC), 6G research | Potential network-assisted motion/object sensing and infrastructure awareness | Research only; specialised infrastructure required; complement dedicated radar |
| P2 | Integrated mmWave / 60 GHz radar and passive RF sensing | Dedicated short-range motion/occupancy experiments | Separate sensor modality with calibration and blind-spot tests; distinguish active radar from network sensing |
| P2 | LEO satellite / non-terrestrial networks | Backhaul when terrestrial networks are unavailable | Optional external backhaul; no assumption of indoor availability or continuous service |
| Research | Ambient power communications, energy-harvesting tags, wake-up radios | Ultra-low-power sensor discovery and periodic status | Monitor standardisation and prototypes; never make them safety-critical dependencies |
| Research | SDR, passive radar, opportunistic RF tomography | Experimental signal capture and algorithm research | Receive-only or shielded/lawful test environment; no unauthorised transmission |

### Why these are the strongest candidates

1. **802.11bf is a published IEEE amendment** for WLAN sensing in supported bands and PHY families. This creates a standards-based research path, but does not mean arbitrary commodity APs expose CSI or sensing reports.
2. **UWB and Bluetooth Channel Sounding provide ranging primitives**, unlike RSSI-only proximity guesses. They still require compatible hardware, calibration, multipath/NLOS rejection, and independent validation.
3. **5G/5G-Advanced and private cellular are connectivity multipliers**, not universal coverage guarantees. They may require carrier agreements or dedicated infrastructure.
4. **Wi-Fi HaLow and mesh are complementary:** HaLow targets lower-rate, longer-range, lower-power sensor links; mesh can extend local coverage but introduces routing and partition risks.
5. **Wi-Fi 8 and cellular ISAC are strategic research tracks**, not production prerequisites. Draft status, specialised hardware, and deployment requirements must be represented accurately.

## 3. Vendor-neutral adapter architecture

Every adapter must report, where available:
- Transport ID, technology, standard/version, vendor, hardware model, firmware version.
- Discovery, connection, authorization, capability, and operational-eligibility states as separate fields.
- Supported bands, channel, bandwidth, PHY, link quality, packet loss, latency, and jitter.
- Measurement types/units, sample rate, timestamp source, clock uncertainty, coordinate frame.
- Calibration ID/status, validation status, known limitations, source identity, data origin, consent scope.
- Cryptographic integrity, access-control scope, and retention policy.

Publish separate lifecycle events for discovery, pairing, authorization, transport readiness, measurement availability, and validated operational eligibility. Never collapse them into a single connected flag.

### Common append-only observation envelope

Every wireless observation should carry:
- Unique event/source IDs and monotonic sequence number where available.
- Original timestamp, receive timestamp, clock domain, and estimated time uncertainty.
- Raw payload pointer/hash plus decoder and adapter versions.
- Measurement name, value, unit, coordinate frame, and reference point.
- Radio metadata: technology, band/channel, PHY, link, antenna/anchor geometry where available.
- Quality metrics: packet loss, jitter, SNR/RSSI where applicable, multipath/NLOS, stale/outlier flags.
- Evidence class: MEASURED, DERIVED, INFERRED, PREDICTED, SIMULATED, or UNKNOWN.
- Validation state: UNVERIFIED, LAB_TESTED, FIELD_TESTED, INDEPENDENTLY_REPLICATED, or DEGRADED.
- Provenance, consent, access-control, retention, and audit references.

Raw payloads must never be overwritten by cleaned, fused, or model-generated results. Corrections and exclusions are new linked records.

## 4. Fusion, security, and fail-safe rules

- Preserve original clock domains and uncertainty. Do not imply precision synchronisation from ordinary phone timestamps.
- Transform spatial measurements only when coordinate frame, anchor survey, pose source, and transform uncertainty are known.
- Fuse modalities only after per-source quality gates. Missing data must not be silently imputed as a positive observation.
- Keep independent evidence streams visible beside every fused estimate; record contributors and rejected sources.
- Apply robust outlier rejection and explicit NLOS/multipath handling for UWB, Bluetooth ranging, Wi-Fi FTM, and CSI-derived estimates.
- Prioritise command/control and safety telemetry; throttle or defer video and bulk uploads under congestion.
- Support store-and-forward, local incident mesh, reconnection reconciliation, and offline-first operation.
- A model-generated location, victim count, injury diagnosis, or hazard label must never become a measured fact.
- No wireless-only modality may independently authorise entry, declare an area clear, or establish victim presence until that specific claim passes independent validation.
- Require authenticated pairing, least-privilege authorisation, replay protection, key rotation/revocation, signed firmware where supported, and compromised-node isolation.

## 5. Research and validation plan

### Track A — Wi-Fi sensing / 802.11bf / CSI

1. Inventory AP/chipset/firmware/driver support and whether CSI/BFI/sensing reports are actually exposed.
2. Establish controlled geometry and independently surveyed ground truth for human/robot motion and static clutter.
3. Vary distance, orientation, materials, AP placement, channel width, interference, packet loss, jitter, and network load.
4. Compare baseline signal features and open algorithms; evaluate detection separately from classification and localisation.
5. Test false positives from fans, HVAC, moving doors, animals, multiple people, and RF interference.
6. Publish raw data, environment metadata, protocol versions, code, confidence intervals, and negative results.

### Track B — UWB and Bluetooth Channel Sounding

1. Select standards-compliant evaluation kits with documented ranging support.
2. Survey anchors with independent physical ground truth; record antenna orientation, height, geometry, and clock status.
3. Test line-of-sight and NLOS across concrete, metal, glass, stairwells, vehicles, and moving bodies.
4. Compare UWB, Bluetooth Channel Sounding PBR/RTT, RSSI-only baselines, and optical/laser reference measurements.
5. Test spoofing, relay, replay, anchor movement, clock drift, battery depletion, and device loss.
6. Report median and tail error, availability, false-range rate, drift, calibration, and failure detection—not best-case accuracy alone.

### Track C — Resilient incident networking

1. Build a local-first simulator/test harness for Wi-Fi APs, mesh, BLE, private cellular, and gateway loss.
2. Measure packet delivery, end-to-end latency, jitter, handover time, congestion, range, power, and recovery after partition.
3. Verify that video and bulk uploads cannot starve command/control and safety telemetry.
4. Test authentication, key rotation, device revocation, replay protection, signed firmware, and compromised-node isolation.
5. Verify evidence continuity and duplicate-safe reconciliation after offline operation.

### Track D — ISAC, mmWave and SDR

1. Evaluate open research frameworks and published datasets before hardware procurement.
2. Reproduce baselines under packet loss, timing jitter, multipath, and interference.
3. Compare cellular ISAC claims with dedicated radar and independent ground truth.
4. Use receive-only or shielded configurations unless spectrum authorisation explicitly permits transmission.
5. Treat prototype results as research evidence until independently replicated.

## 6. Research references

- IEEE 802.11 working group status and amendments: https://grouper.ieee.org/groups/802/11/
- IEEE 802.11bf-2025 Wireless LAN Sensing: https://standards.ieee.org/ieee/802.11bf/11574/
- NIST open-source 802.11bf evaluation under packet loss and timing jitter: https://www.nist.gov/publications/open-source-framework-ieee-80211bf-evaluation-under-lossy-and-jittery-conditions
- NIST 802.11bf sensing performance study: https://www.nist.gov/publications/sensing-performance-ieee-80211bf-protocol-and-its-impact-data-communication
- Bluetooth SIG Channel Sounding technical overview: https://www.bluetooth.com/channel-sounding-tech-overview/
- Bluetooth SIG Core 6.3 feature update: https://www.bluetooth.com/blog/just-released-bluetooth-core-6-3/
- Wireless Broadband Alliance Wi-Fi 8 (802.11bn) work: https://wballiance.com/wi-fi-8/
- Wireless Broadband Alliance 2026 Wi-Fi outlook: https://wballiance.com/wireless-broadband-alliance-reveals-its-wi-fi-predictions-for-2026-and-beyond/

Open-source simulation and SDR tools must be screened for licence, maintenance, hardware needs, reproducibility, and security before adoption. Open source alone is not an approval criterion.

## 7. Delivery sequence

**Phase 0 — Inventory and capability truth**
- Enumerate current Android, browser, server, and hardware radio capabilities using runtime discovery.
- Produce a compatibility matrix distinguishing OS API, chipset, driver exposure, permission, and actual sample arrival.
- Treat the current phone as a baseline device only; do not assume UWB, Wi-Fi CSI export, Wi-Fi RTT modes, or Bluetooth Channel Sounding support.

**Phase 1 — Common transport and evidence contracts**
- Define adapter interfaces and the common observation envelope.
- Add mock adapters and deterministic replay fixtures.
- Add offline buffering, provenance, clock uncertainty, and security tests.
- Keep existing data sources working during migration.

**Phase 2 — Low-cost research pilots**
- Wi-Fi sensing using accessible research hardware or public datasets.
- UWB and Bluetooth Channel Sounding using loaned, donated, or institutional kits.
- Mesh/failover tests using existing phones, routers, and development boards where supported.
- Use simulation and public datasets before procurement.

**Phase 3 — Independent physical validation**
- Assign protocols to external labs, universities, fire-service research partners, or independent reviewers.
- Require pre-registered metrics, physical ground truth, blinded trials where practical, negative controls, repeatability, and independent replication.
- Keep operational claims disabled until pre-defined gates pass.

**Phase 4 — Operational integration**
- Enable only validated capabilities for the relevant mission and hardware profile.
- Retain fallbacks, explicit degraded modes, and human-readable limitations.
- Never require experimental wireless technologies for basic dispatch, communications, or firefighter safety.

## 8. Acceptance gates

A radio integration is incomplete until it has:
1. Documented standard and implementation version.
2. Hardware/firmware/driver compatibility evidence.
3. Permission, authorisation, and security model.
4. Repeatable sample-arrival and timestamp tests.
5. Packet loss, jitter, congestion, multipath/NLOS, and interference characterisation.
6. Independent physical ground truth for each ranging, localisation, or sensing claim.
7. Calibration, uncertainty, false-positive/false-negative, and failure-mode reporting.
8. Offline and degraded-mode tests.
9. Append-only provenance and audit trail.
10. Independent review before operational promotion.

**No accuracy, range, detection, or life-safety claim is approved by this roadmap.** It establishes an integration strategy and test plan; capability status must come from reproducible evidence.