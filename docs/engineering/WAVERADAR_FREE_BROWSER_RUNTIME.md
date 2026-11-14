# WaveRadar OS — Browser Automation Independence

**Decision status:** Browser automation is not a required component of WaveRadar OS. The repository does not configure or launch a Chrome/Chromium remote-control service, browser extension, Playwright MCP server, or hosted browser provider.

## Architecture decision

WaveRadar work must not depend on Super Chrome access, a Chrome extension, Playwright MCP, Puppeteer, WebDriver, or a persistent remote browser.

Use this order for integrations and automation:

1. Native application capabilities and documented platform APIs.
2. Existing first-party or connected service APIs and connectors.
3. Portable command-line or local service interfaces where appropriate.
4. Browser automation only as an explicitly optional, separately approved adapter for a workflow that has no supported API.

No browser automation adapter is enabled by default. No paid browser, model, proxy, hosted session, cloud VM, subscription, or trial may be activated without explicit authorization. Do not assume persistent compute is free or available.

## Important distinction: rendering is not remote control

The React/Vite application still renders through a web runtime. The Android build uses Capacitor and Android WebView to display the application UI. These are normal application-runtime components, not remote-control dependencies.

Do not remove Android WebView, Capacitor, the Vite build, or browser-standard APIs merely to remove Chrome remote control. Such changes could break the app and are outside this decision.

The Android runtime must continue to use local packaged web assets by default. A hosted URL configured through `WAVERADAR_HOSTED_URL` is an optional pilot/development mode that requires network access; it must not silently become a production or offline dependency.

## Verification requirements

For each future automation integration, record:

- Whether it is required for core app operation or merely optional tooling.
- The API/native alternative and why it is or is not sufficient.
- Runtime, network, account, compute, and cost requirements.
- Permission scope and credential handling.
- A reproducible test proving the workflow works without Chrome remote control.

A successful repository configuration change is not proof that the Android app is offline-capable, portable, or fully independent of hosted services. Verify those properties separately.

## Current known boundaries

- The app is a React/Vite application packaged for Android through Capacitor.
- Android WebView remains part of the Android UI runtime.
- Base44 SDK usage remains in the application for authentication, entities, and backend functions; replacing that dependency requires a separate backend-portability project and migration tests.
- The hosted pilot URL remains optional configuration, not proof of an offline runtime.
- Gamepad support through the browser Gamepad API is a local input capability; it is not Chrome remote control and should not be removed under this decision.
