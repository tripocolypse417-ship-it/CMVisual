# WaveRadar Independent Research & Validation Institute

**Status:** Approved strategic direction; implementation specification  
**First research candidate:** Wi-Fi beamforming-feedback / channel-state human-presence sensing (KIT BFId research)

## 1. Mission

Provide a repeatable, evidence-first process for evaluating emerging technologies against testable claims and real-world conditions. The Institute must be able to confirm, qualify, or reject a claim. Negative results must be preserved and every conclusion must be auditable.

The Institute is a research and validation program, not a certification body unless and until it obtains the required competence, governance, and accreditation. A WaveRadar validation result must never be described as formal certification or independent accreditation.

## 2. Operating principles

1. Evidence before claims. A paper, demo, simulation, vendor claim, or synthetic data alone cannot validate a capability.
2. Provenance is mandatory: origin, collector, timestamp, device/configuration, environment, consent/legal basis, and integrity hash where technically possible.
3. Original evidence is append-only after acceptance. Corrections are new linked records; never silently overwrite or delete originals.
4. Keep evidence classes distinct: MEASURED, DERIVED, INFERRED, PREDICTED, SIMULATED, UNKNOWN, and UNAVAILABLE.
5. Ground truth must be independent of the system being evaluated.
6. Pre-register claims, hypotheses, exclusions, conditions, sample-size rationale, metrics, and pass/fail thresholds before confirmatory testing.
7. Separate training, tuning, and final evaluation data by participant, site, device, and/or session as appropriate. Never tune on the final holdout set.
8. Retain failed, inconclusive, interrupted, and invalid runs with reasons.
9. Apply least privilege to every external researcher, tester, and reviewer.
10. No automatic production promotion. A passing research result creates an integration candidate, not an operational feature.
11. Minimize personal data, obtain informed consent where people are involved, define retention, and avoid identity inference unless separately justified, lawful, consented, and approved.
12. Define ownership, background IP, newly created IP, publication rights, confidentiality, licenses, and commercial integration rights before accepting data or prototypes.

## 3. Program divisions

### Research Intelligence
Monitor peer-reviewed research, preprints, patents, standards, public datasets, open-source projects, and field reports. Maintain a source register with publication date, authors, version, DOI/URL, license, and review status. Score relevance, evidence quality, maturity, feasibility, safety impact, cost, and IP risk. Discovery summaries are not validation.

### Independent Validation
Convert claims into testable hypotheses. Prepare protocols, ground-truth plans, sample-size rationale, controls, and analysis plans. Operate isolated workspaces and scoped tester assignments. Preserve raw evidence, logs, calibration records, and deviations. Support blinded or independent review where practical.

### Technology Integration
Review passed evidence against WaveRadar architecture and operational risk. Create adapters behind feature flags; keep experimental sources disabled by default. Run shadow-mode and non-safety-critical trials before operational consideration. Maintain rollback, compatibility, and monitoring plans. Require separate release approval for safety-critical use.

## 4. End-to-end lifecycle

DISCOVERED → SCREENING → IP/SAFETY REVIEW → ACCEPTED → PROTOCOL DRAFT → PRE-REGISTERED → TESTING → EVIDENCE LOCKED → REVIEW → RESULT ISSUED → INTEGRATION CANDIDATE / REJECTED / INCONCLUSIVE

Allowed outcomes:
- Supported within stated test envelope
- Partially supported / limited
- Not supported
- Inconclusive
- Invalid test, with reason and preserved evidence

Every status change records actor, timestamp, previous status, new status, rationale, and linked evidence.

## 5. Portal and workspace requirements

### Researcher submission portal
- Researcher organization and contact verification.
- Technology description, claimed capability, maturity, intended use, known limitations, and hazards.
- Source-paper, dataset, code, hardware, and license/provenance declarations.
- Requested evaluation scope and publication/confidentiality terms.
- Acknowledgement that submission does not imply acceptance, endorsement, certification, or integration.

### Program administrator console
- Intake queue, conflict-of-interest declarations, IP/safety/privacy gates, prioritization, and assignments.
- Project-level access policy and reviewer assignment.
- Protocol approval and version history.
- Evidence completeness, custody, and integrity status.
- Review findings, dissenting opinions, corrective actions, and final disposition.
- Integration candidate register and release approvals.

### Isolated experiment workspace
- Separate workspace per accepted project; separate credentials and scoped roles.
- No cross-project data access by default.
- Testers see only assigned protocols, devices, and collection tasks.
- Upload allow-list, file-size limits, malware scanning, content-type validation, and quarantine.
- Never execute submitted binaries, scripts, notebooks, or firmware on application servers.
- No access to WaveRadar production secrets, customer data, or unrelated experiments.
- Export only approved evidence packages with access logs.

### Reviewer workspace
- Read-only access to protocol, evidence manifest, evidence classes, analysis, deviations, and report.
- Reviewer identity, qualifications, conflicts, scope, and signed decision recorded.
- Reviewers can challenge exclusions, methodology, analysis, and conclusions.
- Dissent is retained in the final record.

## 6. Evidence record and chain of custody

Each observation or artifact should carry, where applicable:

- Evidence, experiment, protocol-version, and run identifiers.
- Evidence class and modality.
- Source device, model, OS/firmware, sensor/API, configuration, and calibration.
- Collector/tester identity or pseudonymous assignment ID.
- UTC event time, ingestion time, clock quality, and sequence number.
- Environment/site identifier, environmental conditions, and test geometry.
- Raw payload reference, schema version, units, coordinate frame, and uncertainty.
- Ground-truth method and reference artifact.
- Processing software/model version and parameters for derived results.
- Consent/legal basis and retention classification.
- Cryptographic digest, signature/attestation where supported, and custody events.

Store raw evidence separately from derived analysis. Every derived record links to inputs and transformations. Hashes prove integrity after capture; they do not prove that a sensor reading was truthful or that ground truth was correct.

## 7. Roles and access model

- Program Owner: policy, funding, and final accountability.
- Research Intake Manager: screening and communication; cannot approve own submission.
- Protocol Lead: test design and preregistration.
- Test Operator: executes assigned procedure; cannot alter a locked protocol.
- Evidence Custodian: controls acceptance, hashing, retention, and export.
- Independent Reviewer: read-only evidence review; declares conflicts.
- Safety/Privacy/IP Reviewer: approves relevant risk gates.
- Integration Engineer: implements approved adapters; cannot change validation outcomes.
- Auditor: read-only access to relevant logs and decisions.

Use role-based access plus project-level scope. Require MFA for privileged roles, short-lived credentials, revocation, and auditable access. Enforce server-side authorization on every read/write/export; hiding UI controls is not access control.

## 8. Validation scorecard

Do not collapse all dimensions into one opaque score. Report each separately:

| Dimension | Required evidence |
|---|---|
| Claim validity | Pre-registered hypothesis and measured outcome |
| Measurement integrity | Provenance, timestamps, calibration, completeness, integrity |
| Ground-truth quality | Independent reference method and uncertainty |
| Repeatability | Repeated runs and operator/site/device variation |
| Generalization | Held-out people, sessions, devices, sites, and conditions |
| Error profile | False positives, false negatives, precision, recall, calibration |
| Spatial performance | Localization error distribution and coverage, if claimed |
| Robustness | Interference, occlusion, environmental variation, failure behavior |
| Operational safety | Hazard analysis, failure modes, human factors, safe fallback |
| Reproducibility | Independent rerun and complete protocol/software manifest |
| Privacy/security | Data minimization, consent, threat model, access review |
| IP/licensing | Provenance, license compatibility, permissions, commercial rights |

Every metric includes denominator, confidence interval or uncertainty, test envelope, exclusions, and limitations. Thresholds are set before confirmatory testing and justified by intended use. There is no universal pass score.

## 9. Promotion gates

- G0 Intake: scope, ownership, provenance, and submission completeness.
- G1 Feasibility: hardware/API availability, cost, legal permissions, and testability.
- G2 Protocol approval: preregistration, ground truth, safety/privacy review, and thresholds.
- G3 Bench validation: controlled tests and instrumentation checks.
- G4 Independent replication: separate operator and held-out conditions.
- G5 Integration review: architecture, security, performance, licensing, and failure-mode review.
- G6 Operational authorization: separate safety case, field evaluation, human oversight, rollback, and accountable release approval.

Failure at any gate blocks promotion. Limited or inconclusive results can still be published accurately.

## 10. First pilot: Wi-Fi BFI / CSI human-presence sensing

### Research question
Can legally usable Wi-Fi channel/beamforming feedback measurements support reliable, non-identifying human-presence or movement detection within a defined test envelope, and can results generalize across people, sessions, devices, rooms, and environmental conditions?

The pilot must not target identity recognition. It must not claim through-wall imaging, exact victim localization, or firefighter-ready performance without separate evidence.

### Feasibility gate
1. Obtain and archive the exact paper, supplementary material, dataset description, code, and license/terms.
2. Confirm whether the paper's BFId inputs are available from candidate hardware and APIs.
3. Identify chipset, driver, and firmware constraints; do not assume Android exposes BFI/CSI.
4. Determine whether lawful, repeatable collection is possible without bypassing device security.
5. Record commercial-use restrictions and obtain permissions before use.
6. If required measurements cannot be accessed, record a feasibility failure rather than substituting simulated values.

### Controlled protocol
- Use consenting adult volunteers and non-identifying labels.
- Include presence/absence and movement/no-movement trials.
- Vary distance, orientation, room layout, wall/material configuration, device placement, furniture, occupancy, and RF interference.
- Record negative controls, empty-room baselines, repeated sessions, and environmental conditions.
- Separate participants and sessions between training/tuning and final holdout evaluation.
- Randomize trial order and blind the analyst to ground truth where feasible.
- Use an independent reference method with consent and documented uncertainty.
- Report false-positive rate per unit time/area, sensitivity, precision, recall, calibration, detection latency, coverage, and localization error only if localization is explicitly tested.
- Report performance by condition, not only aggregate accuracy.
- Preserve failures, missing samples, exclusions, and protocol deviations.

The pilot report states what was and was not demonstrated, exact hardware/software and conditions, data exclusions, uncertainty, and reproducibility package. Only then can an RF adapter be considered for WaveRadar, initially as an experimental evidence source.

## 11. Implementation roadmap

### Phase A — Governance and specification
Approve charter, submission terms, IP policy, privacy/retention policy, reviewer conflict policy, and safety escalation. Define evidence schema, lifecycle states, roles, audit events, and validation report template. Select a low-risk pilot and preregister feasibility questions.

### Phase B — Minimum viable portal
Build researcher intake and submission tracking; admin triage and project creation; scoped tester accounts and task assignments; protocol versioning and approval; evidence upload, quarantine, manifest, hashes, and append-only custody log; reviewer workspace and decision capture; exportable validation report and evidence manifest.

### Phase C — Assurance and testing
Threat model, authorization tests, tenant-isolation tests, upload-security tests, audit-log tests, backup/restore test, and retention enforcement. Synthetic fixtures may be used for software QA only and must be visibly marked SIMULATED; they never enter research evidence or validation results. Obtain independent security review before accepting sensitive external submissions.

### Phase D — Pilot and scale
Run the KIT BFI/CSI feasibility study, publish results with limitations, and add further candidates only when capacity and reviewer independence permit. Establish university and laboratory partnerships only through written agreements.

## 12. Non-goals and prohibited claims

The Institute does not initially certify products or provide regulatory approval; guarantee safety or field performance; identify individuals through RF sensing; infer victims from a single ambiguous signal; use generated or simulated measurements as physical evidence; silently rewrite or delete raw evidence; allow external testers to access production systems; transfer IP by accepting a submission; or automatically enable experimental capabilities in firefighter workflows.

## 13. Definition of done for the first portal release

- External submission can be created and tracked.
- Each accepted submission has an isolated project and scoped roles.
- Protocols are versioned and approval-gated.
- Evidence is immutable after acceptance, integrity-checked, and linked to provenance.
- Raw, derived, inferred, simulated, unknown, and unavailable data remain distinguishable.
- Reviewers can independently inspect and challenge results.
- Negative and inconclusive results remain preserved.
- Exports contain a manifest, protocol version, custody history, limitations, and reviewer decisions.
- Automated tests prove one project cannot access another project's records or files.
- No experimental result can be promoted to production without separate approval.

---

**Implementation note:** This document is a design specification, not a claim that the portal, security controls, validation process, or RF sensing capability have already been implemented. The current WaveRadar README records that physical validation is pending and that the phone-only workflow is not a validated through-wall sensing system. This specification preserves that distinction.
