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

**Security boundary:** event JSON payloads are AES-256-GCM encrypted with an Android Keystore key. Event/incident IDs and index metadata remain plaintext for local querying. Android backup is disabled for the generated app because the key is device-bound. This is not whole-database encryption or tamper-evident storage; uninstall/data-clear can remove the database and key. Key rotation/recovery, retention and instrumented process-death tests remain open.

### 3. Evidence-ledger scene replay

`src/lib/evidenceSceneReplay.js` projects ledger events into a deterministic incident snapshot. Knowledge-time filtering is distinct from capture-time replay. Replay requires an explicit clock domain; events from other domains remain unaligned, and untimed evidence remains visible outside the timed scene.

Only explicit `payload.sceneEntity` objects with stable IDs/types create scene entities. Position rendering requires finite x/y/z, coordinate frame, calibration reference, transform version, metric units, validation reference, validator ID and an INDEPENDENTLY_VALIDATED declaration. The UI labels this validation-referenced geometry, not verified certification; the referenced evidence still requires independent review. Multiple coordinate frames are not overlaid without a common validated transform. Competing hypotheses and conflicts remain separate collections.

Command and helmet projections derive from the same snapshot and share a synchronization key. A local replay page and basic Three.js viewport are implemented; they read the native journal and render only validation-referenced positions. This is not yet the production WIS renderer or a real helmet display.

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

1. Add documented Keystore key rotation/recovery and instrumented Android tests for append, process restart, paging, duplicates, collisions, interrupted transactions and migrations.
2. Persist all approved sensor/evidence adapters through the journal without blocking capture.
3. Implement authenticated, encrypted, idempotent store-and-forward transport with explicit authorization, replay protection and conflict handling.
4. Implement clock offset/drift estimation and versioned coordinate transforms with measured error bounds.
5. Integrate the replay page with the production WIS command interface and a real helmet transport/display, preserving a shared incident revision/cursor.
6. Add building/floor geometry ingestion and independent review of validation references before any coordinates are treated as trusted.
7. Independently evaluate sensor and scene performance against physical ground truth and external review.

## Verification

Automated contract tests cover ledger semantics, local-store bridge behavior, validation-sample mapping and scene replay/projection semantics. GitHub Actions runs web lint/build, Android compilation and regression tests. A passing source-level test does not prove device persistence or physical accuracy; actual Android device testing remains required.

## Non-claims

This is not a completed operating system, durable multi-device evidence platform, encrypted incident database, calibrated fusion engine, 3D scene renderer, verified helmet display, through-wall sensor, victim detector or life-safety validated system. No indoor-positioning accuracy or operational readiness is established.
