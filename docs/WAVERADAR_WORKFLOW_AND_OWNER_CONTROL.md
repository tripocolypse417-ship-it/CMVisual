# WaveRadar development workflow and owner-control policy

## Purpose
Make WaveRadar easier to build, troubleshoot, validate, and distribute while keeping the project owner in control of the repository, intellectual property, product direction, accounts, and commercial decisions.

## Source of truth
- Primary source repository: `tripocolypse417-ship-it/CMVisual`.
- Preserve the existing React/Vite + Capacitor application unless evidence shows a migration is necessary.
- Use Git history and reviewable commits as the record of changes.
- Treat Base44 and hosted deployments as secondary workspaces until their source, data, and backend dependencies are portable and verified.
- Never assume a hosted UI, successful build, or downloadable APK proves the application works correctly on a device.

## Default workflow
1. **Triage:** reproduce the error, record the exact message and affected screen, and identify the most recent known-good commit/build.
2. **Inspect:** examine the relevant source, package scripts, build workflow, dependency versions, runtime logs, and test output before changing code.
3. **Protect:** make changes on a dedicated branch or checkpoint; preserve the current main branch and any user data.
4. **Repair the smallest cause:** prefer a narrow fix over broad rewrites or adding features before the app renders reliably.
5. **Verify:** run the data audit, production build, and relevant tests; build the Android debug APK when the available workflow permits. Report each check as passed, failed, skipped, or not run.
6. **Review:** inspect the diff for secrets, permissions, licenses, privacy, security, data loss, and unsupported sensing claims.
7. **Deliver:** provide one clear link to the changed branch/PR or build artifact, plus a short status: what changed, what was tested, what remains unverified, and the next action.
8. **Recover:** if a check fails, preserve logs, roll back or correct the isolated change, and do not claim success until a new verification passes.

## Delegated technical authority
The assistant/development agent may, without asking for routine approval:
- Inspect repository files, build logs, errors, and test results through authorized tools.
- Choose suitable free/open-source tools and dependencies when the license and maintenance status are acceptable.
- Fix reproducible bugs, improve defensive error handling, add tests, improve accessibility/mobile usability, and document workflows.
- Create branches, draft pull requests, and prepare debug builds when permissions allow.
- Prefer reversible, incremental changes and explain meaningful tradeoffs in concise language.

## Owner approval required
Do not do any of the following without explicit, specific approval:
- Transfer, delete, archive, or make private/public the owner's repository or change ownership/access control.
- Spend money, enable paid services, add billing, or create financial obligations.
- Publish a production release, sign a production app, submit to an app store, or represent a build as certified/operational.
- Change the project's business model, equity/IP terms, patent strategy, or license in a way that changes the owner's rights.
- Delete or migrate production data, rotate/revoke credentials, weaken security/privacy controls, or introduce a new external data-sharing service.
- Merge a broad/destructive rewrite into the main branch when a safer reviewable alternative exists.
- Make claims about customers, grants, partnerships, accuracy, lives saved, or validated life-safety capability without evidence.

## Ownership and intellectual property safeguards
- Keep the owner in control of GitHub, hosting, domain, signing keys, accounts, and billing.
- Never place secrets, access tokens, signing keys, personal data, or real responder/location data in source control or public logs.
- Before adding a dependency, record its name, exact version, license, purpose, and whether it creates distribution or commercial-use obligations.
- Keep proprietary project code separate from components whose licenses or terms could require source disclosure or impose other obligations. Flag uncertain license compatibility for owner review.
- Back up source and document how to reproduce builds. A debug APK is not a production-signed release.
- This workflow is an operational delegation policy; it does not transfer ownership or create legal authority over third parties.

## WaveRadar evidence and safety rules
- Label each item as MEASURED, DERIVED, INFERRED, PREDICTED, UNKNOWN, UNAVAILABLE, or DEMO as appropriate.
- Never represent synthetic targets, placeholder values, or camera-only detections as validated through-wall sensing.
- Phone IMU readings do not alone establish absolute position; a missing detection does not prove a space is empty or blocked.
- Keep test results tied to device, hardware, software version, environment, ground truth, and test conditions.
- Treat navigation, target tracking, team alerts, and external-sensor fusion as non-safety-certified until independently validated.
- Preserve privacy: minimize collected data, obtain appropriate consent, and keep sensitive recordings local unless a deliberate, documented sharing decision is made.

## Current priority order
1. Resolve the current runtime/rendering failure using actual logs and source inspection.
2. Confirm audit and web build pass.
3. Confirm Android workflow and APK artifact succeed; test installation and controls on the target phone.
4. Fix device/sensor initialization and clearly report permission/support/freshness states.
5. Validate capture and ground-truth recording with repeatable tests.
6. Only then expand overlays, orientation, 3D, tracking, team sharing, and replay.
7. Evaluate a backend migration only after mapping existing Base44 SDK dependencies and verifying the replacement API/data model.

## Status-report template
- **Changed:** ...
- **Evidence:** ...
- **Checks:** passed / failed / skipped / not run
- **Build/artifact:** link or unavailable
- **Known limitations:** ...
- **Next step:** ...
