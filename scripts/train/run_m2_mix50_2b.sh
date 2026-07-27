#!/usr/bin/env bash
# M2: 50% 图文(Geo3K) + 50% 纯文本(polaris_easy_boxed 子集) 混合
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
POLARIS=/data/juicefs-white/5281-gpu-a100/lijunyi/polaris
VLM_EXP=/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp

export EXP=m2_mix50_2b
export TRAIN_FILES="[${VLM_EXP}/parquet/mm/geo3k_raw/train.parquet,${VLM_EXP}/parquet/mm/text_subset_m2_2101.parquet]"
export VAL_FILES="[${POLARIS}/evaluation/benchmarks/aime24.parquet,${VLM_EXP}/parquet/mm/geo3k_val_probe_100.parquet]"
export TOTAL_EPOCHS=5    # 4202 行/batch32≈131 step/epoch

exec bash "${SCRIPT_DIR}/run_mm_mix_2b.sh" "$@"
