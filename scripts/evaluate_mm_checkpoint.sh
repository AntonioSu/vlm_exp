#!/usr/bin/env bash
# Merge and evaluate one completed M1/M2/M3 step-150 checkpoint.
# Usage: CUDA_VISIBLE_DEVICES=0 bash scripts/evaluate_mm_checkpoint.sh m1_geo3k100_2b
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: CUDA_VISIBLE_DEVICES=<gpu> bash $0 <experiment_name>" >&2
  exit 2
fi

EXP=$1
export CUDA_VISIBLE_DEVICES=${CUDA_VISIBLE_DEVICES:-0}
VLM_EXP=/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp
POLARIS=/data/juicefs-white/5281-gpu-a100/lijunyi/polaris
EVALSCOPE=/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope
ENVBIN=/home/jeeves/.conda/envs/verl_qwen35/bin
ACTOR_DIR=${VLM_EXP}/model/exp2card_mm/${EXP}/global_step_150/actor
MERGED_DIR=${VLM_EXP}/model/exp2card_mm/${EXP}/merged_150
GEO_OUT=${VLM_EXP}/evaluation/geo3k/${EXP}_step150.jsonl

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
export PYTHONPATH=${VLM_EXP}/scripts:/data/juicefs-white/5281-gpu-a100/lijunyi/verl-main:${PYTHONPATH:-}
"${ENVBIN}/python" "${VLM_EXP}/scripts/eval_geo3k.py" \
  --model "${MERGED_DIR}" \
  --output "${GEO_OUT}" \
  --temperature 0.6 --top-p 0.95 --n 8 --max-tokens 16384 \
  --enforce-eager

# Text retention and general-capability evaluation. Put the verl environment's
# vLLM-capable Python first; the evalscope CLI itself remains /usr/local/bin/evalscope.
export PATH=${ENVBIN}:${PATH}
cd "${EVALSCOPE}"
cleanup_eval_server() {
  pkill -f "vllm.entrypoints.openai.api_server --model ${MERGED_DIR} " 2>/dev/null || true
}
trap cleanup_eval_server EXIT
bash eval.sh \
  --model-name "exp2card_mm/${EXP}" \
  --model-path "${MERGED_DIR}" \
  --batch-size 10 \
  --infer-type vllm \
  -t "mmlu_temp" \
  -mt "aime24 aime25 math_500" \
  --math-generation-config "temperature=0.6,top_p=0.95,max_tokens=16384,n=8"
cleanup_eval_server
trap - EXIT

echo "Evaluation complete: ${EXP}"
echo "Geo3K summary: ${GEO_OUT}.summary.json"
echo "Text results: ${EVALSCOPE}/outputs/exp2card_mm/${EXP}/"
