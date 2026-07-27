#!/usr/bin/env bash
# Compatibility shim → train/run_mm_mix_2b.sh. Prefer the categorized path.
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
exec bash "${SCRIPT_DIR}/train/run_mm_mix_2b.sh" "$@"
