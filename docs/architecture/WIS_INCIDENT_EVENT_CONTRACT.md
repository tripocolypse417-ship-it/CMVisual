# WIS Shared Incident Event Contract

**Status:** Proposed v1 contract; implementation and conformance tests required  
**Date:** 2026-11-17  
**Applies to:** WaveRadar Core, WIS Command, WIS Helmet, Research & Validation Lab, incident replay

## Objective

All operational clients consume one incident event stream and derive role-specific views from the same versioned state. Clients must not invent independent hazard, route, coordinate, or source truth.

## Event envelope

Every event carries these fields. Nullable values may be unknown; unknown is never replaced with a guess.

- schema: waveradar.incident-event
- schemaVersion: integer, initially 1
- eventId: globally unique immutable identifier
- incidentId: incident scope
- incidentVersion: authoritative monotonically increasing incident sequence, assigned on acceptance
- eventType: namespaced event type
- eventTime: capturedAt, clockDomain, optional monotonicNanos, optional clockUncertaintyMs, receivedAt
- source: sourceId, deviceId, adapterId, optional actorId, authorizationScope
- spatial: optional coordinateFrameId, mapRevision, position, orientation, uncertainty
- evidence: provenance, integrity, quality flags, rawPayloadRef, contentHash, calibrationRef
- freshness: optional expiresAt and maxAgeMs
- causality: causedBy, supersedes, conflictsWith
- payload: bounded event-type-specific object

The example identifiers in this document are placeholders, not incident records. receivedAt is ingestion time, never a substitute for capturedAt. Offline clients may create events with unique IDs and provisional local sequence values, but must not claim an authoritative global version before reconciliation.

## Required invariants

1. Identity: eventId is globally unique; retries retain the same ID. Duplicate IDs with different content are integrity conflicts, not updates.
2. Versioning: accepted events receive a strictly increasing incidentVersion within one incident. Gaps are detectable and repairable by replay.
3. Provenance: MEASURED, DERIVED, INFERRED, PREDICTED, SIMULATED, UNKNOWN, and UNAVAILABLE remain distinct. Integrity (PENDING, VERIFIED, FAILED, NOT_CHECKED) is a separate axis.
4. Time: preserve source clock domain, monotonic capture time where available, receipt time, and uncertainty independently. Never compare monotonic clocks across devices without a synchronization model.
5. Space: coordinates require a named frame and map revision. Pose, orientation, calibration, and uncertainty are required before asserting a source viewpoint or world-locked overlay.
6. Authorization: producer and authorization scope are attributable. Unauthorized events are rejected or quarantined; they do not silently enter operational state.
7. Immutability: accepted evidence is append-only. Corrections are new events that explicitly supersede or dispute prior events.
8. Privacy: collect only fields needed for the authorized incident purpose. Do not create person-identification or profiling records from radio identifiers. Infrastructure identifiers are sensitive operational metadata and require scoped access, minimization, and retention controls.
9. No silent promotion: a prediction, simulation, or unverified inference cannot be rendered as a confirmed measurement or hazard.
10. Bounded payloads: payload size, nesting, arrays, strings, and attachment references must be bounded and validated before persistence or transport.

## Incident-state projection

The incident state is a deterministic projection of accepted events, not a mutable client-owned document.

- The authoritative service validates schema, authorization, source integrity, and event causality before assigning an incident version.
- Clients persist received events and the last verified projection checkpoint.
- A client reconnects by requesting events after its last contiguous authoritative version.
- Reordered events are buffered within bounded limits; missing versions trigger replay; duplicate identical events are idempotent.
- Conflicting events remain visible with both source references and are resolved by an attributable adjudication event. Last-write-wins is prohibited for hazards, routes, coordinates, and evidence.
- A client with a gap, unresolved conflict, expired critical data, or unverified checkpoint must show DELAYED, RESYNCING, CONFLICT, or STALE, as appropriate.

## Helmet and command consistency

WIS Command and WIS Helmet subscribe to the same incident ID, authoritative version, coordinate-frame registry, map revision, and event provenance. Their layouts and permissions differ, but their underlying accepted facts cannot diverge.

Helmet synchronization states: LIVE, DELAYED, OFFLINE, RESYNCING, CONFLICT, STALE. On disconnection, the helmet uses its last verified snapshot and local observations, visibly marks age and source, and never presents command connectivity as live. Safety-critical overlays are suppressed when pose, calibration, map revision, or alignment confidence is unavailable or outside validated bounds.

## Acceptance tests required before implementation is called conformant

- Schema version, required-field, enum, size, and malformed-payload rejection.
- Duplicate event ID: identical retry is idempotent; altered content is quarantined.
- Version gap, reorder, replay, duplicate delivery, and reconnect reconciliation.
- Clock-domain mismatch, wall-clock jump, stale capture, and missing monotonic time.
- Missing coordinate frame, map revision, pose, calibration, and uncertainty.
- Unauthorized producer, revoked scope, cross-incident access, and reviewer-role isolation.
- Conflicting hazard and route updates never silently overwrite each other.
- Offline helmet display reports stale/offline and suppresses ungrounded world-locked overlays.
- Command and helmet projections agree on the same accepted event sequence.
- Append-only evidence and audit history survive restart and interrupted writes.

## Explicit non-claims

This contract does not establish that the event service, durable synchronization, Android/Linux adapters, helmet hardware, spatial overlays, or any life-safety behavior are implemented or validated. Each requires code, automated conformance tests, hardware-specific tests, and independent review.
