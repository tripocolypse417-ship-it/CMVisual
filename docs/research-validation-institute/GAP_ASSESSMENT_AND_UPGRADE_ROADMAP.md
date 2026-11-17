# WaveRadar Research & Validation Institute — Independence Gap Assessment and Upgrade Roadmap

**Status:** Proposed governance and operating upgrade; not an accreditation claim.
**Purpose:** Turn the existing Institute charter into a credible, independently governed TEVV program with reproducible test methods and externally reviewable results.

## 1. Executive assessment

The existing charter already establishes a strong foundation: evidence provenance, append-only records, preregistration, independent ground truth, role separation, conflict declarations, reviewer scope, negative-result retention, and gated technology promotion.

The principal gap is not another dashboard or more AI. It is institutional independence and demonstrated technical competence. The Institute is currently a WaveRadar-controlled program in design/implementation, not an independently governed research institution, accredited testing laboratory, IRB, certification body, or regulator.

The first objective should be to establish an independently governed research and test program, preferably hosted with an existing university, public laboratory, fire-service research organization, or competent third-party test facility. Build toward formal accreditation only when scope, staff competence, equipment, quality system, proficiency evidence, and demand justify it.

## 2. Critical gaps and required controls

### A. Independence and governance — critical

**Gap:** A founder-controlled program can create perceived or actual conflicts when evaluating WaveRadar technology, selecting thresholds, interpreting results, or publishing failures.

**Upgrade:**
- Establish an external Scientific and Technical Advisory Board with a majority of members independent of WaveRadar.
- Establish a separate Test Integrity and Ethics Committee; neither committee reports to product engineering for technical conclusions.
- Require written conflict-of-interest declarations at intake, protocol approval, test execution, analysis, review, and publication.
- Recuse conflicted members; record recusals and dissent.
- Give the independent reviewer authority to require reanalysis, mark a test invalid, or publish a minority opinion.
- Prohibit product leadership from changing locked protocols, raw evidence, analysis outputs, or result classifications.
- Publish a governance charter, reviewer-selection criteria, appeals procedure, and annual transparency report.
- Seek an external host/partner for initial confirmatory tests. Do not call a WaveRadar-only review “independent.”

### B. Competence and quality management — critical

**Gap:** A protocol and hash are not proof that a test operator, instrument, method, or laboratory is competent.

**Upgrade:**
- Create a quality manual and controlled SOP set: document control, training/competence, equipment, calibration, method validation, sample handling, nonconforming work, corrective/preventive action, internal audit, management review, complaints, data integrity, and record retention.
- Maintain a competence matrix for every role and test method, with training, observed qualification, authorization scope, and requalification dates.
- Maintain an equipment register with serial/model, firmware, calibration status, traceability chain, uncertainty, maintenance, and out-of-tolerance actions.
- Use reference instruments with documented calibration and uncertainty appropriate to each claim.
- Run inter-operator and inter-laboratory comparisons where possible; record proficiency and reproducibility.
- Make “not competent / not calibrated / not in scope” a blocking result, not a warning.

### C. Measurement science and ground truth — critical

**Gap:** The charter requires independent ground truth but does not yet require a complete measurement uncertainty budget or traceability plan for every measurand.

**Upgrade:**
- Define the measurand precisely: what quantity, unit, coordinate frame, time basis, spatial extent, and operating envelope are being tested.
- Identify the reference method, calibration chain, traceability, resolution, uncertainty, environmental sensitivity, and limitations.
- Quantify uncertainty from reference equipment, alignment, synchronization, operator, sampling, and processing.
- Set acceptance limits before testing and justify them from intended use and consequence of error.
- Report distributions and tails (median, P90/P95/P99 where appropriate), not only averages.
- Keep sensor measurement error, algorithm error, ground-truth error, and end-to-end task error separate.
- Treat a hash as evidence that bytes have not changed after hashing—not evidence that the original measurement was accurate or truthful.

### D. Statistical design and reproducibility — critical

**Gap:** The charter calls for sample-size rationale and held-out evaluation, but needs a more explicit statistical analysis plan and control of repeated testing.

**Upgrade:**
- Require a preregistered Statistical Analysis Plan for every confirmatory study.
- Define primary/secondary endpoints, estimands, denominators, exclusions, missing-data rules, multiplicity handling, stopping rules, confidence intervals, and subgroup analysis before collection.
- Power studies for meaningful effect sizes and rare but consequential failure modes; do not choose sample sizes by convenience alone.
- Split datasets by participant, site, device, operator, session, and time as appropriate to prevent leakage.
- Use blind or randomized test ordering where feasible; separate model developers from final test operators and analysts.
- Include negative controls, adversarial cases, baseline comparisons, ablation, and failure injection.
- Repeat tests on new days, operators, devices, and sites; distinguish repeatability from reproducibility and generalization.
- Publish all prespecified endpoints, including null, negative, and inconclusive results.

### E. AI and prediction evaluation — critical

**Gap:** The Institute needs model-specific safeguards beyond ordinary software tests.

**Upgrade:**
- Maintain a model/system card for each evaluated model: intended use, prohibited use, architecture/version, training data provenance, licensing, known limitations, and update history.
- Pin model weights, code commit, runtime, dependencies, prompts/configuration, thresholds, and dataset manifests.
- Maintain immutable train/validation/test manifests and leakage checks.
- Evaluate calibration, uncertainty quality, selective prediction/abstention, subgroup performance, out-of-distribution behavior, drift, robustness, and failure recovery.
- Use independent holdouts and external replication; prohibit self-certification by the model developer.
- Require human factors testing for alerts, false reassurance, alarm fatigue, operator workload, and override behavior.
- No model retraining or online learning from operational incident data without consent/legal basis, governance approval, data-quality review, and a controlled release process.
- A model score is never itself a safety case or clinical diagnosis.

### F. Safety engineering and human factors — critical for emergency use

**Gap:** The charter has an operational safety gate but needs a formal safety-case structure and explicit hazard ownership.

**Upgrade:**
- Build a hazard log and safety case for each intended operational use, with hazard, hazardous situation, harm, severity, likelihood, controls, verification evidence, residual risk, and accountable owner.
- Conduct FMEA/FMECA, fault-tree analysis, misuse analysis, and system-theoretic hazard analysis as appropriate.
- Test safe-state behavior for sensor loss, stale/conflicting inputs, communication loss, low battery, thermal overload, network partition, localization uncertainty, and model abstention.
- Test degraded modes and fail-safe/manual fallback with actual responders in controlled exercises.
- Separate advisory features from control functions; retain human authority over dispatch, entry, victim contact, medical decisions, and robot/drone actions.
- Require a field safety officer and stop-work authority for every live exercise.
- Do not test unvalidated features in live emergencies.

### G. Cybersecurity, privacy, and data governance — high

**Gap:** Existing access-control and upload-quarantine concepts need a full threat model, security verification, and governed data lifecycle.

**Upgrade:**
- Threat-model the full ecosystem: phone, helmet, drone, robot, radio/network, cloud, identity, APIs, model supply chain, update mechanism, and lab portal.
- Apply least privilege, MFA for privileged access, secure key management, signed releases, SBOMs, dependency scanning, vulnerability disclosure, incident response, backup/restore testing, and penetration testing.
- Define data classification, minimization, lawful basis, consent, de-identification, retention/deletion, access/export, breach response, and secondary-use rules.
- Treat biometric, health, location, voice, video, and incident data as sensitive by default.
- Do not use real victim or patient data for model training absent documented legal authority, appropriate consent/waiver, privacy controls, and independent approval.
- Keep research and production environments segregated; never expose production secrets to external researchers.

### H. Human-subject and clinical research oversight — high

**Gap:** Human presence, injury assessment, responder performance, and patient-related research can trigger ethical and regulatory obligations that the Institute cannot self-assign away.

**Upgrade:**
- Before involving human participants, determine whether the activity is human-subjects research and whether IRB review, exemption determination, consent, or other oversight is required.
- Partner with an established IRB or institution for studies requiring review; do not represent the Institute itself as an IRB unless properly constituted and qualified.
- Use informed consent, privacy protections, withdrawal procedures, adverse-event reporting, and extra safeguards for vulnerable participants.
- For injury/medical-assessment claims, obtain qualified clinical leadership and determine applicable medical-device/regulatory requirements before any clinical or diagnostic claim.
- Use simulated or mannequin scenarios for early engineering work; keep real patient studies outside the initial pilot.

### I. Public reporting, correction, and appeals — high

**Gap:** Results must be accessible and correctable without allowing sponsors to suppress unfavorable findings.

**Upgrade:**
- Create a public registry of accepted studies with protocol ID/version, status, sponsor/funding, conflicts, and planned endpoints.
- Publish a report for every completed confirmatory test, including limitations, deviations, missingness, failures, and dissent.
- Provide machine-readable evidence manifests and analysis code where lawful and safe.
- Use independent technical review before result issuance.
- Add a correction/retraction policy and a formal appeal route that cannot silently overwrite the original report.
- Publish sponsor/funder influence disclosures and an annual count of supported, rejected, inconclusive, and withdrawn studies.

## 3. Proposed institutional structure

1. **Governing Council:** approves charter, independence policy, budget controls, and public accountability.
2. **Scientific and Technical Advisory Board:** external subject-matter experts; approves methods and scientific scope.
3. **Test Integrity and Ethics Committee:** conflicts, protocol deviations, human-subject protections, and publication integrity.
4. **Methods and Metrology Unit:** measurement science, calibration, uncertainty, reference methods, and proficiency.
5. **AI/Software TEVV Unit:** software assurance, data science, model evaluation, cybersecurity, and reproducibility.
6. **Field Robotics and Responder Safety Unit:** drones, ground robots, exoskeletons, human factors, and controlled field testing.
7. **Evidence Custodian and Data Steward:** chain of custody, data quality, access, retention, and export.
8. **Independent Review Pool:** external reviewers assigned by competence and conflict screening.

One person may temporarily perform multiple administrative roles in a small pilot, but no person should approve their own protocol, execute and independently review the same confirmatory test, or adjudicate their own conflict.

## 4. Formal standards and frameworks to map against

Use these as a gap-analysis map, not as claims of compliance or accreditation:

- **ISO/IEC 17025:2017:** competence, impartiality, and consistent operation for testing/calibration laboratory activities. Map requirements to the actual test scope and seek accreditation through a recognized accreditation body only when ready.
- **NIST AI RMF 1.0 and TEVV guidance:** governance, mapping, measurement, management, independent review, and documented uncertainty for AI system risks.
- **HHS 45 CFR Part 46 / OHRP guidance:** determine applicability and obtain appropriate IRB/ethics review for human-subjects research.
- **NIST Cybersecurity Framework 2.0:** cybersecurity governance and lifecycle risk management.
- **Applicable medical-device and occupational/fire-service requirements:** determine with qualified regulatory and safety counsel based on intended use; do not assume one blanket standard covers the whole platform.

## 5. Revised result categories

Every report must select exactly one top-level disposition:

- **SUPPORTED WITHIN TEST ENVELOPE**
- **PARTIALLY SUPPORTED / RESTRICTED**
- **NOT SUPPORTED**
- **INCONCLUSIVE**
- **INVALID TEST — EVIDENCE PRESERVED**

Additionally, report separate statuses for:
- protocol compliance;
- measurement-system suitability;
- evidence integrity;
- ground-truth suitability;
- statistical adequacy;
- independent-review completion;
- safety-case status;
- privacy/security status;
- operational authorization.

A software test passing must never turn any of these independent statuses green by implication.

## 6. Priority implementation roadmap

### Phase 0 — Governance before claims
- Adopt the independence, conflict, publication, appeals, and non-suppression policies.
- Name interim roles without implying external independence.
- Publish the Institute's current status as a WaveRadar-controlled research program.
- Freeze the initial claims and intended-use boundaries.
- Recruit at least three external advisors with distinct expertise; do not invent appointments.

### Phase 1 — Minimum viable quality system
- Create controlled SOPs, training/competence matrix, equipment/calibration register, protocol templates, deviation/CAPA workflow, and audit schedule.
- Add uncertainty budgets and preregistered statistical analysis plans to the protocol schema.
- Create a public study registry and report template.
- Complete access-control, backup/restore, and evidence-export tests.

### Phase 2 — External pilot
- Select one narrow, non-safety-critical research question.
- Have an external institution or competent lab review the protocol and ground-truth plan.
- Run a feasibility-only study first; do not collect data if the required sensor measurements cannot be obtained lawfully and reproducibly.
- Use a blinded, held-out confirmatory phase only after feasibility and protocol gates pass.
- Publish the result, including negative or inconclusive findings.

### Phase 3 — Competence and accreditation readiness
- Perform a formal gap assessment against ISO/IEC 17025 for a clearly bounded test scope.
- Conduct internal audits, management reviews, proficiency/inter-laboratory comparisons, and corrective actions.
- Apply for accreditation only when the laboratory can demonstrate competence for the specific scope requested. Do not claim broad accreditation for unassessed methods.

### Phase 4 — Multi-site validation network
- Add independent university, public-safety, metrology, clinical, and robotics partners.
- Harmonize protocols and data schemas; preserve site-specific deviations.
- Conduct multi-site replication and publish inter-lab reproducibility.
- Expand scope only when staffing, equipment, oversight, and funding match the new risk.

## 7. First 90-day deliverables

1. Independence and conflict-of-interest policy.
2. Public charter/status page with explicit non-accredited status.
3. External advisory recruitment brief and qualification criteria.
4. Controlled SOP index and document-control procedure.
5. Equipment/calibration/uncertainty register template.
6. Protocol preregistration and statistical analysis plan template.
7. Safety case and hazard-log templates.
8. Human-subject/IRB applicability checklist.
9. Model/system card and AI evaluation checklist.
10. Public results registry and negative-results publication policy.
11. External partner test brief for one bounded pilot.
12. ISO/IEC 17025 scope-specific readiness gap matrix.

## 8. Non-negotiable boundaries

- No claim of accreditation, certification, IRB authority, clinical validity, or independent validation unless the relevant authority and evidence exist.
- No founder or sponsor veto over valid negative findings.
- No retrospective threshold changes to make a result pass.
- No deleting failed records or replacing originals with corrected values.
- No use of synthetic/simulated results as physical measurements.
- No model self-evaluation as the sole validation.
- No operational deployment based only on a successful demo, software test, or laboratory result outside its tested envelope.
