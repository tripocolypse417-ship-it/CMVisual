# WaveRadar Integrated Program Operating System

**Purpose:** One evidence-controlled program for WaveRadar OS / WIS, Guardian X, independent research, validation, funding, and commercialization. This document is the operating source of truth for coordinating work across repositories, institutions, datasets, vendors, and reviewers.

## 1. Operating model

WaveRadar owns system requirements, interfaces, provenance, evidence custody, integration, and acceptance decisions. External partners perform bounded research, testing, specialist engineering, and independent review. No partner's work is accepted solely on its own assertion.

Use the least expensive credible route first: public data, published protocols, donated/in-kind equipment, university capstones and research collaborations, shared facilities, then paid specialist testing only when funding exists. Never represent a facility, partner, dataset, grant, or test as secured until documentary evidence confirms it.

## 2. Single evidence lifecycle

Every contribution must move through these states:

`proposed → source-checked → rights-cleared → protocol-approved → collected/imported → integrity-checked → independently-reviewed → accepted | rejected | quarantined`

Keep operational pipeline states distinct:
`candidate → verified → outreach-drafted → contacted → response-received → scoped → funded/in-kind-confirmed → testing → report-received → independent-review → closed`

A draft is not contact. A forecast is not an open grant. A dataset listing is not a licensed download. A test plan is not a test. A passed internal check is not independent validation.

## 3. Evidence classes and mandatory labels

Every displayed or exported claim must be labelled as one of:
- **Measured:** directly captured by a named sensor or instrument, with timestamp, calibration/status, units, and raw record.
- **Derived:** computed from measured inputs using a versioned method.
- **Inferred:** model-based interpretation with confidence/uncertainty and known failure modes.
- **Simulated:** generated in a simulation or synthetic environment.
- **Predicted:** a forecast with horizon, probability/calibration, and validation scope.
- **Unavailable:** required source absent, unsupported, denied, stale, or invalid.

Never convert missing data into a positive detection. Preserve original files and immutable hashes. Corrections are append-only; never silently rewrite historic observations or relabel old samples as validated.

## 4. Work packages and acceptance gates

| ID | Work package | External work sought | Minimum acceptance evidence |
|---|---|---|---|
| WP-01 | Android native sensor baseline | Independent motion/pose ground truth, repeatable phone capture | Raw sensor events, permission/support matrix, monotonic + wall-clock timestamps, clock drift, sample loss, device/build metadata, synchronized reference trajectory, reproducible report |
| WP-02 | Indoor localization | Optical tracking / surveyed reference / instrumented testbed | Per-frame reference truth, coordinate-frame definition, error distributions, NLOS/occlusion strata, failure cases |
| WP-03 | Wi-Fi CSI / RF | CSI capture and controlled RF experiments | Hardware/firmware/config manifests, channel/bandwidth, calibration, raw CSI, repeat trials, environmental metadata, rights |
| WP-04 | UWB | TWR/TDoA and anchor geometry experiments | Anchor survey, clock/sync data, raw ranges, ground-truth trajectory, NLOS labels, error and availability statistics |
| WP-05 | mmWave radar | Presence/motion/pose feasibility tests | Raw radar data, sensor configuration, target materials/postures, clutter/occlusion matrix, confusion/error metrics; no through-wall claim absent direct proof |
| WP-06 | Building geometry / point clouds | Scan processing and semantic structure | Source scans, registration error, coordinate system, room/door/stair annotations, completeness and provenance |
| WP-07 | Fire/smoke/thermal perception | Public dataset audit and controlled thermal testing | Sensor modality and spectral band, calibration, scene conditions, frame-level labels, subject/privacy rights, split-leakage audit |
| WP-08 | PPE / thermal / human factors | Fire-service and PPE lab review | Applicable standard/method, thermal exposure protocol, ergonomics, mobility, heat burden, instrumented dummy first |
| WP-09 | Guardian X exoskeleton | Qualified mechanical, controls, and human-factors engineering | Load paths, force/torque limits, emergency disengagement, power isolation, pinch/crush analysis, thermal/environmental limits, failure analysis |
| WP-10 | Integrated portable rescue tool | Rescue-tool specialist and structural test lab | Tool force/speed/energy limits, mount load cases, independent reaction frame/anchor, restraint and release tests, manual fallback, instrumented surrogate tests |
| WP-11 | Drone/robot interoperability | Public datasets and partner sensor exports | Read-only ingest, time/frame alignment, sensor provenance, geofence/privacy constraints, no unauthorized vehicle control |
| WP-12 | Cybersecurity / resilience | Independent threat model and penetration assessment | Asset/threat model, authentication/authorization tests, signed audit logs, offline/degraded-mode tests, remediation retest |
| WP-13 | WIS integration and human factors | Fire chiefs, firefighters, dispatch and usability researchers | Task-based study, workload/error measures, accessibility, role permissions, clear uncertainty and stale-data indicators |
| WP-14 | Independent system review | External reviewer with no implementation ownership | Reproducible test package, conflict disclosure, evidence traceability, limitations, dissenting findings |

No high-risk human testing until qualified engineering review, applicable ethics/safety approvals, and instrumented surrogate/fixture tests are complete.

## 5. Guardian X rescue-tool safety boundary

A portable spreader/cutter or similar rescue tool may be evaluated as an integrated module, but the firefighter's body or exoskeleton must not be assumed to be the reaction anchor. The reaction path must terminate in a separately engineered, rated, inspectable support structure or verified external anchor. Require:
- load-path and stability analysis for all tool orientations and worst-case reaction loads;
- positive mechanical retention plus rapid, deliberate emergency release;
- fail-safe behavior on power loss, jam, sensor fault, or controller fault;
- thermal isolation and protected power routing;
- pinch/crush and entanglement analysis;
- independent manual operation and removal;
- instrumented fixture/surrogate testing before any human trial.

## 6. Dataset intake contract

For every dataset, record: canonical source URL; publisher; version/date; license and commercial-use terms; attribution; consent/privacy restrictions; sensor and firmware; units; coordinate frames; timestamps/synchronization; ground-truth method and accuracy; participants/devices/sites; missingness; train/test split provenance; checksum; download date; retention/deletion rules.

Classify labels correctly: activity labels are not location ground truth; image class labels are not thermal calibration; point clouds are not live tracking; simulated data are not field evidence. Do not train or redistribute until rights are checked.

## 7. Partner engagement contract

Every outreach package contains: narrow research question; bounded scope; proposed protocol; required instruments; expected data/report deliverables; data ownership and publication options; privacy/security plan; cost or in-kind request explicitly framed as unconfirmed; independence/conflict disclosure; no request for proprietary data without a rights agreement.

Track official contact evidence and correspondence. Never mass-email or send drafts without explicit user authorization. Do not make commitments, promise equity, or disclose sensitive operational details.

## 8. Funding readiness

Maintain separate tracks:
- **R03-style feasibility:** bounded secondary-data or pilot measurement question with measurable aims.
- **R21-style exploratory development:** technical feasibility and high-risk/high-reward aims.
- **SBIR/STTR and state/regional programs:** only when the entity, solicitation, and applicant eligibility are verified.
- **In-kind / sponsored research:** facilities, equipment loans, faculty time, student projects, independent review.

For every opportunity capture official notice, applicant eligibility, due date/time/timezone, budget ceiling, cost-share/indirect rules, required registrations, partner letters, IP/data terms, and submission owner. Forecast notices remain forecast until the official notice opens.

## 9. Program dashboard metrics

Report counts with denominators and dates:
- candidate / rights-cleared datasets;
- verified partner contacts / drafts / actual responses;
- scoped work packages / funded or in-kind-confirmed packages;
- tests planned / run / integrity-passed / independently reviewed;
- claims supported by measured, derived, inferred, simulated, predicted, or unavailable evidence;
- unresolved blockers, risks, and decisions.

Do not report a percentage without a defined denominator. Do not claim a confidence threshold without a statistically defensible analysis and independent replication.

## 10. Immediate execution order

1. Freeze and preserve the existing historical diagnostic baseline; do not retroactively validate it.
2. Run a fresh Android native-sensor capture protocol on the available test phone, with an independent reference instrument or facility. If reference equipment is unavailable, label the run engineering-only.
3. In parallel, request scoped feasibility conversations with NIST PSITC/Z-Axis, NIST PerfLoc, UW NEWT, Northeastern INSI, SUNY Polytechnic AERFC, UMass Lowell NERVE, Iowa State NexGenPPT, and Illinois Fire Service Institute. Outreach drafts remain unsent until explicitly authorized.
4. Audit the candidate dataset corpus for rights, ground truth, version, and split leakage before any model training.
5. Keep Guardian X mechanical and rescue-tool integration in analysis/fixture design until a qualified lab can assess load paths and safety.
6. Build one reproducible benchmark harness before expanding model claims.
7. Pursue grant eligibility and institutional PI/partner fit before writing a full application.

## 11. Decision rule

Prefer a smaller, reproducible, independently checked capability over a broad but unverified feature set. A feature is not production-ready until its safety case, provenance, failure behavior, and acceptance evidence are documented.
