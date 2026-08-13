#!/usr/bin/env bash
# M1: 100% 图文（Geo3K only）| 数据混合消融的极端组
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# Resolve workspace root without hardcoding user paths.
if [[ -z "${WORKSPACE_ROOT:-}" ]]; then
  if [[ -f "${SCRIPT_DIR}/../../../scripts/workspace_root.sh" ]]; then
    # polaris/vlm_exp/scripts/<...>/
    source "${SCRIPT_DIR}/../../../scripts/workspace_root.sh"
  elif [[ -f "${SCRIPT_DIR}/../../../../polaris/scripts/workspace_root.sh" ]]; then
    # sibling vlm_exp/scripts/<...>/
    source "${SCRIPT_DIR}/../../../../polaris/scripts/workspace_root.sh"
  else
    _pkg=$(cd "${SCRIPT_DIR}/../.." && pwd)
    WORKSPACE_ROOT=$(cd "${_pkg}/.." && pwd)
    # nested polaris/vlm_exp → go up one more if needed
    if [[ "$(basename "${_pkg}")" == "vlm_exp" && "$(basename "$(dirname "${_pkg}")")" == "polaris" ]]; then
      WORKSPACE_ROOT=$(cd "${_pkg}/../.." && pwd)
    fi
    export WORKSPACE_ROOT
    unset _pkg
  fi
fi
POLARIS=${POLARIS:-${WORKSPACE_ROOT}/polaris}
VLM_EXP=${VLM_EXP:-${WORKSPACE_ROOT}/vlm_exp}
VERL_DIR=${VERL_DIR:-${WORKSPACE_ROOT}/verl-main}

export EXP=m1_geo3k100_2b
export TRAIN_FILES="[${VLM_EXP}/parquet/mm/geo3k_raw/train.parquet]"
export VAL_FILES="[${POLARIS}/evaluation/benchmarks/aime24.parquet,${VLM_EXP}/parquet/mm/geo3k_val_probe_100.parquet]"
export TOTAL_EPOCHS=10   # 2101 行/batch32≈66 step/epoch，需要多轮才能凑够 150 step

exec bash "${SCRIPT_DIR}/run_mm_mix_2b.sh" "$@"
