# WaveRadar OS control plane — first portable primitives

This directory contains provider-neutral task lifecycle and evidence-journal primitives.

## Task lifecycle
- Task definitions declare bounded scopes, data classification, idempotency, attempt limits, approval requirement, and a verifiable postcondition.
- State transitions are deterministic and reject invalid terminal transitions.
- A task is not successful until its postcondition and required evidence are verified.
- The caller must persist the event and resulting state atomically. The pure transition helper is not itself a database.

## Evidence journal
- JSONL records are append-only and SHA-256 hash chained.
- Verification detects altered records, reordered records, duplicate sequence positions, and incomplete trailing writes.
- Incomplete tails fail closed: no further append is allowed until an explicit recovery/quarantine procedure is performed.
- The current JSONL implementation is single-writer per journal. It does not claim multi-process transactional safety or tamper-proof storage against an attacker who can rewrite the entire journal. For multi-writer production use, implement a transactional database adapter with append-only permissions and externally anchored signed checkpoints.
- Hashes provide integrity detection, not authenticity. Production attestations require signer identity, key custody, trusted timestamps, and independent verification.

## Safety boundary
A model output, detected device, sensor presence, or successful CI run is not independent physical ground truth. Experimental capabilities remain explicitly unvalidated until the required external protocol and qualified review are complete.

## Tests
Run:
- `node scripts/test-control-plane-task-contract.mjs`
- `node scripts/test-evidence-ledger.mjs`
