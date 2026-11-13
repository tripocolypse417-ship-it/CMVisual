# WaveRadar OS — Super-Free Operational Architecture

**Decision:** SuperPowers/Super is not a required runtime, orchestration, browser, model, credential, or credit dependency for WaveRadar OS.
**Scope:** WaveRadar product/runtime, engineering automation, research workflows, and validation operations.
**Status:** Architecture decision and migration controls documented; full runtime migration remains subject to the acceptance tests below.
**Cost rule:** No paid subscription, hosted browser, model API, or always-on compute is enabled by default.

## 1. Non-negotiable independence requirements

WaveRadar must continue to build, test, collect permitted evidence, operate its research workflows, and provide its core user-facing functions when:
- Super is unavailable, disconnected, rate-limited, or has zero credits;
- any single LLM/model provider is unavailable;
- a browser automation runtime is unavailable;
- an optional cloud host is unavailable.

No production path may require a Super account, Super API key, Super browser extension, Super credit balance, Super agent session, or Super-hosted project.

Do not use Super as a hidden fallback. A fallback must be an explicitly configured independent provider or a deterministic local/native path.

## 2. Target WaveRadar-owned control plane

```text
WaveRadar OS Control Plane (repository-owned contracts)
  |
  +-- Task registry / durable task state
  +-- Policy engine / approval gates
  +-- Evidence and append-only audit ledger
  +-- Scheduler adapters
  |     +-- GitHub Actions (bounded, ephemeral scheduled jobs)
  |     +-- Local scheduler / user-controlled host (optional)
  |     +-- Other portable scheduler adapters (optional)
  |
  +-- Execution adapters
  |     +-- Native APIs and existing authorized connectors (preferred)
  |     +-- Playwright MCP (UI-only browser tasks)
  |     +-- Local scripts / deterministic workers
  |     +-- Optional independent model providers
  |
  +-- Output verification / idempotency / recovery
```

The control plane owns task definitions, state transitions, policy, provenance, retries, and completion checks. Execution adapters are replaceable workers, not the system of record.

## 3. Replacement matrix

| Former Super-dependent capability | WaveRadar replacement | Boundary |
|---|---|---|
| Browser automation | Microsoft Playwright MCP, already configured in `.mcp.json` | UI-only fallback; native APIs first |
| Browser session / extension | Isolated Playwright-managed Chromium context | No Chrome profile or cookie import |
| Agent task orchestration | Repository-owned task contracts plus bounded workers | Do not assume GitHub Actions is always-on |
| Scheduled repository checks | GitHub Actions scheduled workflows | Ephemeral; persist task state externally or in repository artifacts as appropriate |
| Model access | Provider-neutral model adapter with local/deterministic fallback | No model provider is mandatory for core data integrity |
| Project/task records | Git repository, issues/PRs, structured evidence records | GitHub is a replaceable implementation; exportable records |
| Browser execution host | Local user-controlled Node.js host or approved ephemeral CI runner | No claim of free persistent hosting |
| Credentials | Least-privilege secrets store / runtime secret injection | Never commit secrets or echo them in logs |

## 4. Provider-neutral model gateway

Model inference is an optional capability, not the orchestrator's authority source.

Required interface concepts:
- `ModelProvider`: provider identity, endpoint configuration, supported model capabilities, cost metadata, health state.
- `generate`: bounded request with explicit model, budget, timeout, and data-classification policy.
- `healthCheck`: availability only; never interpreted as correctness.
- `fallbackPolicy`: explicit ordered providers or deterministic no-model behavior.
- `usageLedger`: request, token/compute estimate, provider, task, and cost; do not log secrets or sensitive prompt content.

Rules:
1. No hard-coded Super endpoint, key name, account ID, or SDK in core business logic.
2. No provider silently receives restricted evidence or personal/medical data.
3. If all model providers fail, preserve evidence and task state; do not fabricate outputs.
4. A second model is not independent ground truth. Safety/medical claims require external reference standards and qualified independent review.
5. Provider failover must obey the same privacy, data residency, and cost policy as the primary route.

## 5. Automation execution contract

Every task must declare:
- stable task ID and version;
- trigger/schedule and maximum runtime;
- read/write scope and allowed domains;
- idempotency key and retry policy;
- approval requirement;
- inputs and data classification;
- expected postcondition;
- evidence artifacts, hashes, and retention;
- cancellation and recovery behavior.

A successful process exit or accepted tool call is not proof of completion. Verify the resulting external state. Never replay uncertain non-idempotent actions such as payment, message send, submission, deletion, or legal acceptance.

GitHub Actions may execute bounded tasks but is not a persistent agent, durable queue, or always-on computer. For tasks requiring continuous operation, use a user-controlled host or independently verified host with a documented cost and recovery plan. If none is available, report that limitation and keep the task queued; do not silently subscribe to a service.

## 6. Security response for the previously exposed Super key

The Super key previously pasted into chat must be considered compromised:
- revoke it in the issuing provider's dashboard;
- do not copy it into GitHub Actions, repository files, issues, logs, or a replacement integration;
- if it was reused elsewhere, rotate those credentials independently;
- retain no copy of the exposed value in project documentation or task records.

This architecture migration does not itself revoke the key or delete the Super account. Those are separate account-owner security actions requiring authenticated dashboard access. WaveRadar must not use the exposed key.

## 7. Migration sequence

1. Keep the merged Playwright MCP replacement as the browser baseline.
2. Remove Super from all runtime and automation configuration; retain no active Super fallback.
3. Inventory workflow definitions, environment variables, secrets references, agent project IDs, and deployment settings for Super references.
4. Port each required workflow to a native API/connector or a bounded portable worker.
5. Move task state and evidence into exportable, append-only WaveRadar-owned records.
6. Add deterministic retries, idempotency, approval gates, and postcondition verification.
7. Run a Super-off test: revoke network access to Super endpoints and remove Super credentials from the test environment; all core tests must still pass.
8. Remove unused Super-specific configuration and revoke exposed credentials through the provider dashboard.
9. Keep a documented rollback to the last Super-free release; rollback must not reintroduce a Super requirement.

## 8. Acceptance criteria

- [x] Playwright MCP is configured as the open browser automation runtime.
- [x] Playwright MCP CI smoke test passed on the merged replacement change.
- [ ] Repository-wide inventory confirms no Super SDK, endpoint, environment variable, extension, or account is required by runtime.
- [ ] Scheduled and event-triggered tasks execute without Super credentials or credits.
- [ ] Core application build and test suites pass with Super credentials absent.
- [ ] Super-off network test passes for core workflows.
- [ ] Task state, logs, and evidence remain recoverable after worker restart.
- [ ] Model gateway has at least one independently configured route or deterministic no-model path; no provider is mandatory for core operations.
- [ ] Browser automation can be disabled without breaking native API workflows.
- [ ] No paid subscription, cloud host, model endpoint, or trial is started by default.
- [ ] Exposed Super credential is revoked by the account owner and no longer used.

## 9. Current verified status and honest limitations

The repository's merged browser-runtime change (#75) replaces the paid Super Chrome/browser dependency with Playwright MCP. Its CI reported successful code-quality, Android APK, runtime-safety, and Playwright MCP smoke-test workflows.

That evidence does not prove complete Super independence. The repository has not yet passed a full Super-reference inventory, a Super-off integration test, or a clean-room test of all scheduled automation and agent workflows. This ADR defines the migration and acceptance bar; it does not claim those unfinished tests have passed.

**Operating rule:** Super is not an approved runtime dependency or fallback for WaveRadar. Continue only through the independent paths above.
