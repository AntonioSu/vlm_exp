#!/usr/bin/env bash
# M1: 100% 图文（Geo3K only）| 数据混合消融的极端组
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
POLARIS=/data/juicefs-white/5281-gpu-a100/lijunyi/polaris
VLM_EXP=/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp

export EXP=m1_geo3k100_2b
export TRAIN_FILES="[${VLM_EXP}/parquet/mm/geo3k_raw/train.parquet]"
export VAL_FILES="[${POLARIS}/evaluation/benchmarks/aime24.parquet,${VLM_EXP}/parquet/mm/geo3k_val_probe_100.parquet]"
export TOTAL_EPOCHS=10   # 2101 行/batch32≈66 step/epoch，需要多轮才能凑够 150 step

exec bash "${SCRIPT_DIR}/run_mm_mix_2b.sh" "$@"
