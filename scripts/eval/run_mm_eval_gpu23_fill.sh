#!/usr/bin/env bash
# Fill M1–M3 formal offline evals on GPU2/GPU3, steps 10→150 in order.
#
# GPU2 PORT=18152: M1 10,20,...,150
# GPU3 PORT=18153: M2 10,20,...,150 then M3 10,20,...,150
#
# Usage:
#   bash scripts/eval/run_mm_eval_gpu23_fill.sh
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
if [[ -z "${WORKSPACE_ROOT:-}" ]]; then
  if [[ -f "${SCRIPT_DIR}/../../../scripts/workspace_root.sh" ]]; then
    source "${SCRIPT_DIR}/../../../scripts/workspace_root.sh"
  elif [[ -f "${SCRIPT_DIR}/../../../../polaris/scripts/workspace_root.sh" ]]; then
    source "${SCRIPT_DIR}/../../../../polaris/scripts/workspace_root.sh"
  else
    WORKSPACE_ROOT=$(cd "${SCRIPT_DIR}/../../../.." && pwd)
    export WORKSPACE_ROOT
  fi
fi
POLARIS=${POLARIS:-${WORKSPACE_ROOT}/polaris}
VLM_EXP=${VLM_EXP:-${WORKSPACE_ROOT}/vlm_exp}
EVALSCOPE=${EVALSCOPE:-${WORKSPACE_ROOT}/evalscope}
ENVBIN=${ENVBIN:-/home/jeeves/.conda/envs/verl_qwen35/bin}
EVAL_SH=${SCRIPT_DIR}/evaluate_mm_checkpoint.sh
DASH_PY=${SCRIPT_DIR}/../analysis/gen_mm_eval_dashboard_data.py

MODEL_DIR=${VLM_EXP}/model/exp2card_mm
DONE_DIR=${VLM_EXP}/evaluation/completed
GEO_DIR=${VLM_EXP}/evaluation/geo3k
LOG_DIR=${VLM_EXP}/logs/exp2card_mm/eval_queue
LOCK_DIR=${LOG_DIR}
STEPS=(10 20 30 40 50 60 70 80 90 100 110 120 130 140 150)
WORLD_SIZE=${WORLD_SIZE:-2}
SKIP_EXISTING=${SKIP_EXISTING:-1}
TP_SIZE=${TP_SIZE:-1}

mkdir -p "${DONE_DIR}" "${GEO_DIR}" "${LOG_DIR}"

log() { printf '[%s] %s\n' "$(date -Is)" "$*"; }

geo_complete() {
  local exp=$1 step=$2
  local summary=${GEO_DIR}/${exp}_step${step}.jsonl.summary.json
  [[ -f "${summary}" ]] || return 1
  "${ENVBIN}/python" - "${summary}" <<'PY'
import json, sys
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
}

sync_dashboard() {
  [[ -f "${DASH_PY}" ]] || return 0
  flock "${LOCK_DIR}/dashboard.lock" \
    "${ENVBIN}/python" "${DASH_PY}" \
    || log "[warn] dashboard sync failed"
}

run_worker() {
  local gpu=$1 port=$2
  shift 2
  local exps=("$@")
  local label="${WORKER_LABEL:-gpu${gpu}}"
  local fail=0 skip=0 ok=0
  local steps=("${STEPS[@]}")
  if [[ -n "${STEPS_OVERRIDE:-}" ]]; then
    read -r -a steps <<< "${STEPS_OVERRIDE}"
  fi
  export CUDA_VISIBLE_DEVICES="${gpu}"
  export PORT="${port}"
  export TP_SIZE
  export VLLM_GPU_MEM_UTIL="${VLLM_GPU_MEM_UTIL:-0.85}"
  export NO_PROXY="${NO_PROXY:-127.0.0.1,localhost,::1}"
  export no_proxy="${no_proxy:-127.0.0.1,localhost,::1}"
  export WORKSPACE_ROOT POLARIS VLM_EXP EVALSCOPE

  log "${label}: start PORT=${port} EXPS=${exps[*]} STEPS=${steps[*]}"
  for exp in "${exps[@]}"; do
    for step in "${steps[@]}"; do
      local actor="${MODEL_DIR}/${exp}/global_step_${step}/actor"
      if [[ ! -d "${actor}" ]]; then
        log "${label}: [skip] missing actor ${exp} step ${step}"
        continue
      fi
      if [[ "${SKIP_EXISTING}" == "1" ]] && eval_complete "${exp}" "${step}"; then
        log "${label}: [skip] already complete ${exp} step ${step}"
        skip=$((skip + 1))
        continue
      fi
      local lockf=${LOCK_DIR}/${exp}_step${step}.eval.lock
      exec 9>"${lockf}"
      if ! flock -n 9; then
        log "${label}: [skip] locked ${exp} step ${step}"
        exec 9>&-
        continue
      fi
      local run_log=${LOG_DIR}/${label}_${exp}_step${step}_$(date +%Y%m%d_%H%M%S).log
      log "${label}: evaluating ${exp} step ${step}; log=${run_log}"
      echo "${exp} ${step} running $(date -Is)" > "${LOG_DIR}/${label}.status"
      # One vLLM per GPU. evaluate_mm_checkpoint.sh claims gpuN.device.lock.
      set +e
      CUDA_VISIBLE_DEVICES="${gpu}" PORT="${port}" EVAL_STEP="${step}" \
        TP_SIZE="${TP_SIZE}" \
        VLLM_GPU_MEM_UTIL="${VLLM_GPU_MEM_UTIL}" \
        SKIP_GPU_CLAIM="${SKIP_GPU_CLAIM:-0}" \
        WORKSPACE_ROOT="${WORKSPACE_ROOT}" \
        VLM_EXP="${VLM_EXP}" POLARIS="${POLARIS}" EVALSCOPE="${EVALSCOPE}" \
        bash "${EVAL_SH}" "${exp}" >"${run_log}" 2>&1
      local exit_code=$?
      set -e
      exec 9>&-
      if [[ "${exit_code}" -eq 0 ]] && eval_complete "${exp}" "${step}"; then
        ok=$((ok + 1))
        log "${label}: completed ${exp} step ${step}"
        echo "${exp} ${step} done $(date -Is)" > "${LOG_DIR}/${label}.status"
        sync_dashboard
      else
        fail=$((fail + 1))
        log "${label}: FAILED ${exp} step ${step} exit=${exit_code}; see ${run_log}"
        echo "${exp} ${step} failed $(date -Is)" > "${LOG_DIR}/${label}.status"
      fi
    done
  done
  log "${label}: finished ok=${ok} skip=${skip} fail=${fail}"
  echo "done ok=${ok} skip=${skip} fail=${fail} $(date -Is)" > "${LOG_DIR}/${label}.status"
  [[ "${fail}" -eq 0 ]]
}

if [[ "${1:-}" == "--worker" ]]; then
  shift
  run_worker "$@"
  exit $?
fi

STAMP=$(date +%Y%m%d_%H%M%S)
MASTER=${LOG_DIR}/gpu23_fill_master_${STAMP}.log
exec > >(tee -a "${MASTER}") 2>&1
log "=== MM eval GPU2/GPU3 fill start ==="
log "master log: ${MASTER}"
log "order: step 10→150 per experiment (Geo3K n=8 + evalscope text)"
log "GPU2: m1_geo3k100_2b"
log "GPU3: m2_mix50_2b then m3_mix20_2b"

log_gpu2=${LOG_DIR}/gpu2_fill_${STAMP}.log
log_gpu3=${LOG_DIR}/gpu3_fill_${STAMP}.log

bash "$0" --worker 2 18152 m1_geo3k100_2b >>"${log_gpu2}" 2>&1 &
pid2=$!
bash "$0" --worker 3 18153 m2_mix50_2b m3_mix20_2b >>"${log_gpu3}" 2>&1 &
pid3=$!

echo "${pid2}" > "${LOG_DIR}/gpu2_fill.pid"
echo "${pid3}" > "${LOG_DIR}/gpu3_fill.pid"
echo "${log_gpu2}" > "${LOG_DIR}/gpu2_fill.latest"
echo "${log_gpu3}" > "${LOG_DIR}/gpu3_fill.latest"
log "PIDs gpu2=${pid2} gpu3=${pid3}"
log "logs: ${log_gpu2}"
log "      ${log_gpu3}"

status=0
if ! wait "${pid2}"; then
  log "gpu2 worker failed"
  status=1
fi
if ! wait "${pid3}"; then
  log "gpu3 worker failed"
  status=1
fi
sync_dashboard
log "MM eval GPU2/GPU3 fill finished exit=${status}"
exit "${status}"
