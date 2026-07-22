#!/usr/bin/env bash
# Unattended M1 -> M2 -> M3 training supervisor.
# A failed run is relaunched with resume_mode=auto after a short cooldown.
set -uo pipefail

VLM_EXP=/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp
PROJECT_DIR=${VLM_EXP}/model/exp2card_mm
LOG_DIR=${VLM_EXP}/logs/exp2card_mm/pipeline
mkdir -p "${LOG_DIR}"

experiments=(m1_geo3k100_2b m2_mix50_2b m3_mix20_2b)
entrypoints=(run_m1_geo3k_2b.sh run_m2_mix50_2b.sh run_m3_mix20_2b.sh)

checkpoint_step() {
  local tracker=${PROJECT_DIR}/$1/latest_checkpointed_iteration.txt
  if [[ -f "${tracker}" ]]; then
    tr -cd '0-9' < "${tracker}"
  else
    printf '0'
  fi
}

is_complete() {
  local exp=$1
  local step
  step=$(checkpoint_step "${exp}")
  [[ ${step:-0} -ge 150 && -d "${PROJECT_DIR}/${exp}/global_step_150/actor" ]]
}

process_running() {
  local pid=$1
  local state
  state=$(ps -o stat= -p "${pid}" 2>/dev/null | tr -d ' ')
  [[ -n "${state}" && "${state}" != Z* ]]
}

for index in "${!experiments[@]}"; do
  exp=${experiments[$index]}
  entry=${entrypoints[$index]}

  while ! is_complete "${exp}"; do
    # M1 may already have been launched before this supervisor. Wait for that
    # detached process instead of creating a duplicate training job.
    existing_pid_file=${VLM_EXP}/logs/exp2card_mm/${exp}/launcher.pid
    if [[ -f "${existing_pid_file}" ]]; then
      existing_pid=$(tr -cd '0-9' < "${existing_pid_file}")
      if [[ -n "${existing_pid}" ]] && process_running "${existing_pid}"; then
        echo "[$(date -Is)] ${exp}: waiting for existing PID ${existing_pid}; checkpoint=$(checkpoint_step "${exp}")"
        sleep 60
        continue
      fi
    fi

    echo "[$(date -Is)] ${exp}: launching ${entry}; checkpoint=$(checkpoint_step "${exp}")"
    bash "${VLM_EXP}/scripts/${entry}"
    exit_code=$?
    echo "[$(date -Is)] ${exp}: process exited ${exit_code}; checkpoint=$(checkpoint_step "${exp}")"
    if ! is_complete "${exp}"; then
      echo "[$(date -Is)] ${exp}: incomplete, retrying after 60 seconds"
      sleep 60
    fi
  done

  echo "[$(date -Is)] ${exp}: complete at step 150"
done

echo "[$(date -Is)] M1, M2, and M3 training complete"
