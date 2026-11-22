# WaveRadar rescue evidence journey — software acceptance slice v0

**State:** test-only / simulated / not field-ready. Date: 2026-11-21.
**Parent integration:** draft PR #109 (stacked on #108). Work tracking: #99, #107, #92; independent lab: tripocolypse417-ship-it/waveradar#4.

## What this actually builds

A dependency-free Node regression fixture runs the proposed native-envelope-to-ledger adapter against a **fully synthetic** three-event training incident. It uses temporary, file-backed JSONL append-only mock logs to model:

1. Offline local capture of synthetic observation, annotation and prediction.
2. Reopening the fixture journal after a *simulated* restart.
3. Refusing acknowledgements when a mock server's durable-acceptance receipt is absent or mismatched.
4. A lost acknowledgement followed by an idempotent retry and reconnection.
5. Same-ID/different-digest conflict quarantine without overwriting prior originals.
6. Three read-only **simulated role projections** of one incident through the existing replay adapter.
7. Knowledge-time cutoff, clock-domain separation, unavailable spatial pose, and no verification promotion.
8. Fail-closed rejection of an unsupported event type.

Run: node scripts/test-rescue-evidence-journey.mjs

The fixture deletes temporary **synthetic** test records after execution. It does not touch actual historical evidence, local handset storage, production Core, or Base44. It is designed to run in GitHub Actions without npm installation or a paid environment. The output contains counts and explicit NOT_TESTED gates; it is not an attestation of readiness.

## Important limits — do not promote this result

This test does **not** run Android native encrypted SQLite, Core's authenticated ingest endpoint, the actual deployed WIS or helmet, device process death, APK in-place update, any physical sensor, independent ground truth, or real responders. File-backed mock writes are not a substitute for mobile power-loss / SQLite durability testing. The code exercises the proposed adapter branch, not a merged release.

A notable contract risk remains: the event envelope's timing.received_at represents the timestamp supplied by the source envelope. For incident command's strict "as known by the server" replay, actual server-ingest receipt time must be retained **separately** from the source's local receipt time, or the server's historical knowledge could be backdated by a delayed offline upload. Do not rewrite the source event. Add a separately recorded, immutable server acceptance timestamp and clear clock provenance in the integration design before G3 is accepted.

## Release acceptance and next physical tests

| Gate | Required proof | Status |
| --- | --- | --- |
| G0 software fixture | Deterministic synthetic capture/restart/retry/collision/replay assertions | Proposed CI automation; confirm workflow execution |
| G1 phone durability | Signed/installable APK; native capture, force-stop/reopen, battery/network interruption, original digests equal | **BLOCKED**; installed APK update failure / signing identity remains unresolved |
| G2 actual Core sync | Authenticated scoped ingestion, receipt semantics, idempotency, original persistence, owner isolation, retry and conflict quarantine | **UNVERIFIED** |
| G3 actual Field/WIS/Replay parity | Two actual clients, same incident IDs and provenance, separate server knowledge time, stale/offline UI, export/replay parity | **UNVERIFIED** |
| G4 spatial truth | Independent physical reference trajectory, calibration, error distributions, unavailable-pose behavior | **UNVERIFIED** |
| G5 safety and pilot | Independent lab sign-off and responder usability / incident safety review | **NOT STARTED** |

**Immediate engineering order:** unblock Android install/update without deleting the existing app's evidence; prove native journal persistence across force-stop/restart; prove scoped server ingestion and duplicate/collision behavior; then connect actual Field/WIS/Replay views. Independent ground truth is mandatory before any operational spatial or victim-location claim.

All simulated observations must remain labeled **SIMULATED**. The test never asserts through-smoke, through-wall, life support, reliable vital signs, or safety-critical navigation capability.
