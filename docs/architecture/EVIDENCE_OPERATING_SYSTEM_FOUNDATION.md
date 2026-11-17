# WaveRadar Evidence Operating System — Foundation Contract

**Status:** Implemented software contract slice; integration and physical validation remain open.  
**Date:** 2026-11-17

## Core principle

WaveRadar is an evidence operating system, not a sensor-fusion score generator. It preserves source-native observations, their provenance and timing, derived claims, competing hypotheses, conflicts and explicit unknowns. Fusion is a consumer of this evidence fabric—not the authority that rewrites it.

## Canonical event model

The first software slice is `src/lib/evidenceLedger.js`.

Every event carries:
- stable event and incident identifiers;
- explicit event type and evidence class;
- source identity where known;
- capture/event time and receipt/ingest time as separate nullable fields;
- declared clock domain (a label, not proof of synchronization);
- sequence where supplied;
- coordinate frame and calibration reference only when supplied;
- immutable raw-evidence reference/hash where supplied;
- source-event lineage for derivations and hypotheses;
- integrity state separate from provenance;
- typed payload and hypothesis grouping.

Invalid events are reported in a rejection/quarantine list. Repeated identical IDs are idempotently recognized; a reused ID with different content is rejected as a collision. Original evidence is never overwritten by a stronger evidence label.

## Two different historical questions

- **Event-time reconstruction:** what events were captured in a specified time range and declared clock domain? No cross-domain clock alignment is attempted.
- **Knowledge-time reconstruction:** what had reached the system by a receipt-time cutoff? Events without receipt time are excluded rather than assigned an invented arrival time.

These are not interchangeable. Late-arriving evidence can change the current reconstruction without changing what the system knew at the earlier decision time.

## Multi-hypothesis state

Competing hypotheses share a group ID and remain separate records. The ledger does not collapse them into a single location, object identity or hazard state. Conflict and retraction events are first-class event types; a downstream policy must decide how to present or resolve them while preserving the underlying history.

## Architecture integration

1. **Provider/capability plane:** existing capability registry and Android native plugins report support, permissions, registration, sample arrival and limitations separately.
2. **Evidence ledger:** this module preserves the event history and lineage.
3. **Clock/space alignment:** future adapters must provide explicit synchronization evidence and versioned coordinate transforms. Clock-domain equality alone is not synchronization.
4. **Typed measurement/fusion:** the experimental fusion work in PR #94 remains a separate candidate consumer; its heuristic uncertainty and unknown source correlation are not calibrated confidence.
5. **Incident scene and replay:** the scene/replay branch is a prototype projection layer. Reconcile its event contract with this ledger before integration; do not use its branch's prior divergent history as a merge base.
6. **Independent integrity:** challenge estimates with held-out sources, physical ground truth and independent reviewers; the producer cannot certify its own output.
7. **WIS/helmet projections:** command, helmet and replay must consume the same incident revision and evidence lineage. Only presentation density and role permissions differ.

## Networking and offline operation

PR #95 defines the provider-independent network OS and command/helmet synchronization requirements. The ledger is designed to accept events from local-first adapters and durable store-and-forward transport. This commit does not implement radio discovery, encrypted transport, durable persistence, Linux services, or browserless device management.

## Acceptance gates

- Schema and append-only/idempotency tests (this change).
- Durable storage with crash-safe append and bounded retention.
- Authenticated event transport with duplicate/reorder/partition/reconnect tests.
- Clock offset/drift estimation backed by synchronization observations.
- Versioned coordinate transforms and calibration provenance.
- Multi-hypothesis scene projection with explicit uncertainty and unavailable states.
- Command/helmet shared revision, stale/offline display and deterministic reconciliation.
- Independent ground-truth evaluation and external safety review before operational use.

## Non-claims

This is an in-memory deterministic software foundation. It is not a durable event database, cryptographic signature verifier, real-time multi-device sync service, physical sensor adapter, 3D renderer, calibrated fusion engine or life-safety validated system. It does not establish through-wall sensing, victim detection, precise indoor positioning or operational readiness.
