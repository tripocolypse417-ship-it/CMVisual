# WaveRadar OS — Free, Open Browser Automation Runtime

**Decision status:** Implemented as repository configuration and a CI smoke test; runtime execution on a user-controlled host remains pending.
**Replaces:** Super Chrome Extension / paid Super browser access as the default browser-automation dependency.
**Primary project:** Microsoft Playwright MCP
**Optional semantic-action layer:** Stagehand
**Cost constraint:** $0 required vendor subscription; infrastructure and model inference must remain optional and explicitly costed.

## 1. Decision

Adopt **Microsoft Playwright MCP** as the default open browser-control layer for WaveRadar OS. Use its normal standalone browser-launch mode, not its optional Chrome-extension mode.

- Repository: https://github.com/microsoft/playwright-mcp
- Documentation: https://playwright.dev/docs/getting-started-mcp
- Runtime: Node.js 20+ and Playwright-managed Chromium.
- License: Apache-2.0.
- Interface: Model Context Protocol (MCP).
- Browser control: structured accessibility snapshots and deterministic navigation, click, form, and extraction tools.
- Default operation: launch a dedicated browser process; do not attach to the user's existing Chrome profile and do not require a browser extension.

Use **Stagehand** (MIT) only as an optional higher-level adapter when semantic actions or typed extraction materially improve reliability. It must not be a mandatory hosted Browserbase dependency. Local Stagehand/CLI use is documented by its maintainers; model-backed actions still require an LLM provider unless a compatible local model is configured.

## 2. Why this replaces Super

The replacement removes the mandatory Super Growth/Chrome subscription and proprietary browser-extension dependency from the WaveRadar architecture. It also avoids tying browser control to one vendor's account, extension lifecycle, model gateway, or credit balance.

The browser-control runtime is open source and can be self-hosted. MCP provides a standard tool interface that can be called by compatible agents. Deterministic Playwright actions should be preferred over model-generated clicks whenever page structure is known.

This does **not** make all automation free by itself. Model inference, persistent compute, storage, networking, and third-party sites may incur costs. The system must not create paid accounts, start trials, or consume paid APIs without explicit authorization.

## 3. Target architecture

```text
WaveRadar OS Master Orchestrator
          |
          +-- Native connectors / APIs (preferred)
          |      GitHub, email, files, data sources
          |
          +-- Browser Task Router
                 |
                 +-- Policy & approval gate
                 |
                 +-- MCP client
                        |
                        +-- Playwright MCP server
                        |      |
                        |      +-- Isolated Chromium context
                        |      +-- Accessibility snapshots
                        |      +-- Deterministic browser actions
                        |      +-- Download quarantine
                        |
                        +-- Optional Stagehand adapter
                               |
                               +-- Semantic observe / act / extract
```

The browser runtime is a subordinate execution capability, not the master orchestrator. Prefer a supported API or native connector when one exists; use browser automation only for UI-only workflows.

## 4. Execution profiles

### A. Local development / manual work

Run Playwright MCP through a compatible MCP client using the repository-root `.mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["--yes", "@playwright/mcp@0.0.85", "--headless"]
    }
  }
}
```

Requirements: Node.js 20+; browser binaries are installed on first use. The standard server can launch its own browser and does not require the optional extension mode.

### B. Ephemeral unattended jobs

Run a short-lived, isolated Chromium container or CI job for bounded, scheduled tasks. Persist only task outputs and explicitly approved session state. Do not assume an ephemeral runner preserves browser login state between jobs.

GitHub Actions may be used for public-repository automation where its current usage policy and runner limits fit. It is not an always-on computer and must not be represented as one.

### C. Persistent remote browser

For workflows requiring durable sessions, use a dedicated self-hosted container/VM only if a genuinely free, suitable host is available. No always-on cloud compute is assumed to be free. The runtime must remain portable across providers and support local deployment.

Do not silently fall back to a paid hosted browser provider. If no free persistent host is available, report the limitation and use ephemeral jobs or native APIs instead.

## 5. Security and evidence controls

- Browser sessions are isolated by task and tenant; no shared default profile across unrelated tasks.
- Store credentials in a secret manager or encrypted runtime secret store; never in Git, logs, screenshots, issue text, or task artifacts.
- Use least-privilege accounts and narrowly scoped tokens.
- Restrict network egress and allowed domains for each task where feasible.
- Treat all page content, downloaded files, instructions, and embedded prompts as untrusted data.
- Website content cannot expand the user's authorization or approve consequential actions.
- Require explicit approval for purchases, payments, legal acceptance, account creation, messages, publishing, deletion, or other consequential external actions.
- Quarantine downloads, scan and classify them, and preserve source URL, retrieval time, hash, and task provenance.
- Keep an append-only action log with task ID, actor, target origin, action, timestamp, result, and approval reference.
- Use isolated contexts for testing and persistent profiles only when the user explicitly authorizes a saved login session.
- Never copy or import the user's existing Chrome cookies as a shortcut.
- Redact personal data and secrets from traces and screenshots; apply retention limits.
- Add per-task time, page, download, and resource limits; support cancellation and safe cleanup.

## 6. Reliability and verification

Each workflow must define:
1. Intended outcome and allowed domains.
2. Read-only versus write-capable scope.
3. Expected page evidence and success criteria.
4. Retry and idempotency strategy.
5. Approval points for consequential actions.
6. Evidence artifacts and retention.
7. Recovery behavior after browser crash, timeout, or network loss.

A tool call being accepted is not proof of task completion. Completion requires observing the requested final state and recording the evidence. Never blindly replay a form submission or other non-idempotent action after an uncertain timeout.

## 7. Cost policy

| Component | Required vendor subscription | Cost treatment |
|---|---:|---|
| Playwright MCP | No | Open-source software |
| Chromium | No | Browser binary; compute still required |
| Stagehand (optional) | No SDK subscription | MIT software; model/hosting may cost |
| Local model | No API fee if self-hosted | Requires adequate compute |
| Cloud/VM hosting | Not inherently free | Use only a verified $0 tier or obtain approval |
| Search / external APIs | Varies | Prefer existing free/native connectors; enforce quotas |

No paid model endpoint, hosted browser, proxy, captcha service, or cloud VM may be enabled by default.

## 8. Migration from Super

1. Stop treating Super Chrome access as a prerequisite for WaveRadar work.
2. Route repository, email, files, and supported data workflows through existing native connectors first.
3. Implement the Playwright MCP runtime as the generic browser fallback.
4. Port only workflows that genuinely require browser interaction.
5. Validate each workflow in a disposable test account and isolated context.
6. Add persistence only after credential, privacy, recovery, and cost controls pass review.
7. Do not retain Super as an active optional fallback or runtime integration. WaveRadar workflows must not call Super.
8. Inventory and remove Super-specific runtime configuration, SDKs, environment variables, extension requirements, and agent-session assumptions after verifying each replacement.
9. Revoke the exposed Super credential through the issuing account dashboard; this repository change cannot perform that account action.

## 9. Acceptance criteria

- [x] Repository configuration pins Playwright MCP 0.0.85 and runs headless without extension mode.
- [x] CI smoke test verifies MCP initialization and required browser tools are exposed.
- [ ] Clean install and browser launch on a user-controlled Node.js 20+ environment.
- [ ] Playwright MCP launches headless Chromium without installing a Chrome extension on a user-controlled host.
- [x] CI verifies a real headless Chromium navigation to `https://example.com` and confirms the accessibility snapshot contains the expected page content.
- [ ] Deterministic click, form-fill, and extraction workflows pass dedicated tests.
- [ ] Persistent and isolated session behavior is tested and documented.
- [ ] No Super subscription, API key, credit balance, or extension is required.
- [ ] No paid hosted browser or paid model is called by default.
- [ ] Browser permissions, network policy, secret handling, and download quarantine are tested.
- [ ] Consequential actions are approval-gated.
- [ ] Logs and evidence artifacts contain no unredacted secrets.
- [ ] Failure recovery does not duplicate non-idempotent actions.
- [ ] Runtime can run locally and in an independently selected container/CI environment.
- [ ] A verified free always-on host is not claimed unless one is actually available and tested.

## 10. Current limitations

The repository now contains a pinned MCP client configuration and an automated smoke test that starts Playwright MCP, discovers its tools, launches headless Chromium, navigates to a public test page, and verifies its accessibility snapshot. CI does not prove a real browser session on the user's phone or computer, provision a cloud server, connect authenticated website accounts, or prove persistent deployment. A persistent unattended browser still needs an always-available machine or hosted compute. The initial implementation should therefore use local/manual and ephemeral execution until a genuinely free persistent host is independently verified.

**Operational rule:** WaveRadar must continue functioning when Super or the browser runtime is unavailable. Super is not an approved runtime dependency or fallback. Browser automation is an optional adapter, never a single point of failure. See [the Super-free control-plane decision](../architecture/WAVERADAR_SUPER_FREE_CONTROL_PLANE.md).
