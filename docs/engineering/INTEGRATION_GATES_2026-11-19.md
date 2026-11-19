# WaveRadar integration gates — 2026-11-19

## Verified checks

- PR #96 (`14aa0cd`): quality, runtime-audit and android-debug passed; GitHub reports mergeable, but PR remains draft and unmerged.
- PR #97 (`0fd0338`): quality and runtime-audit passed; android-debug failed at **Test native sensor registration lifecycle** (step 11). PR is not mergeable.
- PR #95 (`0fd5b4e`): all three checks passed; PR is not mergeable.
- PR #98 (`f399b3e`): runtime-audit passed; quality and android-debug both failed during **Install dependencies** (steps 4 and 5 respectively). PR is not mergeable.

## Required repair sequence

1. Preserve main and all historical evidence; review PR #96 as the base integration candidate. Passing CI is not permission to deploy a life-safety system.
2. For #97, inspect native sensor registration lifecycle test failure, including callback registration/unregistration and platform version compatibility; fix on its branch and rerun Android CI. Reconcile its in-memory native buffer and IndexedDB ledger with #96 encrypted SQLite journal, without changing event identity or source clock.
3. For #98, inspect dependency installation failures and reconcile lockfile/package manifest against main; fix branch and rerun quality and Android CI. Do not infer dependency root cause from failing step name alone.
4. Rebase or selectively port #95/#97/#98 changes after conflict review, avoiding blind merge of competing evidence stores and scene contracts.
5. Verify Moto G Play physical capture, offline persistence across process death/reboot, upload/retry/idempotency, secure enrollment, multi-client WIS/HMD stale-state behavior, and APK signing/update compatibility.
6. Obtain independent spatial ground truth and lab review before any operational guidance or accuracy claims.

## Release gate

No merge/deployment without passing checks, reviewed conflict resolution, backup/rollback, and evidence-preserving migration. Track remaining acceptance evidence in issue #99.
