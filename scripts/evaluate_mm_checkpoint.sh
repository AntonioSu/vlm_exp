#!/usr/bin/env bash
# Compatibility shim → eval/evaluate_mm_checkpoint.sh. Prefer the categorized path.
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
exec bash "${SCRIPT_DIR}/eval/evaluate_mm_checkpoint.sh" "$@"
