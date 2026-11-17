# WaveRadar Network OS — Architecture Contract

**Status:** Architecture baseline / implementation plan  
**Date:** 2026-11-17  
**Branch:** `waveradar/network-os-foundation`

This document defines networking as a first-class subsystem of WaveRadar OS. It is an engineering contract and roadmap, not a claim that every adapter is implemented or validated.

## Mission and principles

Provide a provider-independent, local-first infrastructure and sensor networking layer that discovers observable capabilities, connects only to authorized resources, preserves source provenance, transports evidence reliably, and supports incident operations without internet access.

- Authorization precedes active access. Passive discovery is distinct from joining networks or reading protected data.
- Local capture, display, incident records and queued evidence must work without public cloud or browser sessions.
- Hardware support, OS support, permission state, registration, availability, sample arrival and validation remain distinct.
- Raw evidence and acquisition metadata are preserved. Inferences never become measurements.
- Secrets never enter logs or evidence records.
- Network-derived output is never represented as life-safety certainty.
- Independent reviewers—not the producing model or team—validate claims.

## Logical planes

1. **Discovery:** permission-bounded observation of supported Wi-Fi, cellular, BLE, GNSS, UWB, Ethernet, satellite/NTN, private-network and other adapter capabilities.
2. **Capability:** normalized adapter/protocol/band/feature registry with hardware, firmware, driver, API and permission requirements.
3. **Identity and authorization:** device enrollment, operator/agency consent, least-privilege scopes, credential references, revocation and audit.
4. **Connectivity:** explicit connection lifecycle, authenticated peers, encryption, route health, reconnection and policy-controlled failover.
5. **Evidence transport:** local durable outbox, bounded buffering, store-and-forward, idempotency, ordering and conflict handling.
6. **Fusion interface:** timestamped, source-attributed observations with explicit uncertainty.
7. **Operations:** diagnostics, permission explanations, health, offline state and degraded-mode reporting.

## Technology adapters

| Family | Integration boundary | Limitations / evidence required |
|---|---|---|
| Wi-Fi | Android/Linux APIs; authorized gateway telemetry | Scan throttling, permissions, hardware support; no unauthorized association |
| Wi-Fi RTT | Supported hardware and authorized compatible peers | Calibration and surveyed ground truth |
| Wi-Fi CSI/BFI | Compatible NIC/firmware research adapter | Not assumed available through ordinary Android APIs |
| Cellular | OS-exposed registration, radio and network telemetry | Carrier/OS limits; no baseband bypass or interception |
| Private 4G/5G | Agency-authorized core/RAN/gateway APIs | Operator agreement, provisioning and audit |
| Satellite/NTN | Provider-approved terminal/gateway APIs | Hardware/provider-specific; ordinary phones do not imply satellite access |
| BLE | Android/Linux BLE APIs and authorized GATT/advertisement feeds | Permissions, rotating identifiers and privacy |
| UWB | Secure ranging with compatible authorized peers | Hardware support, secure sessions, calibration and anchor geometry |
| GNSS | Platform location/time APIs and approved receivers | Indoor degradation, spoofing/jamming, multipath and uncertainty |
| Ethernet/IP | Authorized interface, route and gateway telemetry | Segmentation and credential boundaries |
| Mesh/ad hoc | Authenticated peer-to-peer links | Trust, key management, congestion and partition recovery |
| LoRaWAN | Authorized gateway/network-server integration | Low throughput, duty cycle and coverage |
| SDR/RF/mmWave | Separate lawful research hardware adapters | Spectrum and transmission compliance |
| Drones/external sensors | Owner-authorized APIs, signed feeds or gateway exports | Source identity, operator authorization, time, pose and calibration |

Technology names are integration targets, not claims of present support.

## Capability contract

Each adapter publishes: stable capability and adapter IDs; version; hardware/firmware/driver/API identity; family and supported operations; support state (`SUPPORTED`, `UNSUPPORTED`, `UNKNOWN`); permission state (`GRANTED`, `DENIED`, `NOT_REQUIRED`, `UNKNOWN`); registration, availability and sample-arrival states separately; limitations; last-seen time; and health diagnostics.

A capability declaration is not proof of operation. Never collapse hardware support, registration, permission, adapter initialization, sample arrival, timestamp validity, calibration, spatial-pose availability or validation into one status.

## Common observation envelope

Every observation includes event ID and schema version; source device and adapter identity; event and monotonic capture times where available; ingest time and clock uncertainty; coordinate frame, pose and uncertainty only when available; raw payload or immutable reference and content hash; units, quality flags and calibration reference; provenance (`MEASURED`, `DERIVED`, `INFERRED`, `PREDICTED`, `SIMULATED`, `UNKNOWN`, `UNAVAILABLE`); integrity state separately; authorization context; retention classification; and audit correlation ID.

Missing values remain unknown/unavailable. Signal strength, range, location, presence, identity and environmental inference are distinct measurement classes. No radio observation alone establishes a person's identity, exact location, presence behind a wall or victim detection.

## Connection lifecycle

`DISCOVERED → ELIGIBILITY_CHECKED → AUTHORIZED → CONNECTING → CONNECTED → DEGRADED / DISCONNECTED`

No state may skip authorization. Every transition records actor/service, policy decision, time, reason, adapter and resource. Credentials are stored only in platform keystores or approved secret managers.

## Offline-first transport

- Durable local outbox with bounded storage, retention and backpressure.
- Stable event IDs before transmission; idempotent retry.
- Preserve capture order and original times; record delivery and ingest times separately.
- Authenticated encrypted remote transport.
- Distinguish queued, transmitted, received, integrity-checked and accepted.
- Detect gaps, duplicates, reordering, clock discontinuities and replay.
- Expose queue depth, age, dropped/delayed events and last contact.
- Never promise delivery across a network partition.

## Security and privacy

No authentication bypass, credential harvesting, unauthorized network entry, covert collection or unapproved payload access. Enforce least privilege at adapter/device/tenant/incident/researcher scopes. Prefer rotating or pseudonymous identifiers and minimize persistent radio identifiers. Separate discovery from protected-data access. Audit enrollment, permission changes, connection attempts, key changes, exports and reviewer access. Validate schemas, sizes, timestamps, signatures and authorization. Fail closed for privileged operations.

## Runtime boundaries

- **Android endpoint:** native Kotlin/Java adapters through documented APIs and a stable native bridge; query permissions and actual device/API support at runtime.
- **Linux reference host:** modular services, documented interfaces, explicit device permissions and bounded IPC. No custom kernel until a concrete driver/isolation requirement justifies it.
- **WaveRadar Core:** portable documented APIs; hosted services optional for local incident operations.
- **WIS clients:** consume common capability/evidence contracts; no incompatible per-client discovery logic.
- **Browserless control:** device management, acquisition, service health and offline operations work through native services/local APIs; browser is optional UI only.

## Validation gates

1. Contract and state-machine tests.
2. Adapter tests on named hardware, OS, firmware and permission sets.
3. Transport loss, duplication, reordering, delay, partition, reconnect, storage exhaustion and clock-jump tests.
4. Independent security review of authorization, revocation, isolation, secrets and replay.
5. Calibration and independent ground truth for every ranging/positioning/sensing claim.
6. Controlled field scenarios with independent observers and stop conditions.
7. Release claims bounded to the exact tested configuration and environment.

## Implementation sequence

**P0 foundation:** versioned capability/observation contracts; adapter lifecycle; local durable event queue; service IPC and identity boundary; network health and degraded-mode reporting.

**P1 practical endpoints:** Android Wi-Fi/cellular/network state and GNSS diagnostics through documented APIs; BLE; Linux network inventory and gateway interfaces; offline replay and synchronized ingest.

**P2 specialized adapters:** UWB, Wi-Fi RTT, private 5G, LoRaWAN, satellite provider APIs, drone/external sensor gateways; CSI/BFI and SDR feasibility with compatible research hardware.

**P3 resilience/research:** authenticated multi-hop mesh, time/space-aware multi-radio fusion, independent benchmarks, Guardian X and helmet integration.

## Current status / non-claims

The repository README describes an early React/Vite/Capacitor prototype, Base44 SDK dependencies, a native Android sensor bridge and pending physical validation. This document does not change those facts. No claim is made that all adapters exist, that satellite/private 5G/mesh/CSI/BFI/UWB/SDR are operational, that browserless control is complete, or that the system is validated for life-safety use.

## Definition of done

For every adapter: documented capability contract; explicit permission and authorization behavior; source-attributed observations; safe failure states; automated contract and lifecycle tests; hardware-specific integration test; security/privacy review; transport recovery test; and independent measurement validation for any quantitative sensing claim.
