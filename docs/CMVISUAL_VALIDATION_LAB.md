# CMVisual Validation Lab

## Purpose

CMVisual must demonstrate what the system can measure, derive, fuse, and predict instead of relying on product claims. The Validation Lab is the repeatable test layer for that evidence.

## Evaluation axes

1. **Input integrity** — invalid, stale, duplicated, malformed, and missing observations are quarantined.
2. **Track integrity** — a persistent track does not silently jump to another observation.
3. **Cross-sensor agreement** — corroboration is measured; disagreement remains visible.
4. **Coordinate alignment** — federated observations are projectable only when an explicit shared frame exists.
5. **Temporal consistency** — timestamps, age, latency, and ordering are retained.
6. **Prediction calibration** — predictions are compared against later measured outcomes at defined horizons.
7. **Runtime capacity** — frame cadence, long-task pressure, heap when available, sensor latency, and active target load determine conservative runtime headroom.
8. **Graceful degradation** — removal of a sensor reduces capability rather than creating substitute measurements.
9. **Replay reproducibility** — a fixed event stream must produce the same track/evidence outcomes within documented tolerances.
10. **Operator utility** — measure task completion, time-to-acquire, false-lock rate, and operator corrections in controlled trials.

## Required experiment classes

### Baseline
Run camera-only, external-sensor-only, and combined sensor conditions against the same recorded scenario.

### Ablation
Remove one modality at a time. Record which outputs disappear, which remain, and whether uncertainty increases as expected.

### Failure injection
Test stale packets, delayed packets, dropped frames, sensor disagreement, coordinate-frame mismatch, device disconnect, and memory/runtime pressure.

### Capacity sweep
Replay increasing numbers of real observation tracks while recording:
- effective FPS
- median / P95 / P99 processing latency
- long-task pressure
- event backlog
- dropped observations
- heap usage when exposed
- active target count
- safe runtime capacity estimate

The safe capacity is a conservative runtime estimate, not a universal hardware limit.

### Prediction calibration
For every prediction horizon, compare the prediction with the later measured state. Store error, uncertainty, calibration status, and the source observations used to produce the prediction.

## Evidence labels

- `MEASURED`
- `DERIVED`
- `CORROBORATED`
- `FEDERATED_MEASURED`
- `PREDICTED`
- `SPECULATIVE`
- `UNRESOLVED`
- `INSUFFICIENT DATA`
- `HISTORICAL`

No prediction is promoted to measured evidence.

## Team target designation test

A designation packet is a request to acquire a target, not proof of target existence. Tests must verify:

- designation may arrive before visual acquisition;
- assigned device metadata routes the request without implying identity;
- acquisition occurs only after a real observation matches the declared track ID or spatial acquisition rule;
- the lock never silently retargets after a dropout;
- stale / expired / cancelled designations remain distinguishable;
- provenance and evidence references survive federation;
- federation does not echo a packet back into its originating device.

Packet schema: `cmvisual-team-target-designation-v1`.

## Reproducibility record

Every validation run should export:

- CMVisual build/version
- device/browser/runtime information when available
- sensor capability inventory
- dataset/replay identifier
- experiment class
- configuration
- coordinate frame configuration
- source observation references
- metrics
- failures and degraded modes
- prediction calibration results
- evidence bundle references
- timestamped reviewer notes

## External benchmark alignment

Current world-model benchmark work emphasizes separating evaluation target, protocol, metric family, and data source. CMVisual should preserve those four coordinates in its validation metadata rather than publishing one blended score. This keeps operational claims auditable and comparable.