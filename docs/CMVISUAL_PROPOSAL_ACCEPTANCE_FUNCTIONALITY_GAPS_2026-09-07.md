# CMVisual — Proposal Acceptance Functionality Gaps

## Why this matters

CMVisual already has strong spatial fusion, provenance, evidence assessment, prediction calibration, federation, replay and real-data boundaries. The remaining opportunity is to make the system easier for a technical reviewer to **evaluate, reproduce, falsify and trust**.

Current NSF 26-510 and 26-511 solicitations emphasize Intellectual Merit, Broader Impacts and Commercial Impact, while NSF also expects sound plans, measurable success mechanisms, qualified teams/resources, customer/stakeholder engagement, commercialization and risk reduction. Verify the current solicitation language before submission.

## Highest-value additions

### 1. Evaluation / Validation Mode — IMPLEMENTED
A dedicated panel now exposes explicit evaluation gates:
- input integrity
- track continuity
- cross-sensor agreement
- provenance/timestamps
- prediction calibration
- evidence thresholding
- replay availability
- graceful degradation

It can start/stop a run, freeze a run, reset it, and export a portable JSON evidence-run record.

### 2. Reproducibility package
Every benchmark/evaluation run should eventually record:
- software version / commit
- model version
- sensor adapter versions
- dataset + license + version
- configuration
- coordinate frame
- hardware/device class
- environment conditions
- random seed where applicable
- evaluation protocol
- pass/fail thresholds
- raw observation references rather than duplicated payloads.

### 3. Baseline comparison
Add explicit baseline columns for each experiment:
- camera-only
- sensor-only
- simple fusion
- CMVisual fusion
- CMVisual + calibrated prediction

Report whether CMVisual improves accuracy, latency, track continuity, uncertainty calibration, or operator performance. Do not claim improvement until measured.

### 4. Ablation testing
Provide one-click experiment definitions that disable one layer at a time:
- remove camera
- remove external sensor
- remove federation
- remove prediction
- remove corroboration
- remove calibration

This makes the technical contribution falsifiable instead of anecdotal.

### 5. Latency budget
Track end-to-end timing:
`source timestamp → receive → normalize → fuse → track → render → prediction`

Report p50/p95/p99 where enough samples exist. This is particularly important for sensor-fusion and constrained-compute proposals.

### 6. Graceful degradation / failure injection
Explicitly test:
- stale packets
- dropped packets
- conflicting sensors
- clock skew
- coordinate-frame error
- missing modalities
- intermittent connectivity
- low battery / CPU pressure

The system should show what it knows, what it lost and how confidence changes rather than silently continuing as if nothing happened.

### 7. Track-integrity score
Add a measurable track-quality object based on continuity, observation age, source agreement, uncertainty and identity continuity. This should never mean human identity; it means continuity of an observation track.

### 8. Operator workload / human factors
For fire/rescue and command applications, measure:
- time to locate a target/observation
- time to identify the evidence source
- time to recognize stale/conflicting data
- task completion rate
- false-alarm handling
- cognitive/interaction burden

This turns “useful to firefighters” into measurable evidence.

### 9. Safety / non-overclaiming report
Automatically generate a section showing:
- measured facts
- derived values
- predictions
- unresolved items
- unsupported capabilities
- known data gaps
- sensor conflicts

This is a major trust feature for reviewers and end users.

### 10. Open-data benchmark manifest
Each dataset adapter should declare:
- license
- commercial/non-commercial status
- modalities
- calibration metadata
- coordinate frame
- labels
- intended benchmark tasks
- adapter status
- known limitations.

No dataset should enter a commercial benchmark automatically unless its license permits the intended use.

## Proposal-specific emphasis

### NSF 26-510
Emphasize the scientific/technical question, measurable hypotheses, experimental design, broader impacts, commercial path, customer validation and follow-on funding readiness.

### NSF 26-511
Emphasize CMVisual as an evidence-preserving scientific instrumentation/software platform: synchronized multimodal observation, spatial registration, uncertainty, reproducibility, replay and validated inference.

### Navy sensor-fusion topic
Emphasize parallel processing, sensor fusion, latency, redundant-data handling, spatial alignment, temporal correlation, track integrity, platform independence and scalable edge deployment.

### DARPA semantically-aware ISR topic
Emphasize provenance, semantic extraction, constrained communications, uncertainty, operator trust, traceability and auditability. Do not claim contested-environment or embedded-compute performance until demonstrated.

## Acceptance principle

The strongest proposal is not the one with the most features. It is the one where a reviewer can answer:

1. What exact technical problem is being solved?
2. What is novel?
3. What is the measurable hypothesis?
4. What baseline will be beaten?
5. How will failure be detected?
6. How will results be reproduced?
7. What happens when sensors disagree or disappear?
8. Why does the result matter to a real customer or scientific user?
9. What remains uncertain?
10. What will Phase I prove that cannot reasonably be proven today?

CMVisual should make those answers visible in the product itself, not only in the proposal narrative.