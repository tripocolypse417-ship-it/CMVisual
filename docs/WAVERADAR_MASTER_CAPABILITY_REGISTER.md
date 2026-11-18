# WaveRadar Master Capability Register

**Register date:** 2026-11-15  
**Scope:** WaveRadar Core, WIS command platform, responder interfaces, Guardian X, sensor and robotics ecosystem, Research & Validation Lab, deployment and commercialization.  
**Status semantics:** `Existing/documented` means a repository or project record describes the item; it does not mean independently verified. `Partial` means some implementation or documentation exists but the capability is incomplete. `Planned` means architecture or requirements only. `Research` means feasibility is unproven. `Blocked` means a prerequisite or external action is outstanding.

## 1. Governing rules

1. **Evidence before claims.** Label every output MEASURED, DERIVED, INFERRED, PREDICTED, SIMULATED, DEMO, UNKNOWN, or UNAVAILABLE. Preserve source, timestamp, device, calibration, software/model version, conditions, uncertainty, and chain of custody.
2. **No unsupported life-safety claims.** No through-wall accuracy, victim localization, structural safety, rescue performance, or operational-readiness claim without appropriate independent ground truth and validation.
3. **Independent validation.** Research, prediction, product engineering, and independent verification have separate responsibilities. A model cannot certify itself.
4. **Human authority.** AI may summarize, prioritize, and recommend. Safety-critical actions remain with authorized incident command and responders unless a narrowly scoped function is separately certified and approved.
5. **Fail safely.** Missing, stale, contradictory, out-of-distribution, or low-confidence data must produce an explicit degraded/unknown state, not a fabricated answer.
6. **No hidden dependencies.** Inventory every device, model, vendor, cloud service, API, data source, license, credential, and network dependency; document alternatives and offline behavior.
7. **Privacy and lawful use.** Minimize collection; establish purpose, authority, consent where required, access, retention, sharing, deletion, and audit rules before field deployment.
8. **Reversible engineering.** Preserve raw evidence, backups, known-good builds, and reviewable Git changes. No destructive migrations or paid commitments without owner approval.

## 2. Capability register

| ID | Capability / accountable function | Dependencies | Maturity | Safety class | Required validation / acceptance evidence |
|---|---|---|---|---|---|
| GOV-01 | Product safety case, hazard analysis, risk controls, residual-risk register — Safety lead | System architecture; intended-use definition; incident scenarios | Planned | Critical | Hazard analysis; traceability from hazard to control/test; independent safety review; signed release gate |
| GOV-02 | Human override, fail-safe states, graceful degradation, emergency stop — Systems safety | Power, communications, UI, device state model | Planned | Critical | Fault injection; loss-of-power/network/sensor tests; safe-state timing; responder usability tests |
| GOV-03 | Command succession, role handoff, accountability and decision log — Incident operations | Identity, role-based access, audit log, comms | Planned | High | Multi-user incident simulations; handoff completeness; audit reconstruction; access-control tests |
| GOV-04 | Data governance, consent, ownership, retention, sharing and deletion — Privacy/data steward | Identity, storage, legal review, audit | Planned | High | Data-flow inventory; threat/privacy assessment; retention/deletion tests; access audit |
| GOV-05 | Supply-chain security, SBOM, provenance, vulnerability response — Security lead | Build pipeline, dependency inventory, vendor records | Partial | High | Reproducible build; signed artifacts; SBOM; dependency/license scan; vulnerability remediation drill |
| GOV-06 | Lifecycle, calibration, maintenance, firmware provenance and end-of-life — Hardware operations | Device registry, service records, calibration standards | Planned | High | Calibration interval study; maintenance workflow test; component traceability; end-of-life data handling |
| CORE-01 | Portable core services and deployment independence — Platform engineering | API contracts, database, identity, hosting, CI/CD | Partial | High | Clean-room deployment; backup/restore; provider outage and migration test; dependency map |
| CORE-02 | Identity, authentication, authorization and tenant/jurisdiction boundaries — Security/platform | Identity provider, roles, incident model | Partial | Critical | Threat model; privilege-escalation tests; session and revocation tests; independent security review |
| CORE-03 | Resilient communications, offline mode, store-and-forward and recovery — Network/platform | Radio, Wi-Fi, cellular, satellite, mesh, local storage | Planned | Critical | Network impairment tests; message integrity/order; recovery and reconciliation; coverage characterization |
| CORE-04 | Interoperability, common data model, APIs and mutual-aid exchange — Integration lead | Versioned schemas, identity federation, partner systems | Planned | High | Contract tests; schema compatibility; cross-agency tabletop and integration trials |
| SENS-01 | Android/native sensor intake and device lifecycle — Mobile engineering | OS permissions, hardware APIs, timestamps, device registry | Partial | High | Fresh-device baseline; permission/support/sample-arrival separation; timestamp integrity; repeatability |
| SENS-02 | Wireless sensing: Wi-Fi CSI/RTT, BLE, UWB, cellular, GNSS and SDR — Wireless research | Compatible radios, firmware/API access, calibration, lawful spectrum use | Research | Critical | Preregistered feasibility study; controlled ground truth; multipath/interference tests; independent replication |
| SENS-03 | Environmental sensing: gas, heat, humidity, pressure, radiation and air quality — Sensor engineering | Calibrated instruments, sampling, environmental protection | Planned | Critical | Traceable calibration; cross-sensitivity and response-time tests; environmental chamber/field tests |
| SENS-04 | RGB/thermal/LiDAR/IMU/acoustic and multimodal fusion — Perception engineering | Sensor adapters, synchronization, calibration, compute | Partial | Critical | Per-sensor baselines; synchronization; occlusion/smoke tests; fusion ablation; uncertainty calibration |
| SENS-05 | Drone and ground-robot data ingestion / coordination — Robotics integration | Authorized telemetry/video, maps, comms, operator controls | Planned | Critical | Simulated then controlled trials; geofence and link-loss tests; human-supervised operation; no unauthorized control |
| MAP-01 | Indoor/outdoor positioning and coordinate-frame continuity — Spatial systems | GNSS, inertial, UWB, visual/radio references, building anchors | Partial | Critical | Surveyed ground truth; drift/error distributions; transition tests; confidence and unavailable-state behavior |
| MAP-02 | Building reconstruction, floor plans, CAD/BIM, room/door/stair graph — Digital-twin team | Source plans, scans, georeferencing, versioning | Planned | High | Survey comparison; topology checks; change tracking; provenance and uncertainty display |
| MAP-03 | 3D scene, room replay, time rewind and incident reconstruction — WIS engineering | Time-series store, coordinate frames, synchronized streams | Planned | High | Replay determinism; time alignment; missing-data markers; reconstruction review against ground truth |
| INT-01 | Fire/smoke/heat/visibility/structural and hazard prediction — Modeling team | Physics models, environmental inputs, validated datasets | Research | Critical | Benchmark reproduction; calibration; out-of-distribution tests; uncertainty and horizon scoring; independent review |
| INT-02 | Victim/person-presence search and evidence prioritization — Search-support team | Thermal/acoustic/radar/wireless inputs, maps, human review | Research | Critical | Blinded trials; false-positive/negative analysis; varied mannequins and environments; no claim of absence from non-detection |
| INT-03 | Route, egress, obstacle and changing-hazard intelligence — Operational algorithms | Building graph, live conditions, responder position, uncertainty | Planned | Critical | Scenario testing; route hazard injection; stale-data tests; human factors and command approval |
| INT-04 | Cross-sensor contradiction, anomaly and causal analysis — Intelligence team | Provenance graph, synchronized evidence, model governance | Research | High | Synthetic and real benchmark suites; known-conflict tests; explainability; independent adjudication |
| WIS-01 | Chief command center, incident overview and multi-crew accountability — Product engineering | Identity, maps, comms, dispatch/incident data, role model | Partial | Critical | Role-based workflow tests; load/latency; degraded-mode drills; command-user evaluation |
| WIS-02 | Firefighter helmet/responder interface, voice and alert prioritization — Human factors | Wearable display/audio, compute, sensor outputs | Planned | Critical | PPE compatibility; visibility, heat, noise, gloves and fatigue studies; cognitive-load and alarm-fatigue tests |
| GX-01 | Guardian X protective suit and powered full-body exoskeleton — Hardware/safety engineering | Mechanical design, actuators, battery, thermal management, sensors | Planned | Critical | Independent mechanical/electrical safety; load, mobility, entrapment and endurance tests; fail-safe disengagement; heat/flame/impact evaluation |
| GX-02 | Suit power, energy storage, thermal control and emergency release — Hardware safety | Battery chemistry, protected modules, connectors, actuator controls | Research | Critical | Abuse and fault testing; thermal runaway containment; ingress/impact tests; emergency release and power-loss tests |
| PUB-01 | Public warning, evacuation, accessibility, reunification and shelter coordination — Public protection | Verified incident data, authority, accessible channels | Planned | Critical | Alert authorization; accessibility/language tests; delivery/receipt metrics; privacy and misuse review |
| REC-01 | Post-incident evidence preservation, reconstruction and after-action review — Evidence operations | Immutable audit, synchronized media, retention policy | Partial | High | Chain-of-custody audit; export verification; replay reproducibility; reviewer sign-off |
| REC-02 | Exposure, contamination, hazardous-material tracking and re-entry support — Environmental safety | Calibrated environmental sensors, maps, authoritative thresholds | Planned | Critical | Instrument validation; sampling protocol; expert-reviewed thresholds; false-safe analysis |
| HUM-01 | Human factors, accessibility, multilingual operation and fatigue-aware design — Human factors lead | UI prototypes, responder cohorts, operational scenarios | Planned | High | Representative-user studies; workload/alert tests; accessibility audit; documented design changes |
| OPS-01 | Training, exercises, procedures, maintenance and support — Operations lead | Training materials, equipment lifecycle, service model | Planned | High | Competency assessments; exercise evaluation; maintenance response and recovery drills |
| COM-01 | Total cost of ownership, repairability, affordable tiers and sustainable delivery — Commercial/operations | Bill of materials, service costs, procurement research | Planned | Medium | Cost model with assumptions; repair-time and lifecycle analysis; small-department procurement feedback |
| COM-02 | Licensing, partner/OEM channels, data/API products and validation services — Commercial lead | IP review, terms, security, evidence-backed product boundaries | Planned | High | Customer discovery; legal/license review; pilot acceptance criteria; no unverified performance claims |

## 3. Maturity and release gates

Use these gates for each capability; do not skip a gate because a demo is compelling:

- **G0 — Concept:** use case, intended user, boundaries, hazards, dependencies and owner recorded.
- **G1 — Feasibility:** reproducible bench evidence; data rights and hardware/API access understood; no unsupported claim.
- **G2 — Prototype:** documented implementation, tests, known limitations, failure states and versioned artifacts.
- **G3 — Controlled validation:** preregistered protocol, independent ground truth, representative conditions, statistical plan, raw evidence and reproducible analysis.
- **G4 — Independent review:** reviewer independence/conflicts recorded; safety case and residual risks reviewed; unresolved findings tracked.
- **G5 — Limited pilot:** trained users, operational controls, monitoring, rollback, support and explicit non-certified limitations.
- **G6 — Operational release:** only after applicable regulatory, standards, certification, procurement and organizational approvals; ongoing surveillance and change control.

Current repository evidence supports a number of documented software and governance components, but it does not establish any G3-G6 life-safety capability. Each capability must be re-assessed against current code, deployment, and evidence before its maturity is advanced.

## 4. Required record fields for every implementation item

Every work item derived from this register must record: capability ID; named accountable role (person only when assigned); technical owner; dependency IDs; intended-use boundary; maturity gate; implementation link/commit; test protocol and version; device/hardware/software/model versions; dataset/scenario; ground-truth source and calibration; metrics and uncertainty; failure cases; independent reviewer and conflict declaration; privacy/security/license review; result (PASS/FAIL/INCONCLUSIVE/NOT RUN); known limitations; date; next gate; change history.

## 5. Initial execution sequence

1. **Baseline and preserve evidence:** recheck live Core/Lab state; export and hash raw evidence; keep historical records immutable; quarantine only through documented review, never bulk-delete.
2. **Fresh Android baseline:** distinguish hardware support, registration, permission, sample arrival, timestamp integrity and spatial-pose availability. Use independent physical ground truth; phone-only observations cannot establish absolute spatial accuracy.
3. **Safety and system boundary:** document intended use, hazard analysis, fail-safe/degraded modes, command authority, privacy/data-flow map and threat model before operational pilots.
4. **Portable-core proof:** inventory Base44 SDK and all external dependencies; build a clean deployment and recovery path before declaring provider independence.
5. **Wireless feasibility:** preregister a narrow Wi-Fi CSI/RTT feasibility study; define a measurable hypothesis and negative controls; do not imply victim detection or through-wall capability.
6. **WIS workflow prototype:** prioritize command overview, source/provenance display, uncertainty, responder accountability, offline/degraded mode and incident replay before expanding predictive overlays.
7. **Guardian X staged research:** begin with requirements, ergonomics and non-powered mockups; isolate exoskeleton actuation and battery safety; no human-worn powered prototype until independent engineering safety review.
8. **External validation and pilot readiness:** recruit qualified independent institutions/reviewers only after protocols, access controls, privacy terms, and evidence packages are ready.
9. **Sustainability and deployment:** build transparent cost/repair/training models and low-cost deployment tiers; avoid paid commitments until funding and owner approval.

## 6. Known baseline limitations carried forward

The last repository master-status snapshot (2026-10-30) recorded 4,021 historical observations, 0 integrity-verified observations, 8 registered devices, 0 validated devices, 78 validation runs and 0 passed runs. These are historical snapshot values, not a live status check. Re-query the current service before relying on them. Preserve raw records and do not reinterpret old captures as accuracy evidence.

The same snapshot described the KIT Wi-Fi BFI/CSI and Android Native Sensor protocols as drafts, with no external researcher, tester, reviewer, or physical test evidence recorded at that time. Confirm current status before claiming progress.

## 7. Current service evidence snapshot (2026-11-15)

Queried the existing WaveRadar service directly on 2026-11-15. These are database/service states, not independent validation results:

- **Observation ledger:** 4,021 records; all 4,021 carry the `MEASURED` evidence-class label; 0 are integrity-verified. The current records remain `integrity_state=UNKNOWN`. No observation was received in the preceding 24 hours; the latest stored observation was received 2026-10-29 18:15:33 UTC. Five distinct device IDs appear in the observation ledger.
- **Device registry:** 9 registry rows; 0 validated. One record was seen at 2026-11-15 19:20:18 UTC. This is a registry-row count, not a count of nine verified physical devices.
- **Validation runs:** 78 total; 8 FAILED, 70 INDETERMINATE, 0 PASSED. The latest run was created 2026-10-24 19:40:22 UTC.
- **Latest capability snapshots:** seven snapshots each for camera, geolocation, motion, and spatial pose, last received around 2026-11-15 19:20 UTC. Reported states were camera permission granted, geolocation and motion declared supported, and spatial pose unavailable. All four capability groups remain UNVALIDATED.
- **Device identity limitation:** the recent registration/capability event carries generic Android / `guided-wizard-v1` metadata and does not establish the handset's exact manufacturer/model or prove that the native Android sensor plugin is loaded. Keep browser/device identity separate from account-alert identifiers.
- **Latest data-quality audit (2026-11-15 20:10:06 UTC):** 59 distinct sources; 23 require license review; 12 ingestion errors; 14 duplicate metadata records. These are audit findings to triage, not permission to discard or rewrite source records.

The `MEASURED` label describes the record's declared evidence class; it does not establish hardware authenticity, calibration, integrity, positional accuracy, or independent validation. Preserve the original rows and audit trail. Do not convert these records into an accuracy baseline or pass result.

## 8. Change control

Update this register through reviewable pull requests. Every change must explain the evidence supporting a maturity change, the risks introduced, the tests run, and the owner of follow-up actions. Never mark a capability validated solely because code exists, a build passes, a simulator works, a vendor claims performance, or an AI model agrees with itself.

## 9. Reference documents

- `docs/WAVERADAR_MASTER_STATUS_AND_TASK_REGISTER.md` — project status and historical evidence snapshot.
- `docs/WAVERADAR_WORKFLOW_AND_OWNER_CONTROL.md` — delegated work boundaries and owner approvals.
- `docs/CMVISUAL_TEVV_VALIDATION_MASTER.md` — verification and validation test families.
- `docs/CMVISUAL_VALIDATION_LAB.md` — Research & Validation Lab governance and workflows.
- `docs/WAVERADAR_INDEPENDENT_ARCHITECTURE_AND_INSTITUTIONAL_PLAN.md` — independent architecture and institutional plan.

**Important:** This register is an architecture and governance planning artifact. It does not certify the product, authorize field use, or establish that listed capabilities are implemented.

## 10. Scanner Fusion Network and persistent 3D World Model

**Status:** Architecture requirement / planned capability. This section is not evidence that multi-device ingestion, room-level sensing, through-wall detection, or validated 3D localization is currently implemented.

### 10.1 Operator workflow

The target workflow is a spatial-temporal investigation interface:

1. Command staff select an authorized incident area on the world map.
2. They open a building, floor, and room where reliable building geometry and identifiers exist.
3. They choose a time interval and optional source, modality, device, and evidence-class filters.
4. The system retrieves only observations the operator and source are authorized to access.
5. Every result exposes its source, capture and receipt times, coordinate frame, location uncertainty, device capability, calibration state, provenance, evidence class, validation status, and link to immutable raw evidence where permitted.
6. The operator can replay synchronized observations and compare sources without erasing disagreement or missing-data intervals.

A room with no observations must be shown as **NO DATA / COVERAGE UNKNOWN**, not as empty, clear, safe, or searched.

### 10.2 Scanner and source registry

Each scanner/source record must include:

- Stable source ID; owner/organization; device ID; manufacturer, model, hardware revision, serial/asset reference, firmware and adapter version where available.
- Modality and exact measurement types; units; sampling rate; timestamp semantics and clock domain; coordinate frame; transport and power requirements.
- Actual hardware/API/driver evidence establishing that the capability exists on this device and configuration.
- Frequency, bandwidth, range, resolution, field of view, accuracy, and coverage only where supported by authoritative specifications or measured characterization. Unknown values remain UNKNOWN.
- Calibration profile, certificate/reference, date, expiry, uncertainty, intrinsic/extrinsic transforms, and calibration status.
- Environmental and operating limits; interference/coexistence constraints; known failure modes; health and data-age state.
- Permission/consent basis, operator authorization, license/terms status, data classification, retention rule, encryption and key-management profile.
- Evidence classes and validation status for each use case, not one global validated flag.

A source may advertise a capability without producing a measurement. Keep **CAPABILITY DECLARED**, **HARDWARE DETECTED**, **PERMISSION GRANTED**, **STREAM REGISTERED**, **SAMPLE RECEIVED**, **CALIBRATED**, **INTEGRITY VERIFIED**, and **INDEPENDENTLY VALIDATED** as separate states.

### 10.3 Connector and ingestion contract

All connectors implement a versioned adapter contract with capability discovery, permission checks, start/stop lifecycle, health reporting, raw payload preservation, normalized observation output, clock metadata, error states, and deterministic teardown.

Allowed source families are conditional on real access and authorization:

- Opt-in enrolled phones: camera, native motion sensors, GNSS, and supported platform pose/depth APIs only when runtime capability checks confirm availability.
- Wi-Fi: authorized device/AP telemetry and CSI only where chipset, firmware, driver, API, permission, and local law actually permit access.
- Cellular: public coverage/open datasets or explicitly authorized carrier/network telemetry. Public coverage is infrastructure context, not a people-sensing measurement.
- Power systems: public datasets or utility/asset-owner-authorized telemetry. Grid telemetry is infrastructure state, not a people-sensing measurement.
- Dedicated UWB, FMCW/mmWave radar, thermal, depth/LiDAR, environmental, and other scanners only after physical hardware is present, identified, enrolled, and separately qualified.
- Building plans, CAD/BIM, GIS, and open maps only with source/version, coordinate reference, license, rights, and accuracy limitations recorded.
- Public research datasets remain separate from live incident evidence and must retain their license, provenance, and benchmark-only designation.

Never infer that ordinary Wi-Fi, cellular, or power infrastructure is inherently a human scanner. No unauthorized network access, interception, probing, credential bypass, private-content collection, or aircraft control is permitted.

### 10.4 Spatial-temporal event model

Every observation must preserve its immutable source payload or a content-addressed raw-evidence reference and carry:

- Observation ID, source ID, device ID, incident/tenant scope, sequence number, adapter/schema version.
- Capture time, receive time, clock domain, synchronization estimate, offset/drift uncertainty, and missing/invalid timestamp state.
- Position and orientation separately from sensor pose; coordinate reference/frame, transform lineage, units, and covariance/uncertainty where available.
- Measurand, modality, calibration state, quality flags, environmental context, evidence class, validation state, and raw-data hash.
- Consent/permission, access policy, license/terms reference, retention class, and audit lineage.

Ingestion must be idempotent and append-only. Detect and surface duplicate, replayed, out-of-order, spoof-suspect, malformed, stale, clock-inconsistent, coordinate-incompatible, and unauthorized records. Quarantine an observation from a specific analysis when required, preserve the original, and record the reason. A hash establishes byte-level integrity relative to a trusted manifest; it does not establish source authenticity or scientific truth.

### 10.5 Fusion and uncertainty policy

1. Preserve source-level streams and source-specific uncertainty; fusion never overwrites raw evidence.
2. Fuse only measurements with compatible measurands, units, coordinate frames, time semantics, calibration, and documented error models.
3. Do not average incompatible modalities or correlated measurements as if they were independent. Record dependence assumptions and avoid double-counting shared upstream sources.
4. Keep conflicts visible with source attribution, time alignment, magnitude, and unresolved status. Do not hide disagreement behind a single confidence score.
5. Treat missing, stale, low-quality, out-of-distribution, uncalibrated, and unavailable data as explicit states.
6. Distinguish observed position, estimated object position, device position, camera pose, and reconstructed geometry. Do not create a spatial overlay unless its transform and uncertainty are supportable.
7. Predictive outputs remain PREDICTED/INFERRED, include horizon and uncertainty, and are evaluated prospectively on held-out data. They cannot become measured evidence or validated alerts automatically.

### 10.6 Visual and audible command intelligence

The command interface should provide a synchronized map/building/floor/room view, source registry, time-window replay, timeline, source comparison, coverage gaps, and drill-down from any overlay to its contributing observations and raw evidence.

The AI explanation layer may produce concise spoken and written summaries containing: what was observed; by which source and when; what is derived or inferred; confidence/uncertainty; source conflicts; what is unknown or unavailable; change over time; and the next useful verification step. Recommendations must be labeled as recommendations, not observations or commands. Speech must support configurable verbosity, quiet mode, priority levels, transcript/audit history, and equivalent visual presentation. Avoid alarm overload and never issue unsupported certainty.

### 10.7 Security, privacy, and legal gates

Enforce tenant/incident isolation, least privilege, authenticated device identity, authorization per source and data type, explicit operator consent where required, encryption in transit and at rest, key rotation, signed provenance where feasible, audit logging, data minimization, retention/deletion policy, and license/terms review before ingestion or reuse. Publicly accessible does not automatically mean commercially reusable. Do not expose precise location, imagery, audio, biometric, or personal data to unauthorized roles. Research, training, operational, and public-release datasets require separate access and purpose controls.

### 10.8 Validation and acceptance gates

Before a source can contribute to a validated use case, require modality-specific qualification and independent evidence. Test families include:

- Source discovery, identity, permission, lifecycle, sample arrival, and failure-state correctness.
- Clock synchronization, timestamp drift, sequence integrity, duplicate/replay handling, and offline store-and-forward recovery.
- Intrinsic/extrinsic calibration, coordinate-frame transforms, surveyed geometry comparison, and uncertainty propagation.
- Per-modality performance with positive/negative controls, blinded ground truth where feasible, environmental variation, repeatability, false-positive/false-negative analysis, and preregistered acceptance criteria.
- Cross-sensor dependence, disagreement, missingness, interference/coexistence, and degraded-mode tests.
- Role/tenant isolation, access denial, retention, audit, export integrity, threat modeling, and privacy review.
- Human-factors evaluation of map navigation, source inspection, replay, audible summaries, and operator comprehension.

Passing software tests establishes implementation behavior only. It does not validate physical sensing, localization, through-wall detection, firefighter safety, or operational readiness.

### 10.9 Initial backlog and ownership

| ID | Priority | Owner | Status | Acceptance evidence |
|---|---|---|---|---|
| WR-TECH-3D-01 | Critical | WaveRadar engineering | Planned | Versioned observation and coordinate-frame contract with schema tests |
| WR-TECH-SRC-02 | Critical | WaveRadar engineering | Planned | Source registry and per-capability lifecycle states; unsupported states tested |
| WR-TECH-ING-03 | Critical | WaveRadar engineering | Planned | Idempotent append-only ingestion, raw evidence references, hashes, replay/duplicate tests |
| WR-TECH-FUS-04 | Critical | Research & Validation Lab + engineering | Research | Preregistered compatibility/dependence rules and contradiction test suite |
| WR-TECH-WIS-05 | High | WIS engineering | Planned | Map/building/floor/room/time/source filters with no-data and uncertainty states |
| WR-TECH-AUD-06 | High | WIS engineering | Planned | Attributed voice/text summary with observation-vs-recommendation labels and transcript |
| WR-EVID-3D-07 | Critical | Independent evaluator | Blocked | Surveyed physical ground truth, calibration evidence, uncertainty budget, independent report |
| WR-RISK-SEC-08 | Critical | Security owner | Planned | Threat model, tenant isolation tests, permission/license gate, audit and retention evidence |

Dependencies: current Phase 0 Android baseline and evidence contract; a versioned building/coordinate model; actual source hardware and authorization; qualified test equipment; and independent ground truth. Phone-only development may implement the registry, UI, provenance, and camera-visible workflows, but it cannot unlock RF sensing, through-wall claims, or validated room-level localization.

**Release rule:** The Scanner Fusion Network remains a research/decision-support architecture until each contributing modality and each safety-relevant derived capability passes its own acceptance and independent-validation gates. No empty-room, all-clear, victim-location, or through-wall claim may be inferred from absence of detections or infrastructure telemetry.


---

## 7. Live program reconciliation — 2026-11-16 (Central)

This section supersedes older status statements where later dated evidence exists. Repository records, user reports, tool results, and external validation remain distinct evidence classes.

### 7.1 Verified engineering and infrastructure state

- **Browserless architecture:** PR #78 is open and draft. Its branch now removes the Playwright MCP smoke workflow and launcher, removes the Playwright package script, adds `scripts/test-browserless-config.mjs`, and runs that check from the code-quality workflow. The test checks package dependencies/scripts, `.mcp.json`, and GitHub Actions workflow files. The current four workflow files, package manifest, and MCP configuration were statically inspected; no prohibited browser-control dependency/reference was found in those inspected surfaces.
- **Test evidence:** The new browserless regression test passed in an isolated Node 22 fixture. It has not yet run in GitHub Actions on PR #78. PR #78 is currently non-mergeable (`mergeable_state=dirty`) and has no reported workflow runs. The branch must not be represented as merged or fully accepted.
- **Application runtime boundary:** React/Vite, Capacitor, and Android System WebView remain the application rendering stack. They are not Chrome Remote Control and must not be removed without a separate native migration and compatibility tests.
- **CI evidence on other active branches:** PR #77, #81, #82, #83, #84, and #93 have recorded successful Android build, runtime-safety, and/or code-quality workflows on their inspected heads. PR #83's two workflows were still running after the latest funding-document update; recheck before calling them passed. PRs remain unmerged. PR #77 is non-mergeable; #81 is stacked on #77; #82, #83, #84, and #93 were mergeable at the last inspection.
- **Evidence-class safeguard:** PR #93's CI passed. The latest review follow-up reports strict evidence-class normalization, regression coverage for missing/unrecognized evidence labels, and preservation of a locked track's last-known snapshot as stale. This is software behavior, not physical sensing validation.
- **Super/remote-device state:** No Android phone-farm device is currently connected to the Super account. Free Android device testing is therefore unavailable through that route. Chrome access requires a paid subscription and is not part of the WaveRadar architecture or a required path.
- **Automation:** One consolidated WaveRadar Master Program daily automation is enabled for 9:00 a.m. Central; nine older overlapping automations are paused. This is a scheduled reporting workflow, not proof of a continuously running free host or durable autonomous execution.

### 7.2 Legal and federal-registration readiness

- **Missouri entity:** Missouri Articles of Organization for WaveRadar LLC were accepted November 15, 2026, according to the founder's confirmation.
- **EIN:** The founder reports reaching the IRS EIN confirmation screen. The EIN number/official confirmation record has not been recovered into the accessible project records.
- **SAM.gov:** The founder reports completing the SAM.gov task. Active entity registration, UEI, and current registration status have not been independently verified in the accessible records.
- **Still unverified:** SBA Company Registry and DOE SBIR/STTR Application Hub (AMP) access. These are separate from SAM.gov and must not be inferred from it.
- **Operating rule:** Treat the LLC as formed per the reported acceptance, but do not describe the federal registration package as complete until the EIN record, active SAM registration/UEI, SBA Company Registry, and relevant application-hub access are verified.

### 7.3 Funding pipeline update

- **DOE FY26 Fall SBIR/STTR Topic 14 — Grid Innovations:** Active pitch window; deadline December 16, 2026 at 2:00 p.m. Eastern / 1:00 p.m. Central. Pitch is a screening stage; only invited applicants may submit a full application. Program-wide award totals are not applicant-specific guarantees.
- **GridLink prior-art gate:** IEEE 1901.3-2025 already defines hybrid PLC/RF PHY/MAC for smart-grid applications; gridComm GC8828 describes adaptive PLC/LoRa routing, dual-mode operation, and redundancy; IEEE 1901.3.1-2026 specifies test procedures. Therefore, basic hybrid PLC/radio, adaptive path selection, and failover are not defensible as novel WaveRadar inventions. A distinct vendor-neutral cross-vendor assurance/orchestration contribution remains only a hypothesis. Current recommendation: conditional no-go until a qualified grid-communications reviewer substantiates a technical gap and the team, isolated test fixture, and independent measurement path are credible.
- **USDA-NIFA SBIR/STTR Phase II:** Closes November 17, 2026, but eligibility is limited to prior Phase I SBIR/STTR awardees. Do not pursue absent documentary proof of the required prior Phase I award.
- **NIOSH R03 (RFA-OH-27-056):** Forecasted posting December 17, 2026 and due date February 16, 2027; not yet an open application as of this reconciliation. Treat dates as forecasts until the final NOFO is published.
- **FEMA FP&S FY2025:** Closed; next cycle not confirmed. Future route likely requires an eligible fire-service or research-institution lead, subject to the next NOFO.
- **No applications or pitches have been submitted** in the accessible records. Drafting and eligibility preparation do not equal submission or award.

### 7.4 Validation, device, and safety status

- The last historical diagnostic snapshot remains 4,021 observations, 0 integrity-verified, 8 registered devices, 0 validated devices, 78 runs, and 0 passed. These are historical values and must be rechecked against the live service before operational decisions.
- A fresh Android native-sensor baseline with independent physical ground truth remains outstanding. The current Motorola phone alone does not provide independent ground truth.
- Sensor support, permission, provider registration, sample arrival, freshness, timestamp integrity, calibration, pose availability, and independent validation remain separate states.
- No through-wall victim detection, absolute indoor-positioning accuracy, reliable victim localization, structural safety prediction, or live-incident operational readiness is established.
- The Research & Validation Lab must retain independent reviewer authority and must not certify WaveRadar's own claims solely from WaveRadar-generated software tests or models.

### 7.5 Media and demonstration status

- The five-minute WIS rescue demonstration remains at storyboard/script and concept stage; no completed rendered film or verified shareable production link is recorded.
- A search of the connected Descript drives found no existing WaveRadar/WIS demonstration project. No paid video-generation credits or subscriptions are authorized by the zero-upfront-cost constraint.
- Any eventual film must distinguish measured, derived, inferred, simulated, and demonstration-only visuals; it must not depict unvalidated through-wall detection or victim localization as real capability.

### 7.6 Dependency-ordered next actions

1. Resolve PR #78's merge conflict/dirty state without merging or overwriting unrelated branch work; run the new browserless CI check and a clean application build/test.
2. Reconcile stacked PR order: native Android diagnostics (#77) → wireless interoperability (#81) → occupant track UI (#93). Recheck current mergeability and CI before any merge.
3. Recheck PR #82 safety gate and PR #84 master register against the latest code and tests; keep safety-critical release blocked pending independent physical validation.
4. Recover the EIN confirmation record and verify SAM.gov active status/UEI, SBA Company Registry, and DOE AMP separately.
5. For GridLink, commission a prior-art review and technical reviewer before deciding whether a Topic 14 pitch is justified.
6. Prepare the NIOSH R03 application package for the forecasted December 17 posting, but wait for the final NOFO and secure qualified research, fire-service, and independent measurement partners.
7. Execute the fresh Android baseline only when a physical independent reference method is available; preserve raw evidence and all historical baselines.
8. Complete the five-minute demonstration production package, then render only when suitable media assets and a genuinely no-cost/authorized production path are available.

**Completion rule:** A branch commit, passing software test, drafted application, scheduled automation, or project storyboard is not equivalent to merge, deployment, physical validation, submission, award, continuous operation, or finished video.