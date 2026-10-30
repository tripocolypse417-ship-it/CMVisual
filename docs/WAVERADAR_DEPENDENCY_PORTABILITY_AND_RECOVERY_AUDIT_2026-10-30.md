# WaveRadar Dependency, Portability & Recovery Audit

**Audit date:** 2026-10-30  
**Repository reviewed:** `tripocolypse417-ship-it/CMVisual`  
**Baseline:** `main` at `5e639f1862b179238b1bab4803f3c8389631f4dd`  
**Status:** Source-level audit. No production migration, deletion, or phone installation was performed.

## Executive finding

WaveRadar has a useful separation of concerns in its sensor/evidence code, and its Android CI currently passes its automated checks. However, the current application is **not yet dependency-independent, not yet a verified offline application, and not yet protected by a demonstrated end-to-end backup/restore process**.

Do not remove Base44, Hatchable, Google Drive, or any other existing service until the replacement is running, exported data has been restored successfully, and acceptance tests pass. Preserve all existing evidence and workspaces.

## Verified findings and risk register

### P0 — Android update signing identity is not configured

**Evidence**
- Workflow: `.github/workflows/build-android.yml`
- Secret expected: `WAVERADAR_DEBUG_KEYSTORE_BASE64`
- CI run: Android build run 249, job `android-debug`, 2026-10-30.
- The job log explicitly reports: `WAVERADAR_DEBUG_KEYSTORE_BASE64 is not configured`.
- The workflow therefore generated an ephemeral runner debug key for this APK.

**Impact**
- This APK is not guaranteed to update an existing installation.
- A successful build is not proof of signing compatibility.
- Uninstalling the installed app can erase app-private local data.

**Required action**
- Do not install this artifact over the current app and do not uninstall the current app.
- The owner must configure a persistent signing key through GitHub Actions secrets from a trusted computer, or we must establish a separately approved migration path.
- Verify the signing certificate of the existing installed APK and the new APK before attempting an update. The old runner key may be unrecoverable; a new key cannot reproduce a missing private key.
- Preserve local data first. Only consider a one-time reinstall after export and restore are independently verified.

### P0 — Hosted interface dependency prevents an offline/independent APK claim

**Evidence**
- `capacitor.config.ts` uses `WAVERADAR_HOSTED_URL` to set Capacitor's `server.url`.
- `.github/workflows/build-android.yml` sets that variable to `https://waveradar-20.hatchable.site/workspace/`.
- The configuration comments explicitly state that this path requires internet and is not an offline/production deployment configuration.

**Impact**
- The APK loads its web interface from a hosted service rather than solely from its bundled `dist` assets.
- If the host, account, project, URL, DNS, or network is unavailable, the interface may fail even though native Android code is installed.
- This is a runtime dependency, not merely a development convenience.

**Required action**
- Build and test a bundled-assets APK with no `server.url` override.
- Define which features must work offline and which may synchronize later.
- Add explicit offline, stale-data, and reconnect states.
- Keep hosted deployment as an optional environment, not the only runtime path.

### P0 — Base44 remains a core application dependency

**Evidence**
- `package.json` includes `@base44/sdk` and `@base44/vite-plugin`.
- `src/api/base44Client.js` creates the shared Base44 client.
- `src/lib/AuthContext.jsx` imports the Base44 client and a Base44 SDK internal Axios module.
- `vite.config.js` loads the Base44 Vite plugin.
- `docs/BASE44_DEPENDENCY_MAP.md` lists entity persistence, authentication, server functions, file upload, email, and AI integrations still used by the application.
- `MIGRATION.md` states Base44 is the primary working source and that the independent runtime is not a byte-for-byte source export.

**Impact**
- Removing the SDK/plugin now would break authentication, persistence, and integrations.
- The independent hosted fallback is not a complete backend replacement.

**Required action**
1. Inventory every Base44 entity operation and caller.
2. Define portable application interfaces for identity, database, file/object storage, email, AI, and server functions.
3. Export and reconcile existing records, IDs, timestamps, ownership, and relationships.
4. Implement replacements behind adapters.
5. Run parity tests against copies of data.
6. Verify backup and restore in the replacement.
7. Only then remove Base44 SDK/plugin references in a separate reviewed change.

### P1 — No committed dependency lockfile was found in the repository tree

**Evidence**
- The repository tree contains `package.json` but no `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`.
- The Android workflow runs `npm install`.
- Most direct dependencies use semver ranges (for example, caret ranges).

**Impact**
- Two builds made at different times may resolve different dependency versions.
- Reproducing a previously passing build or investigating a regression becomes harder.
- This weakens software supply-chain traceability.

**Required action**
- Choose one package manager and commit its lockfile.
- Change CI to the matching frozen install command (for npm, `npm ci`).
- Pin GitHub Actions to reviewed immutable commit SHAs where practical, and use automated update PRs rather than floating unreviewed updates.
- Generate an SBOM and preserve it with each release artifact.
- Run license and vulnerability audits; do not automatically upgrade or remove packages without compatibility tests.

### P1 — Local validation queue is browser localStorage, not a verified archive

**Evidence**
- `src/lib/physicalValidationQueue.js` persists the queue under `waveradar:physical-validation:queue:v1` using `globalThis.localStorage`.
- It handles storage-unavailable and quota errors and preserves ambiguous writes, which is good defensive behavior.
- The code does not itself provide encrypted, independent, off-device backup or a verified restore workflow.
- `src/lib/deviceIdentity.js` stores device identity in localStorage/sessionStorage/cookies and suppresses storage exceptions.

**Impact**
- Browser/WebView storage can be cleared, unavailable, quota-limited, or lost with app removal.
- A local queue is not an independent backup.
- A successful write to localStorage is not proof of recoverability.

**Required action**
- Preserve the existing queue behavior and records.
- Add a versioned export package containing raw observations, session metadata, queue states, and evidence manifests.
- Hash every export and verify the hash after download/restore.
- Add a restore preview and duplicate-safe import procedure.
- Evaluate a native durable store for Android (SQLite or equivalent) with explicit transaction semantics and a documented browser fallback.
- Add tests for app restart, process death, low storage, interrupted synchronization, duplicate upload, export, and restore.
- Do not auto-retry ambiguous remote writes without idempotency keys or server-side reconciliation.

### P1 — Existing Drive archive function is not a provider-independent backup

**Evidence**
- `base44/functions/exportSnapshotToDrive/entry.ts` imports `npm:@base44/sdk@0.8.40`.
- It obtains a Google Drive connector token through Base44 and exports a snapshot JSON file.
- The function catches JSON parse errors by falling back to an empty detections array.

**Impact**
- The archive path depends on both Base44 and a Google Drive connector.
- It exports a snapshot-shaped record, not a verified full application/evidence/database backup.
- Replacing malformed detections with an empty array can conceal export loss if the failure is not separately recorded.

**Required action**
- Keep this existing export as a convenience only; do not call it the sole backup.
- Add a provider-neutral export format and independent destination support.
- Make malformed source data fail the export or explicitly mark the affected payload incomplete; never silently represent parse failure as a complete empty dataset.
- Include schema version, export manifest, record counts, content hashes, source IDs, and explicit completeness status.
- Test restore into a clean environment and compare counts and hashes.

### P1 — Source backup hash needs provenance and restore verification

**Evidence**
- `public/cmvisual-source-backup.sha256` contains a digest for `/tmp/cmvisual-source-backup.tar.gz`.
- The referenced archive path is not part of the repository tree.

**Impact**
- The checksum alone does not prove the archive is currently available, complete, or restorable.
- A digest for a missing or inaccessible file is not a usable recovery copy.

**Required action**
- Locate the exact archive from its actual storage location; do not recreate or overwrite it by guessing.
- Verify its SHA-256 against the recorded digest.
- Restore it into a clean temporary directory and compare its source tree with the intended commit.
- Record the archive location, date, commit, size, digest, and restore-test result in a backup manifest.
- Maintain independent copies in at least two storage types, with one isolated/offline copy where feasible.

### P2 — Native sensor bridge reports hardware capability separately from samples, but needs physical verification

**Evidence**
- `native/android/WaveRadarSensorsPlugin.java` enumerates Android sensor hardware and tracks per-sensor registration and sample history.
- It reports capabilities for Wi-Fi RTT, UWB, camera, depth, thermal, and mmWave; unsupported advanced modalities are explicitly false.
- `native/android/WaveRadarRangingPlugin.java` gates Wi-Fi RTT on Android API level, permissions, service availability, and compatible responders.
- CI run 249 passed the native sensor lifecycle test.

**Impact**
- CI verifies code paths and tests, not the physical Moto G Play's actual sensor availability, sample freshness, coordinate accuracy, Wi-Fi RTT support, or pose estimation.
- The device may not have Wi-Fi RTT responders or required hardware.
- IMU measurements alone do not provide absolute position or reliable 6-DoF pose.

**Required action**
- Perform a fresh device-specific baseline with capability, registration, sample arrival, timestamp, freshness, and permission checks kept separate.
- Record missing capabilities as UNAVAILABLE, not zero or simulated values.
- Use independent surveyed/tape-measured ground truth for each narrowly defined accuracy claim.
- Keep all new runs separate from historical runs; preserve failed/incomplete runs.

## Positive controls already present

- A dependency-light canonical data contract exists in `src/lib/dataContract.js`.
- The physical-validation queue explicitly treats interrupted remote writes as ambiguous rather than blindly retrying them.
- Evidence code checks for finite sensor measurements and freshness.
- The native Android sensor bridge tracks registration per sensor and re-registers on resume.
- The World Model architecture plan is documented in PR #39.
- CI run 249 passed data-contract, array-boundary, physical-validation queue, physical-validation evidence, native sensor lifecycle, web build, and Android packaging steps.
- Code-quality and runtime-safety workflows also passed on the PR commit.

These are useful engineering controls, but they do not establish physical validation or full recovery readiness.

## Ordered implementation plan

### Phase A — Protect the current state
1. Preserve main, all repositories, the original Base44 workspace, hosted services, and all raw evidence.
2. Verify the source archive and restore test.
3. Establish a repeatable, versioned release artifact manifest.
4. Resolve Android signing identity before any update attempt.
5. Export local-only phone data before any uninstall/reinstall decision.

### Phase B — Reproducible builds
1. Add the package lockfile.
2. Switch CI to frozen dependency installation.
3. Pin workflow actions and record toolchain versions.
4. Generate and retain an SBOM, license report, and vulnerability report.
5. Build a bundled-assets APK and test it with network access disabled.

### Phase C — Portable platform adapters
1. Enumerate every Base44 caller and entity operation.
2. Define portable interfaces and schema mappings.
3. Implement a self-hostable backend and object storage.
4. Migrate authentication and account recovery.
5. Migrate entities/functions one domain at a time.
6. Verify record parity, authorization, export, and restore.
7. Remove Base44 only after the replacement passes acceptance tests.

### Phase D — Durable evidence and World Model
1. Use the canonical observation envelope and shared versioned World Model.
2. Preserve raw records as immutable inputs; keep derived records separate.
3. Add native durable queue storage and explicit export/restore.
4. Add idempotent synchronization and reconciliation.
5. Keep scanner adapters replaceable and optional.
6. Keep MEASURED, DERIVED, INFERRED, PREDICTED, SIMULATED, UNKNOWN, and UNAVAILABLE distinct.

### Phase E — Physical validation
1. Run a fresh native Android sensor baseline on the actual target phone.
2. Verify every sample source and timestamp.
3. Use independent ground truth for the specific tested metric.
4. Record failures, deviations, and missing capabilities.
5. Do not promote any capability to operational use until independent validation and safety review pass.

## Acceptance gates before removing any dependency

A dependency may be removed only when all applicable conditions are true:
- Replacement source and configuration are version-controlled and recoverable.
- Data export is complete, machine-readable, and hashed.
- Restore succeeds in a clean environment.
- Authentication and authorization parity tests pass.
- Core workflows work without the old provider.
- Offline/degraded behavior is tested where required.
- CI build, tests, SBOM, license, and vulnerability checks pass.
- Rollback is documented and tested.
- No historical evidence or user data is lost.


## Experimental offline-shell build result — 2026-10-30

The isolated workflow `.github/workflows/build-android-offline.yml` was executed on this audit branch.

- Workflow run: **#3**, run ID `41128036966`.
- Result: **success**.
- Job: `offline-shell-debug`; all 14 substantive steps completed successfully.
- Confirmed steps: evidence/sensor safety tests, bundled web build, output verification, Capacitor project generation without a hosted URL, native sensor bridge installation, bundled asset/native plugin sync, Android debug packaging, and artifact upload.
- Artifact: `WaveRadar-offline-shell-experimental`, 5,341,120 bytes.
- Artifact SHA-256: `e5a9d7592c588deb8c30a622d7c169d56ff813a481ccc6ab46ed58eb49204ca1`.
- Artifact expires: **2026-11-29 21:05 UTC**.
- Run/artifact page: https://github.com/tripocolypse417-ship-it/CMVisual/actions/runs/41128036966

**Important limitations from the actual job log:**

1. `WAVERADAR_DEBUG_KEYSTORE_BASE64` was not configured. The job explicitly warns that this APK is for isolated testing only and may not update an installed app. Signing compatibility remains unresolved.
2. The Vite build warned that `VITE_BASE44_APP_ID` was not set. The web bundle and APK packaging succeeded, but this does not establish that Base44-backed authentication, entities, or server functions work in the offline build.
3. The workflow did not perform a physical-device install, airplane-mode launch, camera test, process-death persistence test, or restore test.
4. The APK is an experimental offline *shell build*, not evidence that all application workflows or data services operate offline.

**Next acceptance sequence:** inspect APK signing certificate and package ID; install only on a spare/test device or emulator with no production data; disable network and test launch/navigation/camera/local functions; test restart/process death; test queued-write behavior and reconnect reconciliation; then test a clean export/restore. Do not install over the owner's current phone app until its installed certificate and package identity are matched and local-only data is safely exported.


## New isolated contract and automated dependency inventory — 2026-10-30

Two additional safeguards have been added on this audit branch:

1. `src/lib/worldModelContract.js` defines an additive, versioned World Model validation boundary (`waveradar-world-model-v1`). It keeps MEASURED, DERIVED, INFERRED, PREDICTED, SIMULATED, UNKNOWN, and UNAVAILABLE separate; requires source identity, modality, receive time, provenance, and valid evidence/state classes; checks measurement timestamps, numeric units, confidence bounds, uncertainty, and coordinate frames; and requires World Model entities to retain source-event lineage.
2. `scripts/test-world-model-contract.mjs` exercises valid, simulated, unavailable, malformed, spatial, and lineage cases. It is wired to `npm run test:world-model-contract` in both standard and experimental offline CI workflows.

This contract is **not yet wired into production ingestion or the live World Model**. It is an additive gate and does not change or reinterpret historical evidence. Existing `dataContract.js` enums remain unchanged pending compatibility and migration review.

A provider dependency inventory was also added:
- `scripts/audit-provider-dependencies.mjs`
- `npm run audit:providers`
- Standard Android CI runs the inventory and emits a JSON finding list for Base44 SDK/plugin references, Base44 client/function references, and hosted runtime URL references.

The audit is intentionally observational: it reports existing coupling rather than failing the build simply because known legacy dependencies remain. It fails only if its scan stops detecting the expected Base44 reference, which protects against a broken or incomplete scan. The script and newly added contract tests have been committed to the draft PR branch; a new CI result for the latest head is still required before these changes are treated as tested.

## Local validation-queue archive prototype — 2026-10-30

Added an isolated export/verification/restore utility:

- `src/lib/validationQueueArchive.js`
- `scripts/test-validation-queue-archive.mjs`
- `npm run test:validation-queue-archive`

The archive contains only the records currently stored under the physical-validation browser queue key. It includes a versioned manifest, source queue key/version, export timestamp, record count, and SHA-256 digest over a deterministic JSON representation.

Restore is deliberately non-destructive:
- Hash and record count are verified before preview.
- Existing records are never overwritten or deleted.
- Identical records are skipped to avoid duplicates.
- Same-ID/different-content records are reported as conflicts and block restore until reviewed.
- Repeated restore is tested to be idempotent.

The test command is wired into the standard and experimental offline Android workflows.

**Scope limitation:** this is not a complete WaveRadar backup. It does not export Base44 entities, remote evidence objects, app configuration, authentication records, or arbitrary phone storage. SHA-256 detects accidental/tampered content relative to the manifest but is not a digital signature and does not prove who created an archive. No real user queue was read, exported, uploaded, or modified during this source-code work. Production UI integration and real-device export/restore testing remain outstanding.

## Target-phone capability constraint: Moto G Play (2024) — 2026-10-30

The target test phone is a Motorola moto g play (2024), Android 14.

Motorola's published specification lists an accelerometer, proximity sensor, ambient-light sensor, sensor hub, e-compass, and barometer. It does not list a gyroscope in that official sensor inventory. Treat gyroscope availability as **unknown until Android SensorManager enumerates the physical device**; do not infer it from third-party specification pages.

Google's current ARCore certified-device list does not contain an exact `moto g play (2024)` model entry. Google explains that ARCore device certification evaluates camera, motion sensors, device design, and CPU performance for real-time motion tracking. This is consistent with—but does not by itself prove the cause of—the previous WaveRadar diagnostic result `SPATIAL POSE SOURCE UNAVAILABLE`.

Sources:
- Motorola official specifications: https://en-us.support.motorola.com/app/answers/detail/a_id/177738/~/specifications--moto-g-play-%25282024%2529
- Google ARCore supported-device list and certification explanation: https://developers.google.com/ar/devices

### Consequence for WaveRadar validation

Do not make ARCore/6-DoF pose a required baseline on this handset. The device remains useful for camera, accelerometer, compass, barometer, GPS, connectivity, UI, queue, and evidence-pipeline testing, subject to actual runtime enumeration and sample verification.

The fresh device test should:
1. Enumerate every Android sensor by type/name/vendor/version/resolution/power and report missing types as UNAVAILABLE.
2. Record camera capabilities and real sample arrival separately from permission and camera-open success.
3. Measure actual sensor sample timestamps, rates, dropped samples, clock alignment, and process-resume behavior.
4. Test visual tracking as a separate experimental path with explicit drift/uncertainty; do not label camera feature tracks as validated 6-DoF pose.
5. Keep spatial accuracy tests blocked until an independent pose/position reference is available.

For dependable spatial tracking, evaluate a separately certified ARCore handset or an external sensor stack (for example, UWB anchors, depth/LiDAR, or surveyed fiducials) as an independently validated adapter. These are candidate test routes, not claims that the current phone contains those sensors or that an external stack is already integrated.

## Open technology shortlist for scanner fusion — research only, not dependencies

The following are candidate building blocks and exchange standards. None has been added as a production dependency or selected as the final WaveRadar stack.

| Candidate | Best-fit role | License / constraint | Assessment |
|---|---|---|---|
| OGC SensorThings API 1.1 | Interoperable sensor metadata and observations across heterogeneous devices | Open OGC standard | Strong external sensor-data exchange model; WaveRadar still needs its own richer evidence/provenance envelope |
| OGC 3D Tiles 1.1 | Streaming building geometry, point clouds, photogrammetry, BIM/CAD-derived 3D content | Open OGC community standard | Strong large-scene delivery format for command/building views; not the fusion database |
| RTAB-Map | RGB-D, stereo, and LiDAR graph-based SLAM / mapping | BSD when OpenCV is built without its nonfree module; research-only restriction applies when SURF/nonfree OpenCV is used | Best first SLAM candidate to benchmark for an external Linux/edge computer or suitable sensor rig; not assumed viable on the Moto G Play |
| Open3D | Point-cloud processing, reconstruction, alignment, visualization | MIT | Good research/processing toolkit for lab and command-side 3D workflows; not an Android sensor driver |
| ORB-SLAM3 | Monocular, stereo, RGB-D, visual-inertial and multi-map SLAM | GPLv3 | Technically relevant benchmark, but copyleft implications require legal review before incorporation in a closed-source distributed product |
| OpenVINS | Filter-based visual-inertial estimation / research | GPLv3 | Useful independent algorithm benchmark; depends on adequate calibrated camera + IMU streams and has the same copyleft review requirement |

References:
- OGC SensorThings API: https://www.ogc.org/standards/sensorthings/
- OGC 3D Tiles: https://www.ogc.org/standards/3DTiles/
- RTAB-Map overview and license conditions: https://introlab.github.io/rtabmap/
- Open3D overview and MIT license: https://www.open3d.org/
- ORB-SLAM3 license: https://github.com/UZ-SLAMLab/ORB_SLAM3
- OpenVINS documentation and GPLv3 notice: https://docs.openvins.com/

### Recommended architecture decision

Use WaveRadar's own versioned observation and World Model contracts as the authoritative semantics. Adopt OGC SensorThings and 3D Tiles as optional import/export or transport formats. Keep SLAM and point-cloud engines behind replaceable adapters, and run license/security/performance review before choosing one. Benchmark on representative hardware with independent ground truth; do not use a successful demo or a library's published benchmark as WaveRadar validation.

For the present Moto G Play 2024, prioritize native camera/sensor enumeration and a narrow visual-tracking feasibility experiment. Defer heavy mapping/SLAM integration until a device with supported tracking hardware or an external sensor/edge-compute configuration is available.

## Explicitly not done

- No Base44 SDK/plugin was removed.
- No Hatchable runtime was shut down or replaced.
- No Google Drive archive was deleted.
- No historical measurements or validation records were deleted or relabelled.
- No APK was installed on the owner's phone.
- No current app data was cleared.
- No claim of successful full backup/restore or offline production operation is made.
