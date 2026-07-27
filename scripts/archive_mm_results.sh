#!/usr/bin/env bash
# Compatibility shim → archive/archive_mm_results.sh. Prefer the categorized path.
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
exec bash "${SCRIPT_DIR}/archive/archive_mm_results.sh" "$@"
