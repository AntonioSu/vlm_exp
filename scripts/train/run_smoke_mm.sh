#!/usr/bin/env bash
# 多模态链路烟测：在承诺 150-step 正式跑之前，先用极小 batch/step 验证：
#   1) Qwen3.5-2B 原生 vision 在 verl FSDP2 + vLLM 0.24 rollout 下能否正常前向/生成（新路径，未验证过）
#   2) data.train_files 混合"有 images 列"与"无 images 列"的文件是否能正常 concatenate + 单 batch 内混训
#   3) reward_mm_mixed.py 按 data_source 分发是否正确（同一 batch 内文本/图文都判分）
#   4) data.val_files 多数据源验证是否能分别产出 val-core/<data_source>/... 指标
# 跑 2 个 step、极小 batch，几分钟内应该出结果；出错时看 GPU 显存与 vLLM 是否支持 qwen3_5 多模态输入。
set -xeuo pipefail
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

ENVBIN=/home/jeeves/.conda/envs/verl_qwen35/bin

source ${POLARIS}/scripts/verl_env.sh
export CUDA_VISIBLE_DEVICES=0,1
export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

EXP=smoke_mm_2b
LOG_DIR=${VLM_EXP}/logs/exp2card_mm/${EXP}
mkdir -p "${LOG_DIR}"

MODEL_PATH=/mnt/data/user/tc_ai/klara/models/open_llm_vllm/qwen35_2b/train-model
# 混合"有图"(geo3k)+"无图"(text_subset_m2)两个小文件，直接验证混合 concatenate 路径
TRAIN_FILES="[${VLM_EXP}/parquet/mm/geo3k_val_probe_100.parquet,${VLM_EXP}/parquet/mm/text_subset_m2_2101.parquet]"
VAL_FILES="[${POLARIS}/evaluation/benchmarks/aime24.parquet,${VLM_EXP}/parquet/mm/geo3k_val_probe_100.parquet]"

start_time=$(date +%Y%m%d_%H%M%S)
cd ${VERL_DIR}
${ENVBIN}/python -m verl.trainer.main_ppo \
    trainer.use_v1=False \
    algorithm.adv_estimator=grpo \
    algorithm.use_kl_in_reward=False \
    data.train_files="${TRAIN_FILES}" \
    data.val_files="${VAL_FILES}" \
    data.image_key=images \
    data.train_batch_size=8 \
    data.max_prompt_length=1024 \
    data.max_response_length=2048 \
    data.filter_overlong_prompts=True \
    data.truncation='error' \
    data.shuffle=True \
    +data.apply_chat_template_kwargs.enable_thinking=False \
    actor_rollout_ref.model.path=${MODEL_PATH} \
    +actor_rollout_ref.model.override_config.attn_implementation=sdpa \
    actor_rollout_ref.model.use_remove_padding=False \
    actor_rollout_ref.model.use_fused_kernels=True \
    actor_rollout_ref.model.fused_kernel_options.impl_backend=torch \
    actor_rollout_ref.model.enable_gradient_checkpointing=True \
    actor_rollout_ref.actor.strategy=fsdp2 \
    actor_rollout_ref.actor.optim.lr=1e-6 \
    actor_rollout_ref.actor.ppo_mini_batch_size=8 \
    actor_rollout_ref.actor.use_dynamic_bsz=False \
    actor_rollout_ref.actor.ppo_micro_batch_size_per_gpu=1 \
    actor_rollout_ref.actor.use_kl_loss=True \
    actor_rollout_ref.actor.kl_loss_coef=0.001 \
    actor_rollout_ref.actor.kl_loss_type=low_var_kl \
    actor_rollout_ref.actor.entropy_coeff=0 \
    actor_rollout_ref.actor.entropy_from_logits_with_chunking=True \
    actor_rollout_ref.actor.fsdp_config.fsdp_size=2 \
    actor_rollout_ref.actor.fsdp_config.entropy_checkpointing=True \
    actor_rollout_ref.actor.fsdp_config.param_offload=True \
    actor_rollout_ref.actor.fsdp_config.optimizer_offload=True \
    actor_rollout_ref.ref.strategy=fsdp2 \
    actor_rollout_ref.ref.log_prob_micro_batch_size_per_gpu=1 \
    actor_rollout_ref.ref.entropy_from_logits_with_chunking=True \
    actor_rollout_ref.ref.fsdp_config.param_offload=True \
    actor_rollout_ref.rollout.name=vllm \
    actor_rollout_ref.rollout.tensor_model_parallel_size=1 \
    actor_rollout_ref.rollout.gpu_memory_utilization=0.5 \
    actor_rollout_ref.rollout.n=4 \
    actor_rollout_ref.rollout.temperature=1.0 \
    actor_rollout_ref.rollout.log_prob_micro_batch_size_per_gpu=1 \
    actor_rollout_ref.rollout.enforce_eager=True \
    actor_rollout_ref.rollout.enable_chunked_prefill=False \
    reward.custom_reward_function.path=${VLM_EXP}/scripts/train/reward_mm_mixed.py \
    reward.custom_reward_function.name=compute_score \
    reward.reward_manager.name=naive \
    trainer.critic_warmup=0 \
    trainer.logger=['console'] \
    trainer.project_name=exp2card_mm_smoke \
    trainer.experiment_name=${EXP} \
    trainer.n_gpus_per_node=2 \
    trainer.nnodes=1 \
    trainer.val_before_train=True \
    trainer.test_freq=1 \
    trainer.save_freq=1000 \
    trainer.total_training_steps=2 \
    trainer.total_epochs=1 \
    trainer.default_local_dir=${VLM_EXP}/model/exp2card_mm_smoke/${EXP} \
    "$@" \
    2>&1 | tee "${LOG_DIR}/smoke_${start_time}.log"
