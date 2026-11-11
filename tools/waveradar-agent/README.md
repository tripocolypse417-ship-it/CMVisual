# WaveRadar Local Agent

A zero-subscription, computer-hosted coordinator for the CMVisual repository. It uses the locally installed Codex CLI for bounded engineering work and Git for an isolated persistent worktree. It does not require a hosted agent service, API key, database, or new paid subscription.

## What it does

- Runs on the owner's computer, on demand or in a daily loop.
- Uses a dedicated local worktree and branch: agent/waveradar-local.
- Preserves the user's normal checkout and its uncommitted changes.
- Keeps work-in-progress in the isolated worktree between runs.
- Runs Codex CLI with workspace-only writes, no approval bypass, and network disabled.
- Writes timestamped logs and a Markdown report under ~/.waveradar-agent/.
- Does not commit, push, open PRs, merge, deploy, send messages, submit applications, or spend money.

The agent is a local assistant, not a life-safety control system. Its outputs require engineering review. It must never turn simulations, inferred values, or unverified sensor observations into validation evidence.

## Requirements

- Git
- Python 3.10+
- Codex CLI installed and authenticated with an account that has access to run it
- A local clone of https://github.com/tripocolypse417-ship-it/CMVisual.git

No API key is requested or stored by this runner. Codex availability and usage limits depend on the signed-in account; this repository tool does not promise unlimited free model usage.

## First run

From the repository root:

Windows PowerShell (run once):
    python .\tools\waveradar-agent\run_agent.py --once

macOS / Linux (run once):
    python3 tools/waveradar-agent/run_agent.py --once

The first run fetches the latest origin/main, creates a separate worktree and local branch, then starts one bounded Codex run. It does not alter the current checkout.

## Keep it running daily

Windows PowerShell:
    powershell -ExecutionPolicy Bypass -File .\tools\waveradar-agent\start-agent.ps1

macOS / Linux:
    chmod +x tools/waveradar-agent/start-agent.sh
    ./tools/waveradar-agent/start-agent.sh

The loop runs once immediately, then waits 24 hours between runs. Keep the computer powered on and awake. Closing the terminal stops it. For unattended operation after reboot, the owner can register the launcher with Windows Task Scheduler, launchd, or cron; do not enable that until the first manual run is verified.

## Safety and state

- Main checkout is never used as the agent's write directory.
- Agent work persists in ~/.waveradar-agent/worktrees/CMVisual.
- The agent branch is local only. Review changes in that worktree before manually creating a PR.
- The runner refuses to overwrite a non-empty unrecognized worktree path.
- Codex receives no network access in its sandbox. Git fetch is performed by the runner before the agent starts.
- The unattended run uses workspace-write plus no approval prompts, but network access is disabled. This is appropriate only for the bounded local tasks in AGENT_INSTRUCTIONS.md; do not broaden it to full machine access.
- Do not put passwords, tokens, keystores, private keys, personal records, or raw sensitive incident data in the worktree or prompts.
- Preserve every existing validation capture. Never delete or rewrite original evidence.
- Stop the loop with Ctrl+C.

## Troubleshooting

- If codex is not found, install Codex CLI using the official OpenAI instructions and authenticate it interactively.
- If authentication or account access fails, the runner records the error and stops that run; it does not attempt a paid upgrade.
- If Git cannot fetch, check the local clone's GitHub authentication and network connection.
- If the worktree has changes, the next run continues from those changes. It does not reset or rebase the agent branch automatically.
- To inspect status: git -C ~/.waveradar-agent/worktrees/CMVisual status --short --branch.
- To stop and preserve work, use Ctrl+C. Do not delete the worktree to clear an error.

## Official references

- Codex CLI non-interactive mode: https://learn.chatgpt.com/docs/non-interactive-mode
- Codex agent approvals and sandboxing: https://learn.chatgpt.com/docs/agent-approvals-security
