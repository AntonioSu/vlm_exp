#!/usr/bin/env bash
# Formal Geo3K (n=8 / 16K) for e1_grpo_2b merged_{10..150}.
# One worker per invocation. Waits for a GPU whose MM fill queue has
# finished, then drains remaining steps on that card.
# Usage: bash eval_m0_geo3k_full.sh
set -euo pipefail
WORKSPACE_ROOT=${WORKSPACE_ROOT:-/data/juicefs-white/5281-gpu-a100/lijunyi}
POLARIS=${POLARIS:-${WORKSPACE_ROOT}/polaris}
VLM_EXP=${VLM_EXP:-${WORKSPACE_ROOT}/vlm_exp}
ENVBIN=/home/jeeves/.conda/envs/verl_qwen35/bin
MODEL_ROOT=${POLARIS}/model/exp2card/e1_grpo_2b
DATA=${VLM_EXP}/parquet/mm/geo3k_raw/test.parquet
GEO_DIR=${VLM_EXP}/evaluation/geo3k
LOCK_DIR=${VLM_EXP}/logs/exp2card_mm/eval_queue
LOG_DIR=${VLM_EXP}/logs/exp2card_mm/m0_e1_grpo_2b
EVAL_PY=${POLARIS}/vlm_exp/scripts/eval/eval_geo3k.py
DASH_PY=${POLARIS}/vlm_exp/scripts/analysis/gen_mm_eval_dashboard_data.py
MAX_USED=${MAX_SELECTED_GPU_USED_MB:-2048}
STEPS=${STEPS:-"10 20 30 40 50 60 70 80 90 100 110 120 130 140 150"}
STAMP=$(date +%Y%m%d_%H%M%S)
LOG=${LOG_DIR}/geo3k_full_${STAMP}_$$.log

mkdir -p "${LOG_DIR}" "${GEO_DIR}" "${LOCK_DIR}"

log() {
  printf '[%s] %s\n' "$(date -Is)" "$*" | tee -a "${LOG}"
}

gpu_used() {
  nvidia-smi -i "$1" --query-gpu=memory.used --format=csv,noheader,nounits 2>/dev/null \
    | head -1 | tr -d '[:space:]'
}

step_complete() {
  local summary=${GEO_DIR}/m0_e1_grpo_2b_step${1}.jsonl.summary.json
  [[ -f "${summary}" ]] || return 1
  "${ENVBIN}/python" - "${summary}" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as handle:
    summary = json.load(handle)
raise SystemExit(0 if summary.get("questions") == 601 else 1)
PY
}

fill_holds_gpu() {
  local gpu=$1 pid f stat
  shopt -s nullglob
  for f in "${LOCK_DIR}/gpu${gpu}_fill_"*.pid; do
    pid=$(tr -d '[:space:]' < "${f}" || true)
    [[ -n "${pid}" ]] || continue
    kill -0 "${pid}" 2>/dev/null || continue
    stat=$(ps -o stat= -p "${pid}" 2>/dev/null | awk '{print $1}')
    [[ -n "${stat}" && "${stat}" != Z* ]] && return 0
  done
  return 1
}

next_step() {
  local cand lockf
  STEP=
  for cand in ${STEPS}; do
    if step_complete "${cand}"; then
      continue
    fi
    lockf=${LOCK_DIR}/m0_e1_grpo_2b_step${cand}.geo.lock
    exec 9>"${lockf}"
    if flock -n 9; then
      if step_complete "${cand}"; then
        flock -u 9 || true
        exec 9>&-
        continue
      fi
      STEP=${cand}
      return 0
    fi
    exec 9>&-
  done
  return 1
}

eval_step() {
  local gpu=$1 step=$2
  local model=${MODEL_ROOT}/merged_${step}
  local out=${GEO_DIR}/m0_e1_grpo_2b_step${step}.jsonl
  local run_log=${LOG_DIR}/gpu${gpu}_step${step}_${STAMP}.log
  if [[ ! -f "${model}/config.json" ]]; then
    log "MISSING merged checkpoint ${model}"
    return 1
  fi
  log "GPU ${gpu}: Geo3K e1_grpo_2b step ${step}; log=${run_log}"
  export CUDA_VISIBLE_DEVICES=${gpu}
  # shellcheck disable=SC1091
  source "${POLARIS}/scripts/verl_env.sh"
  export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
  export PYTHONPATH=${VLM_EXP}/scripts:${WORKSPACE_ROOT}/verl-main:${PYTHONPATH:-}
  set +e
  "${ENVBIN}/python" "${EVAL_PY}" \
    --model "${model}" \
    --data "${DATA}" \
    --output "${out}" \
    --temperature 0.6 --top-p 0.95 --n 8 --max-tokens 16384 \
    --gpu-memory-utilization 0.8 \
    --enforce-eager \
    >"${run_log}" 2>&1
  local rc=$?
  set -e
  if [[ "${rc}" -ne 0 ]]; then
    log "FAILED step ${step} exit=${rc}; see ${run_log}"
    return "${rc}"
  fi
  if ! step_complete "${step}"; then
    log "FAILED step ${step}: summary incomplete"
    return 1
  fi
  log "completed step ${step}"
  "${ENVBIN}/python" "${DASH_PY}" >>"${LOG}" 2>&1 \
    || log "[warn] dashboard sync failed"
  return 0
}

claim_gpu() {
  local gpu used
  for gpu in 0 1 2 3; do
    if fill_holds_gpu "${gpu}"; then
      continue
    fi
    exec 8>"${LOCK_DIR}/gpu${gpu}.device.lock"
    if flock -n 8; then
      used=$(gpu_used "${gpu}" || echo 999999)
      if [[ "${used}" =~ ^[0-9]+$ ]] && (( used <= MAX_USED )); then
        GOT=${gpu}
        return 0
      fi
      flock -u 8 || true
    fi
    exec 8>&-
  done
  return 1
}

log "M0 Geo3K full-step worker start STEPS=${STEPS}"

GOT=
while true; do
  remaining=0
  for step in ${STEPS}; do
    step_complete "${step}" || remaining=$((remaining + 1))
  done
  if (( remaining == 0 )); then
    log "all steps complete; exit"
    "${ENVBIN}/python" "${DASH_PY}" >>"${LOG}" 2>&1 || true
    exit 0
  fi
  if claim_gpu; then
    log "acquired GPU ${GOT} (${remaining} steps left)"
    break
  fi
  sleep 30
done

fail=0
ok=0
while true; do
  if ! next_step; then
    log "no remaining unlocked steps; GPU ${GOT} done ok=${ok} fail=${fail}"
    break
  fi
  step=${STEP}
  if eval_step "${GOT}" "${step}"; then
    ok=$((ok + 1))
  else
    fail=$((fail + 1))
  fi
  exec 9>&- || true
done

log "finished ok=${ok} fail=${fail}"
exit 0
