#!/usr/bin/env bash
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

MODEL=${ROOT}/polaris/model/exp2card/e1_grpo_2b/merged_150
EVALSCOPE=${ROOT}/evalscope

export CUDA_VISIBLE_DEVICES=${CUDA_VISIBLE_DEVICES:-3}
export PORT=${PORT:-8081}
export OUTPUT_ROOT=${OUTPUT_ROOT:-${EVALSCOPE}/outputs}
export EVALSCOPE_DATASET_DIR=${EVALSCOPE_DATASET_DIR:-${EVALSCOPE}/.cache/datasets}
export VLLM_MAX_MODEL_LEN=${VLLM_MAX_MODEL_LEN:-24576}
export VLLM_GPU_MEM_UTIL=${VLLM_GPU_MEM_UTIL:-0.85}
export PATH=/home/jeeves/.conda/envs/verl_qwen35/bin:${PATH}

source "${ROOT}/polaris/scripts/verl_env.sh"

validate_text_eval_outputs() {
  local output_root=${EVALSCOPE}/outputs/exp2card_mm/m0_e1_grpo_2b
  /home/jeeves/.conda/envs/verl_qwen35/bin/python - "${output_root}" <<'PY'
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

if [[ -n "${PID_FILE:-}" ]]; then
  mkdir -p "$(dirname "${PID_FILE}")"
  printf '%s\n' "$$" > "${PID_FILE}"
fi

cleanup() {
  pkill -f "vllm.entrypoints.openai.api_server --model ${MODEL} .*--port ${PORT}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd "${EVALSCOPE}"
set +e
bash eval.sh \
  --model-name exp2card_mm/m0_e1_grpo_2b \
  --model-path "${MODEL}" \
  --batch-size 10 \
  --infer-type vllm \
  -t mmlu_temp \
  -mt "aime24 aime25 math_500" \
  --common-generation-config "temperature=0.6,top_p=0.95,max_tokens=16384,n=8" \
  --math-generation-config "temperature=0.6,top_p=0.95,max_tokens=16384,n=8"
eval_exit=$?
set -e
if ! validate_text_eval_outputs; then
  exit 1
fi
if [[ "${eval_exit}" -ne 0 ]]; then
  echo "eval.sh exited ${eval_exit}, but required M0 text evaluation artifacts are complete; continuing"
fi
