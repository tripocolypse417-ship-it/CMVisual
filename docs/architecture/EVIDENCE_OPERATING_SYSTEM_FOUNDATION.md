# WaveRadar Evidence Operating System — Foundation Contract

**Status:** Software foundation implemented on a draft branch; live multi-device integration and physical validation remain open.  
**Date:** 2026-11-17

## Core principle

WaveRadar is an evidence operating system, not a sensor-fusion score generator. It preserves source-native observations, provenance, capture and receipt time, derived claims, competing hypotheses, conflicts and explicit unknowns. Fusion is a consumer of this evidence fabric—not an authority that rewrites it.

## Implemented software slices

### 1. Canonical temporal evidence ledger

`src/lib/evidenceLedger.js` defines versioned events for observations, derivations, hypotheses, conflicts and retractions. It keeps capture time and receipt time separate, preserves clock-domain labels, source lineage, calibration/frame references, integrity state and raw evidence references. Identical duplicate IDs are idempotent; ID collisions are rejected; invalid records are reported rather than silently accepted.

The core is deterministic and in-memory. It is not itself durable storage or cryptographic integrity verification.

### 2. Native Android local evidence journal

`native/android/WaveRadarEvidenceStorePlugin.java` implements an app-private SQLite append/read bridge. The physical-validation screen writes each captured sample as an UNKNOWN-envelope event while retaining per-field MEASURED/DERIVED/INFERRED labels inside the payload. The JS wrapper and mapping contract have automated tests.

The journal has no update/delete API, enforces bounded batches and event sizes, and distinguishes exact duplicate events from event-ID collisions. It is local only; this plugin does not transmit data.

**Important limitations:** the database is not encrypted at rest; Android uninstall/data-clear can remove it; no backup/export recovery, tamper-evident hash chain, retention policy or instrumented process-death test is implemented. Do not place sensitive victim identifiers or unredacted personal information in it.

### 3. Evidence-ledger scene replay

`src/lib/evidenceSceneReplay.js` projects ledger events into a deterministic incident snapshot. Knowledge-time filtering is distinct from capture-time replay. Replay requires an explicit clock domain; events from other domains remain unaligned, and untimed evidence remains visible outside the timed scene.

Only explicit `payload.sceneEntity` objects with stable IDs/types create scene entities. Position requires finite x/y/z. ALIGNED additionally requires an explicit coordinate frame and alignment declaration. Otherwise the entity remains unregistered and positionless. Competing hypotheses and conflicts remain separate collections.

Command and helmet projections derive from the same snapshot and share a synchronization key. This is a tested data contract, not yet a connected renderer or real helmet display.

## Time and space rules

- Capture/event time is not receipt/ingest time.
- A clock-domain label is not proof of synchronization.
- No timestamp is filled from arrival time.
- Cross-domain capture timestamps are not compared without a validated clock transform and error bounds.
- No coordinate is inferred from a range-only measurement.
- No entity without an explicit registered position is placed at the origin.
- Coordinate-frame labels are not calibration; alignment requires independently established transforms.

## Existing architecture retained

- PR #95 remains the separate networking and WIS/helmet architecture proposal.
- PR #94 remains an experimental fusion candidate. Its uncertainty estimates and source-correlation assumptions are not calibrated confidence.
- The divergent scene/replay branch was not merged. Its earlier prototype informed the new ledger-based replay contract, which has been reimplemented on this clean branch.
- Existing Android sensor, ranging and network plugins remain distinct capability providers. This change does not add new hardware capability.

## Next acceptance gates

1. Add Android Keystore-backed encryption and documented key recovery/rotation before sensitive incident data.
2. Add instrumented Android tests for append, process restart, paging, duplicates, collisions, interrupted transactions and migrations.
3. Persist all approved sensor/evidence adapters through the journal without blocking capture.
4. Implement authenticated, encrypted, idempotent store-and-forward transport with explicit authorization, replay protection and conflict handling.
5. Implement clock offset/drift estimation and versioned coordinate transforms with measured error bounds.
6. Connect the ledger-backed scene snapshot to a 3D renderer, timeline controls and evidence drill-down.
7. Connect WIS command and helmet projections to the same incident revision/cursor, with stale/offline and uncertainty indications.
8. Independently evaluate sensor and scene performance against physical ground truth and external review.

## Verification

Automated contract tests cover ledger semantics, local-store bridge behavior, validation-sample mapping and scene replay/projection semantics. GitHub Actions runs web lint/build, Android compilation and regression tests. A passing source-level test does not prove device persistence or physical accuracy; actual Android device testing remains required.

## Non-claims

This is not a completed operating system, durable multi-device evidence platform, encrypted incident database, calibrated fusion engine, 3D scene renderer, verified helmet display, through-wall sensor, victim detector or life-safety validated system. No indoor-positioning accuracy or operational readiness is established.
