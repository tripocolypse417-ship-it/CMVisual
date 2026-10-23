# WaveRadar Predictive Model: Data, Training, and Validation Plan

Status: proposed engineering plan; this document does not claim a trained or validated model exists.

## Objective

Build a calibrated, evidence-first, multi-sensor model for responder situational awareness: device pose/motion, sensor health, visible-person tracks, radio-ranging geometry where supported, environmental context, and uncertainty-aware hazard/route cues. Optimize for measured performance and safe abstention, not for impressive-looking predictions.

No model may claim to detect a person through walls from ordinary phone camera, cellular signal strength, Wi-Fi RSSI, or unsupported sensors. Predictions are advisory until validated in representative controlled trials.

## Lawful data acquisition hierarchy

1. **First-party consented field data** collected by WaveRadar on devices owned/authorized by participants, with written test protocol, purpose limitation, retention limits, access controls, and deletion path.
2. **Public government/open datasets** whose exact terms permit the intended use. Candidate discovery sources:
   - NIST public research datasets and publications relevant to indoor localization, public safety, building research, and responder technology.
   - FEMA / U.S. Fire Administration public incident statistics and reports for aggregate context, after confirming dataset-specific terms and schema.
   - NOAA and USGS public environmental / geospatial data for outdoor context and hazard covariates where relevant.
   - Public building/floor-plan datasets only when redistribution and use terms explicitly allow it; never infer or publish sensitive facility layouts.
   - Public robotics / inertial navigation / visual-inertial odometry datasets (for example, EuRoC MAV and TUM VI) for algorithm benchmarking only, not as a substitute for firefighter or phone-specific validation.
3. **Open research datasets** with license, consent, provenance, and usage restrictions recorded per dataset.
4. **Synthetic/simulated data** only for software testing, edge cases, and augmentation. Keep it explicitly labeled SYNTHETIC and never mix it into measured evidence or use it as proof of real-world accuracy.
5. **Partner data** only under a written data-use agreement that specifies ownership, purpose, security, permitted model training, retention, deletion, and publication rights.

Do not scrape private accounts, bypass access controls, buy illicitly obtained location/telecom records, or collect unrelated personal data. “Publicly accessible” does not automatically mean licensed for unrestricted reuse.

## Data registry and provenance

Every dataset must have a registry record containing: owner/source, exact URL or delivery reference, access date, license/terms, allowed purposes, attribution, version/checksum, collection method, geography/time coverage, sensor/device types, labels and label quality, known biases, privacy review, retention, and approved transformations. Reject datasets with unclear provenance or incompatible terms.

Each observation should retain schema version, pseudonymous device/session IDs, monotonic and wall-clock timestamps, sensor type, units, coordinate frame, evidence class, calibration profile/version, quality flags, uncertainty, firmware/app version, environment, provenance, and integrity status. Preserve lineage through all derived features and predictions.

## Model architecture

Use a modular, replaceable pipeline rather than one opaque “everything model”:

- **Sensor adapters:** camera/pose, IMU, GNSS, barometer, light/proximity, Wi-Fi RTT where both endpoints support it, and approved external sensors. Cellular is contextual only unless a legitimate carrier/device API provides a documented measurement.
- **Quality and capability model:** learn and report modality-specific reliability by device, calibration, motion, environment, and operating conditions.
- **State estimation:** baseline complementary/Kalman filtering and factor-graph or visual-inertial methods where justified; compare against simpler baselines. Do not infer absolute position from accelerometer alone without drift correction and external references.
- **Association and fusion:** time-aligned, uncertainty-aware association; reject out-of-order, stale, duplicated, physically impossible, or conflicting observations. Timestamp proximity alone is not cross-device agreement.
- **Prediction heads:** separately calibrated outputs for pose/trajectory, track continuity, sensor failure/coverage gaps, and hazard/route risk. Never merge unlike targets into a single uncalibrated confidence score.
- **Decision layer:** show MEASURED, DERIVED, INFERRED, PREDICTED, UNKNOWN, and UNAVAILABLE distinctly. Abstain when inputs are insufficient or conflict. A prediction cannot silently become a measurement.

## Training and evaluation

- Split data by building/site, incident/exercise, participant, and device—not randomly by adjacent frames—to prevent leakage.
- Keep a frozen holdout set and a later prospective field trial. Do not tune thresholds against the final test set.
- Compare against simple baselines first. Track position error (median, RMSE, 90th/95th percentile), orientation error, track precision/recall, false alarms, missed detections, time-to-alert, dropout, latency, calibration error, and failure rate. Report confidence intervals and sample counts.
- Evaluate separately by device model, lighting, smoke/occlusion, motion, building materials, radio layout, crowd density, and connectivity. Mark unsupported conditions UNKNOWN.
- Calibrate probabilities on held-out data (for example, reliability diagrams, Brier score, expected calibration error) and test distribution shift.
- Use ablation tests to quantify each modality’s incremental value. A sensor is not retained merely because it adds complexity.
- Establish explicit acceptance thresholds with fire-service domain experts before evaluating; thresholds must be tied to use-case risk and independent ground truth.
- Red-team for spoofed/replayed observations, bad clocks, sensor drift, malicious nodes, poisoned calibration updates, radio multipath, camera occlusion, network loss, battery/thermal throttling, and correlated sensor failures.
- Maintain versioned model cards, dataset cards, test reports, change logs, rollback capability, and reproducible training configurations.

## Privacy, security, and governance

- Minimize data collection; process video locally by default and upload derived, anonymous tracks only when needed and authorized.
- Never store/upload IMSI, IMEI, phone number, raw subscriber identifiers, or stable radio identifiers for model training. Pseudonymize or redact access-point/device identifiers and rotate identifiers where feasible.
- Avoid face recognition and identity inference. Do not infer protected traits.
- Encrypt data in transit and at rest, restrict access by role, log access, set retention/deletion windows, and obtain informed consent for human-subject data.
- Use signed/versioned model artifacts and signed calibration updates; limit update influence, independently validate updates, detect poisoning, and support rollback.
- Require human confirmation for life-safety decisions. The system is not certified for emergency response until independent field validation and appropriate safety review are complete.

## Immediate implementation sequence

1. Fix and test API/schema consistency and end-to-end authenticated uploads.
2. Create dataset registry, data contract validation, privacy filters, and a reproducible offline evaluation harness.
3. Build deterministic baseline estimators and golden test fixtures before introducing learned models.
4. Add ground-truth pairing and sensor-specific calibration; never fill missing metrics with guesses.
5. Run phone-specific tests on the actual supported device matrix. Record unsupported features explicitly.
6. Benchmark candidate models using frozen site-held-out data and report measured results before choosing a model.
7. Only then deploy a shadow-mode model, compare predictions to ground truth, and require sign-off before operational use.

## Current limitations

WaveRadar currently has sensor observations and a physical-validation workflow, but the latest readiness check reported zero validated devices and zero passing validation runs. No claim is made here that a superior predictive model has been trained, that external datasets have been ingested, or that the Android build has passed field tests. The next meaningful improvement is a reproducible, permissioned dataset and evaluation pipeline, followed by measured device validation.
