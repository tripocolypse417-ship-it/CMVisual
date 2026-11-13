# WaveRadar OS — AI, Model and Continual-Learning Audit

**Snapshot:** 2026-11-13  
**Scope:** CMVisual target-canonical repository plus the separate connected Base44 working application. These codebases are not yet synchronized.  
**Status:** Initial model-governance review; not a model-performance validation.

## 1. What the current AI actually is

The CMVisual repository contains model-adapter, prediction, calibration, inference-registry and evaluation concepts, plus dependencies for pretrained TensorFlow.js object/pose models. The inspected repository does not contain a reproducible end-to-end neural-model training pipeline, curated training-data registry, signed model artifact release process or independent validation report for a life-safety use.

The connected Base44 app contains additional adaptive forecasting code not present in CMVisual main:
- `src/lib/adaptiveForecast.js`
- `src/hooks/useAdaptiveForecastEngine.js`
- `src/hooks/useEnvironmentalBaseline.js`
- `src/components/forecast/AdaptiveForecastPanel.jsx`

The adaptive forecast engine is not a newly trained neural network. It selects and tunes simple kinematic forecasting approaches (constant-velocity / constant-acceleration families) and their uncertainty scales using later points from the same device's own track stream. This is best described as **on-device, self-supervised parameter adaptation / same-stream backtesting**, not independent model training or verified real-world learning.

## 2. Confirmed model-learning limitations in the Base44 working source

### M1 — Same-stream evaluation is not independent ground truth
The adaptive engine scores forecasts against later positions from the same detector/track pipeline that produced the original track. This can help estimate internal consistency and local sensor-stream behavior. It cannot establish absolute position accuracy, human detection accuracy, through-wall capability or operational safety.

### M2 — The learning trail uses receipt time
The connected Base44 track manager stamps trail points with `Date.now()`. That is application processing/receipt time, not a source capture timestamp. Network delay, batching, scheduling and UI load can therefore distort time horizons and apparent motion.

### M3 — Model sample counts are not necessarily independent
The backtest creates multiple horizons/windows from a bounded track history. These comparisons can overlap and share the same source points. A count of 12 comparisons is not equivalent to 12 independent tracks, incidents, buildings or physical trials. The UI's prior “training samples” and “learned gain” wording risks overstating the evidence.

### M4 — Persisted learning state lacks a durable per-track cursor
Aggregate accumulators are persisted in local storage, while the per-track “learned through” cursor is held in an in-memory ref. If a previously seen trail is reloaded or replayed, the same comparisons may be counted again. This is a conditional duplication risk that needs an explicit session/dataset identity and idempotent sample keys. The current global storage key also allows parameter totals to carry across unrelated incident/site contexts.

### M5 — Environmental baseline is not site/incident scoped
The baseline hook groups samples by weekday/weekend and broad time-of-day buckets. It does not receive an explicit site, building, incident or session context. A device moved between buildings or operating contexts can mix unlike occupancy/motion distributions. It also treats a missing mean-speed value as numeric zero in its current ingestion path, which can contaminate the motion baseline.

### M6 — Local storage is not a governed training-data registry
Local browser storage has no immutable dataset manifest, external reviewer, label provenance, independent reference, retention policy or reproducible export. It is acceptable for a local experimental heuristic, not a validated training pipeline.

## 3. UI and operational boundaries

The adaptive forecast panel must describe its outputs as experimental, same-stream estimates. It must explicitly state:
- The comparison is against later observations from the same sensor/track pipeline.
- The results are not independent ground truth or external validation.
- The displayed error and improvement are in-sample/backtest statistics unless a separate sealed holdout is implemented.
- These outputs are not for incident command, entry, evacuation, victim location or Guardian X actuation decisions.

A model's presence in a panel or registry is not evidence of deployment approval. Experimental, shadow, pilot and approved states must be explicit and backed by a signed evaluation record.

## 4. Corrections implemented on the CMVisual overhaul branch

The following source changes are isolated on `waveradar-os/architecture-baseline`; a partial, unsynchronized port has also been written to the connected Base44 working app. The Base44 port currently covers source-time track trails, prediction calibration, sensor-frame timestamp handling and range-only spatial gating. The Android lifecycle/evidence-label fix and the model session-scoping/UI wording changes are not yet ported or verified in Base44:
1. Source capture timestamps are required for track-history points. Receipt time is retained separately for liveness.
2. Missing or invalid observation timestamps are excluded from prediction calibration rather than replaced with the current time.
3. Missing coordinates are excluded rather than coerced to zero.
4. Uncertainty coverage is reported only when a positive uncertainty value exists; otherwise calibration coverage/score is null.
5. Range-only observations are preserved separately and are not assigned a zero-degree bearing or projected into the spatial world.
6. Empty native sensor snapshots are classified UNKNOWN rather than MEASURED.
7. Regression tests cover missing/invalid timestamps, null bearings, real zero-degree bearings, invalid coordinates, missing uncertainty and empty native snapshots.

The branch's aggregate test command passes. Physical device and independent ground-truth testing remain outstanding.

## 5. Required model architecture

For the OS target, separate:
- **Perception:** detections from each modality, with source and model provenance.
- **Localization:** coordinate transforms, time alignment, calibration and error bounds.
- **Sensor quality:** freshness, missingness, drift, spoofing and conflict detection.
- **Fusion:** quality-weighted observations with traceable source contributions.
- **World-state estimation:** tracks and spatial hypotheses.
- **Prediction:** explicitly bounded horizons with calibration and abstention.
- **Decision support:** evidence-backed options and human acknowledgment.
- **Independent evaluation:** sealed datasets, physical reference, blinded reviewers and signed reports.

Do not collapse these into one opaque model or one generic confidence score.

## 6. Governed continual-learning design

The approved learning loop is:
1. Capture immutable observations and provenance.
2. Quarantine untrusted, untimed, uncalibrated, duplicated or conflicting records.
3. Curate eligible samples with a documented reason and reviewer.
4. Label with a published protocol and adjudication.
5. Freeze a versioned dataset and incident/site/device-aware split manifest.
6. Train or tune in a reproducible offline job.
7. Evaluate against fixed baselines and a sealed test set.
8. Measure calibration, OOD behavior, subgroup/device variance, missing-modality degradation, latency and resource use.
9. Obtain independent review.
10. Shadow-test, canary and release only with signed artifact, configuration and rollback.
11. Monitor drift and suspend/rollback when thresholds fail.

No live operational stream may update production model weights or tuning parameters automatically. On-device adaptation can remain an experimental shadow feature until its data eligibility, idempotency, site/session scoping and independent evaluation are established.

## 7. Acceptance evidence

A model is not promoted beyond experimental until the evidence package includes:
- Intended use and prohibited use.
- Dataset and label provenance.
- Model/code/runtime/artifact digests.
- Independent physical ground truth for any spatial/physical accuracy claim.
- Pre-registered test protocol and thresholds.
- Incident/site/device-disjoint test results where appropriate.
- Confidence intervals, sample counts, exclusions and failure cases.
- Calibration and OOD/abstention tests.
- Human-factors and degraded-mode evaluation.
- Independent reviewer decision and signed release record.

No model currently earns a life-safety approval from this audit.
