# WaveRadar OS — Victim Evidence and Rescue Handoff Foundation

**Status:** Prototype foundation; not clinically validated and not approved for operational medical use.  
**Implementation branch:** `victim-evidence-foundation-2026-11-13`

## Purpose

Provide one time-indexed, auditable evidence record for a person explicitly designated by a responder during an incident. The record links selected sensor observations and responder-entered observations without converting them into an injury diagnosis.

This is a WaveRadar OS capability integrated into the existing WIS/Home operational workspace. It is not a separate product or a claim that the current application can identify every victim.

## Evidence record

Each record contains:
- an opaque victim-record ID, incident ID, and linked sensor-track ID;
- append-only events with observed and recorded timestamps;
- explicit evidence class, source, modality, and source observation reference;
- selected scan metadata (range, bearing, source confidence, uncertainty, corroboration) when the responder captures a scan reference;
- human-entered observable findings, including explicit `NOT_ASSESSED` and `UNABLE_TO_ASSESS` states;
- conflict flags when a category contains both `OBSERVED` and `NOT_OBSERVED` reports;
- a structured EMS handoff export that preserves source events and limitations.

## Observation categories

Respiratory observation, visible bleeding, responsiveness, visible burn indicators, movement/limb position, environmental exposure, and other observable findings.

The system does not compute an overall injury score, diagnosis, internal-injury estimate, survival probability, triage category, or treatment recommendation. Missing evidence is not evidence of absence. Contradictions are surfaced, not averaged away.

## Sensor boundaries

- RGB/thermal: can provide surface/visible observations subject to lighting, occlusion, calibration, and modality limits; no internal injury diagnosis.
- mmWave/radar: presence or motion/respiratory-motion research signals only after modality-specific validation; not a standalone clinical measurement.
- Depth/LiDAR: geometry, pose, and obstacle context; no injury diagnosis.
- IMU: device motion/orientation; cannot prove fracture, concussion, or injury severity.
- Pulse oximetry/ECG: only through validated medical devices, with quality flags and qualified clinical interpretation; no assumption that such a device is connected.
- Environmental sensing: scene exposure context, not a direct measurement of a victim's internal condition.
- Audio: may capture responsiveness/distress cues but is noise- and context-sensitive.

A scan reference stores metadata and an observation pointer only. This prototype does not copy raw images, audio, waveforms, or biometric data into the victim record.

## Safety and data governance

- No face recognition or identity inference.
- No direct identifiers in this prototype. Use opaque track and victim IDs.
- Human responder explicitly assigns a selected person track to a victim record.
- Original events are immutable in the UI workflow; corrections should be appended as new events, not overwrite history.
- Data currently persists in the current browser tab's `sessionStorage`. It is not encrypted, synchronized, backed up, or a durable clinical/incident record. Export is a user-initiated JSON handoff.
- Do not use real patient data in this prototype. Before field use, implement approved access control, encryption in transit/at rest, retention/deletion rules, audit logging, consent/IRB or other applicable governance, and secure cross-device synchronization.
- Clinical decision support is deliberately not implemented until a qualified clinical governance group defines the intended use, protocols, regulatory assessment, risk controls, and independent validation plan.
- No autonomous treatment, triage, entry, extraction, or tactical command.

## Integration plan

1. **Implemented in this slice:** responder-assigned victim record, linked scan references, append-only responder observations, timestamped event timeline, conflict visibility, session-only save, JSON handoff, deterministic unit test.
2. **Next engineering gate:** replace session-only storage with a portable, secure incident-evidence service and explicit authorization/audit contracts; preserve offline operation and deterministic export/replay.
3. **Next sensor gate:** bind modality-specific raw evidence references and calibration/health metadata through the Edge Runtime, without conflating sensor capability, permission, registration, sample arrival, timestamps, or pose availability.
4. **Next interface gate:** consume the same record in firefighter HUD, Chief Command, WIS replay, and Research & Validation Lab through versioned contracts.
5. **Clinical gate:** independent clinical protocol review and prospective, governed validation with appropriate ground truth. Evaluate false negatives, subgroup performance, missingness, latency, calibration, and human factors before any clinical claim.
6. **Operational gate:** incident command approval, responder training, privacy/security review, and controlled field evaluation. This prototype is not authorized for operational medical decision-making.

## Verification

Run:
- `node scripts/test-victim-evidence-record.mjs`
- `npm run build`
- `npm run lint`

The test exercises immutable append behavior, track-bound scan linking, evidence class preservation, contradictory observations, unassessed categories, and handoff limitations. Build/lint must be run in a configured checkout; repository connector writes alone do not prove those checks passed.
