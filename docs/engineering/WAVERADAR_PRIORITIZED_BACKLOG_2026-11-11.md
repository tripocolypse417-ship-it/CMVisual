# WaveRadar Prioritized Engineering & Validation Backlog

**Snapshot:** 2026-11-11  
**Status:** Draft canonical backlog staged in CMVisual PR #68; not merged.  
**Source surfaces:** CMVisual GitHub, private `waveradar` GitHub repository, WaveRadar 2.0 Hatchable project, separate Validation Lab Hatchable project.  
**Update rule:** Re-verify live state each run. Do not carry forward an old status as current without checking. Link new evidence to an existing item instead of creating duplicate tickets.

## 1. System snapshot

| Surface | Verified state | Limitation |
|---|---|---|
| CMVisual GitHub | Public repo; default branch main last commit 2026-10-31; 30 open PRs and 16 open issues | Work is staged in draft PRs; no merge this run |
| Private `waveradar` GitHub repo | Main last commit 2026-10-31; no open issues; 36-file tree | Archival project record/source snapshot and separate Kotlin test path; not the current WaveRadar 2.0 API source |
| WaveRadar 2.0 | Hatchable version 421, deployed 2026-11-10 | Active application source remains outside the GitHub source-of-truth workflow |
| WaveRadar Core | 4,021 observations; 0 integrity-verified; 8 device records; 0 validated; 78 runs; 0 passed; 8 failed; remaining run statuses not exposed by current aggregate endpoint; release NOT_AUTHORIZED | Latest observation 2026-10-24T19:41:16.142Z; no observations in last 24 hours |
| Validation Lab | Version 18 live; 2 draft scientific protocols; 9 retired QA templates; no active reviewer | Positive reviewer-scoped export path remains unverified |
| Android remote access | Free Android device allowance: 1; registered devices: 0 | No connected handset room; current phone identity unknown |
| Drone/aerial | Documentation catalog and stored-observation query only | No vendor adapter, live feed, authorized aircraft, or independently validated aerial capability |
| WIS / World Data Commons | World model APIs and separate spatial-perception project exist | No World Data Commons source/adapter found in WaveRadar 2.0; three WDC projects are v0 with no deployments |

## 2. Ranked work items

### P0 — Fresh Android native-sensor baseline

- **Owner:** Founder + WaveRadar Engineering; independent evaluator for confirmatory accuracy.
- **Status:** BLOCKED — current handset make/model/build unknown; no fresh physical session; no independent calibrated reference; no active reviewer; no remote Android device registered.
- **Dependencies:** Authorized access to the current handset; exact About-phone identity; existing app-data backup; correct isolated APK/package/signer; preregistered protocol; independent reviewer; calibrated reference instrument and rigid fixture for accuracy claims.
- **Acceptance criteria:** A fresh, append-only session records native SensorManager availability, bridge call, per-sensor support, permission, listener registration, sample arrival, native event timestamp, callback-entry monotonic timestamp, wall-clock receive time, sequence number, and spatial-pose provider state as separate fields. Confirmatory accuracy additionally requires independent ground truth, clock mapping, coordinate alignment, uncertainty, preregistration, and independent review.
- **Next action:** Connect the free one-device Android room, identify the current handset, and run instrumentation-only inventory/lifecycle checks. Do not claim accuracy without ground truth.
- **Evidence:** [PR #63 operator run sheet](https://github.com/tripocolypse417-ship-it/CMVisual/pull/63); [PR #65 freshness guard](https://github.com/tripocolypse417-ship-it/CMVisual/pull/65); [Google ARCore Frame timestamp API](https://developers.google.com/ar/reference/java/com/google/ar/core/Frame#getTimestamp).

### P0 — Historical evidence integrity and eligibility

- **Owner:** WaveRadar Engineering.
- **Status:** BLOCKED — 0 of 4,021 observations are integrity-verified; 0 are training-eligible.
- **Dependencies:** Record-level provenance, raw payload retention, canonical serialization, append-only hashes, custody/access history, and deterministic reconciliation.
- **Acceptance criteria:** Every observation has source/device/sensor identity, capture and receive timestamps, schema/configuration version, raw-payload digest, integrity state, and eligibility decision. Invalid/incomplete records are excluded from validation/training without modifying originals. Integrity verification never automatically means physical accuracy.
- **Next action:** Continue read-only reconciliation and design a versioned integrity-verification pass that writes only append-only verification records.
- **Evidence:** WaveRadar Core `/api/system/readiness` and `/api/ai/learning-loop`; existing evidence/recovery PRs #44 and #55.

### P0 — Independent Lab reviewer and protocol preregistration

- **Owner:** Founder + External independent reviewer/laboratory.
- **Status:** BLOCKED — Lab v18 has no active reviewer; Android and KIT Wi-Fi BFI/CSI protocols remain drafts.
- **Dependencies:** A real non-conflicted reviewer, explicit lab scope, conflict-of-interest declaration, approved acceptance criteria, reference equipment, and controlled test plan.
- **Acceptance criteria:** Reviewer identity and scope are verified; protocol is versioned and preregistered before confirmatory data is viewed; deviations and review decisions are append-only; QA identities/fixtures remain excluded.
- **Next action:** Identify a qualified independent evaluator and prepare a partner-specific test request as a draft. External contact requires founder approval.
- **Evidence:** [PR #64 Lab role/export recheck](https://github.com/tripocolypse417-ship-it/CMVisual/pull/64); live Lab v18; [v18 follow-up report](https://github.com/tripocolypse417-ship-it/CMVisual/blob/validation/lab-role-isolation-export-20261109/docs/research-validation-institute/reports/LAB_ROLE_ISOLATION_EXPORT_RECHECK_2026-11-11.md).

### P1 — Correct ARCore timestamp semantics and connect verified pose to WIS

- **Owner:** WaveRadar Engineering.
- **Status:** BLOCKED BY SOURCE-OF-TRUTH GAP — the Hatchable Kotlin source serializes ARCore `Frame.getTimestamp()` under `monotonicTimestampNs`, but Google's API states its time base is undefined and only likely similar to `System.nanoTime()`. The live WaveRadar 2.0 world scene/model API does not consume this ARCore pose capture or expose an integrated pose-provider field.
- **Dependencies:** Version-controlled copy of the active Kotlin source; explicit schema/version; tests; current-device capture; coordinate-frame/calibration contract; independent ground truth before accuracy claims.
- **Acceptance criteria:** Rename the field to `frameTimestampNs`; add `clockDomain=ARCORE_UNSPECIFIED`; preserve `Frame.getAndroidCameraTimestamp()`, callback-entry time, and wall-clock receive time separately; do not compare across clock domains until synchronization pairs establish a mapping; add monotonic-progression/age checks only after the timebase is established. Only then define a source-linked WIS scene adapter that carries pose frame, calibration, uncertainty, and evidence class without merging camera, aircraft, and object locations.
- **Next action:** Resolve the active Kotlin source ownership/mirroring plan before changing the Hatchable project. Then build a tested adapter into the world scene/model API. Do not patch the archival `waveradar` snapshot and call it current source.
- **Evidence:** [PR #63 run sheet](https://github.com/tripocolypse417-ship-it/CMVisual/pull/63); [Google ARCore Frame API](https://developers.google.com/ar/reference/java/com/google/ar/core/Frame#getTimestamp); live WaveRadar 2.0 `api/world/scene.js` and `api/world/model.js`.

### P1 — Persistent Android debug signing

- **Owner:** Founder (secret configuration) + WaveRadar Engineering (verification).
- **Status:** BLOCKED — the 2026-11-11 isolated APK build log and 2026-10-31 main build log show `WAVERADAR_DEBUG_KEYSTORE_BASE64` empty and an ephemeral signing-key warning.
- **Dependencies:** Founder-approved debug keystore generation/storage, GitHub repository secret access, existing app-data backup, APK manifest and signer verification.
- **Acceptance criteria:** A new CI build records persistent signing mode and stable signer-certificate SHA-256; artifact manifest matches the APK; install/update compatibility is tested on the exact handset without deleting user data.
- **Next action:** Do not configure or change secrets automatically. Founder must authorize secret setup; back up app data before any one-time reinstall.
- **Evidence:** [Main APK build run #41198437561](https://github.com/tripocolypse417-ship-it/CMVisual/actions/runs/41198437561); [isolated APK run #43066453967](https://github.com/tripocolypse417-ship-it/CMVisual/actions/runs/43066453967).

### P1 — Consolidate the stacked Android PR train

- **Owner:** WaveRadar Engineering; founder controls merge authorization.
- **Status:** IN PROGRESS — CMVisual has 30 open PRs and 16 open issues. Several Android changes are stacked and must not be treated as independent.
- **Dependencies:** Review of each diff, CI, branch ancestry, migration compatibility, and explicit merge approval.
- **Acceptance criteria:** One dependency-ordered sequence with no duplicated or conflicting changes; every PR's tests and review state are current; no evidence migration or deployment is implicit.
- **Next action:** Review the main chain in order: #43 → #44 → #55 → #57 → #58 → #62 → #63 → #65. Review #41 separately. Treat #56, #60, and #61 as parallel branches requiring overlap review. Do not merge automatically.
- **Evidence:** [CMVisual open PRs](https://github.com/tripocolypse417-ship-it/CMVisual/pulls); [CMVisual open issues](https://github.com/tripocolypse417-ship-it/CMVisual/issues).

### P1 — Restore a meaningful TypeScript quality gate

- **Owner:** WaveRadar Engineering.
- **Status:** DEGRADED — the Code Quality workflow marks the legacy `npm run typecheck` step `continue-on-error: true`. The latest inspected successful run logged 1,034 TypeScript diagnostics: 298 across 53 project source files and 736 in the Leaflet dependency. The job still reports success.
- **Dependencies:** A reproducible baseline, dependency/source error separation, module ownership, and tests that protect runtime behavior while types are corrected.
- **Acceptance criteria:** Critical evidence, native-sensor, validation, and world-model modules have strict, passing type checks; third-party declaration errors are isolated without suppressing project errors; the full project debt is tracked and the non-blocking exception is removed only when the intended scope is clean.
- **Next action:** Establish a source-only diagnostic baseline, then prioritize `src/lib/dataContract.js`, `src/lib/nativeSensorBaseline.js`, `src/lib/physicalValidationQueue.js`, `src/hooks/useSensorBridge.js`, `src/hooks/useSpatialWorld.js`, and `src/hooks/useWorldDataQuality.js`. Do not bulk-cast to `any` or hide errors.
- **Evidence:** [Code Quality run #43068062631](https://github.com/tripocolypse417-ship-it/CMVisual/actions/runs/43068062631); `.github/workflows/quality-checks.yml`.

### P2 — Source-metadata ingestion reliability

- **Owner:** WaveRadar Engineering.
- **Status:** DEGRADED — 58 source definitions; current source uses `SOURCE_BATCH_SIZE=1` and hourly scheduling, implying about a 58-hour full cycle. The scheduler reports 1 error in 49 runs over 7 days; current `last_error` is null and the failed-run detail is not exposed in the current summary.
- **Dependencies:** Version-controlled active function source, idempotency proof, per-source timeout/error records, dry-run, and batch-overlap tests.
- **Acceptance criteria:** Bounded multi-source batches, deterministic least-recently-attempted selection, no duplicate imports, per-source timeout/error detail, and a measured refresh cycle. No source is promoted to trusted/validated by ingestion alone.
- **Next action:** Mirror the current function into the canonical source workflow before changing batch size or cron cadence. The previously discussed 4-source/2-hour proposal is not present in current source and is not implemented.
- **Evidence:** Live WaveRadar 2.0 `api/automation/source-metadata-ingest.js`; live cron inventory.

### P2 — AI provider failure handling without paid dependencies

- **Owner:** WaveRadar Engineering.
- **Status:** BLOCKED — WaveRadar 2.0 AI gate reports no Anthropic key; the predictive-analysis handler calls `ai.generateText` without a local provider-error catch. The scheduled research-content job has a deterministic fallback.
- **Dependencies:** Active source mirrored to GitHub, deterministic fallback design, endpoint tests, and no new paid provider or secret without founder approval.
- **Acceptance criteria:** AI-dependent route returns a typed `AI_PROVIDER_UNAVAILABLE`/503 result or deterministic evidence-only fallback; no fabricated analysis; safety-critical decisions never depend on a provider call.
- **Next action:** Prepare a code patch only after the source-of-truth plan is approved; do not add an API key or paid service.
- **Evidence:** Live WaveRadar 2.0 AI gate; `api/ai/analyze.js`; `api/automation/research-content-cycle.js`.

### P2 — Drone/aerial read-only integration foundation

- **Owner:** WaveRadar Engineering; external operator/vendor for physical integration.
- **Status:** DOCUMENTATION_ONLY — no vendor adapter or live feed. Current research register covers DJI MSDK V5.18.0, Autel V2.6, Skydio APIs, MAVSDK v4.1.0, FAA Remote ID/OpenDroneID/ASTM, and OGC SensorThings API 2.0.
- **Dependencies:** Versioned source-of-truth, operator authorization, exact model/controller/firmware matrix, vendor scopes/credentials where required, lawful sample data, and independent reference.
- **Acceptance criteria:** Versioned read-only observation envelope; aircraft/controller/camera/sensor/object locations remain distinct; source/capture/receive times, coordinate frames, calibration, uncertainty, provenance, and authorization are retained; prohibited control writes fail at the adapter boundary.
- **Next action:** Stage an OGC SensorThings v2.0 read-only adapter and v1.1 compatibility tests using licensed sample data. No aircraft scan, vendor connection, or control operation.
- **Evidence:** [PR #68 drone interoperability register](https://github.com/tripocolypse417-ship-it/CMVisual/pull/68); live WaveRadar 2.0 `api/integrations/drone/catalog.js` and `api/integrations/drone/area-intelligence.js`.

### P2 — Free authorized Android remote access

- **Owner:** Founder (device authentication) + WaveRadar Engineering (diagnostics).
- **Status:** BLOCKED — free allowance is one Android device; current registered device count is zero. No Mac or Chrome session is connected.
- **Dependencies:** Complete the Android app's account verification and open its private-device room under the same account.
- **Acceptance criteria:** Owner-scoped Android room appears in the device list; read-only device identity and sensor inventory commands return actual handset data.
- **Next action:** Finish the free phone-farm sign-in and room creation. Do not subscribe, add credits, or use paid computer-control features.
- **Evidence:** Super phone-farm setup response: price $0, one included Android device, zero connected devices at 2026-11-11.

### P3 — World Data Commons and WIS integration

- **Owner:** WaveRadar Engineering.
- **Status:** NOT IMPLEMENTED — no WDC source/adapter found in WaveRadar 2.0; three separate WDC projects are version 0 with no deployments. The separate CMVisual Open Spatial Perception project is live but is not evidence of WDC integration.
- **Dependencies:** Canonical project/source decision, versioned source license/provenance, data schema, freshness/uncertainty policy, and 3D coordinate-frame contract.
- **Acceptance criteria:** One versioned WDC adapter with source attribution, update timestamps, coordinate reference, license, confidence, and test coverage; no duplicated project/data stores.
- **Next action:** Defer project consolidation until the active WaveRadar 2.0 source is version-controlled. Do not create another duplicate WDC project.

### P3 — Cinematic Showcase / Studio integration

- **Owner:** WaveRadar Media + WaveRadar Engineering.
- **Status:** SEPARATE PROJECTS — Cinematic Showcase v13 and WaveRadar Studio v4 are deployed independently; no integrated workflow with WaveRadar 2.0 is established. A five-minute chief-facing script exists, but only one 6.08-second concept clip is recorded and no full assembly exists. Studio is a planning/prompt/asset-registry workspace with browser-local storage and JSON export, not a video renderer.
- **Dependencies:** Real screen recordings from the current product, approved claim matrix, actual feature readiness, licensed firefighter/training footage, and one source of truth for media assets.
- **Acceptance criteria:** Five-minute chief-facing showcase uses real recorded product behavior; concepts and simulations are labeled; asset attribution/license records travel with the project; no invented statistics, operational claims, or unvalidated capabilities.
- **Next action:** Keep current projects separate until source synchronization and evidence/claim review are complete. The existing asset manifest records a U.S. Air Force public-domain training photo, a Fort Rucker CC BY 2.0 photo with attribution, and original CC0 SVG concepts; all overlays/routes/sensor visuals are simulated.

### P3 — Funding and external partnership pipeline

- **Owner:** Founder; Engineering prepares evidence and drafts.
- **Status:** DRAFT — funding/NIJ-related PRs and issues remain open; no application, email, or partnership request was submitted.
- **Dependencies:** Verified program eligibility, applicant/partner status, current deadlines, budget, technical evidence, and founder approval.
- **Acceptance criteria:** Each opportunity has an official source, eligibility analysis, deadline, eligible applicant/partner, required match/cost, evidence gaps, and approved draft. No unsupported endorsements or partnerships.
- **Next action:** Continue source verification and prepare drafts only. External contact/submission requires founder approval.

## 3. Existing PR dependency map

The Android baseline work is a stacked series, not a flat list:

`#43 → #44 → #55 → #57 → #58 → #62 → #63 → #65`

Parallel branches requiring overlap review: `#56`, `#60`, `#61`. Independent workstreams include Lab/export `#64`, funding `#66`, local agent runner `#67`, and current status/drone register `#68`.

No PR was merged, no branch was deleted, and no existing issue was closed during this snapshot.

## 4. Decisions and invariants

- Keep all work at $0 unless the founder explicitly approves spending. No Super Growth subscription, credits, paid AI provider, equipment purchase, or paid standard purchase is authorized.
- Do not configure or rotate secrets without explicit founder approval. Never expose secret values.
- Do not merge, deploy, publish external claims, contact vendors/labs, send email, submit grants, or accept terms without explicit approval.
- Do not connect to, scan for, arm, command, or control aircraft. Drone integration remains read-only.
- Preserve all original observations, validation runs, evidence payloads, recovery baselines, and audit records. Quarantine/exclude only through append-only, record-level decisions.
- Keep MEASURED, DERIVED, INFERRED, PREDICTED, SIMULATED, UNKNOWN, UNAVAILABLE, INTEGRITY-VERIFIED, and INDEPENDENTLY VALIDATED distinct.
- Never claim through-wall sensing, victim localization, sensor accuracy, independent validation, accreditation, or life-safety readiness without the specific required evidence.
- Do not treat successful CI, an SDK catalog entry, a sensor capability declaration, or a software simulation as proof of physical device behavior.
