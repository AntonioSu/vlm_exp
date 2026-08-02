#!/usr/bin/env bash
# Wait for optional training PID / free GPU, then fill missing formal M1
# offline evals (Geo3K + text) for available every-10 checkpoints.
#
# Usage:
#   WAIT_PID=<train_pid> bash scripts/eval/supplement_m1_eval.sh
#   ONLY_STEPS="50 100 150" CUDA_VISIBLE_DEVICES=0 bash scripts/eval/supplement_m1_eval.sh
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

WAIT_PID=${WAIT_PID:-}
ONLY_STEPS=${ONLY_STEPS:-"10 20 30 40 50 60 70 80 90 100 110 120 130 140 150"}
CUDA_VISIBLE_DEVICES=${CUDA_VISIBLE_DEVICES:-0}
MAX_SELECTED_GPU_USED_MB=${MAX_SELECTED_GPU_USED_MB:-2048}
SETTLE_SEC=${SETTLE_SEC:-30}
FREE_POLL_MAX=${FREE_POLL_MAX:-180}
# M1 may still be mid-run when supplementing intermediate steps.
ALLOW_INCOMPLETE_EXPS=${ALLOW_INCOMPLETE_EXPS:-1}

if [[ -n "${WAIT_PID}" ]]; then
  [[ "${WAIT_PID}" =~ ^[0-9]+$ ]] || {
    echo "WAIT_PID must be numeric" >&2
    exit 2
  }
  echo "Waiting for training PID ${WAIT_PID} at $(date -Is)"
  while kill -0 "${WAIT_PID}" 2>/dev/null; do
    state=$(ps -o stat= -p "${WAIT_PID}" 2>/dev/null | awk '{print $1}')
    [[ -n "${state}" && "${state}" != Z* ]] || break
    sleep 60
  done
  echo "Training PID gone at $(date -Is); settle ${SETTLE_SEC}s"
  sleep "${SETTLE_SEC}"
fi

free_enough() {
  local selected visible used
  IFS=',' read -ra selected <<<"${CUDA_VISIBLE_DEVICES}"
  for visible in "${selected[@]}"; do
    visible=${visible//[[:space:]]/}
    [[ "${visible}" =~ ^[0-9]+$ ]] || continue
    used=$(nvidia-smi -i "${visible}" --query-gpu=memory.used --format=csv,noheader,nounits 2>/dev/null | head -1 | tr -d '[:space:]' || true)
    [[ "${used}" =~ ^[0-9]+$ ]] || return 1
    (( used <= MAX_SELECTED_GPU_USED_MB )) || return 1
  done
  return 0
}

echo "Waiting for CUDA_VISIBLE_DEVICES=${CUDA_VISIBLE_DEVICES} free (≤${MAX_SELECTED_GPU_USED_MB} MiB)..."
for i in $(seq 1 "${FREE_POLL_MAX}"); do
  if free_enough; then
    echo "GPUs free at $(date -Is)"
    break
  fi
  if (( i == FREE_POLL_MAX )); then
    echo "Timed out waiting for free GPUs" >&2
    exit 1
  fi
  sleep 60
done

echo "=== M1 offline eval ONLY_STEPS=${ONLY_STEPS} at $(date -Is) ==="
ALLOW_INCOMPLETE_EXPS="${ALLOW_INCOMPLETE_EXPS}" \
  ONLY_EXPS=m1_geo3k100_2b \
  ONLY_STEPS="${ONLY_STEPS}" \
  SKIP_EXISTING=1 \
  SYNC_DASHBOARD=1 \
  CUDA_VISIBLE_DEVICES="${CUDA_VISIBLE_DEVICES}" \
  VLM_EXP="${VLM_EXP}" \
  bash "${SCRIPT_DIR}/run_mm_eval_queue.sh"

echo "M1 supplement complete at $(date -Is)"
