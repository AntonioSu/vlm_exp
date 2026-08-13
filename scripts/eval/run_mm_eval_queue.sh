#!/usr/bin/env bash
# Merge and evaluate M1–M3 checkpoints across the formal step grid.
# Wraps scripts/eval/evaluate_mm_checkpoint.sh (Geo3K 601 + text evalscope).
#
# Usage:
#   CUDA_VISIBLE_DEVICES=0 bash scripts/eval/run_mm_eval_queue.sh
#   # Skip already-complete step markers / artifacts:
#   SKIP_EXISTING=1 CUDA_VISIBLE_DEVICES=0 bash scripts/eval/run_mm_eval_queue.sh
#   # Restrict to finished groups / selected steps:
#   ONLY_EXPS="m1_geo3k100_2b m2_mix50_2b" ONLY_STEPS="50 100 150" \
#     bash scripts/eval/run_mm_eval_queue.sh
#   # In-progress group (e.g. M3 mid-run): skip missing actors instead of exiting:
#   ALLOW_INCOMPLETE_EXPS=1 ONLY_EXPS=m3_mix20_2b ONLY_STEPS="10 20" \
#     bash scripts/eval/run_mm_eval_queue.sh
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
ROOT=${ROOT:-${WORKSPACE_ROOT}}
EVALSCOPE=${EVALSCOPE:-${WORKSPACE_ROOT}/evalscope}

# Runtime data root (checkpoints / evaluation/). Override when needed.
ROOT=${ROOT:-$(cd "${VLM_EXP}/.." && pwd)}
POLARIS=${POLARIS:-${ROOT}/polaris}
EVALSCOPE=${EVALSCOPE:-${ROOT}/evalscope}
ENVBIN=${ENVBIN:-/home/jeeves/.conda/envs/verl_qwen35/bin}

MODEL_DIR=${VLM_EXP}/model/exp2card_mm
DONE_DIR=${VLM_EXP}/evaluation/completed
GEO_DIR=${VLM_EXP}/evaluation/geo3k
LOG_DIR=${VLM_EXP}/logs/exp2card_mm/eval_queue

WAIT_PID=${WAIT_PID:-}
CUDA_VISIBLE_DEVICES=${CUDA_VISIBLE_DEVICES:-0}
PORT=${EVAL_PORT:-${PORT:-8082}}
WORLD_SIZE=${WORLD_SIZE:-2}
SKIP_EXISTING=${SKIP_EXISTING:-1}
ONLY_EXPS=${ONLY_EXPS:-}
ONLY_STEPS=${ONLY_STEPS:-}
ALLOW_INCOMPLETE_EXPS=${ALLOW_INCOMPLETE_EXPS:-0}
MAX_SELECTED_GPU_USED_MB=${MAX_SELECTED_GPU_USED_MB:-2048}
SYNC_DASHBOARD=${SYNC_DASHBOARD:-1}

EXPS=(m1_geo3k100_2b m2_mix50_2b m3_mix20_2b)
# Default grid matches trainer.save_freq=10 (formal every-10 checkpoints).
STEPS=(10 20 30 40 50 60 70 80 90 100 110 120 130 140 150)

mkdir -p "${DONE_DIR}" "${GEO_DIR}" "${LOG_DIR}"

log() {
  printf '[%s] %s\n' "$(date -Is)" "$*"
}

contains_word() {
  local needle=$1 haystack=$2 word
  [[ -z "${haystack}" ]] && return 0
  for word in ${haystack}; do
    [[ "${word}" == "${needle}" ]] && return 0
  done
  return 1
}

require_actor_shards() {
  local actor=$1
  local count
  count=$(find "${actor}" -maxdepth 1 -type f \
    -name "model_world_size_${WORLD_SIZE}_rank_*.pt" -size +0c | wc -l)
  [[ "${count}" -eq "${WORLD_SIZE}" ]] || {
    echo "Expected ${WORLD_SIZE} non-empty model shards, found ${count}: ${actor}" >&2
    return 1
  }
}

selected_gpu_has_training() {
  local selected pid visible
  IFS=',' read -ra selected <<<"${CUDA_VISIBLE_DEVICES}"
  for visible in "${selected[@]}"; do
    visible=${visible//[[:space:]]/}
    [[ "${visible}" =~ ^[0-9]+$ ]] || continue
    while IFS=, read -r pid; do
      pid=${pid//[[:space:]]/}
      [[ "${pid}" =~ ^[0-9]+$ ]] || continue
      ps -p "${pid}" -o args= 2>/dev/null | grep -q 'verl.trainer.main_ppo' && return 0
    done < <(nvidia-smi -i "${visible}" --query-compute-apps=pid --format=csv,noheader,nounits 2>/dev/null || true)
  done
  return 1
}

selected_gpu_is_busy() {
  local selected visible used
  IFS=',' read -ra selected <<<"${CUDA_VISIBLE_DEVICES}"
  for visible in "${selected[@]}"; do
    visible=${visible//[[:space:]]/}
    [[ "${visible}" =~ ^[0-9]+$ ]] || continue
    used=$(nvidia-smi -i "${visible}" --query-gpu=memory.used --format=csv,noheader,nounits 2>/dev/null | head -1 | tr -d '[:space:]' || true)
    [[ "${used}" =~ ^[0-9]+$ ]] || continue
    if (( used > MAX_SELECTED_GPU_USED_MB )); then
      echo "GPU ${visible} already uses ${used} MiB (> ${MAX_SELECTED_GPU_USED_MB} MiB)" >&2
      return 0
    fi
  done
  return 1
}

geo_complete() {
  local exp=$1 step=$2
  local summary=${GEO_DIR}/${exp}_step${step}.jsonl.summary.json
  [[ -f "${summary}" ]] || return 1
  "${ENVBIN}/python" - "${summary}" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    summary = json.load(handle)
raise SystemExit(0 if summary.get("questions") == 601 else 1)
PY
}

text_complete() {
  local exp=$1 step=$2
  local root=${EVALSCOPE}/outputs/exp2card_mm/${exp}_step${step}
  [[ -d "${root}" ]] || return 1
  "${ENVBIN}/python" - "${root}" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])
required = {
    "mmlu_anatomy": 135,
    "mmlu_medical_genetics": 100,
    "mmlu_high_school_mathematics": 270,
    "mmlu_machine_learning": 112,
    "aime24_default": 30,
    "aime25_AIME2025-I": 15,
    "aime25_AIME2025-II": 15,
    "math_500_Level 1": 43,
    "math_500_Level 2": 90,
    "math_500_Level 3": 105,
    "math_500_Level 4": 128,
    "math_500_Level 5": 134,
}
required_reports = {"mmlu.json", "aime24.json", "aime25.json", "math_500.json"}

def line_count(path: Path) -> int:
    with path.open(encoding="utf-8") as handle:
        return sum(1 for _ in handle)

for stem, expected in required.items():
    for kind in ("predictions", "reviews"):
        ok = any(
            line_count(path) >= expected
            for path in root.glob(f"*/{kind}/models/{stem}.jsonl")
        )
        if not ok:
            raise SystemExit(1)

reports = {path.name for path in root.glob("*/reports/models/*.json")}
if not required_reports.issubset(reports):
    raise SystemExit(1)
raise SystemExit(0)
PY
}

eval_complete() {
  local exp=$1 step=$2
  [[ -f "${DONE_DIR}/${exp}_step${step}.done" ]] || return 1
  geo_complete "${exp}" "${step}" || return 1
  text_complete "${exp}" "${step}" || return 1
  return 0
}

if [[ -n "${WAIT_PID}" ]]; then
  [[ "${WAIT_PID}" =~ ^[0-9]+$ ]] || {
    echo "WAIT_PID must be numeric" >&2
    exit 2
  }
  log "waiting for PID ${WAIT_PID}"
  while kill -0 "${WAIT_PID}" 2>/dev/null; do
    state=$(ps -o stat= -p "${WAIT_PID}" 2>/dev/null | awk '{print $1}')
    [[ -n "${state}" && "${state}" != Z* ]] || break
    sleep 60
  done
  log "PID ${WAIT_PID} gone"
fi

if selected_gpu_has_training; then
  echo "A verl training process is running on CUDA_VISIBLE_DEVICES=${CUDA_VISIBLE_DEVICES}; refusing to start evaluation" >&2
  exit 1
fi
if selected_gpu_is_busy; then
  echo "CUDA_VISIBLE_DEVICES=${CUDA_VISIBLE_DEVICES} is not free enough for exclusive evaluation; refusing to start evaluation" >&2
  exit 1
fi

for exp in "${EXPS[@]}"; do
  contains_word "${exp}" "${ONLY_EXPS}" || continue
  tracker="${MODEL_DIR}/${exp}/latest_checkpointed_iteration.txt"
  tracker_step=
  [[ -s "${tracker}" ]] && tracker_step=$(tr -d '[:space:]' < "${tracker}")

  if [[ "${ALLOW_INCOMPLETE_EXPS}" == "1" ]]; then
    log "[warn] allowing incomplete experiment: ${exp} (tracker=${tracker_step:-missing}; ONLY_STEPS=${ONLY_STEPS:-<default grid>})"
  else
    [[ "${tracker_step}" =~ ^[0-9]+$ && "${tracker_step}" -ge 150 ]] || {
      echo "Experiment is incomplete: ${exp} (tracker=${tracker_step:-missing})" >&2
      exit 1
    }
    [[ -d "${MODEL_DIR}/${exp}/global_step_150/actor" ]] || {
      echo "Missing final actor checkpoint: ${MODEL_DIR}/${exp}/global_step_150/actor" >&2
      exit 1
    }
  fi

  for step in "${STEPS[@]}"; do
    contains_word "${step}" "${ONLY_STEPS}" || continue
    actor="${MODEL_DIR}/${exp}/global_step_${step}/actor"

    if [[ ! -d "${actor}" ]]; then
      if [[ "${ALLOW_INCOMPLETE_EXPS}" == "1" ]]; then
        log "[skip] missing actor for ${exp} step ${step}"
        continue
      fi
      echo "Missing actor checkpoint: ${actor}" >&2
      exit 1
    fi
    require_actor_shards "${actor}"

    if [[ "${SKIP_EXISTING}" == "1" ]] && eval_complete "${exp}" "${step}"; then
      log "[skip] complete eval already exists for ${exp} step ${step}"
      continue
    fi

    run_log=${LOG_DIR}/${exp}_step${step}_$(date +%Y%m%d_%H%M%S).log
    log "evaluating ${exp} step ${step} on GPU ${CUDA_VISIBLE_DEVICES}; log=${run_log}"
    set +e
    CUDA_VISIBLE_DEVICES="${CUDA_VISIBLE_DEVICES}" \
      PORT="${PORT}" \
      EVAL_STEP="${step}" \
      VLM_EXP="${VLM_EXP}" \
      ROOT="${ROOT}" \
      POLARIS="${POLARIS}" \
      EVALSCOPE="${EVALSCOPE}" \
      bash "${SCRIPT_DIR}/evaluate_mm_checkpoint.sh" "${exp}" \
      >"${run_log}" 2>&1
    exit_code=$?
    set -e

    if [[ "${exit_code}" -ne 0 ]]; then
      echo "Evaluation failed for ${exp} step ${step} (exit ${exit_code}); see ${run_log}" >&2
      exit "${exit_code}"
    fi
    if ! eval_complete "${exp}" "${step}"; then
      echo "Evaluation artifacts incomplete for ${exp} step ${step}; see ${run_log}" >&2
      exit 1
    fi
    # Convenience alias used by the step-150 waiter pipeline.
    if [[ "${step}" -eq 150 ]]; then
      touch "${DONE_DIR}/${exp}.done"
    fi
    log "completed ${exp} step ${step}"
  done
done

if [[ "${SYNC_DASHBOARD}" == "1" ]]; then
  dash_root=${SCRIPT_DIR}/../analysis
  if [[ -f "${dash_root}/gen_mm_eval_dashboard_data.py" ]]; then
    log "syncing MM eval dashboard data"
    "${ENVBIN}/python" "${dash_root}/gen_mm_eval_dashboard_data.py" || \
      log "[warn] dashboard sync failed; eval artifacts are still on disk"
  elif [[ -f "${VLM_EXP}/scripts/analysis/gen_mm_eval_dashboard_data.py" ]]; then
    log "syncing MM eval dashboard data from VLM_EXP tree"
    "${ENVBIN}/python" "${VLM_EXP}/scripts/analysis/gen_mm_eval_dashboard_data.py" || \
      log "[warn] dashboard sync failed; eval artifacts are still on disk"
  fi
fi

log "M1–M3 checkpoint evaluation queue complete"
