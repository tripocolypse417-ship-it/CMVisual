# Architecture Decision — Browserless WaveRadar Execution

**Status:** Superseding decision for browser automation.
**Applies to:** WaveRadar Core, WIS, Research & Validation Lab, engineering automation and scheduled program workflows.

## Decision

WaveRadar must not depend on Chrome, Chromium, Playwright, Puppeteer, Selenium, WebDriver, browser extensions, browser remote debugging, browser agents, or hosted browsers. Browser automation is not an approved fallback. This decision supersedes any earlier architecture text that names Playwright MCP or a managed browser as the default or required execution adapter.

## Required replacement

Use native operating-system and device APIs, official service APIs, webhooks, authorized connectors, portable CLI workers, and bounded event/scheduled jobs. Keep durable task state, evidence, policy, approvals, retries, idempotency and postcondition verification in a WaveRadar-owned control plane. Where no machine interface exists, mark the task as manual or blocked; do not silently introduce browser automation.

GitHub Actions may run bounded, ephemeral jobs. It is not an always-on agent, persistent computer, or durable queue. No free persistent host is assumed until its availability, limits, recovery behavior and cost are verified. Do not purchase or subscribe without explicit founder approval.

## App runtime distinction

Android System WebView inside the Capacitor application is an app-rendering runtime, not Chrome Remote Control. React/Vite and Capacitor must not be removed under this decision. Replacing the app-rendering stack is a separate native-app migration with its own compatibility and acceptance tests.

## Acceptance tests

1. Search all repositories and workflows for browser-control dependencies and classify every match as app rendering, test tooling, optional UI, or prohibited automation.
2. Remove prohibited automation configuration and tests; ensure the MCP configuration contains no browser server.
3. Run supported core builds and tests with browser automation packages and services absent.
4. Verify supported GitHub, email, files, research and evidence workflows through native APIs/connectors.
5. Verify task state and evidence survive worker restart and retries without duplicate side effects.
6. Document all UI-only workflows as manual/blocked until a supported API or native interface exists.
7. Confirm no paid browser, hosted browser, cloud VM, or always-on service is started.

## Current status

The repository MCP configuration is empty and the browser-runtime policy has been rewritten to prohibit browser automation. Repository-wide dependency inventory, workflow migration, clean-room browser-absent testing, and durable background execution remain unverified. Existing Base44 hosted backend dependencies are separate and remain a portability workstream.

**No claim is made that all WaveRadar background workflows are already migrated or that continuous free execution is currently available.**