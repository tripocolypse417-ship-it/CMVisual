# Data Correlation Delegate — Readiness and Implementation Record

**Observed:** 2026-11-12T17:33Z  
**Project:** WaveRadar Validation Lab, Hatchable project `proj_6hufgdUKLWdn`  
**Live deployment:** v18  
**Working-copy status:** New service workflow staged; not deployed  
**Evidence policy:** Preserve all original evidence; no QA fixture is eligible for scientific correlation.

## 1. Current data readiness

A read-only inventory of the live Lab database returned:

| Check | Result |
|---|---:|
| Evidence records | 12 |
| Explicit `source_metadata.qa_fixture=true` | 12 |
| MEASURED label | 3 |
| SIMULATED label | 8 |
| UNKNOWN label | 1 |
| Records with stored payload hash | 8 |
| Records with canonical payload JSON | 7 |
| Active independent reviewers without recorded conflict | 0 |
| Active non-QA protocols | 0 |
| Active Lab templates total | 0 |
| Assignments | 23 (18 rejected, 3 needs_revision, 2 submitted) |

All 12 evidence rows are explicitly marked as QA fixtures. Their `MEASURED` labels are not physical measurement evidence. The delegate must preserve and exclude them from scientific correlation. A missing QA marker in future records will not be treated as proof of scientific eligibility.

No statistical correlation was run. No eligible non-QA dataset was found in this Lab inventory. No independent reviewer or active preregistered protocol is currently available.

## 2. Implemented as a bounded service workflow

The Lab platform supports only the built-in `public`, `user`, `member`, `admin`, and `scheduler` access tiers; it does not expose a custom collaborator role. Therefore the Data Correlation Delegate is implemented as a clearly bounded, admin-gated service workflow, not as a separate autonomous agent or independent reviewer.

Working-copy files:

- `api/delegate/data-correlation.js` — `POST` route, `access='admin'`; reads evidence and governance state, then appends a run record.
- `lib/data-correlation-delegate.js` — pure readiness assessment and canonical manifest serialization.

The workflow:

1. Reads at most 1,000 evidence records with assignment and protocol context.
2. Excludes explicit QA fixtures and evidence classes outside the initial `MEASURED` / `DERIVED` pilot scope.
3. Recomputes canonical payload SHA-256 and checks that the canonical envelope matches the stored evidence fields.
4. Checks evidence-owner/assignment consistency without treating it as cryptographic submitter authentication.
5. Screens for source/device identity, software version, units, clock domain and timestamp semantics, coordinate frame, calibration state, environmental conditions, consent, license, provenance, capture time, and numeric fields.
6. Requires at least three clock synchronization pairs when candidate records span multiple clock domains, and coordinate transforms when candidate records span multiple coordinate frames.
7. Separately checks for an active non-conflicted independent reviewer and an active non-QA protocol before returning a governance-ready disposition.
8. Appends the run ID, canonical input-manifest digest, source evidence references, exclusions, counts, method version, initiator, and disposition to the existing append-only `lab_audit_events` ledger.

The audit table's `lab_audit_events_append_only` trigger was verified through `information_schema.triggers` for both UPDATE and DELETE events. No new table or migration is required for this first readiness-only slice.

## 3. Authority and data boundaries

The delegate is an analytical steward only:

- It cannot approve its own work or mark evidence independently validated.
- It cannot promote evidence, update reviewer decisions, or write to WaveRadar Core.
- It does not call an AI provider or paid external service.
- It does not transmit partner data externally.
- It does not return raw evidence values, tester email addresses, or unredacted device identifiers in its manifest.
- It does not calculate correlations, causal effects, predictions, hazard outputs, victim locations, routes, or life-safety alerts.
- `RECOMPUTED_MATCH` means canonical-byte and stored-field consistency only; it does not prove submitter identity, physical truth, calibration, or independent validation.

The expected readiness disposition for the current inventory is zero candidates because every existing evidence row is an explicit QA fixture. This is an expectation derived from the read-only inventory, not a completed delegate run.

## 4. Verification performed

| Verification | Result |
|---|---|
| Existing append-only audit trigger inventory | Verified: BEFORE UPDATE and BEFORE DELETE triggers present |
| Hatchable dry-run deploy validator | `ok=true`, zero errors |
| Deploy warnings | One existing `visibilityWall` warning: project remains personal/private |
| Projected API function count | 19 (up from 18) |
| Runtime endpoint invocation | Not run — route is not deployed |
| Audit run record created | No |
| Statistical correlation | Not run |
| Evidence/database mutation | None |
| Deployment | None |

The dry run is a static platform validation of the working copy. It is not a runtime test, independent review, or production deployment.

## 5. Required next gates

1. Review the staged source and deploy only after founder authorization.
2. After an authorized deployment, invoke the admin-only readiness route and verify the expected zero-candidate result and append-only audit event.
3. Obtain a real non-QA dataset with consent/license, provenance, capture/receive timestamps, clock domain, units, coordinate frame, calibration state, environmental context, and reproducible raw-data custody.
4. Preregister a specific correlation question and method before confirmatory analysis.
5. Activate a qualified, non-conflicted independent reviewer with explicit lab scope; the delegate cannot substitute for that reviewer.
6. For physical IMU/spatial comparisons, obtain independently measured ground truth, calibrated references, clock synchronization, and coordinate-frame alignment before analysis.

**Disposition:** Delegate implementation is staged in the Lab working copy as a readiness-only service workflow. It is not live, has not executed a run, and has not produced scientific findings. No original evidence, assignments, protocols, reviews, or audit history were modified.
