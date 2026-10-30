# WaveRadar Independent Architecture, Scanner Fusion & Institutional Research Plan

**Prepared:** 2026-10-30  
**Status:** Architecture and execution requirements; not a claim that these capabilities are already implemented or validated.

## 1. Non-negotiable architecture objective

WaveRadar must not depend on a single paid builder, cloud vendor, API, identity provider, sensor manufacturer, model provider, or hosted database to remain operable or to preserve its evidence.

The system must be portable, inspectable, reproducible, and recoverable. A provider may be used as an optional adapter, but must not become the only copy of source code, raw evidence, identity records, operational configuration, or build/release material.

## 2. World Model and scanner-fusion architecture

The World Model is the shared spatial and operational representation consumed by the field interface, command center, admin tools, and research environment. Individual scanners do not each create incompatible world models. They publish observations through common, versioned contracts; the fusion layer aligns and evaluates those observations; the World Model stores the resulting state with provenance and uncertainty.

### Required pipeline

1. **Scanner adapters:** Each scanner or source has an isolated adapter. Examples include RGB/low-light camera, thermal/IR, depth/stereo, LiDAR, radar/mmWave, Wi-Fi/Bluetooth/UWB/radio measurements, GNSS, IMU/motion, barometer, acoustic, environmental/chemical sensors, external sensor modules, building plans/BIM, and manually surveyed references.
2. **Capability discovery:** Report hardware present, API/driver support, permission state, calibration state, runtime availability, sample freshness, and actual sample arrival as separate fields. Never infer that a sensor works merely because a device advertises it.
3. **Canonical observation envelope:** Every observation carries a stable observation ID, source/device ID, sensor modality, timestamp and clock quality, coordinate frame, units, calibration/version, raw-data reference or payload digest, evidence class, uncertainty, quality flags, and collection context.
4. **Time and coordinate alignment:** Normalize units and coordinate frames; preserve original values; estimate clock offset and frame transforms with uncertainty; reject or quarantine unalignable observations rather than silently forcing them together.
5. **Fusion engine:** Use modality-appropriate algorithms and confidence models. Correlate observations only when time, geometry, provenance, and quality requirements are met. Keep conflicting observations visible.
6. **World Model state:** Store geometry, floors, rooms, traversable regions, obstacles, hazards, assets, people/presence hypotheses, routes, and team/device states as versioned entities with source lineage and confidence. A model update must be traceable to the observations and transformations that produced it.
7. **Consumers:** Field/helmet, chief/command, admin, replay, and research tools read the same versioned World Model through role-appropriate views. Safety-critical local functions must degrade gracefully if cloud connectivity is lost.
8. **Feedback and validation:** A correction or ground-truth measurement is a new attributed event. It must not overwrite the original observation or retroactively make an unverified record verified.

### Evidence classes

Preserve the existing canonical classes MEASURED, FEDERATED_MEASURED, DERIVED, INFERRED, PREDICTED, ENVIRONMENTAL, GROUND_TRUTH_OPERATOR_MARKER, CONFLICT, and UNKNOWN. Add SIMULATED and UNAVAILABLE through a versioned schema extension. Preserve the original class through transformations. Never relabel inferred, predicted, simulated, environmental, ground-truth, or federated records as ordinary MEASURED data. Do not present a presence hypothesis as a confirmed victim, a model reconstruction as a scan, or a route as safe without supporting evidence.

### Sensor independence

No sensor is mandatory for the entire product to function. The fusion engine must support missing, degraded, delayed, noisy, or conflicting modalities. Each modality is optional and capability-gated. The system should continue with available modalities while clearly reporting degraded coverage and uncertainty. Scanner adapters must be replaceable without changing the World Model contract.

## 3. Dependency and vendor-exit policy

Maintain a dependency register for every runtime, build, storage, authentication, analytics, mapping, AI, media, and sensor integration. Record purpose, license, version, owner, data processed, network requirement, cost, renewal/availability risk, export format, replacement path, and last tested exit procedure.

### Required controls

- Prefer open standards, documented formats, permissive/open-source components where technically and legally appropriate, and self-hostable services.
- Pin dependency versions and preserve lockfiles, checksums, licenses, and source notices.
- Generate a software bill of materials (SBOM) for each release; scan for known vulnerabilities and incompatible licenses.
- Keep the core application buildable from a clean environment using documented, reproducible steps.
- Keep application source, schema/migrations, configuration templates, build workflows, and deployment instructions in Git.
- Keep secrets out of source control; document how owners rotate and restore them.
- Do not make a paid SaaS API a required runtime path when a local or replaceable implementation is feasible.
- Every external service must have a tested export, migration, and outage/decommission plan before it becomes a critical dependency.
- Do not rely on a provider's free tier, preview URL, temporary token, or uncommitted workspace as the sole production or archival location.
- Maintain local/offline operation for essential field functions where technically feasible; synchronize when connectivity returns.
- Use provider-neutral interfaces for identity, object storage, maps, AI inference, messaging, and telemetry.
- Do not add a dependency solely because it is fashionable or convenient. Evaluate maintenance health, security, licensing, data portability, offline behavior, and total cost.

### Data durability and recovery

- Preserve raw evidence as immutable source records; derived outputs are separate records.
- Use content hashes and signed manifests for evidence packages and release artifacts.
- Maintain at least three recoverable copies across at least two independent storage types, with one copy offline or otherwise isolated.
- Encrypt sensitive data in transit and at rest; separate encryption keys from the data they protect.
- Test restore procedures on a schedule. A backup that has not been restored successfully is not a verified backup.
- Version schemas and migrations; test forward migration and recovery/rollback on copies before production use.
- Preserve failed, incomplete, interrupted, rejected, and unverified records with reason codes. Quarantine is preferred to deletion.
- Record retention, access, export, deletion, and incident-response rules. Apply lawful privacy and retention requirements.
- Before changing providers or deleting a workspace, verify a complete export, checksums, restore, application behavior, and user access in the replacement.

## 4. World Model validation gates

A scanner adapter or fusion method cannot be promoted based on a successful software build alone.

1. **Interface gate:** contract tests, units, timestamps, coordinate frames, null/missing data, and malformed payloads.
2. **Bench gate:** repeatable sensor tests with known inputs and calibration records.
3. **Ground-truth gate:** independent reference measurements appropriate to the claim.
4. **Environment gate:** controlled tests across relevant layouts, materials, obstructions, lighting, motion, and connectivity conditions.
5. **Statistical gate:** preregistered metrics, sample size rationale, uncertainty intervals, failure analysis, and reproducibility.
6. **Independent review gate:** reviewer independence, conflict disclosure, protocol deviations, and signed evidence package.
7. **Operational safety gate:** human-factors evaluation, fail-safe behavior, degraded-mode messaging, cybersecurity, privacy, and department approval.
8. **Promotion gate:** explicit versioned approval before any capability is shown as operational in the firefighter interface.

Until passed, label capability EXPERIMENTAL or UNAVAILABLE and keep it behind a feature flag.

## 5. Research & Validation Institute workstreams

The Institute remains separate from the production application and is organized around three functions:

- **Research Intelligence:** scout existing and emerging scanners, papers, patents, datasets, open-source implementations, standards, and licensing constraints. Produce source-linked technology briefs and a dependency/feasibility assessment.
- **Independent Validation:** preregister protocols, recruit qualified independent testers/reviewers, preserve raw evidence, maintain chain of custody, and publish bounded findings including failures and limitations.
- **Technology Integration:** evaluate accepted findings for compatibility, safety, licensing, security, cost, maintainability, and replacement risk. Integration requires separate approval and cannot occur automatically from a lab result.

The external Lab must enforce invitation and role scopes, separate researcher/tester/reviewer identities, append-only evidence/audit history, conflict-of-interest controls, and exportable evidence packages. Do not accept executable uploads. Binary evidence requires controlled object storage, quarantine, malware scanning, content hashing, and access controls before it is enabled.

## 6. Institutional testing and research targets

These are prospective outreach targets, not existing partnerships or approvals.

### NIST Public Safety Communications Research (PSCR)

Explore a discussion about public-safety location-based services, user experience, indoor localization, and an appropriate evaluation route. NIST describes:
- Buildings with Dots in Gaithersburg for large-space and non-line-of-sight RF scenarios.
- The Public Safety Immersive Test Center (PSITC) in Boulder, with motion capture and high-rate ground-truth location/pose data.
- Collaboration routes including CRADAs. A CRADA is a research collaboration, not a grant; NIST states participants do not receive funding through CRADAs, and fit/terms must be assessed.

References:
- https://www.nist.gov/ctl/pscr/testing-facilities
- https://www.nist.gov/ctl/pscr/about/public-safety-immersive-test-center
- https://www.nist.gov/ctl/pscr/about/collaborate-pscr

### Indiana University RedLab / FRST ecosystem

Explore technical exchange or future testing opportunities with the Indiana University RedLab team. Benchmark against published FRST approaches such as Ascent Integrated Tech and AdaptiTrace using comparable protocols, ground truth, environments, and metrics. Do not imply endorsement or access.

References:
- https://redlab.iu.edu/projects/frst-challenge/frst-challenge-competitors/index.html
- https://www.nist.gov/news-events/news/2024/01/saving-seconds-saving-lives-nist-funded-challenge-crowns-winners-3d

### Funding and institutional eligibility

Review current NIST Fire Research Grant notices and FEMA Assistance to Firefighters / Fire Prevention and Safety research-and-development opportunities. Confirm the current notice, eligible applicant, institutional partner requirements, match, allowable costs, deadline, and award terms before investing effort. The research institute should not claim eligibility until the applicant entity and partners are confirmed.

## 7. Immediate execution sequence

1. Inventory every current dependency and external service in CMVisual and hosted WaveRadar workspaces. Mark each as required, optional, replaceable, or obsolete; do not remove anything until tests pass.
2. Map all scanner inputs to the canonical observation envelope. Identify missing metadata, unavailable APIs, unsupported hardware, and licensing restrictions.
3. Define the first World Model schema and coordinate-frame/time model. Keep it small, versioned, and testable.
4. Build contract tests and simulated fixtures separately from measured evidence. Fixtures must always be labelled SIMULATED and must never enter the measured evidence store.
5. Complete the fresh Android native-sensor baseline on the physical Moto G Play 2024 with an independent reference; keep historical observations unchanged.
6. Complete restore tests and verify a clean-room build before removing or replacing any paid or hosted dependency.
7. Run the Lab's researcher, tester, and independent reviewer workflows with authorized real accounts; test cross-role and cross-lab denial.
8. Prepare a bounded institutional technical brief and request an exploratory discussion with NIST PSCR and IU RedLab. Do not claim partnerships, certifications, test access, or validated performance.
9. Promote no sensor or fusion capability to operational status until its evidence package passes the defined gates.

## 8. Change-control rule

All implementation changes should occur on a branch with focused commits and automated checks. Open a pull request for review. Preserve the current main branch and all historical evidence. Do not delete original workspaces, repositories, evidence, or signing material as part of dependency cleanup. Record any uncompleted work and owner-only action explicitly.
