# CMVisual / WaveRadar Portability & Recovery

## Source of truth
The Base44 project is currently the primary working source. The independent Hatchable deployment is a separate runtime fallback, not a byte-for-byte source export.

Known-good Base44 checkpoint:
- Checkpoint: `6a97d94cd47bee5d9a5f089d`
- Checkpoint name: `Verified CMVisual migration state — build/lint clean + independent fallback deployed`
- Known-good Git commit at checkpoint: `1078bea8f4dcabd8b3040221d18e8a3888c85e38`

## Independent fallback
Hatchable project: `proj_nwATHlbD6XKH`
- Slug: `cmvisual-open`
- Live: https://cmvisual-open.hatchable.site
- Draft: https://cmvisual-open-draft.hatchable.site

The fallback contains a mobile-first real-device telemetry HUD and migration documentation. It intentionally does not claim that ordinary phone sensors can perform genuine through-wall human detection.

## Base44 dependencies still present
The React application still uses Base44-specific services for persistence, authentication, server functions, file upload, email, and some AI operations. Primary client dependency is `@base44/sdk`; the Vite integration uses `@base44/vite-plugin`.

Observed Base44 service areas:
- Entities: Snapshot, SnapshotNote, DetectionEvent, PinComment, Team, InvestorLead, InvestorTarget, PromoCampaign, User
- Auth: login, registration, OTP verification, password reset, provider login, current-user lookup
- Functions: investorLead, investorOutreach, facebookPromo, slackAlert
- Integrations: Core.InvokeLLM, Core.SendEmail, Core.UploadFile
- Vite: @base44/vite-plugin

## Migration order
1. Preserve a complete source export outside Base44 (preferred: private Git repository or ZIP archive).
2. Preserve environment-variable names and document which values are secrets.
3. Replace authentication with an independent provider only after the source backup is verified.
4. Replace entity persistence with portable API/database tables.
5. Replace server functions one at a time.
6. Replace file storage and email integrations.
7. Remove Base44 SDK/plugin dependencies only after all callers are migrated.
8. Build and lint after every migration stage.
9. Keep Hatchable as the independent live fallback.

## Data integrity rules
- Real measurements only.
- Measured observations, derived estimates, and unavailable capabilities must remain distinct.
- Never synthesize human targets from radio/cellular/acoustic data.
- Never infer identity, gender, intent, psychology, biometrics, or heartbeat without validated supporting hardware/data.
- Derived motion may be displayed only when calculated from actual repeated observations and labeled DERIVED.

## Recovery rule
Do not delete or rewrite the working Base44 implementation until an independently retrievable source archive has been verified.