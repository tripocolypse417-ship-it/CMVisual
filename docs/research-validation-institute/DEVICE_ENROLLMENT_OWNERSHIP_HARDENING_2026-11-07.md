# Device Enrollment Ownership Hardening — 2026-11-07

**Scope:** WaveRadar Core device enrollment-token issuance and prior-account ownership claim. This is a code-review and negative-test record. The changes are saved as Hatchable WIP and are **not deployed**.

## Finding

A review of the pre-change Core handlers identified two ownership-boundary weaknesses:

1. `POST /api/devices/enrollment-token` accepted a device ID from any authenticated user without first confirming that the device registry row was owned by that user.
2. `POST /api/devices/claim` validated one device-bound token, then gathered every active token owner for that device ID and migrated records for all of those owners. A credential from one prior owner should not authorize transfer of another account's records.

A read-only database check found **zero device IDs with multiple active token owners** at the time of this review. No cross-owner migration or evidence movement was observed. The issue was preventive hardening, not a confirmed data breach.

## WIP changes

### Enrollment-token issuance

Before creating a token, the handler now requires a matching `sensor_devices` row with both the requested `device_id` and `created_by = req.user.id`. An unowned or differently owned device returns `404 OWNED_DEVICE_NOT_FOUND` and no token is created.

### Prior-owner claim

The claim handler now uses only the `created_by` account attached to the exact unexpired token presented by the caller. All ownership-transfer statements are constrained to that one prior owner. It no longer builds a list of every active token owner for the device ID.

The handler comments and response policy now clarify that possession of an enrollment credential is **not** hardware attestation or proof of physical possession.

## Verification performed against current WIP

| Test | Result |
|---|---|
| Anonymous token issuance | `401` at the declared user-authentication gate |
| Synthetic signed-in user requests token for a device owned by another account | `404 OWNED_DEVICE_NOT_FOUND` |
| Claim using an invalid prior credential | `409 PRIOR_ENROLLMENT_TOKEN_INVALID_OR_EXPIRED` |
| Before/after device token count | Unchanged: 1 |
| Before/after device observation count | Unchanged: 215 |
| Before/after active token-owner count | Unchanged: 1 |
| Hatchable dry-run deployment validation | `ok: true`; 0 hard errors |

The negative tests ran against the latest WIP files through the project test runner. The live deployed version was not changed.

## Not yet verified

- Successful token issuance for a device owned by the actual signed-in account.
- Successful ownership transfer using a real, valid prior credential.
- Actual Motorola Moto G Play (2024) registration, native capture, or upload.
- Hardware identity or attestation; the current enrollment credential does not provide it.
- APK install/update compatibility.

No real-user 401/403 enrollment failure was reproduced. The anonymous `401` above is the expected route gate, not evidence of a handset failure.

## Preservation

No sensor observations, validation runs, device records, enrollment tokens, or historical evidence were modified by these tests. No token value is included in this report. The WIP changes are not deployed.

## Next gate

Before deploying, test a successful owner-bound token flow with the actual signed-in account and target handset, verify the saved credential can upload only for its bound device, and review any ownership transfer against the original account's records. Keep the physical baseline blocked until the phone identity, backup, calibrated reference, fixture, and clock synchronization requirements are met.
