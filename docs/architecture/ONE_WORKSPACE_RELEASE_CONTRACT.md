# WaveRadar One Workspace — consolidation and release contract
Status: implementation specification, NOT a deployed or validated product. 2026-11-19.

## Product boundary
WaveRadar is ONE offline-first incident workspace with three role-based views over ONE incident/event identity: **Field** (Android/helmet), **Command** (WIS), and **Replay** (lab/investigation). These are views, not competing stores or independently calculated truths. On Android, default to the simplest phone-operable Field mode; no headset or cloud connection required for local logging.

## Minimum useful product (MUP)
A user can (1) create an incident offline, (2) record a timestamped observation or manual hazard annotation, (3) see sensor capability and provenance truthfully, (4) navigate an explicitly labeled imported map (or no map), (5) close/reopen the app and recover original events, (6) export an incident evidence bundle, and (7) synchronize with a scoped server when authorized and online. WIS reads the same incident and Replay reconstructs from the same immutable event history. No rescue navigation or victim location is asserted without validated ground truth.

## Single evidence pipeline and boundaries
Android/native collectors -> event envelope v1 -> encrypted native SQLite journal -> durable outbox -> authenticated owner/incident-scoped ingest -> immutable server ledger -> read-only WIS/Replay projections.
- Native journal is authoritative on Android. Browser IndexedDB is a separate non-authoritative browser-only cache. localStorage is never authoritative evidence.
- Append once; retries must be idempotent by event_id + content digest. A repeated ID with different content is a collision, not a silent overwrite.
- Every observation has source identity, consent/authorization scope, device and clock domain, UTC receipt time, optional monotonic capture time, raw evidence reference/hash and uncertainty.
- Receipt acknowledgment is NOT integrity verification; checksum is NOT independent physical validation. A missing reference or sensor capability is displayed as UNKNOWN/UNAVAILABLE.
- Preserve originals. Transformations are versioned projections; errors and unsupported types go to a visible quarantine queue, not silent drops.
- No network scanning or remote sensor ingestion outside explicit authorization and technical access rights.

## User-facing layout
**Incident**: header with incident ID, offline/online, journal persisted, pending sync count, validation banner; tab navigation: Field | Command | Replay | Lab.
**Field**: one large camera/thermal viewport ONLY when real source available; otherwise capability card; hazard list; annotation capture; safe map; offline journal count.
**Command**: synchronized team/incident status with freshness age and source attribution; map overlays toggled by evidence class; predictions never styled as measured.
**Replay**: dual event-time and knowledge-time controls, gaps/unknowns visible, original source payload link, conflict/retraction history, export.
**Lab**: reference procedure, calibration, blind test, signed evidence, acceptance thresholds and rejection reasons.
Design: cinematic graphics for visual hierarchy, but prioritize readable contrast, accessibility, battery and 1-hand Android use. Concept renderings must show SIMULATED watermark; do not display fabricated vital signs or confidence percentages as live data.

## Cross-system blocker register (evidence-driven)
| Priority | Gap / failure mode | Resolution and acceptance test |
| --- | --- | --- |
| P0 | CI install ETARGET: dropdown ^2.2.6 unpublished | Change to published ^2.2.1, rerun npm install, build, lint, typecheck, Android workflow; investigate any subsequent errors rather than claiming green |
| P0 | #96 native journal vs #97 browser store and schema mismatch | Reconcile into one native authority and explicit versioned adapter; round-trip original envelopes and replay; test duplicates/collisions and unsupported types |
| P0 | HTTP 401 enrollment and local key unverified | Test authorized login, refresh, logout, offline grace, expired credentials, owner isolation; no false connected state |
| P0 | Local persistence race / pending uploads | Transactional outbox, crash/restart, airplane mode, reconnect, duplicate ack and multi-tab tests; no destructive resets |
| P0 | APK update install failure | Compare signing certificate, package ID, versionCode and Android 14 requirements; preserve user data; do not instruct disabling Play Protect |
| P0 | No independent spatial reference validation | Explicitly BLOCK spatial accuracy claims; measured reference path and independent tester before operational UI |
| P1 | WIS/helmet scene divergence | Same incident IDs, coordinate frame, provenance and revision; cross-view parity and stale-data tests |
| P1 | RF / Wi-Fi / satellite overclaims | Treat coverage and inference as experimental, permissioned, location-limited; never claim through-wall imagery from GNSS/cellular alone |
| P1 | Remote control dependency | Optional scoped remote operations only; Android capture and local UI function without Chrome/Super or network |
| P1 | Lab governance and data access | Blind holdouts, immutable test manifests, separation of developer vs independent reviewer, retention and redaction |
| P2 | Guardian X hardware and marketing | Separate speculative hardware roadmap from software release; demo visuals clearly simulated |
| P2 | Funding and outreach fragmentation | Link BOM, specific validated test and sponsor contact; track verified recipient, draft/sent/response state without inventing donations |

## Eliminate loops and dead ends
- Every task has exactly one owner, one artifact link, a blocker reason, a measurable exit criterion, and next action.
- Retry limits and exponential backoff for sync. Failed retries remain visible with reason and user-safe recovery, never endless FINALIZING.
- Authentication state is explicit: LOCAL_ONLY, AUTH_REQUIRED, AUTHORIZED, EXPIRED; never infer server verification from local token.
- Storage state is explicit: CAPTURED, LOCAL_PERSISTED, PENDING_SYNC, ACKNOWLEDGED, QUARANTINED; independently report INTEGRITY and VALIDATION.
- Recovery is non-destructive; an operator can export evidence before any migration/reset.

## Release gates
G0 dependency installation + deterministic CI pass.
G1 Android app starts and local journal survives process death, power loss simulation and offline restart.
G2 authorized sync/outbox idempotence, owner isolation and quarantine tests.
G3 same incident and evidence visible in Field, Command and Replay with time/coordinate provenance.
G4 independent calibration and physical ground truth for any claimed positioning/detection.
G5 controlled pilot and incident safety review before operational claims.

No merge or production deployment until G0-G3 pass; no life-safety operational positioning claims until G4-G5. Track verified tests with immutable links, not status estimates.
