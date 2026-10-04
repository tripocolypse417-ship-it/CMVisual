# CMVisual Pilot Scorecard

## Pilot goal
Prove a measurable operational improvement using real sensor data in a controlled environment. Do not sell unsupported sensing claims.

## Candidate pilot
**Primary:** fire/rescue or emergency-response spatial awareness.

**Secondary:** manufacturing/industrial inspection.

## Before/after measurements

| Metric | Baseline | CMVisual | Target direction |
|---|---:|---:|---|
| Time to establish spatial picture | record | record | lower |
| Time to locate/inspect target observation | record | record | lower |
| False-positive rate | record | record | lower |
| Cross-sensor conflict visibility | record | record | higher |
| Provenance completeness | record | record | higher |
| Replay completeness | record | record | higher |
| Operator steps | record | record | lower |
| Setup time | record | record | lower |
| Operator confidence in evidence | survey | survey | higher |

## Evidence requirements
Every pilot output should preserve:
- SOURCE
- TIME
- LOCATION / COORDINATE FRAME
- UNCERTAINTY
- CONFIDENCE
- VALIDATION STATUS
- HISTORY

## Acceptance gates
1. No synthetic observations enter the measured stream.
2. Sensor outages and stale observations are visible.
3. Conflicting measurements remain distinguishable.
4. Federated observations cannot be projected without an explicit shared frame.
5. Replay reproduces the recorded evidence state without republishing remote events.
6. Predictions remain separate from measured truth.
7. Any nonvisual human observation is tied to a validated external sensor source.
8. The pilot produces a quantified operational result suitable for a customer case study and grant/commercialization evidence package.