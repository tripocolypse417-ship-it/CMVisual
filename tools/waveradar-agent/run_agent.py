#!/usr/bin/env python3
"""Run a bounded Codex engineering pass in a persistent, isolated worktree."""

from __future__ import annotations

import argparse
import datetime as dt
import shutil
import subprocess
import sys
import time
from pathlib import Path

REPO_SLUG = "tripocolypse417-ship-it/CMVisual"
AGENT_BRANCH = "agent/waveradar-local"
INTERVAL_SECONDS = 24 * 60 * 60


def run(command: list[str], *, cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if check and result.returncode != 0:
        raise RuntimeError(
            f"Command failed ({result.returncode}): {' '.join(command)}\n{result.stdout[-8000:]}"
        )
    return result


def git(repo: Path, *args: str, check: bool = True) -> str:
    return run(["git", *args], cwd=repo, check=check).stdout.strip()


def timestamp() -> str:
    return dt.datetime.now().astimezone().strftime("%Y%m%d-%H%M%S-%z")


def prepare_worktree(repo: Path, worktree: Path) -> None:
    if not (repo / ".git").exists():
        raise RuntimeError(f"Not a Git checkout: {repo}")

    origin = git(repo, "remote", "get-url", "origin")
    normalized = origin.removesuffix(".git").lower()
    if not normalized.endswith(REPO_SLUG.lower()):
        raise RuntimeError(f"Unexpected origin remote: {origin}; expected repository {REPO_SLUG}")

    # Fetch is performed by this supervisor, outside the Codex sandbox.
    git(repo, "fetch", "--prune", "origin", "main")

    if worktree.exists():
        marker = worktree / ".git"
        if not marker.exists():
            raise RuntimeError(
                f"Refusing to use existing unrecognized path: {worktree}. "
                "Move it manually only after confirming it contains no user data."
            )
        registered = git(repo, "worktree", "list", "--porcelain")
        if str(worktree.resolve()) not in registered:
            raise RuntimeError(f"Path exists but is not a registered Git worktree: {worktree}")
        return

    worktree.parent.mkdir(parents=True, exist_ok=True)
    branches = git(repo, "branch", "--list", AGENT_BRANCH)
    if branches:
        git(repo, "worktree", "add", str(worktree), AGENT_BRANCH)
    else:
        git(repo, "worktree", "add", "-b", AGENT_BRANCH, str(worktree), "origin/main")


def execute_once(repo: Path, state: Path) -> int:
    worktree = state / "worktrees" / "CMVisual"
    reports = state / "reports"
    logs = state / "logs"
    reports.mkdir(parents=True, exist_ok=True)
    logs.mkdir(parents=True, exist_ok=True)

    if shutil.which("git") is None:
        raise RuntimeError("Git is not installed or not on PATH.")
    if shutil.which("codex") is None:
        raise RuntimeError(
            "Codex CLI is not installed or not on PATH. Install it and authenticate it interactively; "
            "this runner will not request a paid upgrade or store credentials."
        )

    prepare_worktree(repo, worktree)
    stamp = timestamp()
    log_path = logs / f"codex-{stamp}.jsonl"
    report_path = reports / f"engineering-{stamp}.md"
    instruction_path = repo / "tools" / "waveradar-agent" / "AGENT_INSTRUCTIONS.md"
    if not instruction_path.is_file():
        raise RuntimeError(f"Missing operating contract: {instruction_path}")

    prompt = f"""Read and follow this operating contract: {instruction_path}

You are operating in the isolated repository worktree at {worktree}.
The report destination is {report_path}.
Continue any existing local work on branch {AGENT_BRANCH}; do not reset, rebase, commit, or push.
Inspect repository instructions and status first. Select one bounded, high-value task using the priority order.
Write a complete report to the exact report destination, including exact test commands and exit codes.
Do not use network access or read secrets. Do not attempt any external action.
If no safe implementation is possible, perform a read-only audit and write a blocker report.
"""

    command = [
        "codex", "exec",
        "--sandbox", "workspace-write",
        "--ask-for-approval", "never",
        "--add-dir", str(state),
        "-c", "sandbox_workspace_write.network_access=false",
        "--json",
        prompt,
    ]
    start = time.monotonic()
    result = subprocess.run(
        command,
        cwd=str(worktree),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    log_path.write_text(result.stdout, encoding="utf-8")
    duration = round(time.monotonic() - start, 1)

    status = git(worktree, "status", "--short", "--branch", check=False)
    diff_stat = git(worktree, "diff", "--stat", check=False)
    if not report_path.exists():
        report_path.write_text(
            "# WaveRadar Agent Run\n\n"
            f"- Timestamp: {stamp}\n- Codex exit code: {result.returncode}\n"
            f"- Duration: {duration}s\n- Branch: {AGENT_BRANCH}\n\n"
            "No report file was produced by Codex. Inspect the JSONL log before continuing.\n",
            encoding="utf-8",
        )

    summary_path = reports / "LATEST.md"
    summary_path.write_text(
        "# Latest WaveRadar Local Agent Run\n\n"
        f"- Timestamp: {stamp}\n- Codex exit code: {result.returncode}\n"
        f"- Duration: {duration}s\n- Worktree: {worktree}\n"
        f"- Detailed report: {report_path}\n- JSONL log: {log_path}\n\n"
        "## Git status\n\n    " + status.replace("\n", "\n    ") +
        "\n\n## Tracked diff summary\n\n    " + diff_stat.replace("\n", "\n    ") + "\n",
        encoding="utf-8",
    )
    print(summary_path.read_text(encoding="utf-8"))
    return result.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the local WaveRadar engineering agent.")
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--state-dir", type=Path, default=Path.home() / ".waveradar-agent")
    parser.add_argument("--once", action="store_true", help="Run one pass and exit (default).")
    parser.add_argument("--loop", action="store_true", help="Run immediately, then every 24 hours.")
    args = parser.parse_args()

    repo = args.repo.expanduser().resolve()
    state = args.state_dir.expanduser().resolve()
    if args.loop:
        print(f"WaveRadar agent loop active. State: {state}. Stop with Ctrl+C.")
        while True:
            try:
                execute_once(repo, state)
            except Exception as exc:
                state.mkdir(parents=True, exist_ok=True)
                failure = state / "reports" / f"failure-{timestamp()}.txt"
                failure.parent.mkdir(parents=True, exist_ok=True)
                failure.write_text(str(exc) + "\n", encoding="utf-8")
                print(f"Agent run failed; see {failure}: {exc}", file=sys.stderr)
            time.sleep(INTERVAL_SECONDS)
    else:
        try:
            return execute_once(repo, state)
        except Exception as exc:
            print(f"WaveRadar agent could not start: {exc}", file=sys.stderr)
            return 2


if __name__ == "__main__":
    raise SystemExit(main())
