# WaveRadar Integrated Runtime Decision Record

**Status:** Proposed integration decision; not a release authorization  
**Date:** 2026-11-18  
**Scope:** CMVisual / WaveRadar Core / Android Companion / WIS command and helmet views / Research & Validation Lab

## Decision

WaveRadar should converge on one evidence-first runtime with a single canonical event contract and one durable local-to-cloud evidence path. It should not continue as separate feature branches, browser-only collectors, duplicate dashboards, or independently evolving scene timelines.

The runtime is:

1. **Authorized source adapters** — Android native sensors first; later, explicitly authorized Wi-Fi/CSI, GNSS, cellular, thermal/RGB, radar, UWB, environmental, building/floor-plan, satellite and drone feeds.
2. **Canonical event envelope** — versioned schema preserving source identity, adapter/version, authorization scope, capture time, receipt time, clock domain, monotonic sequence, evidence class, integrity state, calibration/frame references, uncertainty, raw payload reference/hash and limitations.
3. **Native durable edge journal/outbox** — app-private SQLite, payload encryption using Android Keystore, append-only event writes, bounded queues, separate delivery state, deterministic idempotency, explicit overflow and quarantine.
4. **Transport and Core ingestion** — authenticated device-bound credentials, HTTPS batch upload, server-side token/device binding, canonical hash/length checks, immutable accepted/quarantine records, server receipt timestamps and owner-scoped reads.
5. **World/incident state** — a versioned, time-aware scene graph derived only from supported evidence; competing hypotheses remain separate; no inferred position or geometry is promoted to measured truth.
6. **Role-specific projections** — chief command view and firefighter helmet view render the same incident/scene revision and evidence cursor, with different presentation and permissions.
7. **Replay and after-action review** — capture-time and knowledge-time replay, visible clock/frame incompatibilities, provenance and uncertainty, plus exportable evidence manifests.
8. **Governed intelligence and validation** — Prediction AI, Research AI and Independent Verification AI remain separate roles; external ground truth and independent review gate every performance claim.

This architecture makes the Android phone a sensor/edge node, not the system's source of truth. Core owns the synchronized incident state; the local journal protects evidence during connectivity loss.

## Critical implementation choices

### 1. Make the native journal authoritative

The current shared-event branch uses a bounded process-memory Android sample ring and persists events to browser IndexedDB before upload. That is a useful prototype, but IndexedDB can be evicted and samples still in the native process queue can be lost on process death.

The evidence-journal branch adds encrypted app-private SQLite, but its initial interface is incident-centric and is not yet wired to the shared Android sensor pipeline.

**Required integration:** adapt the native sensor collector to append directly into the encrypted native journal using a stable stream/session key. Keep incident linkage optional until a real incident exists; do not invent an incident ID merely to satisfy storage. The native queue must survive process death before acknowledging samples. Delivery state belongs in a separate table from immutable event content.

Acceptance:
- Force-stop/process-death tests at every boundary: sensor callback, native queue, SQLite transaction, upload, server acknowledgement.
- No sample is acknowledged to the native collector until its journal transaction commits.
- No local event is marked delivered unless the server returns an explicit accepted/duplicate acknowledgement; quarantined and rejected records remain separately visible and recoverable.
- Queue overflow, storage full, encryption/key loss, duplicate ID, ID collision and partial batch outcomes are explicit and tested.
- Export preserves the original envelope, hashes, clock domains and delivery/quarantine history.

### 2. Replace manual token copy/paste with authorized one-time pairing

The existing server already has a signed-in, account-bound enrollment-token endpoint. The current native event pipeline asks the operator to paste an enrollment bundle and stores the bearer token in WebView localStorage.

**Required integration:** when the signed-in owner explicitly selects Pair this device, the app requests a short-lived device-bound token through the authenticated session and passes it directly to a native secure-storage plugin. Store the bearer credential using Android Keystore-backed encryption; never expose it in logs, URLs, analytics, browser localStorage or screenshots. Provide revoke/rotate, expiry, device-owner binding and a clear pairing audit record. The stable device ID is an application identifier, not hardware attestation.

Pairing must fail closed if the owner session, device ownership, token binding or secure storage is unavailable. A successful pairing only authorizes data transport; it does not validate hardware or measurements.

### 3. Build a constrained remote-operations control plane, not unrestricted remote desktop

WaveRadar needs remote diagnostics and maintenance without Chrome Remote Desktop, a paid Super subscription or a founder-owned always-on computer.

Implement a server-side task queue with:
- Explicitly allowlisted operations (health check, diagnostics, capability inventory, bounded test, upload pending evidence, fetch signed app update metadata).
- Per-device and per-task scope, short expiry, unique nonce, replay protection, signed command envelope and append-only audit.
- Device-side validation of command signature, expiry, nonce, app version, permission and battery/network constraints.
- Result receipt with task ID, timestamps, exit state and sanitized logs.
- No arbitrary shell, file browsing, camera/microphone activation, actuator/drone control, credential export or silent privilege escalation.

For Android background work, use push only as a wake-up signal where appropriate, then schedule durable work. WorkManager is the default for deferrable sync. Periodic WorkManager work has a 15-minute minimum interval and is not a real-time control channel. FCM delivery and background execution are not guaranteed; high-priority FCM is intended for time-sensitive, user-visible events and provides only a short processing window. Long-running sensor capture must be user-visible and use a permitted foreground-service design. Report offline, delayed, restricted and not-installed states honestly.

### 4. Keep one event/scene contract across all views

The command display, helmet overlay, 3D workspace, replay timeline and evidence inspector must consume one versioned scene snapshot and evidence cursor. A synchronized projection is not proof that a separate helmet device is connected.

A scene entity may be positioned only when its coordinate frame, metric units, calibration, transform, timestamp semantics and validation references are present. Otherwise render it as unlocated/unknown, not at an invented coordinate. Camera pose, aircraft pose, sensor observation location and estimated object location remain distinct.

### 5. Separate software verification from physical validation

A passing unit test, Android build or server API check proves only the behavior it exercised. It does not establish sensor accuracy, spatial pose, victim detection, through-wall sensing, environmental robustness or life-safety readiness.

The Research & Validation Lab owns preregistered protocols, independent ground truth, calibrated references, uncertainty budgets, negative controls, repeatability, raw-data custody, deviations, reviewer independence and signed reports. Operational release requires every critical safety gate to pass; unknown is not pass.

## Integration sequence

### Gate A — stabilize the foundation
- Review and reconcile the evidence-ledger/native SQLite work with the shared Android event pipeline.
- Keep experimental fusion isolated from operational decisions.
- Rebase or rebuild conflicting PR work on one current integration branch; do not merge stale or conflicting branches blindly.
- Resolve failing CI dependencies and ensure the current PR head—not a prior commit—has green web, runtime-safety and Android checks.
- Review public endpoints flagged by deployment lint individually. Preserve intentionally public health/metadata routes only where their output is deliberately non-sensitive; require authentication and owner checks for private data.

### Gate B — complete the native evidence path
- Wire SensorManager collection directly to encrypted SQLite.
- Implement secure one-tap pairing and token revocation/rotation.
- Implement durable upload, explicit acknowledgement semantics, quarantine recovery and offline/restart tests.
- Add an actual Moto G Play installation and sample-arrival test. Preserve all historical records; do not reclassify them without record-level evidence.

### Gate C — unify the operational picture
- Define one canonical incident/scene revision and cursor.
- Connect WIS command, helmet projection, 3D scene and replay to the same server snapshot.
- Add staleness, uncertainty, source coverage and unavailable-state indicators.
- Demonstrate replay from real, authorized records before claiming live multi-source scene reconstruction.

### Gate D — add adapters and intelligence
- Add one adapter at a time behind the canonical contract.
- Verify permission, capability, source identity, capture/receipt clocks, coordinate frames, calibration and licensing.
- Add model evaluation only after dataset governance, leakage controls, held-out benchmarks and independent review exist.
- Drone support remains read-only data ingestion; no flight or payload control.

### Gate E — independent evaluation and controlled pilots
- Freeze a versioned build and protocol.
- Use independently calibrated physical references and an external reviewer/lab.
- Run bounded non-life-safety pilots for replay, training and after-action analysis first.
- Consider operational evaluation only after cybersecurity, human factors, reliability, failure-mode and independent safety gates pass.

## Current observed constraints (recheck before acting)

The 2026-11-18 read-only WaveRadar 2.0 readiness snapshot reported 4,021 historical observations, zero integrity-verified observations, two sensor families, 78 validation runs, zero passed runs, eight failed and 70 indeterminate, no validated devices, no active prediction models, and release state NOT_AUTHORIZED. The latest observed sensor sample timestamp was 2026-10-24. A separate inventory reported five devices while readiness reported nine device rows; this count discrepancy requires reconciliation.

The inspected deployment was v438 with 80 active API functions. The dry-run deploy validator returned no hard errors and 20 heuristic warnings for public routes without an explicit user check. These warnings are not automatically vulnerabilities: inspect each route's intended public contract and in-handler authorization before changing it.

GitHub review snapshot:
- PR #96: evidence ledger, encrypted native SQLite journal and replay; quality, runtime-audit and Android build workflows passed on the inspected head. No physical-device or independent ground-truth test was claimed.
- PR #97: shared event envelope and Android sensor upload; GitHub reported it non-mergeable and the inspected commit-workflow query returned no PR runs. Its IndexedDB-first queue and localStorage token path should be replaced by the native-journal/Keystore design above.
- PR #95: network and command/helmet architecture draft; quality and Android build failed on the inspected head, including unresolved `recharts` and TypeScript component errors; runtime audit passed.
- PR #94: experimental provenance-aware fusion; CI passed, but it is explicitly not an operational estimator.

These are dated inspection results, not permanent status. No physical device pairing, sensor accuracy validation, independent ground truth, live drone feed or operational readiness is established by this record.

## Release gates

Do not authorize life-safety use unless all critical gates have independent evidence:
- Data integrity and chain of custody.
- Sensor calibration and accuracy against independent ground truth.
- Coordinate-frame and clock synchronization correctness.
- Robustness across representative devices, environments and failure modes.
- Model validity, calibration, held-out performance and subgroup analysis.
- Cybersecurity, privacy, access control, retention and recovery.
- Human factors, degraded-mode behavior and operator training.
- Independent review and a signed, configuration-specific release decision.

## Non-goals

- No unrestricted remote desktop or arbitrary remote shell.
- No hidden sensor access, unauthorized network/device discovery, or drone control.
- No claims of through-wall sensing, victim localization or fire/structural prediction without evidence.
- No use of synthetic data as physical ground truth.
- No migration, merge or production deployment solely because a CI job is green.
- No paid service or recurring subscription as a mandatory dependency.

## References

- [Android background tasks overview](https://developer.android.com/develop/background-work/background-tasks)
- [Android WorkManager periodic work limits](https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started/define-work)
- [Firebase Cloud Messaging Android message priority](https://firebase.google.com/docs/cloud-messaging/android-message-priority)
- [GitHub Actions billing and usage](https://docs.github.com/en/actions/concepts/billing-and-usage)
