# WaveRadar OS / WIS — Universal DFR Intelligence and Continuous Evidence Standard v1

**Owner:** WaveRadar program systems engineering / Independent Lab.
**Date:** 2026-11-22. **Status:** PRIVATE WORKING ARCHITECTURE / research-only code / **not field validated**, not connected to any commercial drone.
**Parent:** `docs/architecture/WAVERADAR_ONE_PLATFORM_CONVERGENCE_V1.md`, `docs/WAVERADAR_SHARED_EVENT_CONTRACT_V1.md`, `src/lib/unifiedIncidentReadModel.js` and private Guardian X PHOENIX PR #6.

## Mission: one meaning, one source of truth, many independently safe clients

WaveRadar should be competitive through *verifiable sensor context and decision provenance*, not the number of drone brands claimed, nonconsensual surveillance, confident-looking inferred locations, or unsupported safety claims.

**Golden path:** explicitly authorized evidence source -> immutable original / SHA-256 -> checked identity and permission -> time/frame alignment -> versioned modality normalization -> bounded optional AI research -> reasoned uncertainty-aware world-state candidate -> independent validation of the *claim*, not just the byte digest -> permissioned WIS / Field / Helmet / Guardian X / Replay -> lab audit.

An original observation is ingested exactly once by ID+verified digest, while **retries and multiple display subscribers reuse projections**. Keep video media in an authorized secure evidence vault, not as duplicate copies inside WIS, a lab database or a funding app. Never discard distinct original event IDs merely because two frames look similar or share a cache key.

WIS provides three explicit, non-interchangeable answers:
1. **What was actually recorded?** Exact source, clock domain, content digest, instrument/camera geometry and limitations.
2. **What may this imply?** Versioned model hypothesis, parents, uncertainty, calibration status, coverage limits and independent review status.
3. **What was known at the time?** Core's actual server acceptance timestamp, source time separately, late arrivals and partial communication history.

A predicted victim, heartbeat, structural stability, safe route or fire behavior never becomes a verified fact merely through model agreement or visual display. WIS must abstain or request more evidence when data are missing, delayed or conflicting.

## Cohesive data language — DO NOT add a second event schema

The **existing canonical** `waveradar-event-envelope-v1.schema.json` is the on-the-wire unit. Use its:
- `event_id` UUID, `incident_id`, `event_type`;
- `source.source_id`, `source_type='DRONE'`, adapter version, `authorization_scope_id`;
- `timing.observed_at`, clock domain/uncertainty, client `received_at`; independently stored **Core server accepted at**;
- `provenance.evidence_class` and `integrity_state`, validation reference IDs and parent event IDs;
- `spatial.frame_id`, coordinate pose, confidence/uncertainty and **UNAVAILABLE** if uncalibrated;
- `payload.payload_schema` and modality-specific `payload.data`, `evidence.raw_payload_ref` / SHA256;
- `quality.calibration_reference`, sampling/quality reason codes.

**Modality-specific data conventions (payload-only, additive, not changes to the envelope):**
- `waveradar.dfr.frame.v1`: `media_kind` (RGB_FRAME / THERMAL_FRAME / VIDEO_FRAME), frame reference in the **authorized gateway** rather than embedded video payload, source frame capture time, camera identity, optical configuration, thermal measurement calibration if known, orientation/field-of-view and video/telemetry sync uncertainty.
- `waveradar.dfr.flight-status.v1`: asset ID, status, battery and last-known coordinates where authorized; no command or mission triggers. **Asset position != observed person location**.
- `waveradar.dfr.coverage.v1`: model-derived *coverage candidate* with camera geometry/occlusion/uncertainty, never a guarantee of seeing all people or rooms.
- `waveradar.dfr.hypothesis.v1`: candidate visual/thermal finding, contributing original IDs, pinned model/preprocessor version, independent validation state, location projection status and expiry. If no calibrated camera-to-world chain, spatial position is `UNAVAILABLE`.
- `waveradar.dfr.sensor-health.v1`: dropped-frame count, decoder/network status, timestamp alignment, camera stream integrity and stale/unknown warnings.

**Important:** `schemas/waveradar-event-envelope-v1.schema.json` requires original SHA-256 to be a 64-hex string if supplied. A camera frame locator must be granted from a Core/gateway storage layer after access checks; never fetch an arbitrary source-supplied URL or elevate a video stream token into a control token.

## Read-only DFR integration contracts

Adapters may be implemented for **operator-approved, documented** methods. They must *never* discover keys, defeat radio encryption, impersonate a drone/controller, or use APIs with flight-control scope.

| Interface | Known source / technical possibility | Strict limit |
| --- | --- | --- |
| Skydio | Skydio External API RTSP video and live telemetry WebSocket, enabled by agency | Skydio notes video/telemetry are not frame-synchronized: timestamps, camera extrinsics and alignment uncertainty are mandatory |
| BRINC | BRINC advertises Video API (RTSPS), Telemetry API, LiveOps integrated operations | Require actual agency-authorized credentials and vendor API details; never assume unrestricted availability |
| DJI | Evaluate documented Cloud API/partner feed in an agency's licensed infrastructure | Actual API licensing, region and network/flight-permission controls to be verified before connection |
| Generic RTSP / RTSPS / WebRTC | Agency-controlled input gateway with explicit service-account permission | Video metadata may be absent: display as video-only without inventing pose |
| Evidence export | Locally authorized imagery/video archive import with chain-of-custody | No claim of live telepresence or immediate dispatch status |
| Remote ID | Separate lawful broadcast identity/asset awareness stream where useful | **Does not contain camera video**, does not authorize video interception or flight control |

Supported low-level protocols are *adapters*, not a substitute for rights, licenses or verified devices.

**Regulatory scope:** WaveRadar's **receive-only** software is not a pilot or operator and confers no authority to fly. Aircraft operators retain FAA Part 107 / COA obligations, including applicable waiver/airspace rules for BVLOS. Public-safety UAS processes should be reviewed against NFPA 2400 and relevant local agency rules. No autonomous flight, avoidance, tracking or emergency dispatch control in this milestone.

## Minimum execution graph (avoid redundant, useless work)

1. **Gate A — Access / identity.** Agency-initiated operator grants with incident/tenant/source scope; ACL enforced at the gateway and Core, not inferred from envelope text. On revoke, stop access. Keep credentials out of event payload, GitHub and marketing.
2. **Gate B — Capture / integrity.** Store exact originals and Core-issued media evidence handles, check SHA-256 of bytes, place id-content collisions in quarantine. Observation IDs persist through all streams. Preserve raw if AI fails.
3. **Gate C — Clock and geometry.** Align separately captured media/telemetry; record offset, drift and uncertainty. Camera calibration, world-reference frame and terrain/building location must be externally supported. Otherwise no projected world target.
4. **Gate D — Idempotent expensive computation.** Use `dfrAnalysisPlanner.js`: accept only valid scoped envelopes, require **externally attested exact media digests+internal reference**, and reuse a deterministic cache key that includes source ID, incident, frame timestamp, media hash, pose/calibration, pinned model, preprocessor and policy versions. Reuse does not imply truth.
5. **Gate E — Compute budgeting.** Fair per-source round robin, explicit `maxJobs` and backlog, local/edge/cloud policy based on actual throughput/thermal/bandwidth. No request floods or uncontrolled auto-spending. Drop **processing requests** only by policy; never silently drop original evidence.
6. **Gate F — Model semantics.** Outputs **INFERRED/PREDICTED** with uncertainty, supporting IDs and expiry. Unsupervised model agreement isn't independent ground truth. No person reidentification or biometric surveillance in default DFR profile.
7. **Gate G — World model.** WIS scene entities require validated geometry and a separate revision processor; authoritative source timestamps remain immutable. Guard against double counting same target from multiple drones.
8. **Gate H — Multi-client delivery.** WIS, helmet, fire engine, Guardian X and authorized command clients subscribe to one event stream/scene revision, each with role-limited rendering. Life-safety protection and exoskeleton release remain independent of WIS.
9. **Gate I — Lab feedback and rollout.** Reproduce failure cases; promote improvements **only** with blind ground truth, independent signoff, versioned releases, canary gates, rollback and safety approval. A self-improving system *suggests/tests* modifications; it never silently self-certifies or rewrites certified protections.

### DFR baseline implemented in this stacked draft

- Existing `src/lib/dfrEvidencePolicy.js` (preceding branch): checks source/incident/scope, event type, readable time, trusted frame requirements for showing source **asset** pose, separates target candidate from aircraft coordinates; no controls.
- New `src/lib/dfrAnalysisPlanner.js`: bounded read-only proposal queue, one-pass deduplication of original IDs, source-fair ordering, independently supplied trusted media handles and digest equality, exact-context cache keys, explicit skipped/deferred/quarantined records. This module **does not actually run a video model or connect to a vendor**.
- Regression tests + GitHub CI: synthetic, not a qualified accuracy or pilot trial.

## Competitive baseline: compare, do not claim global supremacy

Established competitors and platform capabilities should be measured with traceable vendor sources and standardized tasks. Skydio has dispatch/API/video/telemetry options; BRINC has LiveOps, evidence, CAD integrations and published Video/Telemetry APIs; Axon has video/evidence and real-time operations workflows. WaveRadar's proposed differentiation is **vendor-neutral evidence provenance, verifiable uncertainty, deterministic time-aware replay and independent cross-sensor validation**.

| Benchmark | What to measure; compare *same conditions* | Evidence required |
| --- | --- | --- |
| Multivendor interoperability | Eligible authorized feeds connected, missing metadata, ingest failures, initial time to useful view | Test harness/API version and agency permission, not vendor logo |
| End-to-end latency | Frame capture -> admitted evidence -> operator display, p50/p95/p99 and jitter | Synchronized trace with explicit clock uncertainty; no fabricated timing |
| Network resilience | Outage, reconnection, bounded backpressure, preservation of distinct originals, no false ACK | Forced outage logs, replay hash parity |
| Visual hazard/person candidate quality | False-positive/false-negative rates, precision-recall by lighting/smoke/scene class and task; confidence calibration | Independent labeled holdout and confusion matrix with sample denominator |
| Spatial truth | 2D/3D position error and floor confusion; cases with missing survey reference | Independently measured reference and unit/frames |
| Model efficiency | GPU seconds, decode cycles, Wh/processed minute, bandwidth, dedup cache hit rate | Energy/compute instrumentation, matched test set |
| Privacy & evidence | Revocation success, least-privileged access, provenance completeness and retention | Independent security review and audit trail |
| Operational value | Avoided redundant review, reliable coverage labels, responder cognitive load, incident command usability | Partner exercises with preregistered metrics and qualified observers |

Benchmarks must include a **baseline with the same raw feeds and operators**, not an inferior straw-man. Any claim of fewer casualties requires substantial ethically and operationally appropriate evidence; prototype tests cannot establish lives saved.

## Independent laboratory design — turn rigorous testing into grants and licensing

Each benchmark yields:
- Timestamped run and environment ID, hardware/vendor software versions, protocol pre-registration and risk review.
- Frozen raw source evidence with retention/access controls; labels and calibration provided by independent reviewers, not the model being tested.
- Public-safe synthetic fixtures, redacted reports and a separately permissioned raw-evidence archive; holdout data never used to fit/promote the evaluated model.
- Negative results and failures retained. Model regression, calibration drift, domain shift, operator-overtrust and missing source conditions explicitly tested.
- Independent signed **review decision**: PASS / FAIL / INDETERMINATE with methods, uncertainty and limitations.
- Provenance-linked grant evidence packet: reproducible methods, actual results, partner letters **only when obtained**, budget/resource quotes, ethics/privacy plan, adoption path and milestones.

Research fees, compliance testing and sponsored studies are *potential revenue streams*, contingent on personnel, institutional independence, lawful operation, capabilities and qualified accreditation where required. Never imply accreditation exists.

## Continuous improvement / scientific discovery — bounded closed loop

**Daily, via existing master daily automation** (avoid new task duplicates):
1. Ingest updates from *official* vendor API release notes, FAA/NFPA/NIST guidance, research publications and grant notices.
2. Parse citation, date, licensing, scope and methodology. Tag `CANDIDATE`; do not write fetched text directly into executable control policy.
3. Rank proposals by expected life-safety benefit, reproducibility, feasibility, interoperability, cost, licensing and deployment risk. Distinguish `MEASURED`, `RESEARCH`, `SIMULATED`, and unverified marketing claims.
4. Pick **one highest-priority reversible unfinished work item**, or work on several isolated tasks only if dependencies permit; open reviewable PR/test/protocol with linked source.
5. Run deterministic software tests, replay/edge/security regression and independent lab review. If failed, preserve original results and create a blocker; never conceal or auto-promote.
6. Advance `candidate -> tested -> independently reviewed -> approved -> canary -> deployed` with required human safety approvals; never autonomous safety-critical merges, unsupervised model updates, live API access, aircraft controls or financial spend.
7. Record actual costs, denials, closed blockers, new risks, prospective grants and concise daily report; recycle next day.

Use model/data/artifact registries, reproducible experiment manifests and safe rollback. Continuous learning refers to a **continuous evaluated engineering improvement process**, not uncontrolled recursive self-modification.

## Grant strategy — maximize eligible, independently defensible funding, not award count

A global record for most grants is not a sound engineering or financial metric; applications have eligibility, overlapping-cost and institutional constraints. Score pipeline opportunities on **eligibility, mission fit, deadline, verified partner, realistic preliminary data, requested award, proposal effort, cost share and reporting burden**. Avoid duplicate submission of the same expenses.

### Immediate lead to investigate

**NIJ FY 2026 Research and Evaluation on Drones as First Responders** (O-NIJ-2026-172805). Official listing dated Nov 6, 2026: closing **Nov 30, 2026**; expected total **$3.5M**, **six** awards; **no cost share**; small businesses listed among applicant types. Scope prioritizes rigorous evaluations with **law enforcement agencies and researchers**, not a generic fire-only invention grant. WaveRadar must confirm full NOFO, partner agreement, research expertise, registrations and actual project readiness before any application. **No submission** or partnership assertion.

NSF SBIR/STTR: potential future R&D route for an eligible registered business. NSF requires a Project Pitch and invitation to full Phase I; active SAM, Research.gov, SBA registrations for full proposal; it limits parallel submissions. Official NSF materials state registration is free. Do not submit repeatedly to inflate grant totals. Eligibility and calls must be rechecked each cycle. Firefighter grant programs frequently require fire departments/research institutions as direct applicants; pursue lawful partner/subrecipient arrangements instead of ineligible filings.

### Competitor and official source register (verification as of Nov 22, 2026)

- Skydio external API RTSP & telemetry: https://apidocs.skydio.com/reference/rtsp-streaming and https://apidocs.skydio.com/reference/live-telemetry
- BRINC Video / Telemetry integrations: https://brincdrones.com/integrations/
- FAA Public Safety UAS programs and 107/COA rules: https://www.faa.gov/uas/public_safety_gov/drone_program
- NFPA 2400 Public Safety sUAS: https://www.nfpa.org/product/nfpa-2400-standard-for-small-unmanned-aircraft-systems-suas-used-for-public-safety-operations/p2400code
- NIST/AUVSI public-safety connected drones study: https://www.nist.gov/system/files/documents/2024/05/13/AUTONOMOUSAERIALDRONESCONNECTINGPUBLICSAFETYOPPORTUNITIESANDCHALLENGESFORTHEFUTURE.pdf
- NIJ FY 2026 DFR opportunity: https://simpler.grants.gov/opportunity/6a0e879f-1eb1-47a7-9f75-cc87f2f4704c
- NSF small business eligibility: https://seedfund.nsf.gov/solicitation-eligibility/

## Physical and live-API milestones — still NOT done

G0 **simulated software policy**: source/clock/permission, ID collision, dedup and bounded analysis tests in CI.
G1 **partner authorized feed**: non-public pilot/agency consent and vendor read-only access with no flight-control scopes; credential handling audit.
G2 **secure real gateway**: ingest actual media+telemetry, Core byte-hash and independent server acceptance time, clock synchronization measurements, playback without replay distortion.
G3 **cross-client incident**: WIS/Field/Replay/helmet on one incident stream, offline recovery, distinct model outputs, source uncertainty, revoked access.
G4 **independent test**: ground-truth protocol and lab blind holdout; compare same scenes with baseline vendor operator workflows.
G5 **professional partner deployment review**: risk assessment, privacy/retention, FAA operator compliance, NFPA 2400, incident command usable results, monitored staged releases.

**Stop rules:** no unknown-feed interception, flight control, invented location, unlabeled AI conclusions, unapproved continuous model rollout, life-safety suitability claim or unrestricted cloud uploads. Only G0 is eligible for software acceptance from this PR.
