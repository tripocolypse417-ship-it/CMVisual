# Base44 Dependency Map

This document identifies the remaining platform-specific surface area so migration can be performed without breaking the live sensing UI.

## Client SDK
`src/api/base44Client.js`
- Imports `@base44/sdk`.
- Central client used by application components.

## Persistence entities
Current callers use these Base44 entities:
- `Snapshot`
- `SnapshotNote`
- `DetectionEvent`
- `PinComment`
- `Team`
- `InvestorLead`
- `InvestorTarget`
- `PromoCampaign`

Operations observed include list/filter/get/create/update/delete/deleteMany/bulkCreate/subscribe.

## Authentication
Observed in:
- `src/lib/AuthContext.jsx`
- `src/pages/Login.jsx`
- `src/pages/Register.jsx`
- `src/pages/ForgotPassword.jsx`
- `src/pages/ResetPassword.jsx`
- `src/pages/OAuthConsent.jsx`
- `src/pages/Admin.jsx`
- `src/pages/Investors.jsx`
- `src/lib/PageNotFound.jsx`
- `src/components/SnapshotGallery.jsx`
- `src/components/PinCommentPanel.jsx`

Capabilities include current-user lookup, email/password login and registration, OTP verification, password reset, provider login, token handling, logout, and redirect-to-login.

## Server functions
Observed client invocations:
- `slackAlert`
- `investorLead`
- `investorOutreach`
- `facebookPromo`

Function source currently exists under `base44/functions/` for investorLead, investorOutreach, and facebookPromo. These need portable API replacements before the SDK can be removed.

## Base44 integrations
Observed:
- `base44.integrations.Core.InvokeLLM`
- `base44.integrations.Core.SendEmail`
- `base44.integrations.Core.UploadFile`

These should be isolated behind application service modules before replacement.

## Build tooling
- `@base44/vite-plugin` in `vite.config.js`
- `@base44/sdk` in `package.json`

## Migration priority
### P0 — backup
Export the entire repository independently before modifying platform services.

### P1 — isolate
Create application-level adapters for auth, data, functions, storage, email, and AI.

### P2 — portable backend
Move entities and functions to independent APIs/database.

### P3 — remove lock-in
Remove Base44 SDK and Vite plugin only after build/lint and runtime verification.

### P4 — verify
Run production build, lint, authentication tests, snapshot persistence tests, live sensor tests, and mobile performance checks.