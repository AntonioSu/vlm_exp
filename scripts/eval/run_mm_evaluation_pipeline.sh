#!/usr/bin/env bash
# Wait for each formal checkpoint, then merge and evaluate it on the spare GPU.
set -uo pipefail

VLM_EXP=/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp
MODEL_DIR=${VLM_EXP}/model/exp2card_mm
DONE_DIR=${VLM_EXP}/evaluation/completed
LOG_DIR=${VLM_EXP}/logs/exp2card_mm/evaluation_pipeline
# M2 can run concurrently on GPU2/3 while M1 is finishing on GPU0/1.  When M1
# reaches step150, GPU0/1 are expected to be released first, so default eval to
# GPU0 and keep EVAL_GPU as an override for manual scheduling.
GPU=${EVAL_GPU:-0}
PORT=${EVAL_PORT:-8082}
experiments=(m1_geo3k100_2b m2_mix50_2b m3_mix20_2b)

mkdir -p "${DONE_DIR}" "${LOG_DIR}"
if [[ -n "${PID_FILE:-}" ]]; then
  mkdir -p "$(dirname "${PID_FILE}")"
  printf '%s\n' "$$" > "${PID_FILE}"
fi

for exp in "${experiments[@]}"; do
  while [[ ! -d "${MODEL_DIR}/${exp}/global_step_150/actor" ]]; do
    echo "[$(date -Is)] ${exp}: waiting for step-150 actor checkpoint"
    sleep 300
  done

  # evaluate_mm_checkpoint.sh writes <exp>_step<N>.done; also accept the
  # convenience alias <exp>.done written by the step-wise eval queue at 150.
  while [[ ! -f "${DONE_DIR}/${exp}_step150.done" && ! -f "${DONE_DIR}/${exp}.done" ]]; do
    run_log=${LOG_DIR}/${exp}_$(date +%Y%m%d_%H%M%S).log
    echo "[$(date -Is)] ${exp}: starting evaluation on GPU ${GPU}; log=${run_log}"
    CUDA_VISIBLE_DEVICES=${GPU} PORT=${PORT} EVAL_STEP=150 \
      bash "${VLM_EXP}/scripts/eval/evaluate_mm_checkpoint.sh" "${exp}" \
      > "${run_log}" 2>&1
    exit_code=$?
    echo "[$(date -Is)] ${exp}: evaluation exited ${exit_code}"
    if [[ -f "${DONE_DIR}/${exp}_step150.done" ]]; then
      touch "${DONE_DIR}/${exp}.done"
    elif [[ ! -f "${DONE_DIR}/${exp}.done" ]]; then
      echo "[$(date -Is)] ${exp}: incomplete, retrying after 300 seconds"
      sleep 300
    fi
  done
  touch "${DONE_DIR}/${exp}.done"
done

echo "[$(date -Is)] M1, M2, and M3 evaluation complete"
