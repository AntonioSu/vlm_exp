#!/usr/bin/env bash
# Compatibility shim → eval/run_m0_baseline_supervisor.sh. Prefer the categorized path.
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
exec bash "${SCRIPT_DIR}/eval/run_m0_baseline_supervisor.sh" "$@"
