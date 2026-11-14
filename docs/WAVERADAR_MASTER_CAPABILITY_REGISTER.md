# WaveRadar Master Capability Register

**Register date:** 2026-11-14  
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

## 7. Change control

Update this register through reviewable pull requests. Every change must explain the evidence supporting a maturity change, the risks introduced, the tests run, and the owner of follow-up actions. Never mark a capability validated solely because code exists, a build passes, a simulator works, a vendor claims performance, or an AI model agrees with itself.

## 8. Reference documents

- `docs/WAVERADAR_MASTER_STATUS_AND_TASK_REGISTER.md` — project status and historical evidence snapshot.
- `docs/WAVERADAR_WORKFLOW_AND_OWNER_CONTROL.md` — delegated work boundaries and owner approvals.
- `docs/CMVISUAL_TEVV_VALIDATION_MASTER.md` — verification and validation test families.
- `docs/CMVISUAL_VALIDATION_LAB.md` — Research & Validation Lab governance and workflows.
- `docs/WAVERADAR_INDEPENDENT_ARCHITECTURE_AND_INSTITUTIONAL_PLAN.md` — independent architecture and institutional plan.

**Important:** This register is an architecture and governance planning artifact. It does not certify the product, authorize field use, or establish that listed capabilities are implemented.