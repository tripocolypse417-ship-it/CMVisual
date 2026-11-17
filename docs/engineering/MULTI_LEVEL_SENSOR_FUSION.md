# WaveRadar multi-level fusion architecture

**Status:** Experimental design and first software slice. This document is not evidence of physical sensor performance.

## Why a single fusion step is insufficient

A single weighted average hides the most important failure modes in heterogeneous sensing: different clocks, coordinate frames, sensor biases, correlated errors, missing measurements, multipath, occlusion, and a source that is confidently wrong. WaveRadar should therefore preserve source-native evidence and fuse it in explicit layers. Each layer must be independently inspectable and may return UNAVAILABLE.

## Layered architecture

1. **Provider and capability layer** — discovers hardware and software providers; reports support, permissions, registration, sample arrival, freshness, calibration, and validation as distinct states.
2. **Immutable observation layer** — stores the original payload/reference, source identity, source timestamp and clock domain, receipt timestamp, units, coordinate frame, evidence class, uncertainty, calibration, and integrity metadata.
3. **Clock and frame alignment layer** — estimates clock offset/drift only from explicit synchronization evidence; transforms coordinates only through versioned, traceable transforms. Uncertain alignment remains uncertain.
4. **Primitive measurement layer** — converts protocol-native values into typed constraints without inventing semantics: inertial increments, UWB/Wi-Fi ranges, GNSS fixes, camera feature tracks, thermal pixels, environmental measurements.
5. **Local state estimation layer** — estimates a device-local trajectory or source-specific state, retaining covariance and drift. IMU alone is not absolute position.
6. **Cross-source factor layer** — links compatible observations with factors such as range, relative displacement, pose, surveyed anchor, or shared time. Range is not bearing; a feature track is not an identified person.
7. **Robust graph optimization layer** — solves only when observability and conditioning checks pass. Uses robust loss / switchable constraints to quarantine inconsistent factors, and preserves rejected-factor reasons.
8. **Independent integrity layer** — checks residuals, leave-one-source-out sensitivity, source dependence, calibration status, temporal consistency, and failure envelopes. It does not certify its own operational safety.
9. **Decision and presentation layer** — emits bounded hypotheses with evidence class, freshness, uncertainty, contributing/excluded sources, validity envelope, and explicit unavailable states. Operational consumers apply their own safety policy.

## First implemented slice

src/lib/fusion/consensus.js is deliberately narrower than a full factor graph. It provides a deterministic position-observation consensus baseline:
- explicit MEASURED/DERIVED evidence only;
- finite coordinates, source IDs, timestamps, uncertainty, units, and coordinate frames;
- freshness, duplicate-source, frame, unit, and time-skew gates;
- robust residual screening followed by inverse-variance weighting;
- a DERIVED candidate with lineage and an explicitly uncalibrated uncertainty heuristic;
- fail-closed UNAVAILABLE outcomes.

The module is not wired into the operational UI. Its scalar uncertainty is not a calibrated confidence interval and does not model correlated source errors.

## New research directions worth testing

### A. Factor-graph fusion instead of feature concatenation
Represent each sensor contribution as a typed constraint over shared states. This preserves the physical meaning of each source and permits source ablation, residual analysis, and principled handling of missing modalities. Candidate factors: IMU preintegration, UWB/Wi-Fi RTT range, GNSS position, visual relative pose, surveyed landmarks, and known static geometry. Only implement a factor when its measurement model and noise assumptions are documented.

### B. Integrity-aware / switchable constraints
Use robust losses and switch variables so a multipath range or bad visual track can be down-weighted or excluded without corrupting every other source. Record the residual, gate, decision, and source identity. Never silently discard evidence.

### C. Leave-one-source-out fault isolation
Recompute the estimate with each source removed. Large changes reveal dependence on a single provider or a hidden conflict. Report sensitivity and observability; do not label a consensus as trustworthy merely because several correlated sensors agree.

### D. Event-time replay and causal fusion
Keep source time, clock domain, receipt time, and estimated clock mapping separate. Support both event-time reconstruction and 'what the command system knew at time T' replay. Unknown receipt times must be excluded from strict knowledge-time claims.

### E. Adaptive degradation with explicit modes
Prefer a truthful lower-capability mode over a confident-looking but unsupported estimate: GNSS-only outdoor fix, relative-motion-only trajectory, range-only constraints, camera-visible observations, or no spatial pose. Never synthesize a 3D point from missing dimensions.

## Acceptance gates before wider integration

- Contract tests for every provider and each failure state.
- Independent ground-truth datasets with documented rights and synchronized reference clocks.
- Baseline comparisons and ablations per sensor/source, device, environment, and geometry.
- Calibration curves and empirical error distributions; uncertainty must be checked for coverage, not merely output.
- Robustness trials for multipath, NLOS, body occlusion, sensor dropout, clock drift, motion blur, thermal crossover, and building-to-building shift.
- Independent reproduction and safety review before any operational promotion.

## Explicit non-goals

This architecture does not establish through-wall sensing, victim detection, identity, universal indoor positioning, rescue-grade reliability, or Guardian X safety. Those require distinct hardware, protocols, physical tests, qualified reviewers, and independent evidence.