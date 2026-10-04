# CMVisual Architecture Reassessment — 2026-09-11

## Decision
Keep the CMVisual core. Do not restart the product or split it into separate applications.

The architecture is now explicitly **evidence-gated and future-capable**:

`REAL SENSOR → MEASUREMENT → DERIVED VALUE → EVIDENCE ASSESSMENT → INFERENCE → HUMAN DECISION`

If the required evidence is absent, the result is `UNKNOWN` / `INSUFFICIENT DATA`. Future sensor technologies may unlock new inference classes through the capability registry, but no inference becomes operationally eligible merely because a model exists.

## Keep
- Unified camera + 3D spatial + radar/floorplan workspace.
- Real-data-only live runtime.
- Sensor fusion with provenance, timestamps, quality, uncertainty and disagreement.
- Stable track IDs without treating them as identity.
- Timeline/replay and federation with explicit coordinate alignment.
- Physical trajectory/outcome prediction with calibration against later measurements.
- Evidence assessment and human review.
- AI Analyst with competing physical hypotheses and data-gap reporting.

## Add / strengthen
1. **Incident Command Mode** — broader-area operational view for command personnel while field users retain local detail.
2. **Integrity Monitor** — stale-input, conflict, provenance and live-input status visible in the main workspace.
3. **Uncertainty-first visualization** — uncertainty and evidence class remain attached to every observation/derived result.
4. **Sensor contribution/provenance** — every important output remains traceable to source, time, location/frame, validation state and uncertainty.
5. **Training Mode** — a clearly marked training/simulation context. Training data must never be presented as live measured data and must never silently create targets in the live runtime.
6. **Evidence-Gated Inference Registry** — capability definitions specify required sensors/evidence, validation thresholds and eligibility. Unsupported future capabilities remain locked/unresolved.
7. **Future sensor adapters** — validated biometric, neural, thermal, radar, UWB, acoustic, lidar, or other sources can be added without rewriting the inference architecture.

## Remove / prohibit
- Fabricated human targets, synthetic sensor readings or fake measured geometry.
- Unsupported through-wall claims.
- Person-level identity, dangerousness, intent, personality, gender, mental-state or neural-state claims from appearance/motion/radio/camera signatures alone.
- Any prediction displayed as measured fact.
- Any training/simulation state that can be mistaken for live evidence.

## Future inference contract
A future capability is eligible only when all required evidence is present and its validation rules pass. Each inference should carry:

`CAPABILITY · SOURCE · TIME · LOCATION · EVIDENCE CLASS · CONFIDENCE · UNCERTAINTY · VALIDATION · MODEL VERSION`

The system may then expose the inference as `DERIVED`, `CORROBORATED`, `PREDICTED`, or another explicitly defined evidence class. It must never silently promote an inference to `MEASURED`.

## Operational modes
- **Field View:** local detail, target following, sensor evidence.
- **Incident Command:** wider operational picture, team/federated status, hazard/evidence overview.
- **Training:** explicitly labeled simulation/training context; no live-data ambiguity.
- **Review:** captured evidence and replay only.

## Validation priority
1. Sensor ingestion integrity.
2. Track continuity and loss rate.
3. Cross-sensor agreement/disagreement.
4. Coordinate-frame alignment.
5. Replay determinism.
6. Prediction calibration.
7. Human operator task performance.
8. Safety/integrity failure injection.

## Commercial implication
This strengthens the same core package for fire/rescue, search and rescue, industrial operations, construction, robotics, research, utilities and later government customers. The differentiator is not a claim that CMVisual can sense everything; it is that CMVisual can explain exactly what it knows, what it derives, what it predicts, what it cannot know, and what new validated sensors would be required to extend its capabilities.