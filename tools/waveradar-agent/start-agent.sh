#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
python3 "$REPO_ROOT/tools/waveradar-agent/run_agent.py" --repo "$REPO_ROOT" --loop
