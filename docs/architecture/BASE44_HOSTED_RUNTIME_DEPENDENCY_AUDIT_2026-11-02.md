# Base44 and Hosted-Runtime Dependency Audit

**Reviewed:** 2026-11-02  
**Scope:** Repository tree, package/build configuration, existing dependency map, and targeted source/function files on `main`.  
**Status:** Partial source-level audit; not yet an exhaustive import/call-site scan.  
**Safety:** Documentation only. No runtime, data, credentials, deployment, or production configuration changed.

## Executive finding

WaveRadar is not yet independent of either Base44 or its hosted runtime.

There are at least two distinct dependency layers:

1. **Base44 application services:** SDK-backed authentication, entity persistence, server functions, connectors, and core integrations.
2. **Hosted execution/runtime:** the current Android CI build injects a Hatchable URL into Capacitor. That APK loads a remote web application rather than proving that a self-contained local UI and independent backend can run offline.

Removing the SDK package alone would not make the product portable. Authentication, persistence, server functions, file storage, email, AI invocation, and hosted application delivery must be replaced and tested as separate concerns.

## Confirmed source/build findings

| Area | Confirmed path(s) | Finding | Migration implication |
|---|---|---|---|
| SDK client | `src/api/base44Client.js` | Imports `createClient` from `@base44/sdk` and exports the shared client | Replace with provider-neutral service clients only after all consumers are migrated |
| Authentication context | `src/lib/AuthContext.jsx` | Imports shared client and Base44 SDK axios helper; uses public app settings endpoint, `auth.me`, logout, and redirect-to-login | Define OIDC/session contract and preserve public/private route behavior before cutover |
| App parameters | `src/lib/app-params.js` | Reads Base44 app ID, token, functions version, app base URL and Base44-named local-storage keys | Introduce versioned WaveRadar configuration; do not silently reuse old tokens |
| Login | `src/pages/Login.jsx` | Email/password and Google provider login via Base44 auth | Identity provider and callback/redirect migration required |
| Registration | `src/pages/Register.jsx` | Registration, OTP verification/resend, token setting, Google login | Preserve verification lifecycle and abuse protections |
| Password recovery | `src/pages/ForgotPassword.jsx`, `src/pages/ResetPassword.jsx` | Base44 reset request and reset-token flows | Implement secure reset lifecycle before removing SDK |
| OAuth consent | `src/pages/OAuthConsent.jsx` | Calls app-scoped API endpoints directly for MCP authorization | Treat separately from ordinary user login; map scopes, consent, and revocation |
| Snapshot persistence | `src/components/SnapshotGallery.jsx` | Snapshot list/delete; SnapshotNote list; auth lookup; realtime subscriptions | Requires API pagination, ownership checks, delete semantics, and event/subscription replacement |
| Pin comments | `src/components/PinCommentPanel.jsx` | Auth lookup; filtered PinComment reads; subscriptions; creates | Requires tenant/incident authorization, safe text handling, and realtime replacement |
| Build tooling | `package.json`, `vite.config.js` | Declares `@base44/sdk` and `@base44/vite-plugin`; Vite plugin supplies legacy import compatibility and editor/analytics/navigation/HMR hooks | Remove plugin only after legacy imports and development-time features are deliberately replaced or retired |
| Android hosted mode | `capacitor.config.ts` | `WAVERADAR_HOSTED_URL` configures Capacitor to load a remote URL | Keep explicit pilot mode separate from bundled/offline release mode |
| Android CI | `.github/workflows/build-android.yml` | Sets hosted URL to `https://waveradar-20.hatchable.site/workspace/` before APK build | Current APK workflow remains tied to a Hatchable-hosted UI; do not call it standalone/offline |
| Backend functions | `base44/functions/*/entry.ts` | Seven Base44 server-function source directories are present (listed below) | Each function needs an independent API/job replacement or a documented retirement decision |

## Confirmed server-function inventory

All seven inspected function entrypoints import `createClientFromRequest` from the Base44 SDK:

- `base44/functions/exportSnapshotToDrive/entry.ts` — reads Snapshot via service role, retrieves Google Drive connector credentials, uploads export to Drive.
- `base44/functions/facebookPromo/entry.ts` — uses Facebook Pages connector and PromoCampaign entity; performs page/campaign operations.
- `base44/functions/investorLead/entry.ts` — creates/updates InvestorLead and sends email through Base44 Core integration.
- `base44/functions/investorOutreach/entry.ts` — manages InvestorTarget records; calls Core.InvokeLLM and Core.SendEmail.
- `base44/functions/slackAlert/entry.ts` — retrieves Slack connector credentials and calls Slack APIs.
- `base44/functions/weeklyDetectionDigest/entry.ts` — retrieves Gmail connector credentials, reads User and DetectionEvent records, sends Gmail messages.
- `base44/functions/weeklyInvestorDigest/entry.ts` — retrieves Gmail connector credentials, reads User and InvestorLead records, sends Gmail messages.

Do not port these blindly. First classify each as active, dormant, or obsolete; identify its trigger and authorization model; then preserve required behavior or formally retire it. Never copy provider credentials into the repository.

## Persistence and integration surface recorded by the existing dependency map

The existing `docs/BASE44_DEPENDENCY_MAP.md` records these entity types: Snapshot, SnapshotNote, DetectionEvent, PinComment, Team, InvestorLead, InvestorTarget, and PromoCampaign. `MIGRATION.md` additionally names User. The map records list/filter/get/create/update/delete/deleteMany/bulkCreate/subscribe operations.

Recorded Base44 Core integrations:

- `Core.InvokeLLM`
- `Core.SendEmail`
- `Core.UploadFile`

Recorded external connector dependencies include Google Drive, Facebook Pages, Slack, and Gmail. The complete set of entity call sites, data ownership rules, and all storage/upload call sites still requires exhaustive scanning and runtime verification.

## Important non-Base44 runtime dependency

The current Android build workflow sets `WAVERADAR_HOSTED_URL` to the Hatchable WaveRadar Core workspace URL. Capacitor then loads that remote UI. This is a hosted pilot configuration, not a self-contained APK. If the hosted service is unavailable or the device is offline, the workflow does not prove that the full application is usable.

The repository also documents a separately hosted Validation Lab. Its backend, identity, storage, visibility, and backup ownership must be inventoried independently; do not assume that moving the React client also migrates validation records.

## Sensor-specific findings relevant to the research roadmap

- `src/hooks/useCellularFusion.js` listens for an explicit native telephony bridge and reports UNAVAILABLE when that bridge is absent. It normalizes cell identifiers and signal values only when a source supplies them; it does not itself obtain Android TelephonyManager data.
- `src/hooks/useNetworkSignal.js` samples browser Network Information API fields such as effective connection type, downlink estimate, and RTT. Its own comments correctly state that these are network-quality values, not Wi-Fi RF/CSI or wall-penetration radar.
- `src/lib/dataContract.js` currently defines GNSS and Wi-Fi modalities but no dedicated satellite-communications modality. GNSS positioning/timing and satellite-communications link telemetry should remain distinct source types in future contracts.
- The cellular hook's presence is not proof that the target phone exposes the required telephony fields. Native API permissions, Android version restrictions, carrier behavior, hardware, and measured payloads must be checked on the actual device.

## Audit limitations and next steps

The repository tree was enumerated and the files above were inspected directly. GitHub code-search returned no indexed matches for several Base44 symbol queries, so those empty search results were not treated as proof of absence. This audit is deliberately marked partial until a complete source archive or exhaustive file-by-file scan can establish every import and call site.

Next steps, in order:

1. Obtain a reproducible, complete source snapshot and enumerate every JS/TS/TSX/JSX/JSON/YAML file for Base44 imports, legacy aliases, direct API URLs, entity operations, integrations, uploads, and subscriptions.
2. Reconcile every call site against `docs/BASE44_DEPENDENCY_MAP.md`; mark each active, dormant, or removable, with an owner and replacement.
3. Inventory the authoritative data source for each entity, all file buckets, retention rules, scheduled triggers, OAuth scopes, and secrets by **name only**.
4. Define independent OpenAPI contracts and contract tests for identity, devices, incidents, observations, evidence objects, validation sessions, review, audit, and exports.
5. Implement a narrow independent vertical slice in an isolated environment: authenticate → enroll device → create incident → ingest observation → retrieve audit history → export and restore.
6. Prove data reconciliation and rollback before migrating any live entity or turning off a Base44 function.
7. Split Android build profiles into explicit `hosted-pilot` and `bundled-standalone`; only call the latter independent after it launches without a hosted URL and passes offline/recovery tests.
8. Remove Base44 dependencies only after exhaustive scans, tests, data reconciliation, and a verified rollback window.

## Release rule

No Base44 dependency, hosted URL, database, or validation record is to be removed or changed in production as part of this audit. The current application and historical evidence remain intact while the portable replacement is built and verified.
