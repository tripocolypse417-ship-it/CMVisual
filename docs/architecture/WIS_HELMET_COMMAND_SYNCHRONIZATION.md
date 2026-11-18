# WIS Command and Firefighter Helmet Synchronization

**Status:** Product and systems architecture requirement  
**Date:** 2026-11-17

## Core requirement

The firefighter helmet display is a synchronized WIS endpoint. It is not a separate product with its own incident truth, independently maintained map, or competing hazard state.

WIS Command (chief/incident command), WIS Helmet (firefighter), WIS Research & Validation Lab, and incident replay consume the same versioned incident state and evidence references. They render different role-specific views of that shared state.

**One incident state. One evidence chain. Multiple synchronized displays.**

## Shared incident state

The shared state includes:
- incident ID, operational period, scene/building model version and coordinate reference;
- crew and device assignments with authorization scopes;
- source registry, source identity, source pose, calibration, timestamps and health;
- floor plans, room/zone geometry and route graph with source and revision;
- hazards, obstacles, visibility, environmental measurements and uncertainty;
- victim/person-related operational records only where lawfully collected and necessary, with strict role and retention controls;
- alerts, acknowledgments, decisions, task status and incident timeline;
- provenance class and integrity status for every material observation or derived object.

All updates are versioned, ordered, attributable and replayable. Conflicts are explicit; clients must not silently overwrite newer or higher-integrity evidence.

## Role-specific presentation

**WIS Command** emphasizes team overview, incident map, building/zone status, source coverage, hazard evolution, assignments, resource status, communications health, alerts and after-action replay.

**WIS Helmet** emphasizes immediate orientation, assigned route/next waypoint, nearby mapped hazards, exit/egress direction, crew status, concise alerts, sensor/source availability, stale-data warnings and hands-free/voice interaction. It must avoid command-center clutter and show only information relevant to the wearer's role and task.

The views may differ in density and interaction. They must not disagree about underlying coordinates, hazard versions, timestamps, alert severity, route revisions or evidence provenance.

## Synchronization contract

Every material update carries:
- incident ID and monotonic incident-state version;
- event ID and source event references;
- source timestamp, server/relay receipt timestamp and clock uncertainty;
- authoring device/service and authorization context;
- coordinate frame and map/building revision where spatial;
- provenance, integrity, quality and freshness/expiry metadata;
- explicit supersedes/conflict references when applicable.

Clients expose synchronization states: **LIVE**, **DELAYED**, **OFFLINE**, **RESYNCING**, **CONFLICT**, and **STALE**. A disconnected helmet continues local display from its last verified snapshot and local sensors, but visibly labels the snapshot stale/offline and never implies live command connectivity.

## Transport and local operation

- Use an authenticated, encrypted, low-latency event channel for operational updates.
- Use durable store-and-forward for non-urgent evidence and replay.
- Prioritize emergency alerts and route/hazard changes while preserving ordering and acknowledgments.
- Helmet acknowledges receipt and separately acknowledges operator comprehension/action where workflow requires it.
- Acknowledgment is not proof that the firefighter saw, understood or acted unless a distinct human confirmation event exists.
- On reconnection, reconcile by event/version IDs; do not blindly replace local observations.
- Preserve raw observations and conflict history for after-action review.
- Define bounded latency and availability targets only after radio/network architecture and field measurements establish achievable values.

## Spatial alignment and source viewpoints

All displays use a shared coordinate-frame registry and building/map revision. A sensor viewpoint is selectable only if the source has a valid timestamp, pose, orientation, coordinate frame and calibration state. If any are missing, show the source as unlocated or pose-unknown; do not fabricate a 3D viewpoint.

Helmet orientation, world-locked overlays and route alignment require device-specific calibration and independent testing for drift, latency, motion and magnetic disturbance. When alignment confidence falls below a validated threshold, suppress world-locked cues and fall back to a stable compass/relative guidance mode with an explicit warning.

## Safety and human factors

- Never obscure essential real-world vision or certified helmet/SCBA functions.
- No unvalidated overlay may be the sole basis for entry, egress or victim rescue.
- Use glanceable symbols, high contrast, restrained color, redundant shape/text/audio/haptic cues and configurable brightness.
- Design for smoke, low visibility, gloves, stress, motion, heat, vibration and limited attention.
- Avoid alert flooding; rank by urgency, confidence, freshness and actionability.
- Distinguish confirmed hazard, suspected hazard, predicted hazard and unknown area.
- Make route guidance advisory and show blocked/unknown segments.
- Provide rapid manual dismissal/acknowledgment and safe fallback if display, sensors or communications fail.
- Validate optical safety, thermal limits, battery runtime, mechanical integration and human factors with qualified independent test partners.

## Acceptance tests

1. Command and helmet render the same incident ID, map revision, hazard IDs, event versions and source references.
2. Injected updates arrive with measured latency; stale and delayed states are correctly shown.
3. Disconnect/reconnect tests prove local continuity, explicit offline indication and deterministic reconciliation.
4. Conflicting map/hazard versions are surfaced rather than silently overwritten.
5. Coordinate-frame and pose tests quantify overlay drift under motion and environmental disturbance.
6. Alert delivery, acknowledgment and failure modes are tested with independent observers.
7. Human-factors evaluation verifies legibility, cognitive load, glove/voice interaction and safe fallback.
8. All safety-critical functions remain available independently of the helmet overlay.

## Release gate

A synchronized UI prototype is not an operational helmet system. Field deployment requires validated hardware, thermal/optical/mechanical safety, RF coexistence, latency/reliability evidence, cybersecurity review, human-factors testing and agency approval. No life-safety claims until independently demonstrated within a documented test envelope.
