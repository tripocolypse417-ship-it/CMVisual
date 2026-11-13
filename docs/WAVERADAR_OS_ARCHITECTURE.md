# WaveRadar OS — System Architecture Baseline

**Status:** Proposed target architecture; implementation is partial and must be verified component by component.  
**Owner:** WaveRadar program  
**Canonical code repository:** `CMVisual`  
**Architecture principle:** WaveRadar OS is the product. CMVisual is a current implementation/research codebase, not the product definition.

## 1. Product definition

WaveRadar OS is a safety-critical, evidence-first emergency situational-awareness and decision-support operating environment. It coordinates field devices, sensors, data services, spatial models, decision-support models, command interfaces, and independent validation.

The first deliverable is an **operating environment built on supported Android/Linux platforms**, not an immediate replacement kernel or a custom phone OS. A custom AOSP distribution or dedicated hardware OS is a later option only if hardware control, security, lifecycle, latency, or certification requirements justify its maintenance and safety cost.

The system must work as a coherent whole across:
- Firefighter field devices, helmet displays, radios and Guardian X suit/exoskeleton.
- Incident command, chiefs, dispatch and authorized remote operators.
- Phone-native and external sensors, fixed infrastructure, compatible drones and partner feeds.
- Local edge processing, portable/offline operation, and optional remote services.
- Research, evaluation, evidence review and post-incident replay.

## 2. Non-negotiable design principles

1. **Evidence before inference.** Preserve raw observations and provenance. Derived, inferred, simulated and human-entered information remain distinguishable.
2. **Fail visibly and safely.** Missing, stale, conflicting, unsupported or low-confidence inputs must degrade capability explicitly; never silently fabricate continuity.
3. **No autonomous life-safety authority.** Models advise; authorized incident personnel retain operational command. No unvalidated model controls exoskeleton actuation, evacuation, entry or tactical decisions.
4. **Offline-first edge operation.** Core sensing, local evidence capture, local status, local maps where available, and safe degradation must not depend on continuous cloud connectivity.
5. **Replaceable adapters.** Sensors, vendors, maps, model runtimes, identity providers and storage implementations plug in through versioned contracts.
6. **Independent validation.** A model, subsystem, development team or data source cannot certify its own safety or accuracy.
7. **Privacy and least privilege.** Tenant, incident, role, device, purpose and retention boundaries are enforced at the data and service layers.
8. **Reproducible change.** Version all schemas, firmware, adapters, models, configuration, datasets, test procedures and releases.
9. **No invented capability.** UI status derives from observed capability and health, not a configured wish or marketing label.
10. **Budget-aware engineering.** Prefer mature open standards, permissive/open-source components after license review, low-cost local tests and external research partnerships. No paid dependency is a prerequisite for the next engineering step.

## 3. Layered architecture

### A. Device and hardware layer
- Android phones/tablets; future supported rugged devices.
- Helmet display and wearable interface.
- Guardian X: integrated powered full-body exoskeleton, protected power modules, sensor harness and fail-safe disengagement.
- RGB/thermal cameras, IMU, GNSS, barometer, microphone, environmental and gas sensors, compatible RF/Wi-Fi/UWB/mmWave/radar hardware.
- Drones and fixed sensors as external data providers; discovery or ingestion does not imply permission to control them.

Hardware capability is discovered at runtime. The capability registry records hardware identity, firmware, calibration, permission, support status, health, sample arrival, clock quality and pose availability separately.

### B. WaveRadar Edge Runtime
A native Android/Linux service layer owns:
- Device identity, secure enrollment and authorization.
- Sensor adapters and permission lifecycle.
- Clock synchronization and monotonic event sequencing.
- Local encrypted evidence spool and durable queues.
- Connectivity manager and store-and-forward synchronization.
- Resource/thermal/battery budget and graceful degradation.
- Native bridge health and app/service lifecycle.
- Signed update verification and rollback.

The Android application is a client of these services. Browser/web code must not pretend to provide OS-level sensor access that the platform does not expose.

### C. Core platform services
1. **Identity & policy:** user, organization, incident, role, device, capability and purpose-bound authorization.
2. **Device registry:** enrollment, attestation where available, firmware, health and revocation.
3. **Sensor gateway:** adapter lifecycle, permission, data quality and source metadata.
4. **Evidence ledger:** append-only observation and provenance records; corrections are new linked records.
5. **Time & synchronization:** event time, capture time, receive time, monotonic sequence, clock uncertainty and synchronization source.
6. **Spatial service:** coordinate frames, calibration, transforms, map/building alignment and uncertainty.
7. **World model:** versioned scene graph for buildings, rooms, objects, tracks, hazards and routes.
8. **Fusion service:** quality-aware, time-aligned fusion with conflict detection and explicit missing-data behavior.
9. **Model runtime:** isolated, version-pinned inference with resource budgets and deterministic input/output contracts.
10. **Prediction service:** calibrated forecasts with horizon, uncertainty, applicability and abstention.
11. **Alert and workflow service:** severity, evidence, expiry, acknowledgment and escalation policy.
12. **Replay service:** reconstruct an incident from immutable evidence and versioned processing/model configurations.
13. **Audit and export:** signed manifests, access history, reproducible evidence bundles and export controls.

### D. Intelligence and model layer
Distinct services; never a single opaque "AI":
- Perception: detection/segmentation/classification from supported modalities.
- Localization and mapping: pose, coordinate frames and map alignment.
- Sensor quality and reliability: health, calibration, drift, freshness and conflict.
- Fusion: combine compatible observations with source-level traceability.
- World-state estimation: tracks and scene hypotheses.
- Prediction: bounded forecasts for explicitly defined targets and horizons.
- Decision support: compare options and surface evidence/uncertainty; no autonomous command.
- Independent verification: separate evaluation pipeline and reviewer workflow, not a second model simply agreeing with the first.

### E. User experience layer
- **Chief Command:** incident overview, crew/device state, map and building model, evidence-backed alerts, route/hazard context, data freshness, communications and command decisions.
- **Firefighter Field/HUD:** low-cognitive-load, high-contrast, glanceable status; critical alerts, direction/route only when supported, sensor availability, uncertainty and human override.
- **Research & Validation:** protocol execution, ground-truth capture, blinded evaluation, reviewer decisions, evidence export and audit.
- **After-action review:** synchronized timeline, sensor replay, model/version overlays, decision annotations and provenance.
- **Administration:** identity, roles, device enrollment, policy, integrations and retention.

All displays must clearly distinguish measured, derived, inferred, simulated, manually entered and unavailable information.

## 4. Data contracts

Every observation uses a versioned envelope. Minimum fields:

- `schema_version`, `observation_id`, `incident_id` (nullable before assignment), `tenant_id`, `device_id`, `sensor_id`.
- `modality`, `measurement_type`, `value` or immutable payload reference, `unit`, `coordinate_frame`.
- `capture_time`, `receive_time`, `monotonic_sequence`, `clock_uncertainty_ms`.
- `calibration_id`, `firmware_version`, `adapter_version`, `permission_state`.
- `quality_state`, `freshness_state`, `integrity_state`, `provenance`.
- `evidence_class`: measured | derived | inferred | simulated | human_entered | unavailable.
- `uncertainty`, `processing_lineage`, `retention_class`, `integrity_digest`.

An inference references its complete input observation IDs, transform/configuration versions, model artifact digest, runtime version and execution timestamp. Raw data is not overwritten by processing.

Lifecycle states must remain separate: supported, registered, permission-granted, initialized, receiving samples, timestamp-valid, spatial-pose-available, calibrated, healthy, validated. One state never implies another.

## 5. Canonical service boundaries

Use explicit APIs/events, not UI-to-database coupling:
- Device and sensor adapters publish typed observations.
- Evidence service accepts and validates envelopes, then stores immutable records.
- Spatial/fusion services consume evidence and emit linked derived records.
- Model runtime consumes a declared input contract and emits versioned predictions.
- UI reads projections/read models and submits authorized commands through policy services.
- Validation service evaluates frozen datasets and artifacts without write access to production evidence.

Initial deployment may be a modular monolith with strict package boundaries and adapters. Split into independently deployed services only when scaling, fault isolation, security or team ownership justify the operational burden.

## 6. Storage and event strategy

- Local encrypted append-only queue on field devices.
- Durable central event/evidence store with immutable object payloads and searchable metadata.
- Relational metadata for identities, incidents, permissions, device/model registries and review records.
- Object storage for large sensor payloads and model artifacts.
- Spatial indexes for geospatial/building/scene queries.
- Rebuildable read models for dashboards and replay.
- Signed export manifest with hashes and complete lineage.

Avoid treating a UI vendor's entity database as the permanent canonical evidence store. Base44 may remain an adapter/prototype surface until an independently deployable backend is proven.

## 7. Security and safety architecture

- Threat model: lost/stolen device, compromised sensor, spoofed feed, replay, clock manipulation, malicious update, tenant crossover, credential theft, model/data poisoning, denial of service and operator overload.
- Secure boot/attestation where hardware supports it; encrypted storage and transport; device revocation; least privilege; signed artifacts.
- Strict tenant/incident scoping and auditable access.
- Offline credential expiry and revocation strategy.
- Model isolation, input validation, resource limits and rollback.
- No actuation interface for Guardian X in the initial OS release. Any later actuation requires separate hazard analysis, independent controls, hardware interlocks and formal acceptance.
- UI and alerting hazard analysis, human factors testing and graceful degradation.

## 8. Portability strategy

Define provider-neutral interfaces first. Maintain adapters for current Base44 services while building an independently deployable path. Do not remove the existing backend until:
- Identity and role migration is tested.
- All entity schemas and data exports are reconciled.
- Evidence history and audit trails are preserved.
- Offline synchronization and conflict handling are verified.
- Backup/restore and tenant isolation tests pass.
- A rollback path is demonstrated.

Android is the first field runtime. Desktop/web command interfaces consume the same service contracts. A dedicated AOSP fork is a later decision gate, not a starting assumption.

## 9. Acceptance gates

A subsystem is not production-ready until it has:
- Explicit requirements and hazard analysis.
- Versioned contract and failure semantics.
- Unit, integration and negative tests.
- Security/privacy review.
- Real-device verification where hardware is involved.
- Independent ground truth for performance claims.
- Reproducible test data and procedure.
- Operational monitoring, recovery and rollback.
- Documentation and training.
- Signed release record and named accountable owner.

Passing a software build is not evidence of sensor accuracy, spatial accuracy, firefighter safety or operational effectiveness.
