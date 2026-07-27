#!/usr/bin/env bash
# M3: 20% 图文(Geo3K) + 80% 纯文本(polaris_easy_boxed 子集) 混合——更贴近真实 post-training 配比
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
POLARIS=/data/juicefs-white/5281-gpu-a100/lijunyi/polaris
VLM_EXP=/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp

export EXP=m3_mix20_2b
export TRAIN_FILES="[${VLM_EXP}/parquet/mm/geo3k_raw/train.parquet,${VLM_EXP}/parquet/mm/text_subset_m3_8404.parquet]"
export VAL_FILES="[${POLARIS}/evaluation/benchmarks/aime24.parquet,${VLM_EXP}/parquet/mm/geo3k_val_probe_100.parquet]"
export TOTAL_EPOCHS=2    # 10505 行/batch32≈328 step/epoch

exec bash "${SCRIPT_DIR}/run_mm_mix_2b.sh" "$@"
