#!/usr/bin/env bash
# Supervise the M0 baseline Geo3K and text evaluations without disturbing
# currently running jobs. Intended for long unattended runs.
set -euo pipefail

VLM_EXP=/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp
POLARIS=/data/juicefs-white/5281-gpu-a100/lijunyi/polaris
ENVBIN=/home/jeeves/.conda/envs/verl_qwen35/bin
MODEL=${POLARIS}/model/exp2card/e1_grpo_2b/merged_150
LOG_DIR=${VLM_EXP}/logs/exp2card_mm/m0_e1_grpo_2b
DONE_DIR=${VLM_EXP}/evaluation/completed
GEO_OUT=${VLM_EXP}/evaluation/geo3k/m0_e1_grpo_2b_step150.jsonl
GEO_PID_FILE=${LOG_DIR}/geo3k_eval.pid
TEXT_PID_FILE=${LOG_DIR}/text_eval.pid
SUP_PID_FILE=${LOG_DIR}/m0_baseline_supervisor.pid

mkdir -p "${LOG_DIR}" "${DONE_DIR}" "$(dirname "${GEO_OUT}")"
printf '%s\n' "$$" > "${SUP_PID_FILE}"

log() {
  printf '[%s] %s\n' "$(date -Is)" "$*"
}

is_alive() {
  local pid_file=$1
  [[ -f "${pid_file}" ]] || return 1
  local pid
  pid=$(<"${pid_file}")
  [[ -n "${pid}" ]] || return 1
  kill -0 "${pid}" 2>/dev/null || return 1
  local state
  state=$(ps -o stat= -p "${pid}" 2>/dev/null | awk '{print $1}')
  [[ -n "${state}" && "${state}" != Z* ]]
}

geo_complete() {
  [[ -f "${GEO_OUT}.summary.json" ]] || return 1
  "${ENVBIN}/python" - "${GEO_OUT}.summary.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    summary = json.load(handle)
raise SystemExit(0 if summary.get("questions") == 601 else 1)
PY
}

text_complete() {
  local root=/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m0_e1_grpo_2b
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

def line_count(path: Path) -> int:
    with path.open(encoding="utf-8") as handle:
        return sum(1 for _ in handle)

def has_artifact(kind: str, task: str, expected: int) -> bool:
    return any(
        line_count(path) >= expected
        for path in root.glob(f"*/{kind}/models/{task}.jsonl")
    )

for task, expected in required.items():
    if not has_artifact("predictions", task, expected):
        raise SystemExit(1)
    if not has_artifact("reviews", task, expected):
        raise SystemExit(1)
raise SystemExit(0)
PY
}

launch_geo() {
  local log_file=${LOG_DIR}/geo3k_eval_$(date +%Y%m%d_%H%M%S).log
  log "launching M0 Geo3K baseline on GPU2"
  (
    cd "${VLM_EXP}"
    source "${POLARIS}/scripts/verl_env.sh"
    export CUDA_VISIBLE_DEVICES=2
    export HF_HUB_OFFLINE=1
    export TRANSFORMERS_OFFLINE=1
    export PYTHONPATH=${VLM_EXP}/scripts:/data/juicefs-white/5281-gpu-a100/lijunyi/verl-main:${PYTHONPATH:-}
    exec "${ENVBIN}/python" "${VLM_EXP}/scripts/eval_geo3k.py" \
      --model "${MODEL}" \
      --output "${GEO_OUT}" \
      --temperature 0.6 --top-p 0.95 --n 8 --max-tokens 16384 \
      --enforce-eager
  ) >>"${log_file}" 2>&1 &
  printf '%s\n' "$!" > "${GEO_PID_FILE}"
}

launch_text() {
  local log_file=${LOG_DIR}/text_eval_$(date +%Y%m%d_%H%M%S).log
  log "launching M0 text baseline on GPU3"
  (
    cd "${VLM_EXP}"
    export CUDA_VISIBLE_DEVICES=3
    export PORT=8081
    export PID_FILE="${TEXT_PID_FILE}"
    exec bash "${VLM_EXP}/scripts/evaluate_m0_text.sh"
  ) >>"${log_file}" 2>&1 &
  printf '%s\n' "$!" > "${TEXT_PID_FILE}"
}

while true; do
  if geo_complete; then
    touch "${DONE_DIR}/m0_e1_grpo_2b_geo3k.done"
  elif is_alive "${GEO_PID_FILE}"; then
    log "M0 Geo3K running"
  else
    launch_geo
  fi

  if is_alive "${TEXT_PID_FILE}"; then
    log "M0 text running"
  elif text_complete; then
    touch "${DONE_DIR}/m0_e1_grpo_2b_text.done"
  else
    launch_text
  fi

  if [[ -f "${DONE_DIR}/m0_e1_grpo_2b_geo3k.done" && -f "${DONE_DIR}/m0_e1_grpo_2b_text.done" ]]; then
    log "M0 baseline evaluations complete"
    exit 0
  fi

  sleep 300
done
