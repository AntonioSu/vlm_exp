#!/usr/bin/env bash
# 图文混合比例消融 | GRPO(固定,与 E1 完全一致) | Qwen3.5-2B 原生 vision | FSDP2 | 2× A100-80GB
# 唯一自变量：训练数据里图文(Geo3K) vs 纯文本(polaris_easy_boxed)样本的比例。
# 其余超参逐字继承 archive/e1_grpo_2b/scripts/run_e1_grpo.sh 的统一配置块，
# 只新增多模态相关项(data.image_key、混合 reward dispatcher)。
#
# 本脚本是共享骨架，不直接跑，由 run_m1_geo3k_2b.sh / run_m2_mix50_2b.sh / run_m3_mix20_2b.sh
# 设置 EXP / TRAIN_FILES / VAL_FILES / TOTAL_EPOCHS 后 source 调用。
# M0(0%图文)不需要新脚本：直接复用已跑完的 e1_grpo_2b 结果作为该维度的基线，不重跑。
#
# 用法： conda activate verl_qwen35 && bash scripts/run_m1_geo3k_2b.sh   (或 m2/m3)
#   断点续训：直接再次运行同一入口脚本即可(resume_mode=auto)。
set -xeuo pipefail

: "${EXP:?must set EXP}"
: "${TRAIN_FILES:?must set TRAIN_FILES, e.g. '[a.parquet,b.parquet]'}"
: "${VAL_FILES:?must set VAL_FILES}"
: "${TOTAL_EPOCHS:=10}"   # 小数据组(如 M1 只有 2101 行)靠多 epoch 循环凑够 150 step，实际以 total_training_steps 为准

ENVBIN=/home/jeeves/.conda/envs/verl_qwen35/bin
VERL_DIR=/data/juicefs-white/5281-gpu-a100/lijunyi/verl-main
POLARIS=/data/juicefs-white/5281-gpu-a100/lijunyi/polaris          # 主仓库：共享基础设施(verl_env.sh、aime24 基准)
VLM_EXP=/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp             # 本实验独立仓库：脚本、数据、产出都落在这里

# ---- 稳定性环境变量 ----
source ${POLARIS}/scripts/verl_env.sh
export CUDA_VISIBLE_DEVICES=0,1
export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

# ---- 实验标识与路径 ----
PROJECT=exp2card_mm
CKPT_DIR=${VLM_EXP}/model/${PROJECT}/${EXP}
LOG_DIR=${VLM_EXP}/logs/${PROJECT}/${EXP}
export TENSORBOARD_DIR=${VLM_EXP}/tensorboard/${PROJECT}/${EXP}
mkdir -p "${LOG_DIR}" "${TENSORBOARD_DIR}"

MODEL_PATH=/mnt/data/user/tc_ai/klara/models/open_llm_vllm/qwen35_2b/train-model

start_time=$(date +%Y%m%d_%H%M%S)
cd ${VERL_DIR}
${ENVBIN}/python -m verl.trainer.main_ppo \
    trainer.use_v1=False \
    algorithm.adv_estimator=grpo \
    algorithm.use_kl_in_reward=False \
    algorithm.norm_adv_by_std_in_grpo=True \
    data.train_files="${TRAIN_FILES}" \
    data.val_files="${VAL_FILES}" \
    data.image_key=images \
    data.train_batch_size=32 \
    data.seed=1 \
    data.max_prompt_length=1024 \
    data.max_response_length=16384 \
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
    actor_rollout_ref.actor.ppo_mini_batch_size=16 \
    actor_rollout_ref.actor.use_dynamic_bsz=False \
    actor_rollout_ref.actor.ppo_micro_batch_size_per_gpu=1 \
    actor_rollout_ref.actor.clip_ratio=0.2 \
    actor_rollout_ref.actor.loss_agg_mode=token-mean \
    actor_rollout_ref.actor.use_kl_loss=True \
    actor_rollout_ref.actor.kl_loss_coef=0.001 \
    actor_rollout_ref.actor.kl_loss_type=low_var_kl \
    actor_rollout_ref.actor.entropy_coeff=0 \
    actor_rollout_ref.actor.entropy_from_logits_with_chunking=True \
    actor_rollout_ref.actor.use_torch_compile=False \
    actor_rollout_ref.actor.fsdp_config.fsdp_size=2 \
    actor_rollout_ref.actor.fsdp_config.entropy_checkpointing=True \
    actor_rollout_ref.actor.fsdp_config.param_offload=True \
    actor_rollout_ref.actor.fsdp_config.optimizer_offload=True \
    actor_rollout_ref.ref.strategy=fsdp2 \
    actor_rollout_ref.ref.log_prob_use_dynamic_bsz=False \
    actor_rollout_ref.ref.log_prob_micro_batch_size_per_gpu=1 \
    actor_rollout_ref.ref.entropy_from_logits_with_chunking=True \
    actor_rollout_ref.ref.fsdp_config.param_offload=True \
    actor_rollout_ref.rollout.name=vllm \
    actor_rollout_ref.rollout.tensor_model_parallel_size=1 \
    actor_rollout_ref.rollout.gpu_memory_utilization=0.5 \
    actor_rollout_ref.rollout.n=8 \
    actor_rollout_ref.rollout.temperature=1.0 \
    actor_rollout_ref.rollout.log_prob_use_dynamic_bsz=False \
    actor_rollout_ref.rollout.log_prob_micro_batch_size_per_gpu=1 \
    actor_rollout_ref.rollout.enforce_eager=True \
    actor_rollout_ref.rollout.enable_chunked_prefill=False \
    reward.custom_reward_function.path=${VLM_EXP}/scripts/reward_mm_mixed.py \
    reward.custom_reward_function.name=compute_score \
    reward.reward_manager.name=naive \
    trainer.critic_warmup=0 \
    trainer.logger=['console','tensorboard'] \
    trainer.project_name=${PROJECT} \
    trainer.experiment_name=${EXP} \
    trainer.rollout_data_dir=${LOG_DIR}/rollout_dump \
    trainer.n_gpus_per_node=2 \
    trainer.nnodes=1 \
    trainer.val_before_train=False \
    trainer.test_freq=25 \
    trainer.save_freq=10 \
    trainer.resume_mode=auto \
    trainer.max_actor_ckpt_to_keep=null \
    trainer.total_training_steps=150 \
    trainer.total_epochs=${TOTAL_EPOCHS} \
    trainer.default_local_dir=${CKPT_DIR} \
    "$@" \
    2>&1 | tee "${LOG_DIR}/train_${start_time}.log"
