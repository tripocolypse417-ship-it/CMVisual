# WaveRadar — Proposal Concept Drafts

**Prepared:** 2026-11-13  
**Use:** Partner discussion and early proposal drafting. These are not submission-ready applications. All technical claims, team credentials, sample sizes, budgets, data permissions, and partner commitments must be verified before submission.

## Concept A — NIOSH R03 (RFA-OH-27-056)

### Working title
**Feasibility of Provenance-Preserving, Time-Synchronized Sensor Data Capture for Firefighter Occupational-Safety Research**

### Short abstract draft
Firefighter occupational-safety research increasingly depends on measurements collected across dynamic training and operational environments. Data from separate environmental instruments, wearable sensors, mobile devices, and aerial mapping systems can be difficult to align, audit, and reproduce when timestamps, device state, calibration, and data provenance are not consistently recorded. This project will evaluate the feasibility of a vendor-independent data-capture and evidence-management workflow for controlled firefighter training studies. The work will integrate a limited set of independently selected and appropriately validated measurement instruments, preserve original observations and source metadata, synchronize records to a documented time reference, and evaluate completeness, latency, dropout, repeatability, and agreement against independent reference measurements. A fire-service training partner and occupational-safety research partner will define safe, controlled scenarios and the scientific questions. The project will produce a reproducible protocol, documented data-quality metrics, a de-identified research dataset where permitted, and recommendations for larger studies. The study will not diagnose health conditions, infer unmeasured exposures, or claim operational rescue performance.

### Specific aims
1. **Define and implement the measurement workflow.** Select a limited instrument set with the occupational-safety partner; document calibration, sensor identity, sampling behavior, timestamp source, units, uncertainty, and data retention.
2. **Evaluate data integrity and synchronization in controlled training scenarios.** Measure record completeness, timestamp alignment, sample freshness, dropout, device failure, and repeatability against independent references.
3. **Assess research utility and limitations.** Determine which outputs are sufficiently traceable for occupational-safety analysis, document failure modes and missing-data handling, and publish a reproducible protocol.

### Study design outline
- Controlled, non-emergency training environment; no deployment into live incidents.
- Fire-service training partner defines safe scenarios and operational constraints.
- Occupational-safety PI defines research endpoints and appropriate instruments.
- WaveRadar contributes the data-capture, provenance, synchronization, audit, and replay workflow.
- Independent reference equipment and calibration procedures define ground truth.
- Pre-register primary outcomes and analysis methods before data collection.
- Obtain IRB/ethics review and informed consent where required; minimize personal data and avoid unnecessary video or biometric collection.
- Preserve raw source records; distinguish measured, derived, inferred, predicted, simulated, unknown, and unavailable data.
- Report uncertainty, exclusions, missingness, and failed measurements rather than silently filling gaps.

### Candidate primary outcomes
- Fraction of expected samples successfully recorded and linked to source/device metadata.
- Timestamp alignment error relative to the selected reference clock.
- Per-sensor sample freshness and dropout distribution.
- Repeatability of the data-capture workflow across repeated controlled runs.
- Agreement with independent reference instruments for the specific measured quantity, only where the instrument and protocol support a valid comparison.
- Rate and type of provenance/integrity failures detected by the workflow.

### Important limits
This is a feasibility study of data collection and evidence quality, not proof that WaveRadar detects hazards through walls, locates victims, predicts injury, measures an exposure without an appropriate instrument, or improves survival. Do not use the term “validated” for the overall product based solely on software or workflow tests.

### Partner roles to secure
- **Applicant/PI:** eligible small business or research institution, subject to final NOFO.
- **Scientific lead:** occupational safety / industrial hygiene / firefighter health researcher.
- **Fire-service partner:** training environment, safety oversight, practitioner input.
- **Instrumentation partner:** independent reference measurements and calibration.
- **WaveRadar:** software/data-infrastructure contribution and engineering documentation.
- **Independent evaluator:** review protocol and analysis plan; avoid WaveRadar self-validation.

### Budget work required
No budget amount is proposed yet. Build a costed work plan only after partners and instruments are selected. Cost categories may include PI/co-investigator effort, fire-service participant time where allowable, instrument rental or purchase, calibration, independent measurement services, data management, IRB, travel, dissemination, and indirect costs. Obtain quotes and verify allowability.

## Concept B — NSF 26-510 SBIR/STTR Phase I

### Working title
**Evidence-Grade Edge Infrastructure for Interoperable Emergency-Response Sensor Systems**

### Project Pitch — Technical Innovation draft
Emergency-response sensor systems are fragmented across device types, vendors, network conditions, and data formats. A camera, inertial sensor, environmental instrument, drone, or external ranging device can each report data with different timing, metadata, failure modes, and confidence semantics. This makes it difficult to combine observations reproducibly or to distinguish direct measurements from derived or inferred outputs. WaveRadar proposes a vendor-independent edge data architecture that preserves original sensor observations and provenance while normalizing timestamps, units, device state, health, and uncertainty into a common evidence contract. The technical innovation to be tested is a low-overhead method for synchronizing heterogeneous sensor streams, detecting stale or malformed inputs, preserving source-to-output lineage, and presenting evidence to downstream mapping and decision-support systems without upgrading unverified data into measurements. Phase I R&D will establish technical feasibility through adapter prototypes, controlled timing and dropout tests, data-integrity tests, offline operation tests, and comparisons against independently recorded reference streams. The research will explicitly separate measured, derived, inferred, predicted, simulated, unknown, and unavailable information. The output will be a tested architecture and benchmark dataset that supports future commercial products for emergency response, industrial safety, robotics, and research instrumentation.

### R&D plan draft
1. Specify a minimal sensor-neutral evidence contract and adapter interface.
2. Implement adapters for a limited set of accessible sensors and recorded drone data; do not promise broad compatibility before testing.
3. Implement per-source timestamps, freshness, device state, error classification, and integrity checks.
4. Test synchronization, missing data, stale data, clock drift, malformed samples, network loss, offline buffering, and recovery.
5. Compare outputs with independent reference logs and publish a reproducible benchmark.
6. Evaluate integration cost and performance on representative low-cost edge hardware.

### Technical risks and mitigation
- **Clock drift and asynchronous sources:** characterize error and uncertainty; use an explicit time-reference strategy and retain original timestamps.
- **Device/API variability:** use versioned adapters and capability negotiation; unsupported capabilities remain unavailable.
- **Intermittent connectivity:** offline-first buffering with idempotent synchronization and ambiguous-write protection.
- **Sensor faults and malformed values:** structured error states, finite-value validation, stale/future timestamp checks, and no silent null substitution.
- **False confidence:** no heuristic confidence presented as calibrated probability; compare prediction outputs against held-out, independently labeled data only in a later validated phase.

### Market opportunity draft
Potential customers include fire and EMS agencies, public-safety technology integrators, industrial safety operators, robotics and drone developers, and research organizations that need traceable sensor data. The initial commercialization path should focus on a narrow software/instrumentation product: interoperable evidence capture, synchronization, audit, and replay. Customer discovery must verify procurement needs, integration costs, regulatory constraints, willingness to pay, and incumbent alternatives. Do not claim signed customers, paid pilots, deployments, or market share without evidence.

### Company and team draft
WaveRadar is a founder-led Missouri R&D effort. The current project context indicates the intended WaveRadar LLC formation has not yet been confirmed complete. Before a full NSF proposal, establish the legal small-business entity and required registrations. The team must add or formally engage expertise in embedded systems, sensor instrumentation, occupational/public-safety research, independent testing, and commercialization. The principal investigator must meet NSF's primary-employment requirement at award. Do not invent team members, institutional commitments, credentials, or letters of support.

### NSF submission gate
- Confirm no Project Pitch is currently pending and verify the prior draft's exact state.
- Submit one focused Project Pitch and wait for NSF's official response; Phase I full proposals require an invitation.
- Do not submit multiple pitches for the same company while one is pending.
- Complete legal entity formation and active SAM/UEI, Research.gov, and SBA Company Registry requirements before full proposal submission.
- Select NSF 26-510 only if the proposal is a deep-technology R&D project with credible commercialization potential. The March 4, 2027 date is a full-proposal deadline, not a guarantee that a new Project Pitch will receive an invitation in time.

## Concept C — NIOSH U19 Center partner statement

WaveRadar could contribute a bounded technology and research-infrastructure work package to an established Total Worker Health Center. The contribution would support secure, provenance-aware, time-aligned collection and management of data from independently selected occupational-safety instruments; transparent data-quality reporting; reproducible data exports; and auditable analysis workflows. The Center's scientific leadership and occupational-health investigators must define the hypotheses, validated measures, human-subjects methods, and health outcomes. WaveRadar would not claim that its platform is a medical device, an exposure sensor, or an independently validated health-risk model. A suitable role may be as a small-business partner or subrecipient if allowed by the final NOFO and the lead institution's policies.

## Information still required before any submission

- Confirm legal entity status, EIN, SAM/UEI, Research.gov, SBA Company Registry, and bank/payment readiness as applicable.
- Confirm applicant and PI eligibility under the final solicitation.
- Identify named PI/co-investigators and obtain CVs, biosketches, and current/pending support.
- Obtain written partner interest and define prime/subrecipient/contractor roles.
- Select instruments and obtain current quotes, calibration details, data sheets, and licensing terms.
- Obtain independent evaluator and reference-measurement commitments.
- Establish IRB/ethics and privacy pathway.
- Define primary endpoints, sample-size rationale, analysis plan, and project timeline.
- Prepare realistic budget with no invented quotes or commitments.
- Check IP/background IP and data rights before sharing technical materials.
