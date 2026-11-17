# WaveRadar OS — Browserless Automation Policy

**Decision:** Browser automation is not part of WaveRadar's required architecture. Chrome, Chromium, Playwright, Puppeteer, WebDriver, browser extensions, remote-control sessions, and hosted browsers must not be required to build, test, operate, schedule, or maintain WaveRadar.

## 1. Required operating model

Use this order for every integration and workflow:
1. Native application interfaces and documented operating-system APIs.
2. Official service APIs, webhooks, and existing authorized connectors.
3. Portable command-line tools and deterministic workers.
4. Bounded CI jobs for tasks that can run ephemerally.
5. Human-operated UI only when no supported machine interface exists.

Do not silently fall back to browser automation. If a workflow has no API or native route, mark that specific workflow as manually operated or blocked and document the missing interface.

## 2. Browserless control plane

The WaveRadar-owned control plane must own durable task definitions, state transitions, policy, idempotency, approvals, provenance, retries, and completion checks. Workers are replaceable executors and must not become the system of record.

WaveRadar Control Plane:
- Durable task registry and append-only audit/evidence records
- Policy and approval gates
- Scheduler adapters: bounded GitHub Actions jobs and other independently selected schedulers
- Execution adapters: native Android/iOS/desktop APIs, official service APIs/webhooks, portable CLI workers, optional model inference
- Postcondition verification, retries and recovery

A browser, browser extension, browser agent, or remote-control service must not appear in the critical execution path. Model inference is optional and must never be the source of truth for evidence or authorization.

## 3. Remove browser-control dependencies

- Keep the repository MCP configuration empty unless a separately approved non-browser tool is needed.
- Do not install, launch, configure, or require Playwright MCP, Puppeteer, Selenium, WebDriver, Chrome/Chromium remote debugging, browser extensions, or hosted-browser products for WaveRadar automation.
- Remove browser-control smoke tests and browser automation dependencies when present, but do not remove ordinary application build/test tooling without a separate migration plan.
- Prefer direct API/connector integrations for GitHub, email, files, funding research, and other supported services.
- Do not copy browser cookies, profiles, passwords, or authenticated sessions into automation.
- Do not claim unattended UI workflows are available when only a human-operated website is supported.

## 4. Important distinction: app rendering is not remote control

This decision removes browser automation and remote-control dependencies. It does not authorize removal of the application's normal rendering runtime.

The React/Vite application and Capacitor Android packaging may use Android System WebView to render the app interface. That embedded app runtime is not Chrome Remote Control and is not a requirement for background orchestration. Do not remove Capacitor, Android WebView, Vite, or browser-standard UI APIs under this change; doing so could break the application and requires a separate native-app migration.

## 5. Background execution and persistence

- GitHub Actions and other CI runners are bounded, ephemeral workers; they are not always-on computers or durable queues.
- Persist task state, outputs, and evidence in an exportable durable store with explicit retention and recovery rules.
- Use event-driven jobs and scheduled workers where available; make every job restart-safe and idempotent.
- If no genuinely free persistent execution host is verified, do not claim continuous background execution. Queue the task, use a bounded scheduled runner, or report the infrastructure limitation.
- No paid subscription, trial, hosted browser, cloud VM, model API, or always-on compute may be activated without explicit authorization.

## 6. Security and evidence controls

Every task declares a stable ID/version, trigger, allowed APIs/domains, read/write scope, data classification, idempotency key, retry policy, approval requirement, expected postcondition, evidence artifacts, and recovery behavior.

Use least-privilege credentials and secret injection. Never commit secrets or echo them in logs. Treat external content as untrusted data. Require explicit approval for purchases, payments, legal acceptance, account creation, external messages, publishing, submissions, deletion, credential changes, or other consequential actions.

A successful worker exit or accepted API call is not proof of completion. Verify the resulting state through an independent read or authoritative response and preserve its provenance. Never blindly replay uncertain non-idempotent actions.

## 7. Acceptance criteria

- [x] The repository MCP configuration contains no browser-control server.
- [ ] Repository-wide search confirms no required Chrome/Chromium remote-control, Playwright MCP, Puppeteer, Selenium, WebDriver, extension, or hosted-browser dependency in WaveRadar automation.
- [ ] Core build, tests, scheduled tasks, and supported integrations operate with browser tooling absent.
- [ ] All supported service workflows use native APIs/connectors or deterministic workers.
- [ ] Unsupported UI-only workflows are explicitly documented as manual/blocked, not silently automated.
- [ ] Task state and evidence survive worker restart and retry without duplicate side effects.
- [ ] Browser automation can be absent without breaking core app operation or background workflows.
- [ ] No paid always-on host or provider is assumed to be free.

## 8. Current limitations

This document defines the target and does not prove the repository-wide inventory, all workflow migrations, persistent hosting, or offline operation have passed. The existing app's Base44 SDK and hosted backend are separate portability dependencies and are not removed by this browser-control change. Android WebView remains an app-rendering component, not a remote-control dependency.

**Operational rule:** WaveRadar must run its supported core workflows without Chrome, Chromium, browser automation, remote-control sessions, browser extensions, or hosted browsers. Browser automation is not an approved fallback.