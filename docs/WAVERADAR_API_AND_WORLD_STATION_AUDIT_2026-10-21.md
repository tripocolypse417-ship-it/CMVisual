# WaveRadar API and World Information Station Audit
**Audit date:** 2026-10-21  
**Repository:** `tripocolypse417-ship-it/CMVisual`  
**Branch:** `audit/world-information-station-safety`  
**Scope:** Source-level review. This document does not claim that production services were called or that field performance was validated.

## Executive summary

The source tree contains seven explicit Base44 backend function entry files, 108 entity schemas, and five connector configuration files (counts from the repository inventory performed for this review). These counts are not the total number of API endpoints and do not prove that any connector is authenticated or healthy.

The seven function files are:
- `exportSnapshotToDrive`
- `facebookPromo`
- `investorLead`
- `investorOutreach`
- `slackAlert`
- `weeklyDetectionDigest`
- `weeklyInvestorDigest`

Code references show integrations or connector usage involving Facebook Graph API, Slack Web API, Gmail API, Google Drive export, and Base44-managed AI/email/file services. The federated publishing hook is a separate application capability; its receiver and successful end-to-end ingestion were not verified in this source-only review.

## Changes made on this audit branch

### 1. Public marketing claims replaced with evidence-safe copy
File: `base44/functions/facebookPromo/entry.ts`

The rotating promotion library previously claimed that an ordinary phone already performs through-wall radar, detects people through walls/debris, and delivers real-world results without simulation. The project validation evidence reviewed to date does not establish those claims. The library now contains eight messages about the project goals, evidence provenance, validation, training simulation, portability, and admin observability without asserting unverified through-wall capability.

### 2. Privileged automated publishing is no longer anonymously callable
File: `base44/functions/facebookPromo/entry.ts`

The `campaignTick` action uses service-role access and can publish to a public Facebook page. It now requires the `WAVERADAR_CAMPAIGN_TICK_SECRET` environment secret and matching `x-waveradar-campaign-secret` request header. If the secret is absent or does not match, the action returns HTTP 503 and does not publish.

**Deployment follow-up required:** configure the secret in the function environment and the authorized scheduler before expecting automated posts to resume. Do not commit the secret to source control. Test a missing secret (must not publish), a wrong secret (must not publish), and a correct secret in a non-production/test campaign before enabling public posting.

### 3. Slack service-role actions require an administrator
File: `base44/functions/slackAlert/entry.ts`

The function now checks `base44.auth.me()` and requires `user.role === 'admin'` before it obtains the connected Slack credential or lists channels/posts messages. This is a source-level control; negative runtime tests are still required.

### 4. Public investor lead submission has bounded input and safer notification routing
File: `base44/functions/investorLead/entry.ts`

The public `submit` action now checks that name and email are non-empty strings, validates a basic email format, applies field-length limits, and no longer falls back to emailing the first arbitrary registered user if no administrator is found. A real rate limiter, spam protection, and privacy/retention review are still needed.

## Authorization review

| Function/action | Source-level observation | Remaining verification |
|---|---|---|
| `facebookPromo.listPosts` | Returns a static post library without authentication | Confirm the returned content is safe for public exposure |
| `facebookPromo.campaignTick` | Service-role publishing; now secret-gated on this branch | Configure secret in deployment/scheduler; test negative and positive cases |
| `facebookPromo.list/post` | Requires a logged-in user | Verify role policy, page-level permissions, and abuse limits |
| `slackAlert.list/post` | Now requires an administrator before service-role Slack access | Test unauthenticated, non-admin, and admin calls |
| `investorLead.submit` | Public lead intake writes via service role | Add rate limiting/spam controls; verify data access rules and retention |
| `investorLead.outreach` | Requires an administrator | Test unauthorized requests and ensure only intended lead records can be updated |
| `investorOutreach` | Entry point checks administrator role | Review every action and any external research results before using them |
| `weeklyDetectionDigest` | Uses service-role entities and connected Gmail | Verify scheduler-only invocation/authorization and recipient scope |
| `weeklyInvestorDigest` | Uses service-role entities and connected Gmail | Verify scheduler-only invocation/authorization and recipient scope |
| `exportSnapshotToDrive` | Present in the backend function inventory | Inspect complete source and test auth, file scope, and connector permissions |

A source check is not equivalent to a penetration test. No production endpoint was invoked as part of this audit.

## World Information Station: verification status

| Layer | What source presence establishes | What remains unproven |
|---|---|---|
| Data contracts and entity schemas | Data structures are defined | One canonical schema enforced on every ingestion and output path |
| Sensor processing | Sensor-related modules exist | Device measurements are valid, synchronized, and reproducible |
| Prediction | A prediction module calculates trajectories from supplied samples | Accuracy against independent ground truth, calibration, false-positive/negative rates |
| World-state projection | Projection code exists | Real observations reliably update world state with lineage and stale-data handling |
| Federated publishing | A configurable publishing mechanism exists | Receiver identity, authorization, successful ingestion, retries, deduplication, and end-to-end lineage |
| External data sources | Connector/source declarations exist | License-cleared adapters actually fetch, validate, normalize, and update world state |
| Admin dashboard | Admin-oriented schemas and UI components exist | Runtime coverage of source health, exceptions, access logs, and validation status |

## Required tests before claiming production readiness

1. Run the existing scripts from the project root:
   - `npm run audit:data`
   - `npm run test:array-boundaries`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
2. Add automated authorization tests for each privileged function/action, including missing identity, non-admin identity, and valid admin identity.
3. Test the Facebook campaign secret gate with missing, invalid, and valid test credentials. Do not post to a real public page during the test.
4. Test public investor lead validation for empty values, malformed email, overlong fields, and normal input. Add rate limiting and spam controls before exposing the form broadly.
5. Trace every app call site to its backend function or external endpoint. Record method, caller, auth model, request/response shape, retries, timeout, data classification, and owner.
6. Establish a license manifest for each external source and dataset. Unknown or ambiguous licenses must be quarantined rather than ingested.
7. Add a repeatable integration test that sends a known test observation through admission, normalization, evidence storage, fusion/projection, and query/readback. Assert provenance and evidence class survive every boundary.
8. Benchmark predictions against independent, labeled ground truth with temporal/geographic holdouts. Report uncertainty, failure modes, and metrics; do not use simulated outcomes as field validation.
9. Test backup and restore, credential rotation, data deletion/retention, offline operation, and backend portability.

## Deployment blockers / decisions

- Configure `WAVERADAR_CAMPAIGN_TICK_SECRET` and update the scheduled caller. Automated Facebook posting will remain blocked until this is done.
- Confirm whether `slackAlert` is intended to be administrator-only; this branch implements that safer default.
- Add an actual rate-limiting mechanism for public investor lead intake.
- Inspect the complete `exportSnapshotToDrive` and digest handlers for scheduler authorization and least-privilege data access.
- Identify the authoritative federated endpoint and provide a test/staging URL and credentials through the platform's secret manager, not source code.
- Select one license-cleared public data source for a small, testable ingestion adapter before broadening the source catalog.

## Truthful status

This branch makes source-level changes to reduce two immediate risks: unverified claims in automated marketing and anonymous access to privileged publishing/Slack actions. It also tightens public investor-lead input handling. The code has not been run in the deployed Base44 environment from this review, so the changes still require CI/runtime testing and review before merging. No claim is made that through-wall sensing, live source ingestion, or life-safety performance has been validated.
