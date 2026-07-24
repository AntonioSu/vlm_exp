#!/usr/bin/env bash
# Archive multimodal experiment metadata, dashboards, scripts, logs, and eval summaries.
# Checkpoints are intentionally excluded because each group is very large; use the
# original model/exp2card_mm/<experiment>/ path if weights are needed.
set -euo pipefail

VLM_EXP=${VLM_EXP:-/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp}
POLARIS=${POLARIS:-/data/juicefs-white/5281-gpu-a100/lijunyi/polaris}
ARCHIVE_ROOT=${ARCHIVE_ROOT:-${POLARIS}/archive/mm_exp2card}

experiments=(m0_e1_grpo_2b m1_geo3k100_2b m2_mix50_2b m3_mix20_2b)

case "${ARCHIVE_ROOT}" in
  ""|"/"|"/data"|"/data/"*"/polaris"|"/data/"*"/archive")
    echo "Refusing unsafe ARCHIVE_ROOT=${ARCHIVE_ROOT}" >&2
    exit 2
    ;;
esac

mkdir -p \
  "${ARCHIVE_ROOT}/dashboard/mm" \
  "${ARCHIVE_ROOT}/scripts" \
  "${ARCHIVE_ROOT}/logs/exp2card_mm" \
  "${ARCHIVE_ROOT}/evaluation"

copy_if_exists() {
  local src=$1
  local dst=$2
  if [[ -e "${src}" ]]; then
    mkdir -p "$(dirname "${dst}")"
    cp -a "${src}" "${dst}"
  fi
}

copy_tree_if_exists() {
  local src=$1
  local dst=$2
  if [[ -d "${src}" ]]; then
    mkdir -p "$(dirname "${dst}")"
    rm -rf "${dst}"
    cp -a "${src}" "${dst}"
  fi
}

copy_if_exists "${VLM_EXP}/exp_plan_mm.md" "${ARCHIVE_ROOT}/exp_plan_mm.md"
copy_tree_if_exists "${VLM_EXP}/dashboard/mm" "${ARCHIVE_ROOT}/dashboard/mm"
copy_tree_if_exists "${VLM_EXP}/dashboard/algo" "${ARCHIVE_ROOT}/dashboard/algo"
copy_tree_if_exists "${VLM_EXP}/dashboard/common" "${ARCHIVE_ROOT}/dashboard/common"

for script in \
  run_smoke_mm.sh run_mm_mix_2b.sh run_m1_geo3k_2b.sh run_m2_mix50_2b.sh run_m3_mix20_2b.sh \
  run_mm_training_pipeline.sh run_mm_evaluation_pipeline.sh run_m0_baseline_supervisor.sh \
  evaluate_mm_checkpoint.sh evaluate_m0_text.sh eval_geo3k.py reward_mm_mixed.py summarize_mm_rollouts.py \
  gen_mm_rollout_dashboard_data.py gen_mm_eval_dashboard_data.py test_reward_mm_mixed.py; do
  copy_if_exists "${VLM_EXP}/scripts/${script}" "${ARCHIVE_ROOT}/scripts/${script}"
done

for exp in "${experiments[@]}"; do
  copy_tree_if_exists "${VLM_EXP}/logs/exp2card_mm/${exp}" "${ARCHIVE_ROOT}/logs/exp2card_mm/${exp}"
done
copy_tree_if_exists "${VLM_EXP}/logs/exp2card_mm/pipeline" "${ARCHIVE_ROOT}/logs/exp2card_mm/pipeline"
copy_tree_if_exists "${VLM_EXP}/logs/exp2card_mm/evaluation_pipeline" "${ARCHIVE_ROOT}/logs/exp2card_mm/evaluation_pipeline"

copy_tree_if_exists "${VLM_EXP}/evaluation/geo3k" "${ARCHIVE_ROOT}/evaluation/geo3k"
copy_tree_if_exists "${VLM_EXP}/evaluation/mm_rollouts" "${ARCHIVE_ROOT}/evaluation/mm_rollouts"
copy_tree_if_exists "${VLM_EXP}/evaluation/completed" "${ARCHIVE_ROOT}/evaluation/completed"

cat > "${ARCHIVE_ROOT}/README.md" <<EOF
# 多模态消融归档：Qwen3.5-2B M0–M3

归档时间：$(date -Is)

本目录归档 \`vlm_exp/exp_plan_mm.md\` 对应的多模态数据配比消融实验。权重 checkpoint 未复制，避免归档目录膨胀；需要权重时直接使用原始路径：

- \`${VLM_EXP}/model/exp2card_mm/<实验名>/\`
- M0 文本端点复用 \`${POLARIS}/model/exp2card/e1_grpo_2b/\`

## 内容

- \`exp_plan_mm.md\`：方案与执行状态快照
- \`dashboard/\`：多模态看板与相关静态资源
- \`scripts/\`：训练、评测、监督、汇总脚本快照
- \`logs/exp2card_mm/\`：训练/监督/评测日志快照（如已产生）
- \`evaluation/\`：Geo3K、rollout 汇总、done 标记等运行产物快照（如已产生）

## 完成判据

最终完整归档应包含：

- M0 Geo3K 601/601 与文本基线评测结果
- M1/M2/M3 各自 step150 checkpoint 的评测 done 标记
- M1/M2/M3 的 Geo3K test 与 evalscope 文本评测产物
- M1/M2/M3 rollout 曲线汇总与最终看板更新
EOF

echo "Archived multimodal experiment snapshot to ${ARCHIVE_ROOT}"
