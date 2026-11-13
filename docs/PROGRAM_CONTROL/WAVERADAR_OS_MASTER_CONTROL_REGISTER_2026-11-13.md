# WaveRadar OS — Master Program Control Register

**Snapshot:** 2026-11-13  
**Status:** Working control baseline; not a release approval  
**Product:** WaveRadar OS  
**Target code repository:** `tripocolypse417-ship-it/CMVisual`  
**Primary rule:** One integrated operating environment, one governed roadmap, multiple bounded workstreams.

## 1. Product and architecture decision

WaveRadar OS is the product: an evidence-first, offline-capable emergency situational-awareness and decision-support operating environment. WIS (World Information Station) is its command, spatial intelligence, searchable world model and incident-replay subsystem—not a competing product or separate OS.

The first deliverable is an Android/Linux operating environment assembled from supported platform services and replaceable adapters. It is not a custom kernel or a promise to replace Android. A custom AOSP distribution is a later decision only if measured security, lifecycle, latency or hardware requirements justify its cost.

Core subsystems:
1. Edge Runtime: device identity, capability discovery, permission lifecycle, native sensor adapters, time integrity, local encrypted spool, offline sync and safe degradation.
2. Core Platform: identity/policy, device registry, sensor gateway, immutable evidence ledger, time and spatial services, world model, fusion, model runtime, prediction, alerts, replay, audit and export.
3. WIS: global/site/building/floor/room navigation; persistent versioned 3D world model; scanner/source registry; spatial-temporal search; live and historical modes; multi-stream replay; provenance and uncertainty inspection.
4. Intelligence: distinct perception, localization, quality, fusion, world-state, prediction and decision-support services; separate independent evaluation pipeline.
5. Field/HUD and Chief Command: role-specific, low-cognitive-load views; audible/visual alerts; source attribution, freshness, uncertainty and operator acknowledgement.
6. Research & Validation: preregistered protocols, independent ground truth, blinded evaluation, append-only evidence/review records and exportable audit trails.
7. Guardian X: advanced protective suit with powered full-body exoskeleton as an integrated core component; fail-safe disengagement and protected power; no actuation control in the initial OS.
8. Administration and interoperability: least-privilege identity, consent, authorized connectors, data governance, retention and replaceable provider adapters.

## 2. Non-negotiable evidence and safety invariants

- Preserve raw observations immutably. Corrections, exclusions and annotations are new linked records.
- Distinguish MEASURED, DERIVED, INFERRED, PREDICTED, SIMULATED, HUMAN_ENTERED, UNKNOWN and UNAVAILABLE. Separately track integrity verification and independent validation.
- Keep registered, supported, permission-granted, initialized, receiving samples, timestamp-valid, calibrated, healthy, pose-available and validated as separate states.
- Never fabricate missing timestamps, coordinates, bearings, sensor values, continuity or confidence.
- Range-only measurements do not become 3D points without valid bearing/pose and registration evidence.
- Clock domains, capture time, receive time, monotonic sequence and clock uncertainty remain explicit.
- Fuse only compatible measurements; retain source-level evidence and expose contradictions.
- No through-wall detection, victim localization, accuracy, certification or life-safety claims without modality-specific independent ground truth and a defined operating envelope.
- Models advise; authorized personnel retain command. No model may autonomously direct entry, evacuation, tactical action or Guardian X actuation.
- Benchmark, QA fixture, simulated, synthetic and live physical evidence remain segregated.
- No external connector may bypass authorization, consent, licensing, privacy or least-privilege controls.
- A green CI run proves only the checks actually executed—not physical sensor behavior, security completeness or operational readiness.

## 3. Source-of-truth map and reconciliation

| Asset | Current role | Control decision |
|---|---|---|
| CMVisual public GitHub repository | Target canonical code repository | Preserve existing branches, PRs and evidence; migrate only after parity and recovery gates |
| Base44 working application | Current working source per MIGRATION.md | Retain as adapter/prototype until portable parity, export and rollback are demonstrated |
| Hosted WaveRadar Core | Separate service and diagnostics source | Read-only evidence until reconciled; do not assume it is the CMVisual implementation |
| Independent Validation Lab | Separate validation service/project | Preserve independent reviewer separation and append-only evidence/audit records |
| Private WaveRadar GitHub repository | Archival snapshot per prior engineering report | Do not treat as current live source without fresh reconciliation |
| Super projects | Master control, Validation Lab, Super setup | Coordinate; do not duplicate or replace; no paid execution assumed |

No system is designated production-ready merely because it is hosted or has a preview URL. Source identity, data parity, authorization, backup/restore and rollback must be proven before migration.

## 4. Verified repository work already in flight

| Item | Scope | Current disposition from inspected GitHub records |
|---|---|---|
| PR #68 | Engineering status, prioritized backlog, drone interoperability and research partner records | Existing draft; preserve and review for freshness |
| PR #69 | WaveRadar OS architecture, current-state/model/security audits, roadmap and selected sensor/prediction integrity fixes | Existing draft; no review submissions or inline review threads found in inspection |
| PR #70 | Privileged backend authorization hardening and marketing claim controls | Existing draft; no review submissions or inline review threads found in inspection |
| PR #72 | Responder-led victim evidence record and EMS handoff foundation | New draft; quality checks and runtime safety checks passed at head `770dfc6`; Android debug APK build still running at last check |

These are not merged. The master register does not replace their code or documentation. Review CI at the current head and inspect complete diffs before merge. Resolve overlaps and dependency order; do not merge a stack out of order.

### Existing dependency chains recorded in PR #68

- Android baseline: #43 → #44 → #55 → #57 → #58 → #62 → #63 → #65.
- Parallel Android branches #56, #60 and #61 require overlap reconciliation before any independent merge.
- Portable core: #49 → #54.
- Separate workstreams include Validation Lab/export #64, funding #66, local agent runner #67 and status/interoperability #68.

## 5. Master task register

Status vocabulary: PROPOSED, READY, IN_PROGRESS, BLOCKED, COMPLETE, INDEPENDENTLY_VERIFIED. “Complete” requires artifacts and acceptance evidence. “Independently verified” requires an appropriately independent evaluator.

| ID | Priority | Workstream / deliverable | Current status | Dependencies / acceptance evidence |
|---|---|---|---|---|
| WR-TASK-001 | P0 | Reconcile CMVisual, Base44, hosted Core/Lab and private archive into a recoverable source/data map | IN_PROGRESS | Inventory, export, verified restore, parity matrix, rollback proof; preserve all originals |
| WR-TASK-002 | P0 | Review PRs #68–#70 and stacked dependencies | READY | Current CI, full diff review, branch ancestry, conflict map, no blind merge |
| WR-TASK-003 | P0 | Fresh Android native capability baseline on actual Moto G Play | BLOCKED | Authorized handset connection, exact build/device inventory, native permission and sample-arrival diagnostics |
| WR-TASK-004 | P0 | Independent physical ground-truth plan for camera/IMU/pose | BLOCKED | Preregistered protocol, calibrated reference, synchronized clocks, independent reviewer and controlled site |
| WR-TASK-005 | P0 | Evidence integrity and provenance audit | IN_PROGRESS | Reconcile 4,021 historical observations; no retroactive relabeling; integrity checks and append-only dispositions |
| WR-TASK-006 | P0 | Independent reviewer and eligible non-QA Lab dataset | BLOCKED | Prior Lab snapshot reports 12/12 records QA fixtures, zero active non-conflicted reviewers and zero active non-QA protocols |
| WR-TASK-007 | P1 | Freeze WaveRadar OS observation, device, coordinate, time, evidence and inference contracts | READY | PR #69 contract proposals; schema compatibility and negative tests |
| WR-TASK-008 | P1 | Portable Core and Base44 adapter parity | BLOCKED | Inventory SDK/backend use; local/test adapter; identity, RLS, data export and restore parity |
| WR-TASK-009 | P1 | Edge Runtime lifecycle, offline spool and sync | PROPOSED | Android native lifecycle, encrypted queue, idempotency, background/thermal/battery tests |
| WR-TASK-010 | P1 | WIS persistent 3D world model and temporal replay | PROPOSED | Coordinate-frame contract, time sync, versioned scene graph, provenance links, uncertainty and replay tests |
| WR-TASK-011 | P1 | Scanner Fusion Network and authorized source registry | PROPOSED | Connector permission/license gates; hardware discovery; read-only adapters; modality-specific validation |
| WR-TASK-012 | P1 | Prediction and model governance pipeline | IN_PROGRESS | PR #69 governance proposal; pinned datasets/models, baseline reproduction, calibration, OOD, abstention, independent holdout |
| WR-TASK-013 | P1 | Security and privileged backend hardening | IN_PROGRESS | PR #70; review auth helpers, ownership checks, cron gates, regression tests, CI and deployment boundary |
| WR-TASK-014 | P1 | Funding and institutional partner pipeline | IN_PROGRESS | PR #68 partner shortlist/backlog; verify official eligibility/deadlines; drafts only; no outreach or submissions |
| WR-TASK-015 | P2 | Drone read-only interoperability | IN_PROGRESS | PR #68 register; licensed sample data, read-only contract, operator authorization; no aircraft control |
| WR-TASK-016 | P2 | Guardian X integrated exoskeleton engineering | PROPOSED | Requirements, hazard analysis, thermal/load/power/fail-safe tests, PPE standards applicability and independent review |
| WR-TASK-017 | P2 | Chief Command and firefighter HUD human-factors validation | PROPOSED | Realistic task scenarios, glove/low-visibility/low-bandwidth tests, alert burden and degraded-mode acceptance |
| WR-TASK-018 | P2 | Five-minute evidence-grounded showcase | BLOCKED | Current product capture, approved claim matrix, licensed media; simulations visibly labelled; no invented product behavior |
| WR-TASK-019 | P2 | Portable build/release and persistent signing | BLOCKED | Signing key governance, reproducible artifact, digest/provenance, update test on backed-up device |
| WR-TASK-020 | P2 | External research/data intake and reproducible benchmarks | IN_PROGRESS | License review, exact versions, hashes, split/leakage controls, published baseline reproduction |
| WR-TASK-021 | P1 | Victim Evidence Record and rescue/EMS handoff foundation | IN_PROGRESS | PR #72; responder-assigned person track, append-only observations, scan references, sensor-conflict visibility, session export; secure durable storage, multi-interface integration, clinical governance and independent validation remain open |

## 6. Current evidence snapshot — historical, not a fresh measurement

The latest inspected engineering records contain a 2026-11-12 monitoring snapshot:
- Core: 4,021 observations; 0 integrity-verified; 8 device records; 0 validated devices; 78 validation runs; 0 passed; 8 failed; 0 unfinished; release NOT_AUTHORIZED.
- Latest observation timestamp in that snapshot: 2026-10-24T19:41:16.142Z.
- Lab: 12 evidence records, all QA fixtures; 3 labelled MEASURED, 8 SIMULATED and 1 UNKNOWN; 8 stored hashes, 7 canonical payloads; zero active non-conflicted reviewers and zero active non-QA protocols.
- Android: no connected private Super Android room in the inspected account; no fresh handset identity or native sensor capture was obtained through that route.
- Android build signing: prior inspected workflow log reported the persistent keystore secret empty and an ephemeral runner-generated key. Do not assume APK update compatibility.
- AI provider: prior monitoring record reports an unavailable paid provider key; do not add a paid dependency or configure secrets without approval.
- Source catalog: prior snapshot reports 60 catalog entries, one-source hourly ingestion, fetch failures and timeouts. Metadata discovery is not dataset ingestion or training eligibility.
- WIS linkage: prior report says the separate Kotlin ARCore capture was not connected to the WaveRadar 2.0 world-scene/model path; no tested pose-to-WIS adapter was found.
These are historical records from the cited engineering snapshot, not live measurements made while creating this register. Refresh before any operational decision.

## 7. Work sequencing and exit gates

### Gate A — Protect and reconcile
Inventory source trees, PRs, branches, live schemas, SDK calls, backend routes, data exports, evidence, secrets references and build artifacts. Create verified recoverable backups. Do not delete archives or alter historical evidence.

### Gate B — Contracts and trust boundaries
Freeze versioned data envelopes, source identity, event/capture/receive times, clock uncertainty, coordinate frames, calibration, evidence classes, integrity and provenance. Add contract and negative tests.

### Gate C — Portable Core and Edge Runtime
Separate domain logic from UI/provider SDKs. Prove local/test adapter parity, offline capture, durable sync, idempotency, lifecycle and safe degradation.

### Gate D — WIS and Scanner Fusion
Implement searchable area/building/floor/room/time/source queries; versioned 3D scene graph; temporal replay; source registry; modality-aware fusion; conflict and uncertainty display; immutable evidence traceability. Do not promote unsupported sources or fabricated geometry.

### Gate E — Intelligence and learning
Reproduce published baselines; pin datasets/model artifacts; separate training, validation and independent test sets; calibrate uncertainty; monitor drift/OOD; require abstention when inputs are outside envelope. No online self-training into operational models. Independent evaluator must control the holdout and promotion decision.

### Gate F — Field and hardware
Validate phone capabilities first. Add external thermal/RF/UWB/mmWave/radar/depth/LiDAR/drone adapters only when exact hardware, permission, data contract and calibration are present. Guardian X requires separate hazard analysis and independent engineering validation.

### Gate G — Controlled pilot and release
Only after independent evidence, security/privacy/human-factors review, recovery/rollback, training and accountable sign-off. No life-safety operational use before the relevant capabilities pass their defined gates.

## 8. Funding, partners and outreach rules

- Prioritize no-cost university collaboration, fire-service research organizations, public datasets with compatible licenses, open-source tooling, in-kind equipment and grant-funded R&D.
- Verify every opportunity from the official program source: applicant eligibility, partner requirements, current deadline, match, allowable costs, IP terms and submission process.
- Keep startup/company funding distinct from fire-department equipment grants and university/nonprofit-only programs.
- Draft outreach only. No email, phone call, data transfer, application or commitment without explicit founder approval.
- Never state a grant, partnership, endorsement, customer or lab access is secured unless documentary evidence supports it.

## 9. Cost and authorization boundary

Current budget constraint: **$0 upfront**. Do not subscribe, buy credits, purchase hardware/software/standards, hire vendors, or incur fees. The inspected Super account reported $0 credits, zero connected devices and Chrome subscription required; do not use paid automation.

This register authorizes documentation and draft review only. It does not authorize merge, deployment, production data mutation, external publication, outreach, grant submission, secret configuration, legal filing, purchases or safety-critical operation. Obtain separate explicit approval for those consequential steps.

## 10. Session closeout format

Every execution session must append a dated record with:
1. Exact artifacts inspected or changed (paths, PRs, commits, test runs).
2. Verified results and source timestamps.
3. Failures, inconclusive results and unavailable evidence.
4. Data/evidence preservation confirmation.
5. Task IDs whose status changed and the acceptance evidence.
6. New risks, dependencies and decisions.
7. Next highest-value actions and any founder-only blockers.

Never mark a task complete because a plan was written, a task was queued, a preview was generated, or a CI workflow passed unrelated checks.


### 2026-11-13 execution closeout — Victim evidence foundation

- Added draft PR #72: `src/lib/victimEvidence.js`, `src/components/VictimAssessmentPanel.jsx`, Home integration, deterministic tests, CI test step and safety/architecture documentation.
- Latest implementation head: `770dfc651d65487aa585affbd562cb42c5dedc5c`.
- Verified on that head: WaveRadar Code Quality Checks passed (data-contract audit, victim evidence test, lint, legacy typecheck step and web build); WaveRadar Runtime Safety Check passed.
- Android pipeline: data-contract and existing regression checks, web build, Capacitor generation and native sensor bridge setup passed; Android debug APK build remained in progress at the time of this note.
- Scope limitation: sessionStorage prototype only; no encrypted durable persistence, secure cross-device incident service, raw sensor-media retention, helmet/Chief Command/Lab adapter, clinical decision support, physical handset testing, clinical review or independent ground-truth validation.
- No PR merged, deployment made, external outreach sent, purchase made or real patient data used.
- Task status: WR-TASK-021 = IN_PROGRESS, not COMPLETE.


## 11. Live repository reconciliation — 2026-11-13 18:10 UTC

This section supersedes older “last check” statements above where the live GitHub state differs. It does not alter the historical Core/Lab snapshots in Section 6.

### 11.1 Pull-request state and CI

A fresh GitHub read found PRs #68–#74 all **OPEN, DRAFT, NOT MERGED, and reported mergeable** at inspection time. All listed checks below were completed successfully on the inspected head SHAs:

| PR | Scope | Head SHA (short) | Latest inspected checks |
|---|---|---|---|
| #68 | Engineering backlog / drone interoperability / partner research | `22ed76c` | quality PASS; runtime-audit PASS; android-debug PASS |
| #69 | WaveRadar OS architecture and baseline | `7c339f3` | quality PASS; runtime-audit PASS; android-debug PASS |
| #70 | Backend security hardening and marketing controls | `15c7ca8` | quality PASS; runtime-audit PASS; android-debug PASS; backend-security-contracts PASS (two completed runs observed) |
| #71 | Master program control register | `5276ead` | Documentation-only PR; no merge or release authorization implied |
| #72 | Responder-led victim evidence foundation | `770dfc6` | quality PASS; runtime-audit PASS; android-debug PASS |
| #73 | Test-gated open evidence registry | `dee2bc8` | quality PASS; runtime-audit PASS; android-debug PASS |
| #74 | Institute independence and validation governance | `e1a1f9b` | quality PASS; runtime-audit PASS; android-debug PASS |

CI PASS means only that the configured jobs passed on those exact commits. It does not establish physical handset behavior, scientific validity, independent review, security completeness, production signing, or operational readiness. Recheck status before any later merge decision because branch heads and checks can change.

### 11.2 Branch ancestry and conflict controls

Pairwise GitHub commit comparisons show these are **parallel, diverged branches**, not one cleanly stacked PR chain:

- #68 versus #69: diverged (33 commits unique to #68; 40 unique to #69); both touch `README.md`.
- #68 versus #70: diverged (33 versus 15); no shared changed paths in the inspected comparison.
- #69 versus #70: diverged (40 versus 15); no shared changed paths in the inspected comparison.
- #71 versus #72: diverged (2 versus 5); distinct changed paths in the inspected comparison.
- #72 versus #73: diverged (5 versus 29); both modify `.github/workflows/quality-checks.yml` and `package.json` — resolve these together before integration.
- #73 versus #74: diverged (29 versus 1); distinct changed paths in the inspected comparison.

The pairwise comparisons are not proof that the PRs are conflict-free against a future integration branch. Do not merge by PR number or assume “#68 then #69” is a valid stack. First select a canonical integration base, preserve each branch's unique commits, reconcile overlapping workflow/package/README changes, then run the full checks on the combined candidate. Obtain human review of security-sensitive changes before merge.

### 11.3 Current blocker refinements

- WR-TASK-002 remains IN_PROGRESS: CI is green for #68–#70, but no merge order is approved and branch ancestry/overlap needs reconciliation. PRs remain drafts.
- WR-TASK-003 remains BLOCKED: no authorized Android handset session or independent physical ground-truth setup was available in this run.
- WR-TASK-004 remains BLOCKED: no calibrated reference system, preregistered confirmatory protocol, or independent reviewer was demonstrated.
- WR-TASK-006 remains BLOCKED: the prior Lab inventory still has no eligible non-QA evidence, active non-conflicted reviewer, or active non-QA protocol in the evidence currently available. A green repository check does not change Lab eligibility.
- WR-TASK-008 remains BLOCKED: Base44 SDK dependencies remain in the repository; a passing build is not provider portability or data-parity evidence.
- WR-TASK-013 remains IN_PROGRESS: PR #70's security-contract workflow passes, but independent code review, live authorization regression, and deployment-boundary verification remain required.
- WR-TASK-015 remains IN_PROGRESS: the drone register is research documentation; no live vendor adapter, aircraft feed, or validated aerial measurement is established.
- WR-TASK-019 remains BLOCKED: persistent signing key and install/update compatibility on the actual handset remain unverified.
- WR-TASK-021 remains IN_PROGRESS: PR #72's Android CI now passes on `770dfc6`, superseding the earlier “build still running” note. The implementation still uses browser `sessionStorage`; it is not encrypted durable storage, not a cross-device incident service, and not clinically validated.

### 11.4 Integration decision

Recommended review sequence (not an automatic merge instruction):
1. Review #69 architecture/contracts as the baseline proposal.
2. Review #70 security changes against the actual privileged-function call sites and authorization model.
3. Reconcile #68 backlog/README changes with #69's README and architecture descriptions.
4. Integrate #72 victim evidence and #73 research registry together at the workflow/package level, preserving each test command exactly once.
5. Incorporate #74 institute governance and #71 control register after factual status refresh.
6. Run combined quality, type, runtime, backend-security, Android debug, dependency/license, secret scanning, and migration/rollback checks on the final integration candidate.
7. Keep all PRs draft until a qualified reviewer has reviewed the exact combined diff. Do not merge, deploy, publish, or claim physical validation based on this sequence.

No historical observations were edited, reclassified, deleted, or used as new validation evidence in this reconciliation. No external outreach, purchase, deployment, merge, or production mutation was performed.
