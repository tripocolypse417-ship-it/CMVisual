# Validation Procedure Correction and Legacy Evidence Classification

**Status:** Engineering policy / implementation specification  
**Applies to:** Historical WaveRadar / CMVisual measurement sessions whose operator procedure was not understood, not followed, or cannot be reconstructed from contemporaneous records.

## 1. Decision

A historical session performed before the operator understood or followed the prescribed measurement procedure is **procedurally invalid for accuracy validation**.

This is a statement about the validity of the experiment and its claims. It is **not** a finding that the underlying sensor hardware, raw observations, timestamps, or software were necessarily defective.

Do not use such a session to calculate, report, train against, or claim physical accuracy, precision, calibration, localization performance, or benchmark success.

## 2. Required classification

Use the following validation-status value for affected legacy runs:

`LEGACY_PROCEDURE_UNVERIFIED`

Where the application has separate fields, preserve the distinction:

- `evidence_class`: retain the original source classification; do not rewrite provenance.
- `validation_status`: `LEGACY_PROCEDURE_UNVERIFIED`.
- `accuracy_eligible`: `false`.
- `exclusion_reason`: `Operator procedure was not understood/followed or cannot be verified from contemporaneous records.`
- `historical_use`: diagnostic, pipeline debugging, and historical comparison only.

Do not overwrite original run status, timestamps, observations, device metadata, reviewer notes, or integrity digests. If the data model has no suitable fields, record this classification in a separate append-only review/classification record linked to the original run.

## 3. Scope control

Apply this classification only to sessions that can be identified as having been conducted under the invalid or unverified procedure.

Do **not** blanket-classify every server-visible run solely because a subset of earlier tests used an incorrect procedure. Do not assume that all 52 currently visible runs, all historical runs, or all observations share the same procedural defect. Map affected run IDs from available evidence and operator confirmation.

If a run's procedure cannot be established, classify it as procedure-unverified and exclude it from accuracy claims until reviewed. This is not a deletion or a finding that the sensor observations are false.

## 4. Preservation and quarantine

- Preserve every original observation and its original timestamp and provenance.
- Preserve the original run and its audit history.
- Exclude affected runs from accuracy aggregates, model-performance scores, calibration claims, and validation pass counts.
- Keep affected data available in a clearly labeled historical/diagnostic view.
- Never relabel historical observations as newly measured, independently verified, or ground-truth-aligned.
- Any later re-analysis must create a new, linked analysis record; it must not rewrite the original run.

## 5. Distinguish capability diagnostics from validation

A browser capability snapshot, API health response, enrollment flag, permission state, sample count, or sensor registration result is not a physical measurement validation.

The 2026-11-18 diagnostic report records a capability snapshot with 48 visible samples, zero locally buffered observations, HTTP 200 from the validation API, 52 server-visible runs, and an indeterminate validation state. It reports that no native spatial-pose bridge was exposed and explicitly blocks the spatial-accuracy gate.

Therefore that report is a diagnostic observation only. It does not create a new physical-validation run and does not establish spatial accuracy.

## 6. Fresh baseline acceptance gate

A new Android Native Sensor baseline must use a new run ID and a written, versioned procedure that the operator can follow before capture begins.

At minimum, the procedure and run record must identify:

1. Exact handset model and app/build version, with device identity kept distinct from account-alert identifiers.
2. Sensor capability inventory, actual hardware support, registration result, permission state, and sample arrival as separate facts.
3. Test environment and controlled reference setup.
4. Independent physical ground-truth instrument, its calibration/status, uncertainty, and measurement method.
5. Coordinate frames, axis conventions, units, orientation/initialization steps, and mounting/handling conditions.
6. Timestamp source and clock domain, synchronization method, sample rate, dropped samples, and data gaps.
7. Exact operator actions, sequence, duration, repetitions, and stop/restart conditions.
8. Raw observation retention and immutable linkage between observations, run, device, configuration, and reference measurements.
9. Predeclared metrics, tolerances, exclusions, uncertainty treatment, and failure criteria.
10. Independent review of protocol adherence and analysis before any accuracy claim.

The operator must be able to explain and complete the procedure before the run is accepted as an accuracy-validation candidate. If a required condition is absent, the run may still be retained for diagnostics but must not pass the accuracy gate.

## 7. Device identity reconciliation

Browser user-agent data and account security-alert identifiers are different evidence sources. Keep them as separate claims with their own provenance.

For the diagnostic report dated 2026-11-18:
- Browser user-agent reports a Motorola Moto G Play (2024).
- The user-confirmed account-alert identifier reports Samsung SM-S176V / Galaxy A17 5G and is explicitly not independently read from the browser.

Do not merge these identities or assign samples to the Samsung device based on the account-alert identifier. Reconcile the actual test handset before starting a new baseline.

## 8. Spatial-pose gate

Motion sensors, camera availability, GPS capability, and a successful API response do not independently establish a measured world-position pose.

Keep spatial accuracy blocked until an actual supported spatial-pose source is exposed, its coordinate frame and uncertainty are recorded, and its output is compared with independent physical ground truth under the approved protocol.

Do not substitute dead reckoning, inferred position, GPS, or synthetic scene data for independent ground truth.

## 9. Reporting language

Approved:
- "Historical session retained for diagnostics; excluded from accuracy validation because procedure adherence is unverified."
- "The sensor observations may remain useful for software and pipeline debugging."
- "A fresh baseline is pending completion under the approved procedure and independent ground truth."

Not approved:
- "The old sensor data is proven inaccurate."
- "The historical run passed validation."
- "The 48 samples prove spatial accuracy."
- "The API returned HTTP 200, therefore the device is validated."

## 10. Completion criteria for implementation

- Affected legacy runs can be linked to an append-only procedural classification.
- Accuracy queries and dashboards exclude those runs by default.
- Historical diagnostic access remains available and visibly labeled.
- The exclusion reason and reviewer/audit trail are retained.
- New runs require a versioned procedure and required ground-truth metadata before entering the accuracy-validation workflow.
- Tests prove that excluded legacy runs cannot increment accuracy pass counts or enter accuracy aggregates.
- No historical source observation or provenance field is mutated.
