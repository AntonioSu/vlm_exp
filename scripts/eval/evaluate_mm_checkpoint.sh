#!/usr/bin/env bash
# Merge and evaluate one completed M1/M2/M3 checkpoint.
# Usage: CUDA_VISIBLE_DEVICES=0 EVAL_STEP=70 bash scripts/eval/evaluate_mm_checkpoint.sh m1_geo3k100_2b
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

if [[ $# -ne 1 ]]; then
  echo "Usage: CUDA_VISIBLE_DEVICES=<gpu> bash $0 <experiment_name>" >&2
  exit 2
fi

EXP=$1
export CUDA_VISIBLE_DEVICES=${CUDA_VISIBLE_DEVICES:-0}
ENVBIN=/home/jeeves/.conda/envs/verl_qwen35/bin
EVAL_STEP=${EVAL_STEP:-150}
ACTOR_DIR=${VLM_EXP}/model/exp2card_mm/${EXP}/global_step_${EVAL_STEP}/actor
MERGED_DIR=${VLM_EXP}/model/exp2card_mm/${EXP}/merged_${EVAL_STEP}
GEO_OUT=${VLM_EXP}/evaluation/geo3k/${EXP}_step${EVAL_STEP}.jsonl
DONE_DIR=${VLM_EXP}/evaluation/completed
LOG_DIR=${VLM_EXP}/logs/exp2card_mm/eval_queue

# One vLLM service per GPU. Two half-memory jobs on one card are slower for MM eval.
# Hold a per-GPU flock for the whole eval, then wait out leftover occupancy
# (orphan EngineCore) before merge/vLLM.
claim_eval_gpu() {
  [[ "${SKIP_GPU_CLAIM:-0}" == "1" ]] && return 0
  local gpu="${CUDA_VISIBLE_DEVICES%%,*}"
  local lockf=${LOG_DIR}/gpu${gpu}.device.lock
  local max_used=${MAX_SELECTED_GPU_USED_MB:-2048}
  local poll_max=${FREE_POLL_MAX:-1440}
  local i used
  mkdir -p "${LOG_DIR}"
  exec 8>"${lockf}"
  echo "Waiting for exclusive GPU ${gpu} lock ${lockf}"
  flock 8
  echo "Acquired GPU ${gpu} lock"
  for i in $(seq 1 "${poll_max}"); do
    used=$(nvidia-smi -i "${gpu}" --query-gpu=memory.used --format=csv,noheader,nounits 2>/dev/null | head -1 | tr -d '[:space:]' || true)
    if [[ "${used}" =~ ^[0-9]+$ ]] && (( used <= max_used )); then
      echo "GPU ${gpu} free enough (${used} MiB <= ${max_used} MiB)"
      return 0
    fi
    echo "GPU ${gpu} busy (${used:-?} MiB > ${max_used} MiB); wait 60s [${i}/${poll_max}]"
    sleep 60
  done
  echo "Timed out waiting for GPU ${gpu} to be free" >&2
  exit 1
}
claim_eval_gpu

validate_text_eval_outputs() {
  local output_root=${EVALSCOPE}/outputs/exp2card_mm/${EXP}_step${EVAL_STEP}
  "${ENVBIN}/python" - "${output_root}" <<'PY'
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

missing = []
for stem, expected in required.items():
    for kind in ("predictions", "reviews"):
        ok = any(
            line_count(path) >= expected
            for path in root.glob(f"*/{kind}/models/{stem}.jsonl")
        )
        if not ok:
            missing.append(f"{kind}/models/{stem}.jsonl >= {expected}")

reports = {path.name for path in root.glob("*/reports/models/*.json")}
for report in sorted(required_reports - reports):
    missing.append(f"reports/models/{report}")

if missing:
    print("Missing text evaluation artifacts:", file=sys.stderr)
    for item in missing:
        print(f"  - {item}", file=sys.stderr)
    raise SystemExit(1)
PY
}

if [[ ! -d "${ACTOR_DIR}" ]]; then
  echo "Missing completed actor checkpoint: ${ACTOR_DIR}" >&2
  exit 1
fi

if [[ ! -f "${MERGED_DIR}/config.json" ]]; then
  if [[ -d "${MERGED_DIR}" ]] && [[ -n "$(find "${MERGED_DIR}" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
    echo "Incomplete non-empty merge directory requires inspection: ${MERGED_DIR}" >&2
    exit 1
  fi
  bash "${POLARIS}/trans_weight.sh" "${ACTOR_DIR}" "${MERGED_DIR}"
fi

# Geo3K primary visual-reasoning evaluation. Defaults intentionally mirror the
# text evaluation's temperature/top-p/n/max-token sampling regime.
source "${POLARIS}/scripts/verl_env.sh"
export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
export PYTHONPATH=${VLM_EXP}/scripts:${ROOT}/verl-main:${PYTHONPATH:-}
geo_skip=0
if [[ -f "${GEO_OUT}.summary.json" ]]; then
  if "${ENVBIN}/python" - "${GEO_OUT}.summary.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    summary = json.load(handle)
raise SystemExit(0 if summary.get("questions") == 601 else 1)
PY
  then
    echo "Skipping Geo3K; already complete: ${GEO_OUT}.summary.json"
    geo_skip=1
  fi
fi
if [[ "${geo_skip}" -eq 0 ]]; then
  "${ENVBIN}/python" "${VLM_EXP}/scripts/eval/eval_geo3k.py" \
    --model "${MERGED_DIR}" \
    --output "${GEO_OUT}" \
    --temperature 0.6 --top-p 0.95 --n 8 --max-tokens 16384 \
    --gpu-memory-utilization "${VLLM_GPU_MEM_UTIL:-0.8}" \
    --enforce-eager
  "${ENVBIN}/python" - "${GEO_OUT}.summary.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding='utf-8') as handle:
    summary = json.load(handle)
if summary.get('questions') != 601:
    raise SystemExit(f"Geo3K evaluation incomplete: {summary.get('questions')}/601 questions")
PY
fi

# Geo3K's EngineCore can survive os._exit and keep this GPU occupied at 0% util.
# Scope the kill to this checkpoint/port so two jobs can share one GPU.
kill_vllm_on_this_gpu() {
  local gpu="${CUDA_VISIBLE_DEVICES%%,*}"
  KILL_VLLM_GPU="${gpu}" KILL_VLLM_MODEL="${MERGED_DIR}" KILL_VLLM_PORT="${PORT:-}" \
    "${ENVBIN}/python" - <<'PY'
import os
import signal

my_pid = os.getpid()
gpu = os.environ.get("KILL_VLLM_GPU", "").encode()
model = os.environ.get("KILL_VLLM_MODEL", "").encode()
port = os.environ.get("KILL_VLLM_PORT", "").encode()
markers = (b"eval_geo3k.py", b"vllm.entrypoints.openai.api_server")

children_of = {}
cmds = {}
for entry in os.listdir("/proc"):
    if not entry.isdigit():
        continue
    pid = int(entry)
    try:
        with open(f"/proc/{pid}/stat", encoding="utf-8") as handle:
            stat = handle.read()
        ppid = int(stat[stat.rfind(")") + 2 :].split()[1])
        cmd = open(f"/proc/{pid}/cmdline", "rb").read()
    except (OSError, IndexError, ValueError):
        continue
    children_of.setdefault(ppid, []).append(pid)
    cmds[pid] = cmd

roots = []
for pid, cmd in cmds.items():
    if pid == my_pid:
        continue
    if model and model in cmd and any(marker in cmd for marker in markers):
        roots.append(pid)
        continue
    if b"vllm.entrypoints.openai.api_server" in cmd and port and (
        b"--port " + port in cmd.replace(b"\0", b" ") or b"--port\0" + port in cmd
    ):
        roots.append(pid)

killed = []
stack = list(roots)
seen = set()
while stack:
    pid = stack.pop()
    if pid in seen or pid == my_pid:
        continue
    seen.add(pid)
    stack.extend(children_of.get(pid, []))
    try:
        os.kill(pid, signal.SIGKILL)
        killed.append(pid)
    except OSError:
        pass

# Orphan EngineCore from Geo3K is reparented to PID 1 and has no model path.
# Live engines keep a real parent (eval_geo3k / api_server), so this is dual-job safe.
for pid, cmd in cmds.items():
    if pid == my_pid or b"VLLM::EngineCore" not in cmd:
        continue
    try:
        with open(f"/proc/{pid}/stat", encoding="utf-8") as handle:
            stat = handle.read()
        ppid = int(stat[stat.rfind(")") + 2 :].split()[1])
    except (OSError, IndexError, ValueError):
        continue
    if ppid != 1 or pid in seen:
        continue
    try:
        os.kill(pid, signal.SIGKILL)
        killed.append(pid)
    except OSError:
        pass
if killed:
    print(
        f"killed leftover vLLM for {model.decode()} port={port.decode() or '-'}: {killed}",
        flush=True,
    )
PY
}
kill_vllm_on_this_gpu
sleep 3

# Text retention and general-capability evaluation. Put the verl environment's
# vLLM-capable Python first; the evalscope CLI itself remains /usr/local/bin/evalscope.
export PATH=${ENVBIN}:${PATH}
# vLLM serving needs verl_qwen35 on PATH; evalscope CLI lives in the system python.
export EVAL_PYTHON="${EVAL_PYTHON:-/usr/bin/python3}"
export PORT="${PORT:-8082}"
export TP_SIZE="${TP_SIZE:-1}"
export NO_PROXY="${NO_PROXY:-127.0.0.1,localhost,::1}"
export no_proxy="${no_proxy:-127.0.0.1,localhost,::1}"
# Isolate eval.sh's relative server.log so GPU2/GPU3 queues can run in parallel.
eval_cwd=${VLM_EXP}/logs/exp2card_mm/eval_queue/cwd_${EXP}_s${EVAL_STEP}_g${CUDA_VISIBLE_DEVICES//,/_}_p${PORT}
mkdir -p "${eval_cwd}"
cd "${eval_cwd}"
cleanup_eval_server() {
  pkill -f "vllm.entrypoints.openai.api_server --model ${MERGED_DIR} " 2>/dev/null || true
  kill_vllm_on_this_gpu
}
trap cleanup_eval_server EXIT
set +e
bash "${EVALSCOPE}/eval.sh" \
  --model-name "exp2card_mm/${EXP}_step${EVAL_STEP}" \
  --model-path "${MERGED_DIR}" \
  --batch-size 10 \
  --infer-type vllm \
  -t "mmlu_temp" \
  -mt "aime24 aime25 math_500" \
  --common-generation-config "temperature=0.6,top_p=0.95,max_tokens=16384,n=8" \
  --math-generation-config "temperature=0.6,top_p=0.95,max_tokens=16384,n=8"
eval_exit=$?
set -e
if ! validate_text_eval_outputs; then
  exit 1
fi
if [[ "${eval_exit}" -ne 0 ]]; then
  echo "eval.sh exited ${eval_exit}, but required text evaluation artifacts are complete; continuing"
fi
cleanup_eval_server
trap - EXIT

mkdir -p "${DONE_DIR}"
touch "${DONE_DIR}/${EXP}_step${EVAL_STEP}.done"
# Convenience alias for the step-150 waiter pipeline.
if [[ "${EVAL_STEP}" -eq 150 ]]; then
  touch "${DONE_DIR}/${EXP}.done"
fi

echo "Evaluation complete: ${EXP} step ${EVAL_STEP}"
echo "Geo3K summary: ${GEO_OUT}.summary.json"
echo "Text results: ${EVALSCOPE}/outputs/exp2card_mm/${EXP}_step${EVAL_STEP}/"
