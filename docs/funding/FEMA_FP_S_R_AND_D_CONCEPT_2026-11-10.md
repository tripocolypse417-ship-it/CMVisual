# WaveRadar — FEMA FP&S Firefighter Safety R&D Concept

**Document status:** Planning draft for future-cycle discussion only  
**Prepared:** 2026-11-10  
**Founder:** Joshua Marks  
**Proposed entity:** WaveRadar LLC, intended Missouri single-member LLC; **not registered**  
**Application status:** No FEMA application submitted; no award, partner, pilot, or independent validation established

> This document is a research-planning artifact, not a FEMA application, legal opinion, procurement determination, or representation that WaveRadar is eligible for a FEMA award. The FY2025 FP&S application period is closed. The next cycle, if any, must be assessed against its own published NOFO.

## 1. Executive concept

**Working title:** Independent Characterization and Controlled Evaluation of Evidence-Driven Sensor Fusion for Firefighter Situational Awareness.

**Research proposition:** Determine whether an evidence-preserving, time-synchronized sensor-fusion and command-visualization architecture can reliably present heterogeneous responder observations, environmental measurements, source provenance, freshness, and uncertainty in controlled firefighter training scenarios.

The research is not premised on a claim that a phone can see through walls, detect a victim, produce reliable indoor position, or replace established incident-command procedures. It will measure what each authorized sensor source actually provides, characterize its limitations, and evaluate whether presenting source-linked evidence and uncertainty improves specific, pre-defined information tasks.

The central research problem is the integrity of the complete measurement chain:

1. What did each sensor actually measure or report?
2. When was it measured, and how certain is its timestamp?
3. Which device, firmware, application build, calibration, and permission state produced it?
4. Can observations from different sources be aligned without hiding clock error, missingness, drift, or disagreement?
5. Which spatial or environmental outputs are directly measured, derived, inferred, or simulated?
6. Can an independent evaluator reproduce the reported results against appropriate physical ground truth?

## 2. Controlling FY2025 FEMA FP&S facts — historical, not an open opportunity

Official records:

- [Archived FY2025 FP&S opportunity on Simpler.Grants.gov](https://simpler.grants.gov/opportunity/46f6ea4c-82e0-44f3-b1f0-5ce848a19fc7)
- [FY2025 FP&S Notice of Funding Opportunity (PDF)](https://files.simpler.grants.gov/opportunities/46f6ea4c-82e0-44f3-b1f0-5ce848a19fc7/attachments/1272832b-fe85-4118-a905-5d3d9e8ebcf4/FY25_FPS_NOFO_Clean_app_date_508.pdf)
- [FEMA Fire Grants program page](https://www.fema.gov/grants/preparedness/firefighters)
- [FEMA Procurement Disaster Assistance Team](https://www.fema.gov/grants/procurement)

The FY2025 application window was **May 19–June 22, 2026** and is closed. The opportunity is archived. No next-cycle application date is assumed.

The FY2025 R&D activity was aimed at improving firefighter safety, health, or well-being through research and development intended to reduce firefighter fatalities and injuries. Eligible R&D categories included Clinical Studies, Technology and Product Development, Preliminary Studies, and Early Career Investigator.

The FY2025 R&D prime-applicant types were national, state, local, and federally recognized Tribal government entities, and nonprofit organizations such as universities, research foundations, public-safety institutes, public-health, occupational-health, and injury-prevention institutions. Both public and private nonprofits could apply. **Fire departments were not eligible to apply under the R&D activity**, although fire-service participation was an important partner and implementation factor. For-profit organizations and individuals were not eligible R&D applicants.

Historical FY2025 parameters, to be rechecked against any future NOFO:

- Total FP&S programme funding: $32.4 million.
- Expected award range: $1 million–$1.5 million; maximum federal share generally $1.5 million.
- Early Career Investigator projects: maximum federal share $600,000.
- Cost share: generally at least 5% of the grant award; eligible cash and documented in-kind contributions could count.
- R&D period of performance: 12, 24, 36, or 48 months.
- Active SAM.gov registration and UEI were required for federal award eligibility; FEMA could request EIN and bank information during award selection, including for subrecipients.
- The recipient also had to maintain the applicable maintenance-of-effort level described in the NOFO.

These are FY2025 historical terms, not a prediction of future terms.

## 3. Applicant, subrecipient, contractor, and collaborator roles

These roles must be distinguished in any future proposal.

### 3.1 Eligible prime applicant

Preferred future structure, subject to a new NOFO:

- An eligible public university, nonprofit research foundation, public-safety institute, or eligible government research entity acts as prime applicant.
- The prime controls the proposal, scientific governance, award, budget, IRB coordination, reporting, and dissemination.
- Its Authorized Organization Representative (AOR) must be a duly authorized current employee, official, staff member, or leader of the recipient. A consultant or contractor cannot act as the prime's AOR.

Potential Missouri institutions for exploratory outreach only—not confirmed partners—include Missouri S&T, the University of Missouri Fire and Rescue Training Institute, and the University of Central Missouri/Missouri Safety Center.

### 3.2 WaveRadar as a subrecipient/subawardee

The FY2025 NOFO allowed subapplicants and subawards, but its R&D eligible-applicant list did not expressly resolve whether a for-profit technology company could be a subrecipient for the proposed work.

**Do not assume WaveRadar is eligible for a subaward.** Obtain written FEMA/program guidance and the prime institution's grants-office determination before naming a for-profit subrecipient or assigning it federal funds. A subrecipient performs a substantive portion of the programme and is subject to pass-through monitoring, applicable award conditions, reporting, and other requirements under 2 C.F.R. §§ 200.331–200.333.

### 3.3 WaveRadar as a contractor/vendor

A competitively procured contractor route may be possible for defined technology or engineering services, subject to the current NOFO and federal procurement rules.

Important conflict-of-interest constraint: the FY2025 NOFO states that a contractor that develops or drafts procurement specifications, requirements, statements of work, or solicitation documents may be excluded from competing for the resulting procurement. FEMA applies this concern to contractors that help a recipient or subrecipient develop its grant application, project plans, or budget. The NOFO describes a limited exception where one contract covers both development and execution and is procured in compliance with 2 C.F.R. §§ 200.317–200.327.

Therefore:

- The prime should independently own its procurement strategy and procurement specifications.
- WaveRadar should not draft a future competitive statement of work and then assume it can bid on that work.
- The prime's grants and procurement officials should obtain written advice before WaveRadar undertakes paid proposal-development or specification work.
- Any contract must be competitively and transparently procured, with documented rationale, selection, price basis, and conflict-of-interest controls.

### 3.4 Unpaid collaborator

An unpaid collaborator may provide limited technical context or participate in an exploratory discussion without a funded award or contract. This does not create a partnership, endorsement, subaward, intellectual-property licence, or right to reimbursement.

No partner, subrecipient, contractor, or collaborator is currently committed.

## 4. Proposed research aims

### Aim 1 — Sensor characterization and capability boundaries

Characterize each authorized sensor source independently before fusion.

Potential source families, only where the selected hardware and software actually expose them:

- Android camera and inertial sensors.
- GNSS and available cellular/network metadata.
- Wi-Fi measurements actually exposed by the device/API; do not substitute RSSI for CSI/BFI.
- Compatible external environmental sensors, such as temperature, humidity, gas, or visibility instruments.
- Authorized building plans and fixed reference points with recorded source, version, coordinate frame, and permissions.

Measure, where applicable:

- Availability, permission state, hardware support, registration, and sample arrival as separate states.
- Sample rate, timestamp source, timestamp resolution, noise, bias, drift, dropout, and latency.
- Repeatability across devices, sessions, operators, orientations, and environmental conditions.
- Calibration status, operating range, known failure modes, and uncertainty.

Unsupported sources remain UNAVAILABLE or UNKNOWN. A capability flag or browser API presence is not a measurement result.

### Aim 2 — Time synchronization, evidence provenance, and integrity

Develop and evaluate a reproducible observation chain that preserves:

- Original sensor payloads and immutable source records.
- Device identity as registered, without treating a software enrollment token as hardware attestation.
- Sensor type, vendor/model where available, firmware, application/build version, permissions, and configuration.
- Monotonic event timestamps, callback timestamps, wall-clock correlation, clock-offset estimates, drift, and synchronization uncertainty.
- Sequence numbers, dropped-sample indicators, ingestion receipts, and source-to-server timing.
- Calibration certificates and reference-instrument metadata.
- Content hashes and append-only audit events.

Hash matching establishes byte consistency, not author identity, sensor truth, calibration, or scientific validity.

Every output must retain one of these explicit classes: MEASURED, DERIVED, INFERRED, PREDICTED, SIMULATED, UNKNOWN, or UNAVAILABLE. No automatic promotion from metadata, simulation, or an unverified observation is permitted.

### Aim 3 — Spatial and environmental fusion against independent ground truth

Evaluate whether eligible, time-aligned sources can support bounded spatial or environmental outputs in a controlled test environment.

Use independent references appropriate to each claim, such as:

- Calibrated optical tracking or surveyed reference coordinates for the specific spatial quantity under test.
- Rigid fixtures and documented axis alignment for device-orientation experiments.
- Independent calibrated environmental instruments for temperature, humidity, gas, or visibility measurements.
- A documented common timing reference or measured clock-offset procedure.

Record the reference instrument's model, asset identifier, calibration status, range, resolution, uncertainty, acquisition rate, and raw export.

Compare each output with the independent reference using pre-registered metrics. Report coordinate-frame errors, time-alignment errors, missingness, drift, bias, repeatability, false positives/negatives, and uncertainty coverage.

Do not claim through-wall sensing, victim localization, absolute position from IMU alone, or indoor accuracy outside the tested envelope.

### Aim 4 — Command visualization and helmet-interface usability

Evaluate whether command and helmet displays present evidence in a way that operators can correctly interpret.

The display should expose:

- Source and measurement time.
- Data freshness and missingness.
- Evidence class and integrity state.
- Confidence/uncertainty and known limitations.
- Conflicting or unavailable sources.
- The difference between an observation, a derived result, an inference, and a simulation.
- Historical replay without silently mixing later-arriving evidence into the earlier view.

Test bounded information tasks in controlled training scenarios. Do not use a prototype display as an operational command authority or substitute for established incident command.

### Aim 5 — Controlled operational evaluation and dissemination

Use a staged, non-emergency training environment with a documented safety plan. No live-fire, IDLH, hazardous-atmosphere, or real-emergency testing is proposed in this initial concept.

Compare baseline and tool-assisted information tasks using pre-defined, measurable outcomes such as:

- Correct identification of the source and time of a reported observation.
- Correct interpretation of uncertainty and stale/missing data.
- Ability to distinguish measured facts from inferred or simulated information.
- Time to locate and replay a specified evidence item.
- Command/crew comprehension, usability, workload, and error rates.
- System latency, availability, data loss, and recovery behavior.

Use counterbalanced or randomized task order where feasible, pre-register exclusions and thresholds, and retain negative and inconclusive results. A usability or task-performance result does not by itself establish reduced injuries or improved survival.

Dissemination should include a technical report, firefighter-facing summary, reproducible protocol, limitations/failure-case register, and publications or datasets where rights, privacy, and award terms permit.

## 5. Study design and independent evaluation

**Planning duration:** 24 months as a design assumption only. The future NOFO controls the allowable period.

| Phase | Indicative period | Work and exit evidence |
|---|---:|---|
| 0. Governance and preregistration | Months 1–3 | Prime/subrecipient/contractor roles resolved; protocol, hypotheses, metrics, sample plan, analysis plan, privacy plan, and risk register approved before confirmatory data collection |
| 1. Bench characterization | Months 4–7 | Sensor inventory, calibration records, clock tests, repeatability, dropout, latency, and raw evidence package |
| 2. Controlled spatial/environmental trials | Months 8–12 | Independent reference comparisons, uncertainty estimates, failure cases, and held-out conditions |
| 3. Command/helmet task evaluation | Months 13–18 | Approved human-subjects work where applicable; usability and task-performance results with limitations |
| 4. Independent analysis and dissemination | Months 19–24 | Independent review, reproducible analysis, final report, public-facing summary, and implementation recommendations |

The schedule must be revised to match the selected prime's facilities, investigator availability, instrument access, and the next NOFO's period of performance.

### Experimental design controls

- Preregister primary and secondary outcomes, hypotheses, thresholds, exclusion rules, sample-size rationale, and analysis methods.
- Separate exploratory development data from confirmatory evaluation data.
- Hold out devices, sessions, operators, and environments where feasible to reduce leakage.
- Preserve failed, interrupted, incomplete, and contradictory runs with reason codes.
- Blind reference scoring or analysis to the system output where practical.
- Record protocol deviations and any changes before examining confirmatory results.
- Use an independent evaluator who is not responsible for developing the measured system.
- Publish uncertainty, negative results, and the conditions under which a result does not generalize.

## 6. Human-subjects, privacy, and safety plan

The FY2025 NOFO requires an Institutional Review Board (IRB) approval or exemption determination for projects involving human subjects, plus DHS Compliance Assurance Program Office (CAPO) concurrence before any human-subject activity begins. The recipient must ensure that subrecipients and subcontractors meet applicable requirements.

Planning controls:

- Obtain an IRB determination before recruitment or data collection involving human subjects.
- Obtain DHS CAPO concurrence where required before the activity starts.
- Use informed consent and a documented withdrawal process.
- Minimize personal data; avoid identity recognition, emotion/intent inference, and unnecessary audio/video capture.
- Use coded participant IDs and restricted access to any re-identification key.
- Define retention, deletion, breach response, and data-sharing rules before collection.
- Do not use real emergency incidents or expose participants to uncontrolled hazards.
- Require fire-service safety officer approval for each exercise and clear stop conditions.
- Do not use wearable/vital-sign data without explicit consent and a separate protocol.
- Separate training/QA fixtures from scientific evidence and exclude them from validation.

## 7. Preliminary budget architecture

No dollar request is set in this planning draft. The eligible prime, institutional indirect-cost rate, equipment quotes, test-facility costs, staffing plan, and allowable cost treatment are not yet known. Do not copy the FY2025 maximum into a future application without a new NOFO.

Build the budget from documented quantities and rates:

| Cost category | Calculation basis / evidence required |
|---|---|
| Principal investigator and research staff | Named roles, effort by month, institutional salary/fringe rates, and work-package allocation |
| Engineering and data-management personnel | Defined deliverables, effort, and rate support; separate research work from routine product commercialization |
| Independent reference equipment | Rental/purchase justification, calibration certificates, asset controls, maintenance, and usage schedule |
| Controlled test facilities and props | Facility agreements, safety controls, scenario schedule, consumables, and itemized quotations |
| Fire-service partner participation | Defined personnel time, training-site use, safety oversight, and documented match treatment where applicable |
| Human-subjects / IRB / privacy | IRB fees if any, participant recruitment/retention, consent administration, privacy/security review, and approved participant costs |
| Data security and research infrastructure | Restricted storage, access controls, backups, audit, data transfer, and preservation |
| Travel and dissemination | Necessary domestic site visits, publication, conference, and firefighter-facing materials; verify all future NOFO restrictions |
| Indirect costs | Prime institution's negotiated rate or applicable approved methodology; do not invent a rate |

### Historical FY2025 cost share

The FY2025 NOFO generally required non-federal cost share of at least 5% of the grant award. Cash and documented in-kind contributions could qualify subject to 2 C.F.R. § 200.306 and FEMA requirements. The prime must document the source and valuation of the match and satisfy the applicable maintenance-of-effort requirement.

No match source is currently committed. Potential institutional facilities, staff time, or equipment contributions are only planning possibilities until the prime formally documents and approves them.

## 8. Risk register

| Risk | Why it matters | Mitigation / gate |
|---|---|---|
| No current FEMA cycle | FY2025 is closed; next-cycle terms unknown | Monitor official FEMA/Grants.gov notices; re-screen the new NOFO before relying on this concept |
| Prime eligibility | WaveRadar is for-profit and cannot be FY2025 R&D prime | Identify an eligible government/nonprofit prime; obtain current eligibility confirmation |
| Subrecipient ambiguity | FY2025 allows subawards but does not expressly resolve for-profit subrecipient eligibility | Obtain written FEMA and prime grants-office determination before budgeting WaveRadar as a subrecipient |
| Procurement conflict | Proposal/specification assistance can disqualify a contractor from later competing | Prime owns the SOW and procurement; obtain written procurement review before any paid WaveRadar role |
| Company readiness | Proposed WaveRadar LLC is not registered; no EIN, UEI, or SAM registration is verified | Do not represent the company as registered; resolve legal, tax, and registration requirements only after owner decision |
| Match / maintenance of effort | Prime must meet match and historical expenditure conditions | Select a prime with documented capacity; obtain finance-office sign-off and match records |
| Fire-service participation | Fire-service partner participation is an important scored element | Obtain real letters of support/commitment and defined roles before submission |
| Independent ground truth | Current WaveRadar evidence has zero integrity-verified observations and no passed physical validation runs | Use calibrated independent references, preregistration, and independent analysis |
| Sensor availability | Phone APIs and external sensors may not expose required data | Inventory hardware and APIs first; label unsupported sources UNAVAILABLE |
| Clock alignment | Drift and asynchronous samples can create false spatial fusion | Measure offset, drift, sequence integrity, and latency; stop confirmatory analysis when timing is unbounded |
| Human subjects | IRB and DHS CAPO approvals may delay work | Complete determinations before recruitment or testing; include time and cost in the project plan |
| Safety / privacy | Firefighter exercises and sensor data can expose participants to risk or collect sensitive data | Controlled non-hazardous scenarios, consent, data minimization, safety officer, access controls |
| Source licensing | Public metadata does not confer dataset, model, or commercial rights | Maintain source-level licence and provenance review; no automatic ingestion or training |
| Overclaiming | A prototype result could be misrepresented as life-safety performance | Evidence-class labels, external review, limitations, and explicit release gates |
| Adoption burden | Departments may lack equipment, staffing, connectivity, or training capacity | Include career/volunteer and resource-constrained perspectives; report cost and workflow burden |

## 9. Partner-development plan — no commitments assumed

Potential Missouri outreach targets:

- University of Missouri Fire and Rescue Training Institute — possible fire-service training and scenario expertise.
- University of Central Missouri / Missouri Safety Center — possible rural emergency-management and training expertise.
- Missouri S&T — possible secure sensor-data, wireless, and fusion research expertise.
- Fire departments and public-safety organizations — possible controlled training environments and operational feedback.

A potential partner must be assigned a specific role before it is described as a partner. Exploratory contact, an email exchange, or a willingness to discuss does not establish a formal partnership.

The prime institution should retain scientific independence and be responsible for the research design, statistical plan, IRB/CAPO coordination, financial management, and final reporting. A fire-service organization should define operationally meaningful scenarios and safety controls. WaveRadar's role must be separately classified as a potential contractor, potential subrecipient subject to eligibility confirmation, or unpaid collaborator.

## 10. Go/no-go gates

1. **G0 — Opportunity and eligibility:** A new FEMA NOFO is published; eligible R&D prime identified; WaveRadar's proposed role is confirmed in writing.
2. **G1 — Governance and funding:** Prime accepts financial-management duties; match and maintenance-of-effort are documented; procurement and conflict-of-interest review is complete.
3. **G2 — Protocol:** Research questions, sample plan, independent references, analysis, uncertainty, privacy, safety, and preregistration are approved.
4. **G3 — Bench evidence:** Sensor availability, timing, integrity, calibration, and repeatability are demonstrated within the specified test envelope.
5. **G4 — Controlled evaluation:** Fire-service exercises are approved; IRB/CAPO requirements are satisfied before human-subject activity; raw evidence and deviations are preserved.
6. **G5 — Independent review:** An independent reviewer verifies methods, analysis, limitations, and reproducibility.
7. **G6 — Dissemination:** Results are published with appropriate limitations and implementation guidance; no operational capability is promoted without separate evidence and approval.

Failure at a gate results in a documented pause, redesign, or no-go decision—not a relabeling of incomplete data as successful.

## 11. Current readiness and next actions

Known project constraints as of 2026-11-10:

- WaveRadar is an early-stage technology project; the proposed Missouri single-member LLC is not registered.
- No EIN, UEI, or active SAM registration is verified.
- No eligible FEMA R&D prime has committed.
- No fire-service research partner, subrecipient, or contractor agreement is in place.
- Current Core diagnostics report 4,021 historical observations, zero integrity-verified observations, zero validated devices, and zero passed validation runs. The historical observations are preserved but are not physical accuracy evidence.
- The Android native baseline protocol remains draft; no fresh independent physical-ground-truth run is established.
- The Research & Validation Lab has no active independent reviewer.
- No pilot, endorsement, grant, independent validation, or operational life-safety capability is established.

**Next actions that do not require commitments:**

1. Maintain this concept as a planning document and re-screen it when the next FEMA NOFO is published.
2. Prepare a concise prime-applicant briefing that explains the research question, eligible prime role, WaveRadar role alternatives, 5% match, and procurement conflict.
3. Ask the FEMA Fire Grants Branch, through the already-open correspondence, for written clarification of for-profit subrecipient eligibility and contractor/procurement treatment in a future R&D application.
4. Continue non-destructive sensor characterization and evidence-provenance engineering.
5. Identify independent reference equipment and obtain nonbinding price/calibration information before building a dollar budget.
6. Prepare partner-specific outreach drafts only after checking existing correspondence and verifying each recipient address; do not send without owner authorization.

## 12. Source register

- [FY2025 FP&S archived opportunity](https://simpler.grants.gov/opportunity/46f6ea4c-82e0-44f3-b1f0-5ce848a19fc7)
- [FY2025 FP&S NOFO PDF](https://files.simpler.grants.gov/opportunities/46f6ea4c-82e0-44f3-b1f0-5ce848a19fc7/attachments/1272832b-fe85-4118-a905-5d3d9e8ebcf4/FY25_FPS_NOFO_Clean_app_date_508.pdf)
- [FEMA Fire Grants](https://www.fema.gov/grants/preparedness/firefighters)
- [FEMA Procurement Disaster Assistance Team](https://www.fema.gov/grants/procurement)
- [2 C.F.R. § 200.306 — Cost sharing or matching](https://www.ecfr.gov/current/title-2/subtitle-A/chapter-II/part-200/subpart-D/section-200.306)
- [2 C.F.R. § 200.318 — General procurement standards](https://www.ecfr.gov/current/title-2/subtitle-A/chapter-II/part-200/subpart-D/section-200.318)
- [2 C.F.R. § 200.331 — Subrecipient and contractor determinations](https://www.ecfr.gov/current/title-2/subtitle-A/chapter-II/part-200/subpart-D/section-200.331)
- [6 C.F.R. Part 46 — Protection of human subjects](https://www.ecfr.gov/current/title-6/chapter-I/subchapter-A/part-46)

**Integrity rule:** This document records a proposed research concept and historical programme requirements only. It must not be used to imply that the next FEMA cycle is open, that WaveRadar is an eligible prime applicant, that any institution has agreed to participate, or that the current prototype has been independently validated.
