# WaveRadar OS — Provider-Independent, Browserless Operational Architecture

**Decision:** WaveRadar has no required Super, Chrome/Chromium, browser automation, model-provider, or paid-credit dependency.
**Scope:** WaveRadar product/runtime, engineering automation, research workflows, and validation operations.
**Status:** Architecture and browserless configuration updated; complete workflow migration and runtime acceptance testing remain open.
**Cost rule:** No paid subscription, hosted browser, model API, cloud VM, or always-on compute is enabled by default.

## 1. Non-negotiable independence requirements

WaveRadar must continue supported core operation when any one vendor, model provider, browser runtime, or optional cloud host is unavailable. No production path may require a Super account, key, credit balance, agent session, browser extension, Chrome/Chromium remote-control service, Playwright, Puppeteer, Selenium, WebDriver, browser agent, or hosted browser.

Browser automation is not an approved fallback. If a workflow has no native API, official service API, webhook, authorized connector, or portable CLI path, mark it manual or blocked. Do not silently substitute UI automation.

## 2. WaveRadar-owned control plane

The control plane owns durable task definitions, state transitions, policy, approvals, provenance, retries, idempotency, and completion checks. Workers are replaceable executors, never the system of record.

Components:
- Task registry and durable task state.
- Policy engine and approval gates.
- Append-only evidence and audit ledger.
- Scheduler adapters for bounded GitHub Actions and other independently selected schedulers.
- Execution adapters for native device/OS APIs, official service APIs, webhooks, authorized connectors, portable CLI workers, and optional model inference.
- Output verification, idempotency, recovery, and export.

GitHub Actions may execute bounded jobs but is not a persistent agent, durable queue, or always-on computer. Do not claim continuous background execution or a free persistent host unless independently verified.

## 3. Replacement matrix

| Capability | Required implementation | Boundary |
|---|---|---|
| Service integration | Official APIs, webhooks, authorized connectors | Native/API first; no browser fallback |
| Device integration | Android/iOS/desktop native APIs | Hardware and permissions remain explicit |
| Scheduled tasks | Bounded scheduler/CI adapters | Ephemeral unless durable host is verified |
| Agent orchestration | Repository-owned task contracts and deterministic workers | No Super agent-session dependency |
| Model inference | Provider-neutral optional adapter or deterministic no-model path | No model is authority or ground truth |
| Project/evidence records | Exportable versioned records and append-only ledger | GitHub is an implementation, not the only possible store |
| Browser UI | Human-operated only when no machine interface exists | Manual/blocked; no automation dependency |

## 4. Provider-neutral model gateway

Model inference is optional and is not the orchestrator's authority source. Any model request must declare provider, model, data classification, budget, timeout, and task ID. Failures preserve evidence and task state; they must not fabricate outputs. A second model is not independent ground truth. Provider failover must obey the same privacy, residency, and cost policy.

## 5. Automation execution contract

Every task declares a stable ID/version, trigger/schedule, maximum runtime, read/write scope, allowed APIs, idempotency key, retry policy, approval requirement, inputs/data classification, expected postcondition, evidence artifacts/hashes/retention, cancellation, and recovery behavior.

A successful process exit or accepted API call is not proof of completion. Verify the resulting external state. Never replay uncertain non-idempotent actions such as payments, messages, submissions, deletion, or legal acceptance.

## 6. Security response for exposed credentials

Any Super key previously pasted into chat must be considered compromised. Do not copy it into repository files, workflows, issues, logs, or replacement integrations. Revoke it through the issuing provider's authenticated dashboard and independently rotate any reused credential. Repository changes cannot revoke provider-side keys or delete provider accounts.

## 7. Migration sequence

1. Remove Super and all browser-control runtimes from active WaveRadar configuration.
2. Keep the repository MCP configuration free of browser-control servers.
3. Inventory workflows, dependencies, environment variables, secrets references, and scripts for prohibited browser-control requirements.
4. Port supported workflows to native APIs, official service APIs, webhooks, authorized connectors, or portable CLI workers.
5. Mark UI-only workflows manual/blocked until a supported machine interface exists.
6. Move task state and evidence into exportable, append-only records with recovery semantics.
7. Add deterministic retries, idempotency, approval gates, and postcondition verification.
8. Test supported core workflows with browser automation and Super credentials absent.
9. Do not merge, deploy, rotate credentials, or perform irreversible account actions without the required authorization.

## 8. App-rendering distinction

Android System WebView inside the Capacitor application is an embedded UI-rendering runtime, not Chrome Remote Control. Do not remove React/Vite, Capacitor, Android WebView, or browser-standard UI APIs under this decision. Replacing the app-rendering stack is a separate native-app migration requiring compatibility and acceptance tests.

## 9. Acceptance criteria

- [x] Repository MCP configuration contains no browser-control server on this branch.
- [x] Browser-runtime policy prohibits browser automation as a required dependency or fallback.
- [x] A superseding browserless architecture decision is recorded.
- [x] Package dependencies/scripts, MCP servers, and GitHub Actions workflow files are covered by `npm run test:browserless`; current workflow files and manifests were statically inspected.
- [ ] Browserless regression test passes in an isolated Node 22 fixture; GitHub Actions execution on this branch and a clean full application build/test run remain outstanding.
- [ ] Supported service workflows use native APIs/connectors or deterministic workers.
- [ ] Task state, logs, and evidence survive worker restart and retry without duplicate side effects.
- [ ] UI-only workflows are documented as manual/blocked rather than browser-automated.
- [ ] No paid subscription, hosted browser, cloud host, model endpoint, or trial is started by default.

## 10. Honest current status

The browser-control MCP configuration is empty on this branch. The Playwright MCP workflow and launcher script have been deleted, the package script was removed, and `npm run test:browserless` now checks package dependencies/scripts, MCP servers, and GitHub Actions workflow files. Static inspection found no prohibited browser-control reference in the current package manifest, MCP config, or four active workflow files. The test passed in an isolated Node 22 fixture, but has not yet run in this branch's GitHub Actions. Full source-code inventory, migration of every UI-only workflow, a clean full application build/test, durable background execution, and Base44 backend portability remain unverified.

**Operating rule:** WaveRadar's supported core workflows must not depend on Chrome, Chromium, browser automation, remote-control sessions, browser extensions, Super, or hosted browsers.