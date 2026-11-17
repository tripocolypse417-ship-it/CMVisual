# WaveRadar Evidence Scene Replay and Shared Views

**Status:** Deterministic projection core and contract tests implemented. No live WIS or helmet renderer is wired to this module yet.

## Data path

Android sensor/native and browser/remote adapters produce source observations. The temporal evidence ledger records immutable observation, derivation, hypothesis, conflict and retraction events. `evidenceSceneReplay.js` projects that ledger into an incident-time scene without altering the ledger.

## Time semantics

Two independent questions must remain separate:

- **Knowledge time:** which records had arrived by a specified receipt-time cutoff? This reconstructs what the system could have known at a decision point.
- **Capture time:** which records belong at a selected point in the incident timeline? Replay requires an explicitly selected clock domain.

Events from other clock domains are preserved in `unalignedClockEvents`; events without capture time are preserved in `untimedEvents`. Neither is silently assigned a coordinate or inserted into the timed scene. Clock-domain labels do not prove clocks are synchronized.

## Scene projection

Only an event with an explicit `payload.sceneEntity`, stable entity ID and entity type can create a scene entity. Position is retained only when all x/y/z values are finite. An aligned position additionally requires an explicit coordinate frame and `alignmentState: ALIGNED`; otherwise the entity remains unregistered and has no world position.

Hypotheses and conflicts are first-class snapshot collections. Competing hypotheses remain visible as alternatives; this module does not select a winner or turn a confidence score into truth. Retractions affect the projected state but never delete the underlying evidence event.

## Command / helmet consistency

`buildSynchronizedEvidenceScene` constructs one snapshot and produces command and helmet projections from that same snapshot. The synchronization key includes incident, selected clock domain, cursor and applied event IDs. Role/floor/entity-type filtering changes presentation only.

The renderer must surface unlocated entities, hypotheses, conflicts, untimed evidence, unaligned-clock evidence and stale/offline state. It must not place unregistered observations at (0,0,0).

## Tests

`npm run test:evidence-scene-replay` verifies:
- capture-time vs knowledge-time separation and late-arriving events;
- clock-domain isolation;
- retention of untimed and unaligned evidence;
- preservation of competing hypotheses and conflicts;
- no invented position for entities without explicit aligned geometry;
- identical synchronization keys for command and helmet views.

## Remaining work

- Connect live incident observations to this ledger and projection.
- Add versioned geometry/floor-plan ingestion and surveyed transforms.
- Implement a 3D renderer, replay timeline and evidence drill-down.
- Add durable persistence for the scene/geometry metadata and deterministic algorithm versions.
- Add authenticated multi-device sync and independent physical ground-truth validation.
- Verify actual WIS and helmet display timing on target hardware.
