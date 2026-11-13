# WaveRadar OS — Open Pull Request Consolidation Register

**Snapshot:** 2026-11-13  
**Repository:** tripocolypse417-ship-it/CMVisual  
**Purpose:** Consolidate the existing development queue into one WaveRadar OS program without discarding work or merging unreviewed changes.

## 1. Queue snapshot

- 32 open pull requests were present at the snapshot.
- All 32 reported mergeable at GitHub metadata level.
- 28 were drafts; 4 were non-draft (#27, #26, #11, #8).
- Mergeable does not mean tested, safe, current, independent or ready to deploy.
- No existing PR was merged or closed during this audit.

## 2. Workstream register

### A. Platform, portability and offline runtime
- **#49 — WaveRadar portable-core architecture baseline.** Architecture/contract foundation; explicitly leaves Base44 and hosted runtime in place.
- **#40 — Dependency portability and recovery risks.** Includes experimental offline-shell APK, provider inventory, World Model contract and local validation-queue archive.
- **#31 — Fresh build with zero-trust data boundary.** Review against #49/#40 before merging overlapping architecture.
- **#29 — Safe isolated Android test APK path.** Release/test-channel dependency; verify package identity, signing and update behavior.
- **#13 — Authentication redirect loop.** Narrow identity-flow fix; retest with current AuthContext and redirect contract.
- **#8 — Auto-Wizard live service readiness.** UI/readiness workflow; verify against current service health contracts.

**Consolidation direction:** one provider-neutral Core and one offline-capable Edge Runtime, with Base44 and hosted runtime retained as adapters until parity, backup/restore and rollback are proven.

### B. Native Android sensing and independent physical validation
- **#41 — Fresh Android native sensor baseline and evidence export.**
- **#43 — Independent reference evidence capture.**
- **#44 — Preserve independent reference evidence during local log recovery.**
- **#45 — Keep measurement-only reference evidence incomplete.**
- **#55 — Synchronized Android native reference comparison analyzer.**
- **#56 — Native callback timing and sequence integrity diagnostics.**
- **#57 — Prevent reference clock extrapolation and QA fixture eligibility.**
- **#58 — Integrate native event timing with guarded reference analysis.**
- **#60 — Explicit native lifecycle states for Android reference analysis.**
- **#61 — Gate reference analysis on native lifecycle evidence.**
- **#62 — Gate comparisons on per-poll native bridge integrity.**
- **#63 — Operator run sheet for a fresh Android native baseline.**
- **#65 — Keep stale spatial-pose provider claims out of AVAILABLE state.**
- **#26 — Expose per-sensor lifecycle and freshness states.**

**Consolidation direction:** treat #55–#63/#65 as a dependent validation chain, not independent features. Confirm exact branch ancestry and CI before integrating. Preserve independent raw reference artifacts; never extrapolate clocks or treat synthetic fixtures as real measurements. Keep supported, registered, permissioned, sampled, time-valid, calibrated, pose-available and independently validated states separate.

### C. Evidence, data boundaries, replay and Research & Validation Lab
- **#54 — Tenant-scoped evidence adapter and synchronized replay session.** Adapter and query-level tests exist; live SQL/RLS integration, storage and UI wiring remain follow-on work.
- **#64 — Validation Lab role isolation and historical export recheck.** Review the live-version claims against the included working-file status before accepting the report.
- **#30 — Canonical evidence freshness policy.**
- **#14 — API security and evidence-safe publishing.**
- **#11 — Human review queue in the WaveRadar wizard.**
- **#27 — Versioned federated observation envelope.**

**Consolidation direction:** one evidence envelope and append-only evidence store, one tenant/incident authorization policy, one replay timeline, and independent reviewer roles. Verify actual backend enforcement rather than relying on front-end hiding or documentation.

### D. External data and interoperability
- **#19 — WIS external feed adapters.**
- **#4 — Evidence-first sensor intelligence and peer federation.**

**Consolidation direction:** use capability-discovered, permissioned adapters with provenance, freshness, endpoint trust, schema versioning, replay protection and explicit source limitations. Data ingestion must not imply control of a drone or external device.

### E. Program operations, research funding and automation
- **#68 — Engineering status and drone interoperability register.** Contains a recent status snapshot and backlog; refresh live evidence before treating its figures as current.
- **#67 — Zero-cost local WaveRadar agent runner.** The proposal requires a computer where Codex CLI is installed/authenticated. Its scheduled GitHub workflow is a deterministic status snapshot, not a remote autonomous agent. It is a local developer option, not the requested computer-independent master automation.
- **#66 — FEMA FP&S firefighter-safety R&D concept and eligibility controls.** Draft funding concept; verify solicitation, eligibility, deadline and required partners before any submission.

**Consolidation direction:** one master WaveRadar program register with workstream owners, dependencies, evidence gates, funding status and concise reports. Do not treat a local runner or status workflow as proof of autonomous cloud execution.

### F. Current overhaul
- **#69 — WaveRadar OS architecture and overhaul baseline.** Adds target OS architecture, model governance, current/model audits, roadmap, sensor-time/spatial-ingress corrections and regression tests. Draft; no production deployment or main-branch merge.

## 3. Immediate review order

1. Reconcile source-of-truth and schema differences across CMVisual, Base44, private WaveRadar and hosted Core/Lab.
2. Review #49 and #40 as the portability architecture pair; reconcile overlapping boundaries with #69.
3. Review the Android baseline chain (#41/#43–#45/#55–#63/#65/#26) in dependency order, with independent raw evidence preserved.
4. Review evidence and tenant/reviewer authorization (#54/#64/#30/#14/#11/#27).
5. Review external adapters (#19/#4) against the evidence and federation security contracts.
6. Review operational automation (#67) against the requirement for a computer-independent, low/no-cost background coordinator.
7. Review funding concept #66 separately from engineering acceptance; do not submit without current eligibility/deadline verification.

## 4. Specific reconciliation risks

- **Source-of-truth conflict:** MIGRATION.md says Base44 is the primary working source, while CMVisual is the intended target canonical codebase. No sync parity has been proven.
- **Validation Lab version drift:** PR #64's body reports v18 live, while its included WIP document says v17 live and v18 draft. Verify the actual deployed revision before publishing a status.
- **Agent-runner scope mismatch:** PR #67 is local-computer dependent; its GitHub scheduled job only produces a deterministic snapshot.
- **Offline-shell claims:** PR #40 describes an experimental offline-shell APK; verify it actually loads a bundled local UI and does not rely on a hosted URL before calling it offline-capable.
- **Spatial pose:** PR #65 correctly notes that timestamp freshness is not clock synchronization or pose accuracy.
- **Reference validation:** a well-formed analyzer or passing synthetic test does not establish physical calibration, synchronization or accuracy.
- **Federation:** a versioned envelope is necessary but not sufficient; peer identity, endpoint trust, authorization, signing, replay protection and retention remain required.

## 5. Merge policy

No batch merge. Each PR must be:
- Mapped to a single OS subsystem and owner.
- Checked for branch ancestry and overlapping files.
- Reviewed against current source-of-truth and schema versions.
- Tested in an isolated integration branch.
- Evaluated for evidence preservation, security, portability and rollback.
- Merged only after acceptance evidence is recorded.

Draft PRs remain drafts until their specific acceptance gates are satisfied. Do not close or delete historical branches merely to make the queue appear clean.
