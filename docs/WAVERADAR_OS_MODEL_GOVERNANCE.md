# WaveRadar OS — Model Lifecycle, Learning and Evaluation Governance

**Status:** Required policy baseline for every perception, fusion, localization, prediction and decision-support model.

## 1. Learning objective

WaveRadar may improve continuously, but it must not silently teach itself from unverified operational data or deploy its own changes. "Self-teaching" means a governed data-to-evaluation-to-release pipeline with traceable human authorization, not uncontrolled online weight updates.

## 2. Model registry and provenance

Every model release records:
- Unique model ID, semantic version, artifact digest and signature.
- Intended use, prohibited use, supported modalities, operating conditions and prediction horizons.
- Architecture, source code commit, framework/runtime and hardware target.
- Training, validation and test dataset IDs, immutable manifests and data licenses.
- Labeling protocol, annotator/reviewer provenance and adjudication.
- Known limitations, subgroup/device/environment performance and failure modes.
- Calibration method, thresholds, abstention behavior and uncertainty interpretation.
- Compute, memory, latency, energy and thermal profile.
- Model card, evaluation report, risk assessment, approval and rollback target.

No model may be used operationally without an explicit intended-use statement and versioned approval state.

## 3. Data quality and learning eligibility

Each record retains its original evidence class and quality state. Training eligibility is an additional, reversible label with a reason and reviewer provenance; it never changes the underlying evidence.

Exclude or quarantine:
- Unknown provenance or missing source identity.
- Invalid/ambiguous timestamps or unresolved clock drift.
- Missing calibration where required.
- Suspected spoofing, duplication, corruption or tampering.
- Unresolved contradictory labels or ground truth.
- Simulated, synthetic or manually entered records unless the experiment explicitly permits them and they are kept in separate strata.
- Records from the test set or incidents/buildings reserved for final evaluation.

A sample is not ground truth because a model, operator or UI labels it as such. Maintain independent reference measurements and adjudication records.

## 4. Dataset design and leakage controls

- Split by incident, physical site/building, device family and time as appropriate; never rely only on random row-level splits.
- Keep a sealed, access-controlled final test set.
- Prevent near-duplicate frames, repeated sensor windows, same-incident tracks or derived copies from crossing partitions.
- Record class balance, missingness, environmental conditions, device coverage and subgroup coverage.
- Use external/open datasets only after checking provenance, license, collection conditions, label quality and domain fit.
- Synthetic data supplements but does not replace physical testing.
- Maintain a dataset lineage manifest and reproducible preprocessing pipeline.

## 5. Continual-learning loop

1. **Capture:** append observations and provenance; do not train directly from live operational streams.
2. **Triage:** run integrity, duplication, time, calibration, privacy and domain checks.
3. **Curate:** an authorized data steward assigns eligibility and records rationale.
4. **Label:** use documented protocol; blind reviewers where practical; adjudicate disagreement.
5. **Freeze:** create immutable dataset snapshot and split manifest.
6. **Train:** run version-controlled experiments with pinned code, configuration, dependencies and random seeds.
7. **Evaluate:** compare candidate to incumbent and simple baselines on the same frozen tests.
8. **Stress:** evaluate missing sensors, degraded connectivity, smoke/heat/occlusion, device variance, drift, out-of-distribution input, adversarial/spoofed signals and resource limits.
9. **Review:** independent reviewer assesses metrics, failures, calibration, subgroup impact and intended-use scope.
10. **Stage:** shadow mode first; predictions are logged but do not change operational behavior.
11. **Canary:** limited controlled trial with explicit monitoring and rollback thresholds.
12. **Release:** signed artifact and configuration, approved by designated release authority.
13. **Monitor:** drift, calibration, input quality, abstention, latency, thermal load and incident feedback.
14. **Rollback/retire:** automatic safety rollback may disable a model; never silently roll forward to a different model.

## 6. Required evaluation

Report task-appropriate metrics, not one generic accuracy score:
- Classification: per-class precision/recall, F1, confusion matrix, sensitivity/specificity where appropriate, PR-AUC/ROC-AUC where valid.
- Detection/tracking: mAP/IoU, track continuity, identity switches, localization error and missed/false detections.
- Localization/mapping: position/orientation error against independent surveyed ground truth, drift, relocalization failure and coverage.
- Forecasting: horizon-specific error, calibration, Brier/log score where appropriate, interval coverage and sharpness.
- Sensor quality/fusion: source attribution, conflict detection, stale-input rejection, missing-modality degradation and calibration.
- System: end-to-end latency, availability, battery/thermal impact, memory, bandwidth, queue recovery and offline behavior.
- Human factors: alert burden, comprehension, time-to-detect, workload, error rates and safe override.

Report confidence intervals, sample sizes, test conditions, exclusions and uncertainty. Do not state "99.99% confidence" as a blanket quality claim. Statistical confidence, measurement accuracy, model calibration and operational safety are different concepts.

## 7. Safety and abstention

Every model output includes:
- Model and artifact version.
- Input observation references and quality state.
- Output class/value and units.
- Confidence/calibration information appropriate to the task.
- Prediction horizon and validity interval, where applicable.
- Applicability/OOD status.
- Missing/contradictory input indicators.
- Explicit abstain/unknown state.

Abstain when input is outside supported conditions, source quality is inadequate, modalities conflict beyond defined limits, calibration is unavailable, or the model is not approved for that use. "No result" is safer than a fabricated precise result.

## 8. Independent validation

The Research & Validation Lab has:
- Separate reviewer permissions and audit logs.
- Frozen candidate artifacts and dataset manifests.
- Read-only access to production evidence unless a controlled export is approved.
- Independent physical reference equipment and ground-truth protocol.
- Blind or double-blind testing where feasible.
- Pre-registered metrics, thresholds and exclusion rules.
- Authority to reject, suspend or narrow an intended use.

The development model, training pipeline, data curator and vendor cannot self-approve release. A second AI model may assist review but cannot replace independent physical ground truth or accountable human sign-off.

## 9. Release gates

A model progresses through:
`DRAFT → EXPERIMENTAL → BENCHMARKED → INDEPENDENTLY_REVIEWED → SHADOW → LIMITED_PILOT → APPROVED`

Failure or new evidence can move it to:
`RESTRICTED`, `SUSPENDED`, `ROLLED_BACK` or `RETIRED`.

Each transition requires an evidence bundle and authorized actor. No UI may display an experimental model as operationally validated.

## 10. Prohibited patterns

- Online weight updates from unreviewed incident data.
- Training on final test data or leaking test labels.
- Reusing the same physical event in training and validation without explicit leakage analysis.
- Treating model consensus as independent ground truth.
- Hiding failed runs, exclusions, uncertainty or model-version changes.
- Updating model weights/configuration in the field without signed release and rollback.
- Claiming life-safety capability based solely on simulation, demo footage, synthetic data or software tests.
