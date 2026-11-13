# WaveRadar Wireless Interoperability & Sensing Roadmap

**Prepared:** 2026-11-13  
**Status:** Proposed architecture and research/integration plan. This document does not claim that listed radios are present, integrated, validated, or suitable for life-safety use.

## 1. Objective

Connect every authorized and technically compatible radio, sensor, responder device, apparatus gateway, building system, drone payload, and remote data source to one WaveRadar evidence pipeline without making any single radio, carrier, vendor, access point, cloud service, or sensor mandatory.

The goal is not to declare one radio the winner. It is to combine complementary technologies:
- **Communications:** move command, telemetry, voice/video references, alerts, and evidence packages.
- **Ranging/localization:** measure distance, angle, time-of-flight, and peer geometry when supported.
- **RF sensing:** study channel changes, Doppler, multipath, and other signal features as environmental observations.
- **Dedicated sensing:** ingest radar, thermal, depth, LiDAR, GNSS, inertial, acoustic, gas, and environmental measurements.
- **Time and trust:** synchronize observations, authenticate sources, preserve provenance, and expose uncertainty.

These are distinct functions. A connection is not a range measurement; a range is not a bearing; a bearing is not a 3D position; an RF anomaly is not a confirmed person; a person/presence hypothesis is not a confirmed victim.

## 2. Recommended technology portfolio

| Priority | Technology | WaveRadar role | Adoption decision |
|---|---|---|---|
| P0 | Android Ranging API (Android 16 / API 36+) | One platform interface for supported UWB, BLE Channel Sounding, Wi-Fi NAN RTT and Bluetooth RSSI ranging | Implement as a capability-discovered adapter where the OS and hardware expose it. Retain older Android fallbacks. |
| P0 | Wi-Fi RTT / FTM (IEEE 802.11mc) and 802.11az | Measured range to compatible access points and Wi-Fi Aware peers; multi-anchor geometry where surveyed anchor positions exist | Keep as a high-priority, testable ranging path. Require compatible endpoints, permission, fresh results, anchor coordinates and NLOS/quality flags. |
| P1 | UWB (IEEE 802.15.4z; FiRa profiles) | Secure fine ranging between equipped firefighters, apparatus, drones and fixed anchors | Preferred precision-ranging option when the hardware/anchor ecosystem is available. Build interoperable external tags/anchors; do not assume phone UWB. |
| P1 | Bluetooth LE Channel Sounding (Bluetooth Core 6.0+) | Secure peer distance estimation using phase-based ranging and/or RTT; low-power wearable/tag links | Add as a separate ranging adapter, not as RSSI. Require compatible controllers at both endpoints and device-specific calibration/bench testing. |
| P1 / research | Wi-Fi sensing / CSI (IEEE 802.11bf-2025) | Environmental channel-change features, motion/presence research, bistatic/multistatic sensing | Add a lab-only CSI ingestion and evaluation path first. Do not expose human/victim detection as operational until independently validated. |
| P1 | Wi-Fi Aware / NAN, Wi-Fi Direct, BLE discovery | Nearby device/service discovery and out-of-band setup for ranging and sensor links | Use for discovery/transport negotiation only; authenticate every peer and keep discovery separate from evidence trust. |
| P1 | Cellular LTE/5G and private 5G; authorized public-safety broadband gateways | Wide-area backhaul, command/data transport, edge processing and apparatus connectivity | Use as one transport path with local-first operation and explicit network-quality state. Do not replace mission-critical land-mobile radio (LMR/P25) voice systems. |
| P2 | LoRaWAN | Low-rate, low-power status and environmental telemetry from distributed nodes | Optional supplemental telemetry through a gateway. It is a star-of-stars LPWAN, not a general-purpose peer mesh; unsuitable for video, rich sensor streams or time-critical voice. |
| P2 / research | 5G-Advanced, NTN satellite links, 3GPP ISAC and future 6G ISAC | Resilient backhaul and future network-native sensing research | Track standards and testbed maturity. Keep satellite/NTN as a transport path and ISAC as research until commercial device/network access and ground-truth performance are demonstrated. |
| P2 | Dedicated FMCW mmWave radar modules (e.g., 24/60 GHz class, depending on certified module and jurisdiction) | Direct radar range/Doppler/angle observations from an actual radar front end | Prefer documented modules with raw/low-level outputs and reproducible calibration. Never infer radar capability from a phone's Wi-Fi/Bluetooth radio. |
| Research only | SDR and experimental waveforms | Protocol interoperability experiments, spectrum diagnostics and controlled RF research | Lab-only by default. Enforce spectrum, licensing, transmit-power, interference, and public-safety communications rules; no unauthorized transmission or interference. |

### Why these technologies

- IEEE published **802.11bf-2025** as an active Wi-Fi sensing standard in September 2025. It makes Wi-Fi sensing a standards-based research/integration target, but the existence of a standard does not establish device support or field accuracy. [IEEE 802.11bf-2025](https://standards.ieee.org/ieee/802.11bf/11574/)
- NIST published an open-source 802.11bf evaluation framework in May 2026 specifically examining loss and jitter. WaveRadar should adopt this impairment-aware mindset: RF sensing must be tested under congestion, packet loss, interference and timing jitter, not just clean lab conditions. [NIST framework](https://www.nist.gov/publications/open-source-framework-ieee-80211bf-evaluation-under-lossy-and-jittery-conditions)
- Android's Ranging module (API 36) provides a unified interface for technologies including UWB, Bluetooth Channel Sounding, Wi-Fi NAN RTT and Bluetooth RSSI ranging. It also exposes capability/availability and documents session, permission and background restrictions. This is the preferred Android abstraction where present, not a promise that every phone supports every radio. [Android Ranging](https://developer.android.com/develop/connectivity/ranging)
- Android Wi-Fi RTT supports ranging to compatible APs and Wi-Fi Aware peers; Android documents typical 1–2 m performance in supported configurations and 802.11az non-trigger-based support from Android 15. Actual WaveRadar performance must be measured in the target building/device configuration. [Android Wi-Fi RTT](https://developer.android.com/develop/connectivity/wifi/wifi-rtt)
- Bluetooth Core 6.0 introduced Channel Sounding for secure fine ranging. It uses phase-based ranging and RTT methods and depends on both endpoints' controller/stack support; it is not equivalent to RSSI proximity. [Bluetooth Core 6.0 overview](https://www.bluetooth.com/core-specification-6-feature-overview/)
- Android UWB integration requires actual UWB hardware and compatible peers; Android documents FiRa-compatible peer support and secure session setup. [Android UWB](https://developer.android.com/develop/connectivity/uwb)
- LoRaWAN is designed for low-power IoT connectivity and uses a star-of-stars architecture with gateways. It is useful for sparse telemetry, not a replacement for broadband, peer-to-peer mesh, or voice. [LoRa Alliance](https://lora-alliance.org/lorawan-for-developers/)
- FirstNet Authority's November 2026 update reports Release 19 public-safety-related work, including NTN coverage and multi-hop relay, and ongoing studies for GNSS-resilient NTN and integrated sensing/communications. These are roadmap signals, not capabilities that WaveRadar can assume are deployed. [FirstNet Authority / 3GPP Release 19](https://www.firstnet.gov/newsroom/blog/3gpp-completes-release-19-while-progress-begins-6g-work)
- The Next G Alliance's November 10, 2026 work advances ISAC channel measurement and modeling toward practical prototypes; treat 6G ISAC as a research track, not a current field sensor. [ATIS / Next G Alliance](https://atis.org/press-releases/next-g-alliance-advances-integrated-sensing-and-communications-for-6g/)

## 3. Unified WaveRadar radio architecture

All radio adapters must publish into the existing canonical observation and World Model pipeline. Do not build a separate world model per radio.

### Layers

1. **Hardware and platform discovery**
   - Enumerate radios, chip/driver/firmware version, OS/API support, antenna configuration where available, and device role.
   - Record support, permission, registration, session state, sample arrival, freshness, calibration, and validation separately.
   - A declared feature or installed adapter is not proof of an operational radio.

2. **Radio adapters**
   - Separate adapters for Wi-Fi RTT/802.11az, Wi-Fi CSI/802.11bf, UWB, BLE Channel Sounding, BLE RSSI/AoA, cellular/network quality, LoRaWAN gateway telemetry, satellite/NTN transport, and dedicated radar modules.
   - Adapters must be replaceable and must not write directly to the World Model or bypass the evidence envelope.
   - Android API 36+ Ranging should be preferred when it provides the required supported operation; retain capability-gated native adapters for older devices and specialized hardware.

3. **Transport and discovery**
   - Support local event ingress, authenticated local network/WebSocket transport, USB/serial gateways, and approved network/cloud relay.
   - Use Wi-Fi Aware/BLE for discovery and out-of-band session setup where supported.
   - Separate data-plane transport from command/control. A drone's sensor feed may be ingested without granting WaveRadar drone flight-control authority.
   - Queue and preserve evidence locally during network loss; synchronize later with sequence numbers and duplicate detection.

4. **Canonical radio observation envelope**
   Each radio result must carry:
   - observation ID; source device, radio, adapter and firmware identifiers;
   - standard/protocol, band/channel, PHY/mode, peer/anchor IDs and authenticated identity;
   - source timestamp, receive timestamp, monotonic clock, estimated clock offset and synchronization uncertainty;
   - measurement type (RSSI, RTT, phase, CSI/CIR, AoA/AoD, Doppler, range, network quality, etc.), raw units and normalized units;
   - raw payload reference or digest, calibration and processing version;
   - evidence class, measured/derived/inferred status, uncertainty/covariance, quality flags and environmental context;
   - LOS/NLOS assessment only when an explicit method supports it; otherwise UNKNOWN;
   - permission/consent scope, security/session status and chain-of-custody metadata.

5. **Fusion and world-model integration**
   - Normalize units, clocks and coordinate frames without overwriting source values.
   - Convert range-only observations into geometric constraints, not standalone positions. A 2D/3D position requires enough independent geometry, surveyed anchors, clock quality and a stated estimator/uncertainty.
   - Fuse modalities only when time, spatial frame, independence, provenance and quality gates pass.
   - Preserve disagreement as CONFLICT; do not average away contradictory observations.
   - Keep RSSI, CSI, RTT, UWB, BLE Channel Sounding, radar, GNSS and IMU as distinguishable evidence sources.
   - Store the transformation graph from raw packet/measurement to derived feature, track, hypothesis, route and display item.

6. **Command, helmet and research consumers**
   - Chief/command view: radio coverage, device/anchor map, link health, measurement freshness, source agreement, uncertainty and degraded zones.
   - Firefighter view: only concise, validated cues with explicit stale/uncertain indicators; no clutter from raw RF features.
   - Replay: reconstruct the time-aligned radio and sensor state, including missing packets, disconnections and contradictory results.
   - Research Lab: access raw/derived paired datasets, calibration records, protocol metadata and blinded ground truth without changing production evidence.

## 4. Security, privacy and resilience requirements

- Require mutual authentication for radios/gateways where the protocol supports it; bind peer identity to key material and device enrollment.
- Use secure ranging modes and fresh session keys where available (including provisioned UWB STS when supported); reject replayed, unauthenticated or stale session data.
- Encrypt data in transit and at rest; minimize personally identifying metadata and define consent, retention and access scopes for device discovery and RF sensing.
- Treat jamming, spoofing, replay, rogue APs, malicious firmware, compromised gateways and clock manipulation as explicit threat cases.
- Detect interference and packet loss; do not automatically increase transmit power or alter licensed/public-safety spectrum behavior.
- Maintain local/offline command and evidence capture. Cellular, Wi-Fi, satellite and LoRaWAN are alternate paths, not single points of failure.
- Keep public-safety LMR/P25 voice systems authoritative for their existing dispatch/voice function unless a department-approved gateway explicitly exposes data to WaveRadar.
- Make RF sensing opt-in, purpose-limited and auditable. Do not infer identity, medical state or victim status from RF signatures.

## 5. Experimental sensing: what may and may not be claimed

| Signal | Permitted near-term interpretation | Not permitted without new validation |
|---|---|---|
| Wi-Fi/BLE RSSI | Link strength / coarse proximity context | Accurate distance, bearing, room, person or victim location |
| Wi-Fi RTT / 802.11az | Measured range to a compatible peer/AP with quality and uncertainty | Full 3D position without sufficient surveyed geometry; reliable NLOS range without demonstrated correction |
| BLE Channel Sounding | Peer-to-peer ranging result from supported endpoints | Universal smartphone compatibility or guaranteed accuracy across devices/environments |
| UWB | Peer/anchor range and, if available, angle with documented uncertainty | Guaranteed through-wall location or exact victim position |
| Wi-Fi CSI / 802.11bf | Experimental channel-response features correlated with controlled environmental changes | Confirmed human/victim detection, breathing detection, identity, injury diagnosis, or reliable through-wall tracking |
| Dedicated mmWave radar | Module-specific range/Doppler/angle observations | Claims beyond the sensor's antenna geometry, range, calibration and tested material/environment envelope |
| Cellular / NTN | Network connectivity and transport/quality metadata; provider-reported location only with explicit provenance | Building interior location or radar-like sensing from ordinary network connectivity |
| LoRaWAN | Low-rate telemetry delivered through an available gateway | Real-time voice/video, high-rate raw sensor streaming, or direct device-to-device mesh |

No experimental modality may promote itself to operational status. Promotion requires the existing validation gates: interface/contract tests, bench calibration, independent ground truth, controlled LOS/NLOS and material/environment trials, statistical uncertainty, repeatability, external review, security/privacy review, and explicit versioned approval.

## 6. Validation program

### Phase A — capability truth and Android compatibility
- Extend native capability discovery to report Android API level, RangingManager availability, Wi-Fi RTT/802.11az, UWB, BLE Channel Sounding, Wi-Fi Aware and permissions separately.
- On every device, record hardware feature, OS support, API availability, permission, peer compatibility, session success, sample arrival and sample freshness as distinct fields.
- Test the existing Moto G Play 2024 baseline as-is; do not assume it has UWB, RTT, BLE Channel Sounding or Android API 36 support. Keep the phone's actual supported feature list as the result.
- Do not mark any capability AVAILABLE merely because a package, manifest flag or code adapter exists.

### Phase B — controlled ranging comparison
- Compare supported Wi-Fi RTT/802.11az, BLE Channel Sounding and UWB against independently surveyed tape/laser or motion-capture ground truth.
- Test multiple distances, orientations, body blocking, smoke (where safe and controlled), concrete/brick/wood partitions, reflective surfaces, moving people, apparatus, antenna placement and interference.
- Report bias, median/95th-percentile absolute error, standard deviation, dropout rate, latency, stale-result rate, repeatability and failure modes by device/firmware/geometry.
- Separate LOS and NLOS datasets. Never pool them without stratified reporting.

### Phase C — Wi-Fi sensing / CSI feasibility
- Use a research-only testbed with known AP/client/NIC chipset and firmware, raw CSI/CIR access, fixed geometry and synchronized ground truth.
- Establish baselines for empty room, static clutter, one moving person, multiple people, apparatus movement, door state, fan/ventilation, multipath changes and interference.
- Follow the NIST loss/jitter evaluation approach; test missing packets, congestion, clock drift and channel changes.
- Blind the model to ground truth during inference; report false positives/negatives and detection limits by environment. No rescue-facing display until independent replication.

### Phase D — resilient connectivity and field integration
- Test Wi-Fi, cellular, approved public-safety broadband gateways, wired/USB and optional satellite paths under handoff, congestion, dead zones, power loss and backhaul failure.
- Add LoRaWAN only for low-rate telemetry with gateway availability and regional RF compliance documented.
- Test store-and-forward integrity, replay protection, duplicate suppression, clock reconciliation and recovery after disconnected periods.
- Keep voice and command fallback under department-approved systems and procedures.

### Phase E — independent acceptance
- Preregister claims, sample-size rationale, primary metrics and exclusion rules.
- Preserve raw packets/measurements, configuration, calibration, software/firmware versions, environment, protocol deviations and all failed runs.
- Use independent reviewers who did not build the adapter or model.
- Publish limitations and negative results; no internal AI or WaveRadar team can certify its own performance.

## 7. Implementation sequence

1. **Architecture contract:** publish this roadmap and map every current wireless ingress to the canonical observation envelope.
2. **Inventory:** inspect current native Android ranging bridge, permissions, adapter status, build workflows and sensor schemas. Preserve existing behavior and data.
3. **Capability registry:** add separate radio capability identifiers and states for support, API, permission, session, sample, freshness, calibration and validation. Do not overload a single boolean.
4. **Android ranging adapter:** implement the Android 16 Ranging API behind a runtime capability check; maintain legacy Wi-Fi RTT/UWB paths where supported. API 36 is an enhancement, not the minimum supported app version.
5. **BLE Channel Sounding adapter:** add only after confirming supported Android API/device chipset and peer hardware; no RSSI substitution.
6. **CSI research adapter:** define a separate lab ingestion contract for raw CSI/CIR and dataset export; do not route experimental CSI into operational person tracks.
7. **External radio gateway contract:** standardize authenticated ingestion from UWB anchors, radar modules, drones, apparatus gateways, LoRaWAN network servers and approved public-safety interfaces.
8. **World Model integration:** add source lineage, coordinate/time transforms, uncertainty propagation and conflict handling for radio observations.
9. **Test harness:** add deterministic simulated fixtures (SIMULATED only), adapter contract tests, hardware-in-the-loop tests and independent ground-truth protocols.
10. **Deployment gate:** no hardware purchase, paid service, production rollout, radio transmission, or live-system cutover without a separate cost/safety/regulatory review and owner approval.

## 8. Device and cost strategy

- Keep the phone as a controller, display, evidence logger and opportunistic sensor host; do not require a flagship phone for the architecture to function.
- Prefer open standards and modular external radio nodes so a department can add UWB anchors, BLE tags, Wi-Fi sensing APs, radar modules, or satellite/cellular gateways independently.
- Start with capability discovery and software test fixtures at zero hardware cost. Use borrowed/lab equipment and institutional testbeds before purchases.
- Do not buy a new phone or radio module solely to make a capability appear available. First verify the exact hardware, driver/API support, interoperability and validation plan.
- Maintain a vendor-neutral adapter interface and exportable evidence format so no manufacturer owns the World Model or research dataset.

## 9. Acceptance criteria

The wireless integration is not complete until:
- every detected radio reports support, permission, session, sample-arrival, freshness, calibration and validation states independently;
- each adapter passes schema, malformed-payload, time, unit, security and offline/recovery contract tests;
- measured ranging results preserve raw provenance and independent uncertainty;
- fusion refuses invalid geometry and retains conflicting or stale sources;
- experimental CSI/ISAC data cannot promote operational capabilities;
- all wireless data can be replayed and exported without vendor-specific tooling;
- field/helmet displays clearly distinguish measured range, inferred location, experimental RF feature, stale data and unavailable coverage;
- independent tests reproduce the stated performance envelope.

## 10. Reference standards and technical resources

- IEEE 802.11bf-2025: https://standards.ieee.org/ieee/802.11bf/11574/
- NIST 802.11bf loss/jitter evaluation framework (2026-05-01): https://www.nist.gov/publications/open-source-framework-ieee-80211bf-evaluation-under-lossy-and-jittery-conditions
- Android Ranging API: https://developer.android.com/develop/connectivity/ranging
- Android Wi-Fi RTT / 802.11az: https://developer.android.com/develop/connectivity/wifi/wifi-rtt
- Android UWB: https://developer.android.com/develop/connectivity/uwb
- Bluetooth Core 6.0 feature overview: https://www.bluetooth.com/core-specification-6-feature-overview/
- LoRa Alliance standards and developer resources: https://lora-alliance.org/lorawan-for-developers/
- FirstNet Authority / 3GPP Release 19 and public-safety 6G research update: https://www.firstnet.gov/newsroom/blog/3gpp-completes-release-19-while-progress-begins-6g-work
- Next G Alliance / ATIS ISAC Phase III announcement (2026-11-10): https://atis.org/press-releases/next-g-alliance-advances-integrated-sensing-and-communications-for-6g/
- ETSI Integrated Sensing and Communications group: https://www.etsi.org/technical-groups/isac/

---

**Decision:** WaveRadar adopts a standards-first, capability-discovered, vendor-neutral radio architecture. Immediate implementation priority is Android Ranging API + backward-compatible Wi-Fi RTT, followed by UWB and Bluetooth Channel Sounding where endpoint support exists. Wi-Fi CSI/802.11bf and network-native ISAC remain separate research tracks until independent evidence justifies promotion.


## 11. Additional 2026 wireless watchlist

These technologies should be tracked as complementary adapters and future research, not as prerequisites for the first deployable WaveRadar OS:

- **Wi-Fi HaLow (IEEE 802.11ah):** evaluate for low-power, longer-range environmental and infrastructure telemetry. Its low-rate IoT role complements Wi-Fi 6/7; it is not a video, voice, or high-rate sensor backbone. Add only through compatible gateway hardware and regional spectrum checks.
- **Wi-Fi 8 / IEEE 802.11bn:** track ultra-high-reliability coordination, multi-AP operation, and peer/robotics use cases. As of the current IEEE working-group status, 802.11bn remains a draft/ballot work item. Do not base field architecture, procurement, or safety claims on draft capabilities.
- **Ambient Power Communications / IEEE 802.11bp work:** monitor the emerging standardisation work for ultra-low-power ambient-powered communication. Potential role is wake-up/status messaging for tags and passive/energy-harvesting sensors; not a dependable primary link until interoperable products and field performance exist.
- **Bluetooth Core 6.3:** track the 2026 feature updates to Channel Sounding, including improved phase-aligned tone transfer and PHY-specific RTT accuracy reporting. The adapter should negotiate actual endpoint capabilities and preserve method-specific quality metadata; never assume all Bluetooth 6.x radios implement every optional feature.
- **Cellular ISAC / 6G:** continue research on network-native sensing and multi-site RF reflections, but require access to the actual network-side sensing interface, specialised infrastructure, independent ground truth, and legal/agency approval. A standard phone connection does not expose cellular radar data.
- **LEO NTN and public-safety multi-hop relay:** treat as resilient backhaul/coverage options when a provider or agency exposes a supported service. Preserve local operations during satellite/network loss; do not assume satellite availability inside structures.
- **Integrated mmWave and SDR:** keep as distinct hardware-backed sensor/research modalities. Do not infer them from Wi-Fi/Bluetooth chip presence, and do not transmit experimental waveforms without explicit spectrum authority.

### Priority order for the first integrated wireless stack

1. **Transport and failover first:** Ethernet/USB, Wi-Fi, cellular, and supported Bluetooth LE data links with local-first buffering and priority queues.
2. **Standards-based ranging second:** Android Ranging API where available, legacy Wi-Fi RTT/FTM where supported, then compatible UWB and Bluetooth Channel Sounding peers.
3. **Low-power sensor reach third:** gateway-backed LoRaWAN and Wi-Fi HaLow only when actual nodes and regional gateway infrastructure are available.
4. **Research sensing fourth:** 802.11bf CSI/BFI, dedicated mmWave radar, passive RF, and cellular ISAC remain separately labeled research streams until independently validated.
5. **Future reliability fifth:** Wi-Fi 8, ambient power communications, 6G/NTN and advanced multi-hop capabilities are tracked for future adoption without creating present-day dependencies.

The unified adapter contract must report discovered hardware, standard/version, actual endpoint compatibility, permissions, session status, sample arrival, freshness, clock quality, link quality, security state, and validation state separately. A source that is connected but cannot provide a usable measurement is not an operational sensor.

### Additional source references

- IEEE 802.11 working-group status, including TGbn Wi-Fi 8 and TGbp Ambient Power Communications: https://grouper.ieee.org/groups/802/11/
- Wireless Broadband Alliance Wi-Fi 8 program: https://wballiance.com/wi-fi-8/
- Bluetooth SIG Core 6.3 feature update (May 6, 2026): https://www.bluetooth.com/blog/just-released-bluetooth-core-6-3/
- Bluetooth SIG Channel Sounding capabilities and security: https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/channel-sounding/
- NIST 802.11bf evaluation under packet loss and timing jitter: https://www.nist.gov/publications/open-source-framework-ieee-80211bf-evaluation-under-lossy-and-jittery-conditions/
