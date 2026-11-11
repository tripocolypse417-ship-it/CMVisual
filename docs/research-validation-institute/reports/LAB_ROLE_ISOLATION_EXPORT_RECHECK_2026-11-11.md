# Research & Validation Lab — Version 18 Follow-up

**Snapshot:** 2026-11-11T17:19Z  
**Project:** WaveRadar Validation Lab  
**Deployment:** v18 live, deployed 2026-11-10T02:24:51Z  
**Scope:** Read-only deployment, role-boundary, and export-code recheck. No scientific validation or independent-review result is claimed.

## 1. Deployment and export-code delta

The live Lab is at version 18 with 18 active API functions. The current function inventory reports zero errors across all 18 functions in the preceding 24 hours.

The deployed `api/reviewer/export.js` now compares each evidence record's `tester_email` with the parent assignment's `tester_email` after trimming and case-folding. The export adds:

- Per-record `evidenceOwnerMatchesAssignment` and `evidenceOwnerStatus`.
- Aggregate `evidenceOwnershipSummary` and `evidenceOwnershipStatus`.
- A clear limitation that this is a database consistency check, not cryptographic authentication of the submitter.

The export still recomputes SHA-256 from stored canonical payload bytes where available and distinguishes digest mismatch, canonical-record mismatch, invalid canonical payload, and legacy non-recomputable records. The package hash is not a digital signature and does not establish sensor truth, calibration, author identity, or independent custody.

The prior 2026-11-10 read-only data check found 12/12 evidence-owner/assignment matches and zero mismatches before v18 deployment. A fresh positive reviewer export was not run in this recheck because there is no active reviewer. The owner-consistency code is deployed, but the positive real-reviewer path remains unverified.

## 2. Live v18 role-boundary recheck

All requests below were read-only GET requests against the live v18 deployment:

| Route / caller | HTTP | Interpretation |
|---|---:|---|
| `/api/admin/labs` — public | 401 | Expected: admin route requires project-admin identity |
| `/api/admin/labs` — project member | 403 | Expected: collaborator is not an admin |
| `/api/admin/labs` — admin | 200 | Admin read path works; 11 templates returned |
| `/api/reviewer/archive` — public | 401 | Expected: app-user authentication required |
| `/api/reviewer/archive` — project member | 401 | Expected: project-collaborator identity is separate from app-user identity |
| `/api/reviewer/archive` — synthetic app user | 403 | Expected: no active reviewer authorization |

The synthetic app-user context is a platform test identity, not the user's real account and not an independent reviewer. These checks confirm negative access gates and the admin read path; they do not establish a positive real-reviewer export path or cross-lab positive access.

## 3. Current administrative state

Read-only admin routes returned:

| Record group | Current result |
|---|---:|
| Lab templates | 11 total: 2 draft scientific protocols, 9 retired QA templates |
| Testers | 4 suspended |
| Researchers | 1 suspended |
| Reviewers | 1 suspended; no active reviewer |
| Assignments | 23 total: 18 rejected, 3 needs_revision, 2 submitted |
| Research submissions | 4 withdrawn |
| Append-only audit events | 152 |

The two draft scientific protocols remain Android Native Sensor Fresh Baseline and Wi-Fi BFI/CSI Human-Presence Feasibility. They are not preregistered or approved for confirmatory testing.

The 2026-11-10 pre-deployment read-only check recorded 12 evidence records, all explicitly marked as QA fixtures, and 7 review decisions. No evidence, assignment, decision, or audit record was changed in this v18 follow-up. The current reviewer export was not invoked without an active reviewer.

## 4. Remaining gates

1. No active, qualified, non-conflicted independent reviewer is onboarded with explicit lab scope.
2. The positive reviewer-scoped export and historical-archive path must be exercised by a real reviewer under approved scope before being described as end-to-end verified.
3. The Android parent protocol remains DRAFT until preregistered and independently approved.
4. A fresh Android baseline still requires the current handset's exact model/build, authorized physical-device access, backup, and instrumentation-only capture unless calibrated independent ground truth and the required approvals are available.
5. Project visibility was recorded as personal in the v17 report; it was not rechecked in this v18 follow-up. Do not assume external app-user onboarding is available until visibility is verified.

## 5. Preservation and disposition

- All requests in this follow-up were GET-only.
- No QA identity or template was activated.
- No assignment, evidence, decision, or audit event was inserted, updated, deleted, or reclassified.
- The v16, v17, and v18 WIP reports remain preserved as historical snapshots; this document is an additive v18 follow-up.
- No scientific validation, real independent review, through-wall sensing, victim localization, or life-safety readiness is claimed.

**Disposition:** `LAB_V18_DEPLOYED; NEGATIVE_ROLE_GATES_RECHECKED; REAL_REVIEWER_POSITIVE_EXPORT_PENDING`.
