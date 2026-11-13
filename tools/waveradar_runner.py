#!/usr/bin/env python3
"""Portable, no-third-party-dependency WaveRadar task runner.

Dry-run is the default. Use --execute to run only the reviewed task allowlist.
Results are written to a local, hash-chained JSONL ledger; raw project evidence
is never modified. This tool does not deploy, publish, install packages, or
access credentials.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

TASKS: dict[str, dict[str, Any]] = {
    "audit-data": {
        "script": "audit:data",
        "command": "node scripts/audit-data-contract.mjs && node scripts/test-data-contract.mjs",
        "timeout": 180,
    },
    "test-array-boundaries": {
        "script": "test:array-boundaries",
        "command": "node scripts/test-array-boundaries.mjs",
        "timeout": 120,
    },
    "test-validation-queue": {
        "script": "test:physical-validation-queue",
        "command": "node scripts/test-physical-validation-queue.mjs",
        "timeout": 120,
    },
    "test-validation-evidence": {
        "script": "test:physical-validation-evidence",
        "command": "node scripts/test-physical-validation-evidence.mjs",
        "timeout": 120,
    },
    "test-native-sensor-lifecycle": {
        "script": "test:native-sensor-lifecycle",
        "command": "node scripts/test-native-sensor-lifecycle.mjs",
        "timeout": 120,
    },
    "lint": {"script": "lint", "command": "eslint . --quiet", "timeout": 240},
    "build": {"script": "build", "command": "vite build", "timeout": 300},
}
ZERO_HASH = "0" * 64


def canonical_bytes(value: dict[str, Any]) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def verify_ledger(path: Path) -> str:
    if not path.exists():
        return ZERO_HASH
    previous = ZERO_HASH
    with path.open("r", encoding="utf-8") as stream:
        for line_no, line in enumerate(stream, 1):
            record = json.loads(line)
            supplied = record.pop("record_sha256", None)
            if record.get("previous_record_sha256") != previous:
                raise ValueError(f"Ledger chain mismatch at line {line_no}")
            calculated = hashlib.sha256(canonical_bytes(record)).hexdigest()
            if supplied != calculated:
                raise ValueError(f"Ledger hash mismatch at line {line_no}")
            previous = supplied
    return previous


def append_ledger(path: Path, record: dict[str, Any]) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = dict(record)
    payload["previous_record_sha256"] = verify_ledger(path)
    digest = hashlib.sha256(canonical_bytes(payload)).hexdigest()
    payload["record_sha256"] = digest
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    with os.fdopen(fd, "a", encoding="utf-8") as stream:
        stream.write(json.dumps(payload, sort_keys=True, ensure_ascii=False) + "\n")
        stream.flush()
        os.fsync(stream.fileno())
    return digest


def resolve_task(root: Path, task_id: str) -> tuple[list[str], int]:
    if task_id not in TASKS:
        raise ValueError(f"Task is not allowlisted: {task_id}")
    package = json.loads((root / "package.json").read_text(encoding="utf-8"))
    spec = TASKS[task_id]
    actual = package.get("scripts", {}).get(spec["script"])
    if actual != spec["command"]:
        raise ValueError(
            f"Refusing {task_id}: package.json script {spec['script']!r} "
            "does not match the reviewed command."
        )
    npm = shutil.which("npm")
    if not npm:
        raise RuntimeError("npm is not on PATH; use the documented Node.js toolchain.")
    return [npm, "run", spec["script"]], int(spec["timeout"])


def run_one(root: Path, task_id: str, execute: bool, ledger: Path) -> dict[str, Any]:
    command, timeout = resolve_task(root, task_id)
    base: dict[str, Any] = {
        "schema": "waveradar.runner-result.v1",
        "task_id": task_id,
        "repository_path": str(root),
        "command": command,
        "timeout_seconds": timeout,
        "mode": "execute" if execute else "dry-run",
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }
    if not execute:
        return base | {"status": "not_run"}
    started = time.monotonic()
    base["started_at"] = datetime.now(timezone.utc).isoformat()
    try:
        proc = subprocess.run(
            command, cwd=root, shell=False, capture_output=True, text=True,
            timeout=timeout, check=False,
        )
        stdout, stderr = proc.stdout or "", proc.stderr or ""
        code = proc.returncode
        status = "passed" if code == 0 else "failed"
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout.decode("utf-8", "replace") if isinstance(exc.stdout, bytes) else (exc.stdout or "")
        stderr = exc.stderr.decode("utf-8", "replace") if isinstance(exc.stderr, bytes) else (exc.stderr or "")
        code, status = 124, "timed_out"
    except OSError as exc:
        stdout, stderr = "", str(exc)
        code, status = 127, "runner_error"
    base.update({
        "status": status,
        "exit_code": code,
        "duration_seconds": round(time.monotonic() - started, 3),
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "stdout_sha256": hashlib.sha256(stdout.encode("utf-8")).hexdigest(),
        "stderr_sha256": hashlib.sha256(stderr.encode("utf-8")).hexdigest(),
        "stdout_tail": stdout[-4000:],
        "stderr_tail": stderr[-4000:],
    })
    base["ledger_record_sha256"] = append_ledger(ledger, base)
    return base


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="WaveRadar repository root")
    parser.add_argument("--task", choices=sorted(TASKS) + ["all"], default="all")
    parser.add_argument("--execute", action="store_true", help="Actually run tasks; otherwise only validate and print plan")
    parser.add_argument("--ledger", type=Path, default=Path(".waveradar-runner/results.jsonl"))
    args = parser.parse_args()

    root = args.repo.expanduser().resolve()
    if not (root / "package.json").is_file():
        parser.error(f"No package.json found at repository root: {root}")
    ledger = args.ledger.expanduser()
    if not ledger.is_absolute():
        ledger = root / ledger

    selected = list(TASKS) if args.task == "all" else [args.task]
    results = []
    for task_id in selected:
        try:
            result = run_one(root, task_id, args.execute, ledger)
        except Exception as exc:
            result = {"task_id": task_id, "status": "runner_error", "error": str(exc)}
        results.append(result)
        print(json.dumps(result, sort_keys=True))
        if args.execute and result.get("status") not in ("passed",):
            print("Stopping after first non-passing task.", file=sys.stderr)
            break
    return 0 if all(r.get("status") in ("passed", "not_run") for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
