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
"${ENVBIN}/python" "${VLM_EXP}/scripts/eval/eval_geo3k.py" \
  --model "${MERGED_DIR}" \
  --output "${GEO_OUT}" \
  --temperature 0.6 --top-p 0.95 --n 8 --max-tokens 16384 \
  --enforce-eager
"${ENVBIN}/python" - "${GEO_OUT}.summary.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding='utf-8') as handle:
    summary = json.load(handle)
if summary.get('questions') != 601:
    raise SystemExit(f"Geo3K evaluation incomplete: {summary.get('questions')}/601 questions")
PY

# Text retention and general-capability evaluation. Put the verl environment's
# vLLM-capable Python first; the evalscope CLI itself remains /usr/local/bin/evalscope.
export PATH=${ENVBIN}:${PATH}
cd "${EVALSCOPE}"
cleanup_eval_server() {
  pkill -f "vllm.entrypoints.openai.api_server --model ${MERGED_DIR} " 2>/dev/null || true
}
trap cleanup_eval_server EXIT
set +e
bash eval.sh \
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
