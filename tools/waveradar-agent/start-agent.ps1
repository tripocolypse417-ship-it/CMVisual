$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
python (Join-Path $PSScriptRoot "run_agent.py") --repo $RepoRoot --loop
