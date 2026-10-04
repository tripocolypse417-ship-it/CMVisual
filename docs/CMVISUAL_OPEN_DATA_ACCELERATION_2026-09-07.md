# CMVisual Open Data Acceleration — 2026-09-07

## Decision

Yes: CMVisual should streamline evidence association so every inference can be traced to the smallest useful set of observations. The system should also use open datasets for development and benchmarking, while never presenting benchmark/simulation data as live observations.

## Fast evidence record

Use one canonical observation envelope for every source:

- `eventId`
- `sessionId`
- `trackId`
- `sourceId`
- `sensorType`
- `observedAt`
- `receivedAt`
- `coordinateFrame`
- `position`
- `range`
- `bearing`
- `velocity`
- `uncertainty`
- `confidence`
- `validationScore`
- `corroborationScore`
- `evidenceClass`
- `provenance`
- `quality`
- `associationBasis`
- `license`

The key optimization is that derived inference records reference observation IDs instead of copying all sensor payloads.

## Inference linkage

Every inference should contain:

- `inferenceId`
- `inferenceType`
- `generatedAt`
- `inputEventIds[]`
- `inputTrackIds[]`
- `requiredEvidence[]`
- `evidenceClass`
- `confidence`
- `uncertainty`
- `calibrationScore`
- `status`
- `modelVersion`
- `humanReviewRequired`

This makes the relationship `sensor → observation → derived state → inference → prediction → outcome` explicit and auditable.

## Data tiers

### Tier A — permissive/open-source development data
Prefer datasets whose terms permit the intended use. Zenseact Open Dataset is especially useful because it is released under CC BY-SA 4.0 and explicitly supports sensor fusion, localization, mapping and spatiotemporal learning. citeturn0search11

### Tier B — open research datasets with restrictions
Use only when the license matches the specific activity. Examples include aiMotive, which provides synchronized calibrated camera/LiDAR/radar data but is explicitly free for non-commercial research. citeturn0search2

### Tier C — simulation/training
Simulation is useful for isolated Training Mode and failure injection, but it must never enter the live measured evidence stream. DriveFusion-Data is explicitly simulation-derived and carries third-party license obligations. citeturn0search5

### Tier D — user/partner real-world data
Highest product relevance. Ingest only with authorization, preserve provenance and retention policy, and keep raw data separate from derived records.

## Recommended initial open-data stack

1. **Zenseact Open Dataset** — primary permissive benchmark for commercial-capable research.
2. **CMHT Autonomous Dataset** — useful research benchmark for synchronized LiDAR, radar, IR, RGB and GPS/IMU; verify exact dataset license before commercial use. citeturn0search1
3. **MARS** — useful for multi-agent and multi-traversal spatial reasoning; CC BY-NC-SA 4.0 means it should remain research-only unless licensing is separately resolved. citeturn0search6
4. **Waymo Open Dataset** — useful benchmark/reference, but follow its dataset terms rather than treating it as unrestricted CMVisual training data. It includes perception and motion datasets with sensor data, trajectories and maps. citeturn0search4
5. **aiMotive** — strong multimodal sensor-fusion research benchmark, non-commercial research restriction noted above. citeturn0search2

## Streamlining architecture

Create a compact `EvidenceBundle` around each inference:

```text
EvidenceBundle
  inferenceId
  trackId
  observationRefs[]
  strongestEvidence[]
  conflictingEvidence[]
  missingEvidence[]
  provenanceSummary
  qualitySummary
  confidence
  uncertainty
  calibration
```

The UI can display the bundle in one compact inspector instead of repeatedly rendering full sensor records.

## Time-saving rule

For each inference, compute a ranked evidence list:

1. direct measured observation
2. corroborating independent sensor observation
3. validated derived value
4. historical/replay evidence
5. prediction/calibration evidence
6. unresolved/conflicting evidence

Only the top evidence is shown by default; all underlying event IDs remain one interaction away.

## Open-source build strategy

Do not copy datasets into the app bundle. Build adapters/loaders around external datasets and store only:

- schema mappings
- dataset manifest
- license metadata
- benchmark configuration
- checksums/version identifiers
- derived evaluation metrics

This keeps CMVisual portable, reduces storage, and prevents accidental license contamination.

## Reassessment

This is a stronger direction than trying to make the application ingest every dataset directly. The core should become **dataset-agnostic and evidence-reference-driven**. That lets CMVisual train, benchmark, validate and improve rapidly while preserving the strict separation between open benchmark data, simulation, partner data and live field observations.