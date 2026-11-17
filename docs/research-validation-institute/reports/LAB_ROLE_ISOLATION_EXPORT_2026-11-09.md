# Research & Validation Lab — Role Isolation and Evidence Export Recheck

**Date:** 2026-11-09  
**Lab deployment:** WaveRadar Validation Lab v16  
**Scope:** API-level role/isolation verification and reviewer evidence export. This report describes the separate Lab; it does not describe a WaveRadar Core deployment or scientific validation result.

## 1. Summary

The Lab's reviewer export path was extended to preserve scoped historical evidence exports after a protocol is retired, without reopening retired protocols for new review. A read-only archive endpoint and reviewer-portal archive section now make those exports discoverable.

The export now:
- Recomputes SHA-256 from the exact stored canonical payload bytes when present.
- Compares the recomputed digest with the stored digest and checks that the canonical envelope matches the exported database row.
- Reports missing/invalid stored digests, digest mismatches, row mismatches, invalid canonical payloads, and legacy non-recomputable records separately.
- Includes a compact digest-verification summary and stable ordering by creation time plus record ID.
- Labels exports from retired protocols as `HISTORICAL_ARCHIVE_EXPORT`.
- Continues to state that a SHA-256 digest is not a digital signature and does not establish author identity, sensor truth, calibration, or chain of custody.

The Lab was deployed as version 16. The pre-deploy check returned zero errors and one existing warning: project visibility is still personal.

## 2. Access model and test method

The application uses two separate identity planes:

- `user`: signed-in app end users, evaluated against tester/researcher/reviewer registries.
- `member` / `admin`: project collaborators, with admin-only staff routes.

A collaborator identity does not satisfy a route declared for an app end user. The test harness exercised public, app-user, member, and admin contexts. For positive app-user paths, one existing synthetic QA identity was temporarily activated in its tester, researcher, and reviewer registries. Two QA-only lab templates were temporarily activated for scope testing. All statuses were restored after the test.

No real reviewer, researcher, or tester identity was activated. No email was sent.

## 3. End-to-end role and isolation results

| Area | Test | Result |
|---|---|---|
| App-user routes | Anonymous request to tester/researcher/reviewer routes | 401 at the access boundary |
| App-user routes | Member/admin collaborator request to a `user` route | 401; separate identity plane, expected |
| Tester | Active synthetic tester assignment list | 200; returned only that tester's three assignments |
| Tester | GET evidence for own assignment | 200; one evidence record |
| Tester | GET evidence for another tester's assignment | 404 |
| Researcher | Public intake route | 401 |
| Researcher | Suspended/unregistered app user | 403 |
| Researcher | Active synthetic researcher GET | 200; four own submissions |
| Reviewer | Suspended/unregistered app user | 403 |
| Reviewer | Active synthetic reviewer queue | 200; two assignments in explicit lab scope, excluding self-review |
| Reviewer | Scoped package for a `needs_revision` assignment in an active QA lab | 200 |
| Reviewer | Export from an unscoped lab | 404 |
| Reviewer | Export of the reviewer's own test / assignment they created | 403 |
| Reviewer | Conflict-of-interest flag set | 403 for queue, package, and export |
| Reviewer | Reviewer suspended | 403 for archive and export |
| Admin | Public request to staff/admin routes | 401 |
| Admin | App user or project member request to admin routes | 403 |
| Admin | Admin request to staff routes | 200 |

### Retired-protocol behavior

- The active review queue returned no records after the QA labs were retired.
- The new-review package endpoint returned 404 for a retired protocol.
- The new-decision endpoint returned 404 for a retired protocol.
- The historical archive endpoint returned six assignments from the reviewer's retained explicit scope.
- The archive excluded the reviewer's own assignment and all unscoped assignments.
- The scoped historical export returned 200 and included `labStatus=retired` and `exportMode=HISTORICAL_ARCHIVE_EXPORT`.

Retirement therefore stops new review work but does not erase the ability of an active, non-conflicted reviewer with retained scope to export the historical record.

## 4. Evidence export verification

Two retained QA fixtures were used to exercise the export's distinct integrity states:

| Fixture type | Export result |
|---|---|
| Canonical payload with stored digest | `RECOMPUTED_MATCH`; one recomputed match, zero mismatches, one QA fixture excluded from eligibility |
| Legacy payload without a stored digest | `DIGEST_VERIFICATION_INCOMPLETE_OR_FAILED`; missing/invalid stored digest count = 1 |

Both exports returned a 64-character hexadecimal package SHA-256. The package digest identifies the exact serialized JSON package; it is not a digital signature.

A `verified` decision attempt against the legacy fixture returned 409 while the QA lab was active because the payload could not be recomputed and matched. The decision count and assignment-scoped audit count were unchanged by the blocked attempt. Once the lab was retired, new decision attempts were denied at the retired-protocol gate.

QA fixture evidence remains present in the raw export and is explicitly excluded from measured, simulated, and independent-reference eligibility. No fixture was promoted to scientific evidence.

## 5. Implementation details

### New read-only archive route

`GET /api/reviewer/archive`:
- Requires a signed-in app user registered as an active reviewer.
- Rejects suspended and conflict-of-interest reviewers.
- Requires a retained explicit reviewer-to-lab scope.
- Lists only assignments attached to retired lab templates and in a terminal/submitted state.
- Excludes assignments where the reviewer is the tester or creator.
- Returns assignment metadata and evidence/decision counts, not raw evidence.
- Does not permit new review decisions or reopen retired protocols.

### Reviewer portal

The reviewer portal now has a separate **Historical archive** section. Each archived assignment can download the complete JSON evidence/audit package. The active review queue and active review-package workflow remain separate.

### Export integrity manifest

The export includes per-record digest states and a summary with:
- recomputed matches;
- missing/invalid stored digests;
- digest mismatches;
- canonical-envelope/database-row mismatches;
- invalid canonical payloads;
- legacy records without a recomputable canonical payload.

The stored digest comparison is case-insensitive for hexadecimal text. A missing/invalid stored digest remains classified as missing/invalid even when the export can independently compute a candidate digest from the canonical payload.

Evidence, review decisions, and audit events are ordered by `created_at` and then record ID to avoid nondeterministic ordering when timestamps tie.

## 6. Database state after cleanup

After the QA run, the original state was restored:

| Item | Current state |
|---|---:|
| Lab templates | 11 |
| Draft scientific protocols | 2 |
| Retired QA templates | 9 |
| Active lab templates | 0 |
| Assignments | 23 |
| Evidence records | 12 |
| Review decisions | 7 |
| Append-only audit events | 150 |
| Active reviewers | 0 |
| Active testers | 0 |
| Active researchers | 0 |
| Retained reviewer-scope rows | 1 |

All 12 evidence records are explicitly marked as QA fixtures. The synthetic reviewer, tester, and researcher identities are again suspended. Both temporarily activated QA labs are again retired.

Twelve append-only admin audit events were added to record temporary role/lab activation and restoration. Existing audit rows were not changed. No evidence, assignment, or review decision was changed or deleted.

## 7. WaveRadar Core evidence status

A fresh read-only Core diagnostic still reports:

| Metric | Current value |
|---|---:|
| Historical observations | 4,021 |
| Observations tagged MEASURED by ingestion | 4,021 |
| Integrity-verified observations | 0 |
| Registered device records | 8 |
| Validated devices | 0 |
| Validation runs | 78 |
| Passed validation runs | 0 |
| Failed validation runs | 8 |
| Latest observation | 2026-10-24T19:41:16.142Z |

The evidence inventory includes 3,806 browser IMU observations and 215 Android SensorManager snapshots. The presence of the Android-labelled source does not establish a fresh, independently referenced physical baseline.

The Core device registry contains an older Android 14 browser fingerprint whose user-agent string names `moto g play - 2024`; the structured manufacturer/model are `Unknown`/`Android`, and the record is `UNVALIDATED`, last seen 2026-11-02. The user has reported a new phone, but no matching new handset record is present. The prior Moto fingerprint must not be treated as the current test device.

No independent calibrated reference instrument, rigid reference fixture, or fresh physical handset capture was available. The Android Native Sensor baseline therefore remains blocked at the physical ground-truth stage.

## 8. Remaining limitations and next gates

1. A real reviewer must be invited, have qualifications/conflicts reviewed, and receive only the appropriate lab scope before independent scientific review.
2. Project visibility is still **personal**. External testers/researchers cannot reach the app's own sign-in page until the owner changes visibility in Hatchable Settings. This is a human-only setting.
3. The current new phone's exact model/build must be identified from the device itself and then enrolled/observed as a distinct device record.
4. A calibrated independent reference instrument, calibration record, documented rigid fixture, axis alignment, and clock synchronization pairs are required for accuracy comparison.
5. The Android parent protocol remains DRAFT until preregistered and approved by an independent reviewer.
6. No through-wall sensing, victim localization, indoor-position accuracy, spatial pose, or life-safety readiness is established by these software tests.

**Disposition:** Lab role/isolation and historical-export software checks passed within the synthetic QA envelope. Scientific reviewer independence and physical Android validation remain unestablished.
