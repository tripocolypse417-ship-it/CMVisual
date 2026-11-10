# Research & Validation Lab — Version 17 Recheck

**Snapshot:** 2026-11-10T01:56Z (2026-11-09 19:56 America/Chicago)  
**Project:** WaveRadar Validation Lab  
**Deployment:** v17 live; v16 superseded at 2026-11-10T01:42:05Z  
**Scope:** Read-only deployment, database, and access-tier recheck. No scientific validation or independent-review result is claimed.

## 1. Deployment delta

Version 17 was deployed at 2026-11-10T01:49:05Z. The deployment manifest comparison against v16 shows two changed files:

- `api/reviewer/export.js`
- `README.md`

The live project reports 18 active API functions. Every function reported zero errors in the preceding 24 hours at the time of this check. The reviewer archive and export routes are registered.

## 2. Read-only database state after v17

| Record group | Current state |
|---|---|
| Lab templates | 2 draft scientific protocols; 9 retired QA templates |
| Testers | 4 suspended |
| Researchers | 1 suspended |
| Reviewers | 1 suspended; conflict-of-interest flag false |
| Reviewer scope rows | 1 retained row, attached to the suspended synthetic reviewer |
| Assignments | 23 total: 3 needs_revision, 18 rejected, 2 submitted |
| Evidence | 12 total: 3 MEASURED, 8 SIMULATED, 1 UNKNOWN |
| QA markers | All 12 evidence records have `source_metadata.qa_fixture=true` |
| Evidence digests | 8 stored digests present across the 12 records; 7 canonical payloads present |
| Review decisions | 7 total: 4 needs_revision, 3 rejected |
| Append-only audit events | 152; latest event at 2026-11-10T01:49:24Z |

The 2 draft protocols remain Android Native Sensor Fresh Baseline and Wi-Fi BFI/CSI Human-Presence Feasibility. No QA template was activated. No evidence, assignment, decision, or audit record was modified by this recheck.

## 3. Live access-tier recheck

All calls below were read-only GET requests against v17:

| Route / caller | HTTP | Interpretation |
|---|---:|---|
| `/api/reviewer/archive` — public | 401 | Expected: route requires signed-in app-user identity |
| `/api/reviewer/archive` — project member | 401 | Expected: collaborator identity is a separate plane from app-user identity |
| `/api/reviewer/archive` — synthetic app user | 403 | Expected: no active reviewer authorization |
| `/api/researcher/submissions` — synthetic app user | 403 | Expected: no active researcher authorization |
| `/api/admin/labs` — public | 401 | Expected admin boundary |
| `/api/admin/labs` — project member | 403 | Expected admin boundary |
| `/api/admin/labs` — admin | 200 | Admin read path works; returned 11 templates |

The synthetic app-user context is a test identity supplied by the platform, not the user's real account and not an independent reviewer. These checks confirm the negative gates and admin read path; they do not establish a positive real-reviewer path.

## 4. Version 17 export implementation review

The deployed `api/reviewer/export.js` was inspected. The export:

- Recomputes SHA-256 from the exact stored `payload_canonical_json` string when present.
- Parses the canonical envelope and checks assignment, evidence type/class, label, notes, capture time, value, and source metadata against the exported database row.
- Separates `RECOMPUTED_MATCH`, `MISSING_OR_INVALID_STORED_DIGEST`, `DIGEST_MISMATCH`, `DIGEST_MATCH_BUT_RECORD_MISMATCH`, `CANONICAL_PAYLOAD_INVALID`, and `LEGACY_NOT_RECOMPUTABLE`.
- Reports per-record and aggregate digest states, stable evidence/decision/audit ordering, and a SHA-256 over the serialized export package.
- Preserves QA fixture records in the export while excluding them from measured, simulated, and independent-reference eligibility.

The package hash is not a digital signature. A matching digest establishes byte consistency only; it does not establish author identity, calibration, sensor truth, or chain of custody.

The v16 synthetic QA positive-path tests documented in the 2026-11-09 report were not repeated against v17 because all QA identities remain suspended and all QA labs remain retired. The v17 positive export path therefore still requires a real, qualified, non-conflicted reviewer with explicit lab scope before it can be called independently exercised.

## 5. Remaining gates

1. Project visibility remains personal. External testers, researchers, and reviewers cannot reach the app's sign-in page until the owner changes project visibility in Hatchable Settings.
2. No active real tester, researcher, or reviewer is enrolled.
3. A real independent reviewer must be qualified, conflict-checked, invited, and granted only the required lab scope.
4. The Android parent protocol remains DRAFT until preregistered and independently approved.
5. Physical Android collection still requires the exact target handset/build, a controlled backed-up install, suitable calibrated reference equipment, a documented rigid fixture, clock synchronization, and append-only raw evidence.

## 6. Preservation and disposition

- This recheck used GET requests and SELECT queries only.
- No synthetic identity or QA template was activated.
- No assignments, evidence, decisions, or audit events were inserted, updated, deleted, or reclassified.
- The historical v16 report remains unchanged; this document is an additive v17 recheck.
- No scientific validation, real independent review, through-wall sensing, victim localization, or life-safety readiness is claimed.

**Disposition:** `LAB_V17_ACCESS_GATES_RECHECKED; REAL_REVIEWER_AND_PHYSICAL_VALIDATION_PENDING`.
