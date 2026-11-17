# WaveRadar Local Evidence Journal

**Status:** Native Android SQLite append/read bridge implemented on the evidence OS foundation branch. Device persistence and process-death behavior still require instrumented Android testing.

## Why local-first

The local device journal is the first durable write target. Sensor capture must not depend on an internet connection or a cloud service being reachable. Network synchronization is a separate adapter and must never be the only copy of a captured observation.

## Native implementation

- Capacitor plugin: `WaveRadarEvidenceStore`.
- Storage: Android app-private SQLite database, `waveradar_evidence.db`.
- Append-only API: `appendEvents`; there is deliberately no update or delete method.
- Read API: incident-scoped pages ordered by local insertion sequence.
- Event identity: unique `event_id`; exact duplicate content is idempotent; same ID with different content is returned as a collision.
- Batch limits: 500 events; each serialized event limited to 64 KiB.
- Metadata indexes: incident ID and local sequence; captured/received times and clock domain are retained separately.
- JS bridge: dependency-injected client allows deterministic tests without Android hardware.

## Semantics and safeguards

- Local insertion sequence is a storage cursor, not sensor time and not a cross-device sequence.
- Capture and receipt timestamps are stored as supplied; missing values remain null.
- The journal does not align clock domains, infer missing timestamps, assign spatial coordinates or change evidence classes.
- No network transmission is implemented by this plugin.
- A collision does not overwrite an existing record.
- The plugin is app-private but **not encrypted at rest** in this first slice. Do not store sensitive personal identifiers or unredacted victim information in this database until an Android Keystore-backed encryption design and key recovery policy are implemented.
- Android app uninstall/data-clear can remove app-private storage. Export, backup, retention, tamper-evidence and disaster recovery are separate requirements.

## Integration and verification gates

1. Confirm generated Capacitor project copies and registers the plugin.
2. Run Android build and native plugin compilation.
3. Instrumented tests: append, restart process, read, duplicate, collision, large batch, interrupted transaction, database migration.
4. Device test on the Moto G Play; record Android build/API, app build SHA, device clock domain and test protocol.
5. Add encrypted-at-rest storage before any sensitive incident deployment.
6. Add authenticated store-and-forward synchronization only after server identity, authorization, idempotency, replay protection, and conflict semantics are specified.

## Sources

Android recommends a local persistent source of truth for offline-first data, with repositories mediating local and network sources; Room is its recommended structured persistence abstraction. This implementation uses the platform SQLite API directly inside a Capacitor plugin as a first bridge slice; a future Room/Kotlin module may be preferable if the native data layer grows.
