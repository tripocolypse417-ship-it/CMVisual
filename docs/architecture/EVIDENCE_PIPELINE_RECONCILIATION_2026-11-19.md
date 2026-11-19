# WaveRadar evidence pipeline reconciliation — 2026-11-19

Status: design/review only. No production migration, safety approval, or hardware validation.

## Canonical sequence
Native Android SensorManager and authorized adapters -> versioned event envelope -> app-private encrypted SQLite append-only journal -> durable outbox state -> authenticated owner-scoped Core ingest -> immutable server ledger -> versioned scene snapshot -> WIS and helmet role-specific projections -> replay.

## Reconciliation of PR #96 and PR #97
- Adopt PR #96's Android Keystore-backed SQLite journal as the authoritative local record. PR #97's IndexedDB queue may remain a browser compatibility cache but must never be the sole source of truth on Android.
- Preserve PR #97's explicit versioned event envelope, device monotonic clock, source identity, sensor capability, payload hash, capture/receive provenance, quarantine and receipt semantics. Map fields losslessly into the journal; unknown source time stays UNKNOWN.
- Native collector buffer acknowledgement must occur **only after** an SQLite transaction commits. Acknowledgement of a native buffer is NOT acknowledgement of Core receipt. Maintain separate local_persisted, upload_pending, server_received, server_integrity_verified, and independently_validated states.
- Use bounded batches and stable event IDs; retries are idempotent. Event-ID/hash collisions quarantine without overwriting either original. Preserve overflow/drop counts and raw payloads. Never silently discard queued evidence.
- Outbox lease/attempt state is operational metadata, separate from immutable evidence payloads. Crash/process-death recovery must re-enumerate unacknowledged entries. Server receipts must be durably committed before advancing delivery cursor.
- Pairing credentials must be device-bound, scoped, revocable, never logged, and stored with Android Keystore-backed protection. Read-only diagnostics are the remote-control default. Do not equate a test-user API response with founder enrollment.
- WIS command and helmet projections must consume the same incident ID, scene revision, evidence lineage and snapshot key. Render stale/unavailable data explicitly. Never derive position from unaligned clocks or unsurveyed frames.

## Blocking acceptance tests
1. Native collector -> SQLite transaction -> native acknowledgement, including injected transaction failure.
2. Process kill/restart before and after commit, during upload and after server receipt.
3. Offline 24-hour queue simulation, overflow reporting, retry/backoff and duplicate/collision handling.
4. Device identity mismatch, token expiration/revocation, cross-owner access rejection and quarantine.
5. Source clock-domain mismatch and unknown timestamps: no invented alignment.
6. Replay and WIS/helmet projection determinism from the same versioned snapshot.
7. Android build with stable signing identity; physical installation/upgrade and independently witnessed sensor ground truth.

## Merge gates
Review #97 conflict against #96; port minimal event-contract and native ingestion changes onto #96 in a feature branch. Run quality, Android build, runtime security, and targeted persistence tests. Keep #94 experimental and #95 architectural. No merge/deploy without explicit approval.
