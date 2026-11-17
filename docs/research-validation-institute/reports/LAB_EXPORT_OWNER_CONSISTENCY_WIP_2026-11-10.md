# Lab Evidence Export — Owner Consistency Hardening (WIP)

**Date:** 2026-11-10  
**Live deployment:** v17  
**Working-file target:** v18 draft; not deployed  
**Scope:** Export integrity hardening and read-only data check. No database writes or reviewer activation occurred.

## 1. Gap identified

The live v17 reviewer export recomputes SHA-256 from the stored canonical evidence payload and compares the canonical envelope with the evidence row's assignment ID, type, class, label, notes, capture timestamp, value, and source metadata.

The export did not separately compare the evidence row's `tester_email` with the parent assignment's `tester_email`. The payload digest is not a cryptographic identity proof, and the canonical payload intentionally does not include the tester email. A row-level ownership mismatch could therefore go unreported even if the canonical payload digest matched.

## 2. Read-only current-data check

A read-only join across `lab_evidence` and `lab_assignments` returned:

| Check | Result |
|---|---:|
| Evidence records | 12 |
| Evidence owner matches assignment tester | 12 |
| Owner mismatches | 0 |
| Missing evidence owner | 0 |

No records were changed.

## 3. WIP change saved in Hatchable

The working copy of `api/reviewer/export.js` now:

- Selects the evidence row's `tester_email` for an internal consistency check.
- Compares it with the parent assignment's tester email after trimming and case-folding.
- Emits per-evidence `evidenceOwnerMatchesAssignment` and `evidenceOwnerStatus` fields in the integrity manifest.
- Adds aggregate `evidenceOwnershipSummary` and `evidenceOwnershipStatus` to the export package and manifest.
- Excludes the duplicate per-evidence `tester_email` field from the raw evidence array; the assignment still identifies the assigned tester.
- Adds an explicit limitation that owner matching is a database consistency check, not cryptographic authentication.

The canonical payload schema, stored payload bytes, stored digests, historical evidence rows, assignments, and review decisions are unchanged.

## 4. Tests and deployment gate

- A read-only project-isolate check evaluated all 12 existing evidence/assignment pairs: 12 matches, 0 mismatches.
- Synthetic comparison checks returned true for case-insensitive matching and false for a mismatched owner.
- Hatchable deploy dry-run returned `ok=true`, zero errors, and one existing `visibilityWall` warning because project visibility remains personal. The proposed next version is 18.
- The live project remains at v17. No deploy, reviewer activation, evidence mutation, or audit insertion was performed.

## 5. Remaining validation

The v17 positive reviewer export path has not been rerun against a real reviewer. All QA identities remain suspended and QA labs remain retired. Before deploying v18, the owner-consistency fields should be reviewed, and a qualified reviewer with explicit lab scope should exercise the positive export path under an approved protocol. The test must not reactivate QA fixtures as scientific evidence.

**Disposition:** `WIP_ONLY; LIVE_V17_UNCHANGED; 12_OF_12_CURRENT_EVIDENCE_OWNERS_MATCH`.
