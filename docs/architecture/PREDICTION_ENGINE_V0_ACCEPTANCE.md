# Prediction Engine v0 — executable acceptance contract
Status: experimental; no field safety approval.

## Interface
Input: immutable evidence-envelope IDs, source capability, event time and clock domain, measured environmental values with units, provenance, uncertainty, freshness, and optional site context.
Output: immutable forecast ID, parent event IDs and hashes, model version, generated-at time, forecast horizon, expiry, variable and units, predicted interval or UNAVAILABLE, assumptions, reasons, and integrity/validation flags.

## MVP algorithm
Use a deterministic, bounded linear trend estimator for a single environmental quantity (e.g., temperature) from at least 3 compatible MEASURED observations from a permitted sensor in one normalized clock domain. Require finite values, valid units, monotonically ordered timestamps, a configurable max sample age, minimum time span and maximum observation gap. Do not extrapolate past a short explicitly configured horizon. If clock synchronization, source calibration, uncertainty, or adequate observations are missing, return UNAVAILABLE rather than a numeric forecast. A fitted line is not a validated fire model; label output EXPERIMENTAL FORECAST and never use it for escape-route authorization.

## Safety separation
Prediction is DERIVED/FORECAST, never MEASURED. Simulation inputs yield SIMULATED outputs. Receipt/hash validation does not establish physical accuracy. Independent verification engine can veto presentation for stale, contradictory, uncalibrated, or unsupported inputs. Show prediction and evidence side by side, not as a real-time observation. Never fabricate victim location, vital signs, structural collapse, or safe navigation.

## Acceptance fixtures
1. Three compatible measured values, correct units and clocks -> deterministic output with horizon and source lineage.
2. Missing observations, stale values, mismatched units, mixed clock domains, duplicate IDs, nonfinite inputs -> UNAVAILABLE with specific reason.
3. Contradictory sensors or unavailable calibration -> no operational recommendation.
4. Same frozen evidence + model version -> identical replay forecast; originals unchanged.
5. Later ground truth scored separately (absolute error, false alarm, calibration when applicable), no rewriting of prior forecast.
6. Airplane mode, restart, delayed sync and event-order permutations -> persisted forecast provenance and deterministic reconstruction.
7. Forecast expiration and independent veto -> overlay disappears or displays unavailable, never silently persists as current.

## Integration sequence
A. Implement pure function and fixtures without network or UI dependency.
B. Attach to journal projections behind experimental feature flag.
C. Expose read-only forecast in Command/Field with timestamp, expiry, uncertainty and evidence link.
D. Compare against independent lab observations and publish acceptance thresholds before any operational use.

Owner and CI run links to be filled from actual work; no passing test or deployment asserted.
