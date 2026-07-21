# 多模态消融实验方案：文本 vs 图文混合比例（基于 Qwen3.5-2B）

机器：单机 2× A100-80GB（与 E1–E5 文本实验共用，需排队）。工作区根目录 `/data/juicefs-white/5281-gpu-a100/lijunyi`（下文 `$ROOT`）；`vlm_exp` / `polaris` / `verl-main` / `evalscope` 均在其下。目标：在**完全相同的模型、算法(GRPO)、序列长度、预算**下，只改变**训练数据里图文样本的占比**（0% / 20% / 50% / 100%），对比：

1. 视觉推理能力的获得速度与上限（Geo3K 验证/测试集 acc）；
2. 纯文本数学能力是否被图文数据"稀释"或"带崩"（复用 aime24/math_500 探针，与 E1 GRPO 直接可比）。

> **科学性总则**：唯一自变量是"数据里图文样本的比例"。算法固定用 GRPO（E1 的统一配置块），不与算法维度的消融交叉，避免维度组合爆炸（详见下方"为什么不铺开全部消融轴"）。

## 0. 关键决策与依据（已核实，非拍脑袋）

- **模型选型：Qwen3.5-2B 原生 vision**（`/mnt/data/user/tc_ai/klara/models/open_llm_vllm/qwen35_2b/train-model`，与 E1–E5 文本实验**同一份权重、同一个 conda 环境**）。已用 `AutoProcessor` 实测确认该 checkpoint 的 `config.json` 带 `vision_config`/`image_token_id`，processor 类是 `Qwen3VLProcessor`，能正确把图像转成 `pixel_values`/`image_grid_thw`（见本文档"前置验证"）。选它而非独立的 Qwen3-VL-2B/Qwen2-VL-2B，是因为可以做"同底座加图像模态"这种最干净的对比，且直接复用已验证过的 `verl_qwen35` 环境与 E1 超参。
- **算法固定为 GRPO**：复用 E1 统一配置块的算法项（`norm_adv_by_std_in_grpo=True`、`kl_loss_coef=0.001` 等），不在本轮引入算法维度，理由见第 5 节。
- **任务域：Geo3K**（`hiyouga/geometry3k`，几何图形+数学推理，2101 训练/601 测试）。选它是因为 verl 官方有现成 GRPO 示例和 reward 实现（`verl/utils/reward_score/geo3k.py`），社区结果可比，且规模适合 2B/2 卡的预算。
- **本机无法直连 huggingface.co**（TLS handshake 失败），但 **hf-mirror.com 可用**（已验证 `datasets.load_dataset` 走 `HF_ENDPOINT=https://hf-mirror.com` 成功下载）。数据已下载并预处理完毕，见第 2 节。

### 前置验证（已完成，降低新路径风险）

```
processor class: Qwen3VLProcessor
templated text has image placeholder: True
processor output keys: ['input_ids', 'attention_mask', 'mm_token_type_ids', 'pixel_values', 'image_grid_thw']
```

另确认 verl `rl_dataset.py` 原生支持"部分训练文件有 `images` 列、部分没有"的混合 concatenate（源码注释：*"When concatenating multimodal datasets, get will return None for samples without a modality column"*，`_build_messages` 里 `if not images and not videos and not audios: continue` 会跳过纯文本行的图像占位符替换）。这意味着**混合比例可以直接靠 `data.train_files=[a.parquet,b.parquet]` 传多个文件实现，不需要手工合并 schema**——这是本方案数据侧的核心简化。

**尚未验证、需要烟测确认的**：verl FSDP2 + vLLM 0.24 rollout 对 `Qwen3_5ForConditionalGeneration` 的**多模态**生成路径（此前的架构验证只测过纯文本生成，见 polaris 主仓库的 `/data/juicefs-white/5281-gpu-a100/lijunyi/polaris/smoke_test/smoke_test_results.md`）。这是本方案唯一的新架构风险点，已备好 `/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/run_smoke_mm.sh`，正式跑前必须先过一遍（见第 6 节）。

## 1. 消融分组设计

| 组   | 图文占比      | 训练数据组成                                                    | 说明                                    |
| ---- | ------------- | ----------------------------------------------------------------- | --------------------------------------- |
| M0   | 0%（纯文本）  | `polaris_easy_boxed.parquet`（全量 13688 行）                     | **直接复用已跑完的 `e1_grpo_2b` 结果**，不重跑，省 ~26h |
| M1   | 100%（纯图文）| `geo3k/train.parquet`（2101 行）                                    | 极端组，检验纯视觉信号下 GRPO 的行为        |
| M2   | 50%           | `geo3k/train.parquet` + `text_subset_m2_2101.parquet`（各 2101 行）| 等量混合                                  |
| M3   | 20%           | `geo3k/train.parquet` + `text_subset_m3_8404.parquet`（2101+8404）| 更贴近真实 post-training 配比            |

**为什么 M0 不重跑**：M0 本质就是 E1 GRPO 的原始设定（同模型、同算法、同数据、同超参），复用其已有的完整训练曲线和 checkpoint，把这一维度消融的"0% 图文"端点直接对齐到已有结果，省下一组 ~26 小时的算力，也让本轮多模态消融和已有的算法消融结论可以互相印证。

**统一不变量**（M1–M3 逐字相同，只改 `data.train_files`）：GRPO、`train_batch_size=32`、`rollout.n=8`、`max_prompt_length=1024`、`max_response_length=16384`、非思考模式、`lr=1e-6`、`total_training_steps=150`、`data.seed=1`、2 卡 FSDP2。

**已知的不完美但可接受的权衡**：`max_response_length=16384` 是为文本数学长尾预留的，对 Geo3K（通常几十~几百 token 就能给出答案）明显过冗余。保持全组统一是为了不引入"响应长度"这个混杂变量；代价是 M1（纯图文）单 step rollout 会比理论最优慢，但由于实际生成长度会自然收敛得更短，不会像文本组一样频繁触顶截断，可接受。

## 2. 数据准备（已完成）

```bash
# 1) 下载 + 预处理 Geo3K（走 hf-mirror，因为直连 huggingface.co 会 TLS 失败）
cd /data/juicefs-white/5281-gpu-a100/lijunyi/verl-main
export HF_ENDPOINT=https://hf-mirror.com
unset HF_HUB_OFFLINE TRANSFORMERS_OFFLINE
python examples/data_preprocess/geo3k.py \
  --local_save_dir /data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/parquet/mm/geo3k_raw
# 产出：geo3k_raw/train.parquet(2101行) geo3k_raw/test.parquet(601行)
# schema: images(ndarray[dict]) / data_source='hiyouga/geometry3k' / prompt(含<image>占位符)
#         / ability='math' / reward_model.ground_truth / extra_info

# 2) 按比例切分文本子集 + 训练中验证用的 geo3k 探针
python /data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/data_process/build_mm_mix.py
# 产出：/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/parquet/mm/text_subset_m2_2101.parquet（M2用）
#       /data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/parquet/mm/text_subset_m3_8404.parquet（M3用）
#       /data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/parquet/mm/geo3k_val_probe_100.parquet（训练中 test_freq 验证探针，对齐 aime24 的 30 题量级）
```

Geo3K 预处理与混合切片已在本机跑过，产物已落盘在 `$ROOT/vlm_exp/parquet/mm/`，可直接被下面的训练脚本引用。**注意**：`vlm_exp` 是独立于 `polaris` 的 git 仓库（`$ROOT/vlm_exp` → `git@github.com:AntonioSu/vlm_exp.git`）；`polaris_easy_boxed.parquet`、`verl_env.sh`、`aime24.parquet`、`trans_weight.sh` 等共享基础设施仍在 `$ROOT/polaris/` 下引用，多模态专属脚本/数据/产出都在 `vlm_exp` 名下。

## 3. Reward 设计

同一 batch 里会混有 `data_source=math_dapo/aime24`（纯文本）和 `data_source=hiyouga/geometry3k`（图文）的行。写了统一的 dispatcher `/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/reward_mm_mixed.py`：

```43:46:/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/reward_mm_mixed.py
def compute_score(data_source, solution_str, ground_truth, extra_info=None):
    if data_source == "hiyouga/geometry3k":
        return _score_geo3k(solution_str, ground_truth)
    return _score_text_math(solution_str, ground_truth)
```

- 纯文本分支：复用现有 `reward_boxed.py` 逻辑（Math-Verify 符号等价判定，强制 `\boxed{}`，与 E1–E5 完全一致，保证 M0↔M1–M3 的文本判分口径不变）。
- 图文分支：复用 verl 官方 `verl/utils/reward_score/geo3k.py` 的判分逻辑（mathruler 的 `grade_answer` + 10% 权重的 `<think></think>\boxed{}` 格式奖励），与社区 Geo3K GRPO 基线口径一致，方便结果对外可比。

## 4. 训练脚本

| 脚本 | 用途 |
| --- | --- |
| `/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/run_mm_mix_2b.sh` | 共享骨架（继承 E1 统一配置块 + 多模态改动），由下面三个脚本设环境变量后调用 |
| `/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/run_m1_geo3k_2b.sh` | M1：100% 图文 |
| `/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/run_m2_mix50_2b.sh` | M2：50/50 混合 |
| `/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/run_m3_mix20_2b.sh` | M3：20/80 混合 |
| `/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/run_smoke_mm.sh` | **正式跑前必须先跑**的多模态链路烟测（2 step、极小 batch，见第 6 节） |

M1–M3 相对 E1 统一配置块的改动只有：`data.train_files`（换成图文混合列表）、`data.image_key=images`、`data.val_files`（加一路 geo3k 视觉验证探针）、`reward.custom_reward_function.path`（换成 mixed dispatcher）、`trainer.project_name=exp2card_mm`（与文本实验的 `exp2card` 分开存放，避免混淆）。checkpoint 存 `/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/model/exp2card_mm/<实验名>/`，日志存 `/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/logs/exp2card_mm/<实验名>/`。

**小数据组的 epoch 设置**：M1 训练池只有 2101 行（`train_batch_size=32` → 每 epoch ≈66 step），需要 `total_epochs=10` 循环凑够 150 step；M2 池 4202 行（`total_epochs=5`）；M3 池 10505 行（`total_epochs=2`）。实际停止点仍由 `total_training_steps=150` 控制，`total_epochs` 只是保证不会在还没到 150 step 时就因为 epoch 耗尽而提前停止。

## 5. 为什么不在本轮铺开算法/分辨率/冻结视觉编码器等其它消融轴

多模态场景下值得做的消融还有：视觉编码器冻结 vs 解冻、图像分辨率/视觉 token 数量、模型底座对比（Qwen3.5-2B vs Qwen3-VL-2B）。这些都有价值，但：

- 上一轮纯算法消融（5 组×150 step）在 2 卡上就花了 1.5–2 周，多模态单 step 通常更慢（视觉 encoder forward + 更多 token）。
- 把"数据配比"和其它维度交叉会导致组数指数增长，超出可行预算，也会让"是哪个变量导致的差异"变得难以归因。

因此本轮**只锁定"数据配比"一个自变量**，把算法、分辨率、模型底座都固定。如果这轮结果显示图文数据对文本能力有明显负面影响或正面迁移，值得作为下一轮"视觉编码器冻结 vs 解冻"消融的立项依据（例如：如果 M1/M2 文本能力掉得多，值得试试冻结视觉编码器是否能减少对语言层的干扰）。

## 6. 执行顺序（重要：先烟测，再排队等 GPU）

1. **烟测（不占用完整预算，几分钟级）**：

   ```bash
   conda activate verl_qwen35
   bash /data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/run_smoke_mm.sh
   ```

   验证四件事：① Qwen3.5-2B 原生 vision 在 FSDP2+vLLM 0.24 下多模态生成不报错（新路径，此前只验证过纯文本）；② 混合"有图"与"无图"两个 parquet 文件的 `data.train_files` 列表能正常 concatenate 并在同一 batch 内联合训练；③ `reward_mm_mixed.py` 对同一 batch 内的文本/图文行都能正确分发判分；④ `data.val_files` 两路验证集能各自产出 `val-core/math_dapo(或aime24)/...` 与 `val-core/hiyouga/geometry3k/...` 指标。若显存不够，先降 `actor_rollout_ref.rollout.gpu_memory_utilization`（当前 0.5，图文比纯文本占用更多，可能需要降到 0.4 左右，参照 `run_qwen3_5_2b_video_fsdp.sh` 官方示例用的是 0.1，但那是 4 卡张量并行摊薄后的值，2 卡场景需要重新试）。

2. **等 E4(RLOO)/E5(REINFORCE++) 跑完，GPU 空出来后**，依次启动 M1 → M2 → M3（建议这个顺序：先跑信号最强、最快出结果的纯图文组，再跑混合组）：

   ```bash
   bash /data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/run_m1_geo3k_2b.sh
   bash /data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/run_m2_mix50_2b.sh
   bash /data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/run_m3_mix20_2b.sh
   ```

   断点续训：直接重跑同一条命令即可（`resume_mode=auto`）。

## 7. 评测流程（每组跑完执行，仿 `exp_plan.md` 第 4 节）

```bash
# 1) FSDP 分片 → HF 格式（同文本实验，trans_weight.sh 是主仓库的共享脚本）
bash /data/juicefs-white/5281-gpu-a100/lijunyi/polaris/trans_weight.sh \
  /data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/model/exp2card_mm/<实验名>/global_step_150/actor \
  /data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/model/exp2card_mm/<实验名>/merged_150

# 2) Geo3K 测试集(601题)评测：视觉推理能力主判据
#    暂无现成 evalscope 多模态评测脚本，需要另写一个基于 verl geo3k.py 判分逻辑的
#    离线批量推理+判分脚本（vllm 直接加载 merged 权重跑 geo3k_raw/test.parquet 601 题）

# 3) 文本能力保持：复用已有的 evalscope 流程（同 exp_plan.md 第 4 节）
cd /data/juicefs-white/5281-gpu-a100/lijunyi/evalscope
bash eval.sh --model-name exp2card_mm/<实验名> \
  --model-path /data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/model/exp2card_mm/<实验名>/merged_150 \
  -t "mmlu_temp" -mt "aime24 aime25 math_500" \
  --math-generation-config "temperature=0.6,top_p=0.95,max_tokens=16384,n=8"
```

**对比维度**：

- **视觉能力主判据**：Geo3K test（601题）acc，M0(0%)→M1(100%)理应单调上升，重点看 M2/M3 用多少图文比例就能追上多少视觉能力。
- **文本能力保持主判据**：math_500（沿用已有主判据口径）。核心问题是"混入图文数据后，文本数学能力相对 M0(=E1) 掉了多少"，以及"掉多少图文比例换多少视觉能力"这条权衡曲线。
- **通用能力监控**：`mmlu_temp`，同 exp_plan.md 的判读标准（相对 base 掉 1~2 点内正常）。
- 训练过程指标：reward/pass rate 按 `data_source` 分开看（naive reward manager 的 per-sample 判分会自然按行归属，tensorboard 里如果只有聚合曲线，可以从 `/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/logs/exp2card_mm/<实验名>/rollout_dump/*.jsonl` 里按 `data_source` 拆开统计）。

## 8. 时间预算（粗估，正式数字待烟测校准）

| 阶段 | 预估 |
| --- | --- |
| 烟测 | 几分钟~半小时（含调试） |
| M1（100%图文，150 step） | 待烟测校准单 step 耗时后估计；图文 batch 通常比纯文本(16K)快，因为响应更短，但视觉 encoder forward 有额外开销，方向不确定，需实测 |
| M2 / M3 | 同量级，混入文本样本后单 step 耗时应介于 M1 与 E1(618s/step) 之间 |
| 评测（3 组 × Geo3K 601题 + 文本 evalscope） | 每组 ~2-4h |
| 合计 | 保守估计与文本 5 组消融相近量级（约 1~1.5 周），实际以烟测结果为准，如超预算优先砍 M3 或把 step 降到 80-100 |

## 9. 待办

- [ ] 跑 `/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/run_smoke_mm.sh`，确认多模态 FSDP2+vLLM 链路无报错，记录单 step 耗时用于校准预算
- [ ] 等 E4/E5 训练结束、GPU 空闲后启动 M1 → M2 → M3
- [ ] 写 Geo3K 601 题的离线批量评测脚本（vllm + `verl/utils/reward_score/geo3k.py` 判分逻辑）
- [ ] 每组跑完按第 7 节流程评测 + 归档（参照 `$ROOT/polaris/archive/README.md` 的归档惯例）
