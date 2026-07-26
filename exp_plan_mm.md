# 多模态消融实验方案：文本 vs 图文混合比例（基于 Qwen3.5-2B）

机器：单机 4× A100-80GB（与 E1–E5 文本实验共用，需排队）。工作区根目录 `/data/juicefs-white/5281-gpu-a100/lijunyi`（下文 `$ROOT`）；`vlm_exp` / `polaris` / `verl-main` / `evalscope` 均在其下。目标：在**完全相同的模型、算法(GRPO)、序列长度、预算**下，只改变**训练数据里图文样本的占比**（0% / 20% / 50% / 100%），对比：

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

**烟测已通过（2026-07-21）**：verl FSDP2 + vLLM 0.24 rollout 对 `Qwen3_5ForConditionalGeneration` 的多模态生成、图文 parquet 混合、mixed reward dispatcher 与双验证集指标均已跑通；产物在 `model/exp2card_mm_smoke/smoke_mm_2b/global_step_2/`，日志在 `logs/exp2card_mm/smoke_mm_2b/`。

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

**已知偏离 E1 配置的一处（`enforce_eager=True`，非科学性变量）**：M1 首次正式跑时用 E1 原始的 `enforce_eager=False`（开 CUDA-graph capture + torch.compile）复现了崩溃——`torch._inductor` 的 autotune 缓存保存阶段抛出 `PermissionError: /data/lijunyi`（一个与本次路径迁移无关的 torch/vLLM 内部缓存路径解析问题，多次排查未能定位到具体源头；`enforce_eager=True` 的烟测脚本从未触发这条编译路径，因此未提前暴露）。为尽快解除阻塞，`run_mm_mix_2b.sh` 改为 `enforce_eager=True`（跳过 vLLM 的 CUDA-graph 编译，只影响 rollout 吞吐，不影响模型数值/正确性）。这与 E1 的 `enforce_eager=False`不一致，如果 M1–M3 的 rollout 吞吐显著低于 E1 折算值，这是已知原因；若后续需要修复以恢复可比性，需要进一步定位该 torch/vLLM 缓存路径 bug。

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
   # 默认使用 GPU0,1；如需并行利用空闲卡，可覆盖 MM_CUDA_VISIBLE_DEVICES
   MM_CUDA_VISIBLE_DEVICES=2,3 bash /data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/run_m2_mix50_2b.sh
   bash /data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/run_m3_mix20_2b.sh
   ```

   断点续训：直接重跑同一条命令即可（`resume_mode=auto`）。

## 7. 评测流程（每组跑完执行，仿 `exp_plan.md` 第 4 节）

```bash
# 一条命令依次完成：FSDP→HF 合并、Geo3K 601 题视觉评测、文本能力评测
CUDA_VISIBLE_DEVICES=0 bash \
  /data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/evaluate_mm_checkpoint.sh \
  <实验名>
```

其中 `scripts/eval_geo3k.py` 复用训练时的 Qwen 多模态模板和 Geo3K 官方判分逻辑，逐题落 JSONL、支持中断续跑，并同时汇报 `sample_accuracy` 和 `pass_at_n`。文本部分复用 evalscope，覆盖 `mmlu_temp`、`aime24`、`aime25`、`math_500`，采样口径统一为 temperature=0.6、top_p=0.95、max_tokens=16384、n=8。本机安装的 EvalScope 0.17.1 不识别新版自定义 `mmlu_temp` adapter，因此 `eval.sh` 将其等价映射为标准 MMLU 的 `anatomy`、`medical_genetics`、`high_school_mathematics`、`machine_learning` 四个子集，并显式保持 5-shot；数据缓存已改到工作区可写目录。

`scripts/run_mm_evaluation_pipeline.sh` 已作为独立 session 等待 M1/M2/M3 的 step-150 checkpoint；每组训练完成后会自动合并、评测，失败则保留日志并重试，成功标记写入 `evaluation/completed/`。2026-07-24 14:15 起 M2 已临时并行占用 GPU2/3；为避免 M1 step150 后评测与 M2 抢卡，2026-07-24 16:44 已将评测默认 GPU 从 2 改为 0，并重启等待中的 supervisor（`logs/exp2card_mm/evaluation_pipeline/supervisor.pid=833608`）。所有组完成后用 `scripts/archive_mm_results.sh` 生成 `$ROOT/polaris/archive/mm_exp2card/` 快照（不复制大体积 checkpoint）。

**对比维度**：

- **视觉能力主判据**：Geo3K test（601题）acc，M0(0%)→M1(100%)理应单调上升，重点看 M2/M3 用多少图文比例就能追上多少视觉能力。
- **文本能力保持主判据**：math_500（沿用已有主判据口径）。核心问题是"混入图文数据后，文本数学能力相对 M0(=E1) 掉了多少"，以及"掉多少图文比例换多少视觉能力"这条权衡曲线。
- **通用能力监控**：`mmlu_temp`，同 exp_plan.md 的判读标准（相对 base 掉 1~2 点内正常）。
- 训练过程指标：reward/pass rate 按数据源分开看。mixed reward 会在 M2/M3 的 rollout dump 写入 `is_geo3k`；用 `scripts/summarize_mm_rollouts.py` 可生成逐 step 的 Geo3K/text accuracy 与 mean score，并用 `scripts/gen_mm_rollout_dashboard_data.py` 转成静态看板 JS。M1 是单一 Geo3K 数据源，分析历史 dump 时传 `--default-source geo3k`。M1 首轮正式 run 的 step 1–104 已生成早期汇总：`evaluation/mm_rollouts/m1_geo3k100_2b_rollout_summary.csv`（运行产物，因 `evaluation/` 被 `.gitignore` 忽略不入仓）和 `dashboard/mm/js/data-m1-rollouts.js`（看板数据快照，26624 samples，overall accuracy=0.6674，mean_score=0.6007；step104 单步 accuracy=0.6992，mean_score=0.6293）。2026-07-24 18:45 M1 在 step105 后同样触发 Ray node memory OOM；由于最后落盘 checkpoint 仍是 step100，2026-07-24 18:46 自动重启后实际训练状态回退到 ckpt100，step101–105 属于未 checkpoint 证据，已复制保留到 `logs/exp2card_mm/m1_geo3k100_2b_pre_oom_step105_uncheckpointed/`。2026-07-24 19:26 M1 重启 run 写出新的 step101 rollout（accuracy=0.7656，mean_score=0.6891）；为避免把 OOM 前未 checkpoint 的旧 step102–105 混入当前 run，已在确认备份一致后将 live `rollout_dump/102.jsonl`–`105.jsonl` 移到 `logs/exp2card_mm/m1_geo3k100_2b_pre_oom_step105_uncheckpointed/removed_from_live_after_resume_20260724_1927/rollout_dump/`。2026-07-24 20:04 M1 重启 run 写出新 step102（accuracy=0.6484，mean_score=0.5836），2026-07-24 20:37 写出新 step103（accuracy=0.7109，mean_score=0.6398），2026-07-24 21:10 写出新 step104（accuracy=0.7227，mean_score=0.6504），2026-07-24 21:51 写出新 step105（accuracy=0.5508，mean_score=0.4957），2026-07-24 22:26 写出新 step106（accuracy=0.5625，mean_score=0.5063），2026-07-24 22:58 写出新 step107（accuracy=0.6797，mean_score=0.6117），已越过旧 run 的 step105 OOM 点且当前无错误；2026-07-25 00:49 已确认 `latest_checkpointed_iteration.txt=110` 与 `global_step_110/actor`，live rollout/训练指标已同步到 step110（step110：accuracy=0.5586，mean_score=0.5027；`dashboard/mm/js/data-m1-rollouts.js` 与 `dashboard/mm/js/data-m1-train.js` 已刷新）；2026-07-25 01:27 M1 写出 step111 rollout（accuracy=0.5938，mean_score=0.5344），rollout dashboard 已同步；2026-07-25 02:06 M1 写出 step112 rollout（accuracy=0.6211，mean_score=0.5590），rollout/train dashboard 已同步；2026-07-25 02:40 M1 写出 step113 rollout（accuracy=0.7188，mean_score=0.6469），rollout dashboard 已同步；2026-07-25 03:17 M1 写出 step114 rollout（accuracy=0.6445，mean_score=0.5801），rollout/train dashboard 已同步；2026-07-25 03:54 M1 写出 step115 rollout（accuracy=0.6484，mean_score=0.5836），rollout dashboard 已同步；2026-07-25 04:34 M1 写出 step116 rollout（accuracy=0.6914，mean_score=0.6223），rollout/train dashboard 已同步；2026-07-25 05:10 M1 写出 step117 rollout（accuracy=0.6445，mean_score=0.5801），rollout dashboard 已同步；2026-07-25 05:44 M1 写出 step118 rollout（accuracy=0.7305，mean_score=0.6574），rollout/train dashboard 已同步；2026-07-25 06:20 M1 写出 step119 rollout（accuracy=0.6172，mean_score=0.5555），rollout dashboard 已同步；2026-07-25 07:08 已确认 `latest_checkpointed_iteration.txt=120`、`global_step_120/actor` 完整落盘（7 files，约25G）与 step120 rollout（accuracy=0.7227，mean_score=0.6504），rollout/train dashboard 已同步；2026-07-25 07:26 M1 写出 step121 rollout（accuracy=0.7148，mean_score=0.6434），rollout dashboard 已同步；2026-07-25 08:01 M1 写出 step122 rollout（accuracy=0.6992，mean_score=0.6293），rollout/train dashboard 已同步；2026-07-25 08:34 M1 写出 step123 rollout（accuracy=0.7891，mean_score=0.7102），rollout dashboard 已同步；2026-07-25 09:11 M1 写出 step124 rollout（accuracy=0.6680，mean_score=0.6012），rollout/train dashboard 已同步；2026-07-25 09:46 M1 写出 step125 rollout（accuracy=0.7656，mean_score=0.6891），rollout dashboard 已同步；2026-07-25 10:32 M1 写出 step126 rollout（accuracy=0.6797，mean_score=0.6117），rollout/train dashboard 已同步；2026-07-25 11:07 M1 写出 step127 rollout（accuracy=0.7031，mean_score=0.6328），rollout dashboard 已同步；2026-07-25 11:45 M1 写出 step128 rollout（accuracy=0.6758，mean_score=0.6082），rollout/train dashboard 已同步；2026-07-25 12:15 M1 写出 step129 rollout（accuracy=0.8125，mean_score=0.7313），rollout dashboard 已同步；2026-07-25 13:00 已确认 `latest_checkpointed_iteration.txt=130`、`global_step_130/actor` 完整落盘（7 files，约25G）与 step130 rollout（accuracy=0.7344，mean_score=0.6609），rollout/train dashboard 已同步；2026-07-25 13:25 M1 写出 step131 rollout（accuracy=0.6562，mean_score=0.5906），rollout dashboard 已同步，下一 checkpoint 目标 step140。M2 首次并行 run 在 step6 后触发 Ray node memory OOM；该 partial run 的原始日志/rollout 已归档到 `logs/exp2card_mm/m2_mix50_2b_failed_20260724_1841_oom_step6/`（step6 累计：Geo3K 672 samples，accuracy=0.5625、mean_score=0.5063；text 864 samples，accuracy=0.4236、mean_score=-0.1528）。2026-07-24 18:47 已用 `MM_SAVE_FREQ=5` 和 `MM_RAY_MEMORY_USAGE_THRESHOLD=0.99` 重启 M2，后续以新 run 的 checkpoint/rollout 为正式进度；2026-07-24 19:37 新 run 写出 step1，2026-07-24 20:18 写出 step2，2026-07-24 21:01 写出 step3，2026-07-24 21:47 写出 step4，2026-07-24 22:30 写出 step5 且 `latest_checkpointed_iteration.txt=5`、`global_step_5/actor` 已确认（actor 12 files，约 26.6GB）；2026-07-24 23:09 写出 step6；2026-07-25 01:16 已同步到新 run step9 且当前无错误；2026-07-25 01:54 已确认 `latest_checkpointed_iteration.txt=10` 与 `global_step_10/actor`（actor 约 25GB），并同步到 step10 rollout（Geo3K 144 samples，accuracy=0.6458、mean_score=0.5813；text 112 samples，accuracy=0.5536、mean_score=0.1071）；2026-07-25 02:33 M2 写出 step11 rollout（Geo3K 128 samples，accuracy=0.6250、mean_score=0.5625；text 128 samples，accuracy=0.4766、mean_score=-0.0469），summary/dashboard 已同步；2026-07-25 03:17 M2 写出 step12 rollout（Geo3K 144 samples，accuracy=0.5417、mean_score=0.4875；text 112 samples，accuracy=0.3304、mean_score=-0.3393），summary/dashboard 已同步；2026-07-25 03:53 M2 写出 step13 rollout（Geo3K 168 samples，accuracy=0.6488、mean_score=0.5839；text 88 samples，accuracy=0.5000、mean_score=0.0000），summary/dashboard 已同步；2026-07-25 04:30 M2 写出 step14 rollout（Geo3K 136 samples，accuracy=0.6324、mean_score=0.5691；text 120 samples，accuracy=0.3417、mean_score=-0.3167），summary/dashboard 已同步；2026-07-25 05:11 已确认 `latest_checkpointed_iteration.txt=15`、`global_step_15/actor` 与 step15 rollout（Geo3K 96 samples，accuracy=0.7188、mean_score=0.6469；text 160 samples，accuracy=0.4313、mean_score=-0.1375），summary/dashboard 已同步；2026-07-25 05:54 M2 写出 step16 rollout（Geo3K 96 samples，accuracy=0.6771、mean_score=0.6094；text 160 samples，accuracy=0.4938、mean_score=-0.0125），summary/dashboard 已同步；2026-07-25 06:33 M2 写出 step17 rollout（Geo3K 120 samples，accuracy=0.5250、mean_score=0.4725；text 136 samples，accuracy=0.4779、mean_score=-0.0441），summary/dashboard 已同步；2026-07-25 07:11 M2 写出 step18 rollout（Geo3K 88 samples，accuracy=0.6591、mean_score=0.5932；text 168 samples，accuracy=0.5238、mean_score=0.0476），summary/dashboard 已同步；2026-07-25 07:53 M2 写出 step19 rollout（Geo3K 120 samples，accuracy=0.5250、mean_score=0.4725；text 136 samples，accuracy=0.3971、mean_score=-0.2059），summary/dashboard 已同步；2026-07-25 08:30 已确认 `latest_checkpointed_iteration.txt=20`、`global_step_20/actor` 完整落盘（7 files，约25G）与 step20 rollout（Geo3K 176 samples，accuracy=0.5909、mean_score=0.5318；text 80 samples，accuracy=0.5250、mean_score=0.0500），summary/dashboard 已同步；2026-07-25 09:13 M2 写出 step21 rollout（Geo3K 112 samples，accuracy=0.4107、mean_score=0.3696；text 144 samples，accuracy=0.5625、mean_score=0.1250），summary/dashboard 已同步；2026-07-25 10:02 M2 写出 step22 rollout（Geo3K 96 samples，accuracy=0.4062、mean_score=0.3656；text 160 samples，accuracy=0.4125、mean_score=-0.1750），summary/dashboard 已同步；2026-07-25 10:44 M2 写出 step23 rollout（Geo3K 128 samples，accuracy=0.6250、mean_score=0.5625；text 128 samples，accuracy=0.4453、mean_score=-0.1094），summary/dashboard 已同步；2026-07-25 11:22 M2 写出 step24 rollout（Geo3K 136 samples，accuracy=0.6544、mean_score=0.5890；text 120 samples，accuracy=0.5500、mean_score=0.1000），summary/dashboard 已同步；2026-07-25 12:05 已确认 `latest_checkpointed_iteration.txt=25`、`global_step_25/actor` 完整落盘（7 files，约25G）与 step25 rollout（Geo3K 152 samples，accuracy=0.7434、mean_score=0.6691；text 104 samples，accuracy=0.5000、mean_score=0.0000），summary/dashboard 已同步；2026-07-25 12:54 M2 写出 step26 rollout（Geo3K 96 samples，accuracy=0.6458、mean_score=0.5813；text 160 samples，accuracy=0.4813、mean_score=-0.0375），summary/dashboard 已同步；`logs/exp2card_mm/m2_mix50_2b/launcher.pid=903677` 仍在运行，下一 checkpoint 目标为 step30。

## 8. 时间预算（粗估，正式数字待烟测校准）

| 阶段 | 预估 |
| --- | --- |
| 烟测 | 几分钟~半小时（含调试） |
| M1（100%图文，150 step） | 近端约 30–41 分钟/step；完整 150 step 约 3–4 天；2026-07-24 18:45 在 step105 后 Ray node memory OOM，最后 checkpoint 为 step100，已从 ckpt100 自动恢复；2026-07-25 00:49 新 run 已 checkpoint 到 step110，2026-07-25 13:25 rollout 到 step131，step130 actor 已确认 7 files/约25G，当前无错误 |
| M2 / M3 | M2 新 run 已于 2026-07-25 05:11 checkpoint 到 step15，2026-07-25 12:54 rollout 到 step26，step25 actor 已确认 7 files/约25G，当前无错误，下一 checkpoint 目标 step30；M3 等待空闲 2-GPU lane |
| 评测（3 组 × Geo3K 601题 + 文本 evalscope） | 每组 ~2-4h |
| 合计 | 保守估计与文本 5 组消融相近量级（约 1~1.5 周），实际以烟测结果为准，如超预算优先砍 M3 或把 step 降到 80-100 |

## 9. 待办

- [x] 跑 `/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/scripts/run_smoke_mm.sh`，确认多模态 FSDP2+vLLM 链路无报错
- [ ] M1 → M2 → M3 正式训练（M1 已于 2026-07-22 用脱离会话的后台进程重新启动，首轮正式 rollout 推进到 step105 后于 2026-07-24 18:45 触发 Ray node memory OOM；`global_step_100/actor` 已落盘且 `latest_checkpointed_iteration.txt=100`，因此 2026-07-24 18:46 自动重启后实际从 ckpt100 恢复，未 checkpoint 的 step101–105 证据已复制到 `logs/exp2card_mm/m1_geo3k100_2b_pre_oom_step105_uncheckpointed/`；2026-07-24 19:26 M1 重启 run 写出新 step101，旧 step102–105 已从 live rollout 目录移到 `logs/exp2card_mm/m1_geo3k100_2b_pre_oom_step105_uncheckpointed/removed_from_live_after_resume_20260724_1927/rollout_dump/`，避免污染当前汇总和后续写文件；2026-07-24 20:04 M1 写出新 step102，2026-07-24 20:37 写出新 step103，2026-07-24 21:10 写出新 step104，2026-07-24 21:51 写出新 step105，2026-07-24 22:26 写出新 step106，2026-07-24 22:58 写出新 step107，已越过旧 run 的 step105 OOM 点；2026-07-25 00:49 确认 step110 checkpoint，2026-07-25 07:08 checkpoint/dashboard 已同步到 step120（actor 7 files，约25G；step120 accuracy=0.7227），2026-07-25 07:26 rollout/dashboard 已同步到 step121（accuracy=0.7148），2026-07-25 08:01 rollout/train dashboard 已同步到 step122（accuracy=0.6992），2026-07-25 08:34 rollout dashboard 已同步到 step123（accuracy=0.7891），2026-07-25 09:11 rollout/train dashboard 已同步到 step124（accuracy=0.6680），2026-07-25 09:46 rollout dashboard 已同步到 step125（accuracy=0.7656），2026-07-25 10:32 rollout/train dashboard 已同步到 step126（accuracy=0.6797），2026-07-25 11:07 rollout dashboard 已同步到 step127（accuracy=0.7031），2026-07-25 11:45 rollout/train dashboard 已同步到 step128（accuracy=0.6758），2026-07-25 12:15 rollout dashboard 已同步到 step129（accuracy=0.8125），2026-07-25 13:00 checkpoint/rollout/train dashboard 已同步到 step130（actor 7 files，约25G；accuracy=0.7344），2026-07-25 13:25 rollout dashboard 已同步到 step131（accuracy=0.6562），2026-07-25 14:02 rollout/train dashboard 已同步到 step132（accuracy=0.6133，mean_score=0.5520），2026-07-25 14:38 rollout dashboard 已同步到 step133（accuracy=0.7500，mean_score=0.6750；train dashboard 暂滞后到 step132），2026-07-25 15:18 rollout/train dashboard 已同步到 step134（accuracy=0.6875，mean_score=0.6188），2026-07-25 15:55 rollout dashboard 已同步到 step135（accuracy=0.6641，mean_score=0.5977；train dashboard 暂滞后到 step134），2026-07-25 16:30 M1 写出未 checkpoint 的 step136 后触发 Ray node memory OOM；最后可信 checkpoint 仍为 step130，pipeline 已于 16:31 自动重启新 run，并在 16:36 从 `global_step_130` 加载 model/optimizer/rng/lr_scheduler。为避免污染当前汇总，已将 live `rollout_dump/131.jsonl`–`136.jsonl` 移到 `logs/exp2card_mm/m1_geo3k100_2b_pre_oom_step136_uncheckpointed/removed_from_live_after_resume_20260725_1642/rollout_dump/`，M1 rollout dashboard 回退并同步到可信 step130，train dashboard 已裁剪到 checkpointed/live-clean step130；2026-07-25 17:03 新 run 仍在进行（actor_rollout_ref_update_actor），期间 raylet 报告 4 个 worker 因 memory pressure 被杀；随后该 run 在重新写出未 checkpoint step131 后再次 Ray OOM 退出，pipeline 已于 17:09 第三次从 `global_step_130` 自动恢复。2026-07-25 17:20 已将此次失败的 live `rollout_dump/131.jsonl` 移到 `logs/exp2card_mm/m1_geo3k100_2b_pre_oom_step131_retry_uncheckpointed/removed_from_live_after_resume_20260725_1720/rollout_dump/`，M1 rollout/train dashboard 均保持 checkpointed/live-clean step130；后续多次自动 retry 均卡在 GPU0 CUDA OOM（GPU0 约74.9G 显存被无 nvidia-smi PID 的残留上下文占用，`nvidia-smi --gpu-reset -i 0` 因权限不足失败），2026-07-25 23:17 已终止当前 M1 retry 进程树并暂停 `scripts/run_mm_training_pipeline.sh`，避免继续消耗；最新一次未 checkpoint `rollout_dump/131.jsonl` 已移到 `logs/exp2card_mm/m1_geo3k100_2b_pre_oom_step131_retry2_uncheckpointed/removed_from_live_after_pause_20260725_2318/rollout_dump/`；M1 下一步需等待 GPU0 被管理员/root reset 或等 M2 释放 GPU2/3 后改用空闲 2-GPU lane 从 step130 恢复；`scripts/run_mm_evaluation_pipeline.sh` 仍在等待 step150 actor checkpoint，默认使用 GPU0 评测以避开 M2 的 GPU2/3；supervisor 已补充 7200s 无文件进展的保守 stale 保护；M2 首次并行 run 在 step6 后因 Ray node memory OOM 退出，已归档到 `logs/exp2card_mm/m2_mix50_2b_failed_20260724_1841_oom_step6/`；由于尚无 step10 checkpoint，2026-07-24 18:47 已从头重启 M2，`logs/exp2card_mm/m2_mix50_2b/launcher.pid=903677`，使用 `MM_CUDA_VISIBLE_DEVICES=2,3`、`MM_SAVE_FREQ=5`、`MM_RAY_MEMORY_USAGE_THRESHOLD=0.99`；2026-07-24 19:37 M2 新 run 写出 step1 rollout，2026-07-24 20:18 写出 step2 rollout，2026-07-24 21:01 写出 step3 rollout，2026-07-24 21:47 写出 step4 rollout，2026-07-24 22:30 写出 step5 rollout且无错误，并已确认 `latest_checkpointed_iteration.txt=5` 与 `global_step_5/actor`；2026-07-24 23:09 写出 step6 rollout，2026-07-25 01:54 确认 step10 checkpoint，2026-07-25 05:11 checkpoint/rollout/summary/dashboard 已同步到 step15（step15：Geo3K accuracy=0.7188、text accuracy=0.4313），2026-07-25 05:54 rollout/summary/dashboard 已同步到 step16（Geo3K accuracy=0.6771、text accuracy=0.4938），2026-07-25 06:33 rollout/summary/dashboard 已同步到 step17（Geo3K accuracy=0.5250、text accuracy=0.4779），2026-07-25 07:11 rollout/summary/dashboard 已同步到 step18（Geo3K accuracy=0.6591、text accuracy=0.5238），2026-07-25 07:53 rollout/summary/dashboard 已同步到 step19（Geo3K accuracy=0.5250、text accuracy=0.3971），2026-07-25 08:30 checkpoint/rollout/summary/dashboard 已同步到 step20（actor 7 files，约25G；Geo3K accuracy=0.5909、text accuracy=0.5250），2026-07-25 09:13 rollout/summary/dashboard 已同步到 step21（Geo3K accuracy=0.4107、text accuracy=0.5625），2026-07-25 10:02 rollout/summary/dashboard 已同步到 step22（Geo3K accuracy=0.4062、text accuracy=0.4125），2026-07-25 10:44 rollout/summary/dashboard 已同步到 step23（Geo3K accuracy=0.6250、text accuracy=0.4453），2026-07-25 11:22 rollout/summary/dashboard 已同步到 step24（Geo3K accuracy=0.6544、text accuracy=0.5500），2026-07-25 12:05 checkpoint/rollout/summary/dashboard 已同步到 step25（actor 7 files，约25G；Geo3K accuracy=0.7434、text accuracy=0.5000），2026-07-25 12:54 rollout/summary/dashboard 已同步到 step26（Geo3K accuracy=0.6458、text accuracy=0.4813），2026-07-25 13:39 rollout/summary/dashboard 已同步到 step27（Geo3K accuracy=0.6833、text accuracy=0.3750），2026-07-25 14:18 rollout/summary/dashboard 已同步到 step28（Geo3K accuracy=0.6912、text accuracy=0.5250），2026-07-25 14:57 rollout/summary/dashboard 已同步到 step29（Geo3K accuracy=0.7569、text accuracy=0.3750），2026-07-25 15:38 checkpoint/rollout/summary/dashboard 已同步到 step30（actor 7 files，约25G；Geo3K accuracy=0.7404、text accuracy=0.5789），2026-07-25 16:14 rollout/summary/dashboard 已同步到 step31（Geo3K accuracy=0.7583、text accuracy=0.7279），2026-07-25 16:53 rollout/summary/dashboard 已同步到 step32（Geo3K accuracy=0.6080、text accuracy=0.6000），2026-07-25 23:15 rollout/summary/dashboard 已同步到 step41，并确认 checkpoint step35/step40 actor 均为 7 files、约25G（step40：Geo3K accuracy=0.7885、text accuracy=0.5987；step41：Geo3K accuracy=0.7019、text accuracy=0.6447），2026-07-25 23:37 rollout/summary/dashboard 已同步到 step42（Geo3K accuracy=0.8250、text accuracy=0.5588），2026-07-26 00:15 rollout/summary/dashboard 已同步到 step43（Geo3K accuracy=0.7500、text accuracy=0.5250），2026-07-26 00:53 rollout/summary/dashboard 已同步到 step44（Geo3K accuracy=0.6250、text accuracy=0.4922），2026-07-26 01:34 checkpoint/rollout/summary/dashboard 已同步到 step45（actor 7 files，约25G；Geo3K accuracy=0.6458、text accuracy=0.5125），2026-07-26 02:12 rollout/summary/dashboard 已同步到 step46（Geo3K accuracy=0.7431、text accuracy=0.5804），2026-07-26 02:48 rollout/summary/dashboard 已同步到 step47（Geo3K accuracy=0.8235、text accuracy=0.5250），2026-07-26 03:26 rollout/summary/dashboard 已同步到 step48（Geo3K accuracy=0.5781、text accuracy=0.5469），2026-07-26 04:01 rollout/summary/dashboard 已同步到 step49（Geo3K accuracy=0.6500、text accuracy=0.5735），2026-07-26 04:33 checkpoint/rollout/summary/dashboard 已同步到 step50（actor 7 files，约25G；Geo3K accuracy=0.6806、text accuracy=0.5089），当前无错误，下一 checkpoint 目标 step60；M3 等待下一条空闲 2-GPU lane）
- [x] 写 Geo3K 601 题的离线批量评测脚本（`scripts/eval_geo3k.py`；1 题端到端 vLLM 推理与判分已验证）
- [x] M0(=E1 step150) 正式基线评测（文本基线已完成并写入 `evaluation/completed/m0_e1_grpo_2b_text.done`：MMLU_TEMP AverageAccuracy=0.7834，AIME24 AveragePass@1=0.3542，AIME25 AveragePass@1=0.3250，MATH500 AveragePass@1=0.8635；Geo3K 601/601 已完成并写入 `evaluation/completed/m0_e1_grpo_2b_geo3k.done`：sample_accuracy=0.5732、pass@8=0.8369；输出见 `evaluation/geo3k/m0_e1_grpo_2b_step150.jsonl.summary.json`）
- [ ] 每组跑完按第 7 节流程评测 + 归档（`scripts/run_mm_evaluation_pipeline.sh` 已在后台等待并自动接力 M1→M3 评测；`scripts/archive_mm_results.sh` 已准备好生成 `$ROOT/polaris/archive/mm_exp2card/` 快照，归档口径参照 `$ROOT/polaris/archive/README.md`）

### 2026-07-26 04:42 巡检补充

- GPU 状态：GPU0 仍占用 74902/81920 MiB 且 util=0（疑似 M1 OOM 后残留 CUDA context，非 root reset 失败）；GPU1 空闲 3/81920 MiB；GPU2/3 被 M2 使用（约 38.6G/38.7G，util 40%/38%）。
- M1：仍停在 checkpoint step130，live rollout 已保持到 `130.jsonl`，`global_step_150/actor` 未出现；旧 supervisor `3849879` 为 defunct，未发现继续重试。
- M2：launcher/trainer/workers 仍运行，checkpoint 仍为 step50，latest rollout 为 `50.jsonl`（2026-07-26 04:33:20），未发现 OOM/Traceback/FAILED，仅有 NUMA affinity warning；下一 checkpoint 目标 step60。
- M3：尚未启动；`run_mm_mix_2b.sh` 固定 `trainer.n_gpus_per_node=2`，当前只有单张 GPU1 空闲，因此暂不安全开启新训练任务。
- Evaluation：pipeline supervisor `833608` 仍每 5 分钟等待 M1 step150 actor；`evaluation/completed/` 尚无 M1/M2/M3 completion marker。

### 2026-07-26 04:49 巡检补充

- 短轮询 04:45–04:49：M2 仍为 checkpoint step50，latest rollout 仍为 `50.jsonl`（2026-07-26 04:33:20）；GPU2/3 util 约 35%–41%，进程仍活跃，尚未到 step51。
- GPU 空闲判断未变：GPU1 单卡空闲，GPU0 仍残留约 74.9G，无法满足 M1/M3 的 2-GPU 训练需求；暂不启动新训练任务。

### 2026-07-26 05:03 巡检补充

- 长轮询 04:50–05:03：M2 GPU2/3 从约 38.6G 降到 6–10G 后又升至约 31.6G，util 多次达到 90%–100%，说明训练仍在活跃推进；但 latest rollout 仍为 `50.jsonl`，checkpoint 仍为 step50，尚未落盘 step51。
- M1/M3 启动判断不变：GPU0 仍残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用；当前没有可用 2-GPU lane，继续等待 M2 释放或 GPU0 被 reset。

### 2026-07-26 05:04 巡检补充

- M2 进程仍活跃：workers `906649/906650` 当前处于 `actor_rollout_ref_update_actor`，GPU2/3 约 31.8G、util 60%–67%；latest rollout 仍为 `50.jsonl`，尚无 step51/52 文件或 checkpoint。
- M1 仍为 checkpoint step130、M3 未启动、evaluation supervisor 继续等待 M1 step150；GPU 空闲判断不变，暂不启动后续任务。

### 2026-07-26 05:18 巡检补充

- M2 已写出 `rollout_dump/51.jsonl`（2026-07-26 05:17:26），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新到 step51；step51 指标：Geo3K accuracy=0.6333、text accuracy=0.4632。
- M2 训练进程仍健康运行，checkpoint 仍为 step50（下一 checkpoint 目标 step55/60），日志未发现 OOM/Traceback/FAILED；GPU2/3 约 38.6G、util 41%/41%。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用，仍无可用 2-GPU lane。

### 2026-07-26 05:19 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers `906649/906650` 继续运行，GPU2/3 约 38.6G、util 38%–40%，日志仍仅有 NUMA affinity warning。
- M1/M3/evaluation 状态未变：M1 checkpoint step130、M3 未启动、evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G，当前仍不能启动新的 2-GPU 训练。

### 2026-07-26 05:20 巡检补充

- M2 状态稳定：latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50，GPU2/3 约 38.6G、util 40% 左右；未发现新增错误。
- M1 仍停在 step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0/GPU1/GPU2/3 占用格局未变，无可用双卡 lane。

### 2026-07-26 05:21 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；GPU2/3 约 38.6G、util 41%–42%，训练进程继续运行，日志无新增 OOM/Traceback/FAILED。
- M1 仍为 checkpoint step130、M3 未启动、evaluation supervisor 仍在等待 M1 step150；GPU0 残留约 74.9G，仍无可用 2-GPU lane。

### 2026-07-26 05:22 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；GPU2/3 约 38.6G、util 40%–41%，进程继续运行，未发现新增错误。
- M1 仍为 checkpoint step130，M3 未启动，evaluation supervisor 仍在等待 M1 step150；GPU 占用格局未变，仍无可用 2-GPU lane。

### 2026-07-26 05:24 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；GPU2/3 约 38.6G、util 33%–38%，进程正常，日志无新增 OOM/Traceback/FAILED。
- M1/M3/evaluation 状态未变：M1 checkpoint step130、M3 未启动、evaluation supervisor 等待 M1 step150；无可用双卡 lane。

### 2026-07-26 05:25 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；GPU2/3 约 38.6G、util 33%–37%，训练进程继续运行，日志未见新增 OOM/Traceback/FAILED。
- M1 仍停在 checkpoint step130，M3 未启动；evaluation supervisor 继续等待 M1 step150；GPU 占用格局未变，仍无可用 2-GPU lane。

### 2026-07-26 05:26 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；GPU2/3 约 38.6G、util 29%/29%，进程继续运行，日志无新增 OOM/Traceback/FAILED。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 仍残留约 74.9G，仍无可用 2-GPU lane。

### 2026-07-26 05:27 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 已切到 `actor_rollout_ref_compute_log_prob`，GPU2/3 约 9.8G/10.0G、util 78%/65%，说明 step52 正在前进但尚未落盘。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 仍残留约 74.9G，仍无可用 2-GPU lane。

### 2026-07-26 05:36 巡检补充

- 05:28–05:36 轮询：M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；step52 已从 `actor_rollout_ref_compute_log_prob` → `actor_rollout_ref_compute_ref_log_prob` → `actor_rollout_ref_update_actor`，GPU2/3 约 30.9G、util 81%/100%，仍在活跃推进但尚未落盘 step52。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用，仍无可用 2-GPU lane。

### 2026-07-26 05:38 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 31.7G、util 67%/100%，step52 尚未落盘但仍活跃。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 仍残留约 74.9G，仍无可用 2-GPU lane。

### 2026-07-26 05:39 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 31.8G、util 47%/41%，step52 尚未落盘。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU 占用格局未变，仍无可用 2-GPU lane。

### 2026-07-26 05:40 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 32.0G、util 76%/81%，step52 尚未落盘但仍活跃。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0/GPU1/GPU2/3 占用格局未变，仍无可用 2-GPU lane。

### 2026-07-26 05:42 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 32.2G、util 79%/100%，step52 仍未落盘但训练活跃。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 仍残留约 74.9G，仍无可用 2-GPU lane。

### 2026-07-26 05:43 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 32.5G、util 35%/20%，step52 尚未落盘但进程正常。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G，仍无可用 2-GPU lane。

### 2026-07-26 05:45 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.8G、util 58%/65%，step52 尚未落盘但训练活跃。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G，仍无可用 2-GPU lane。

### 2026-07-26 05:46 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.8G、util 91%/89%，step52 尚未落盘但训练高利用活跃。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G，仍无可用 2-GPU lane。

### 2026-07-26 05:47 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.8G、util 85%/84%，step52 尚未落盘但训练高利用活跃。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU 占用格局未变，仍无可用 2-GPU lane。

### 2026-07-26 05:49 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.8G、util 83%/92%，step52 尚未落盘但训练高利用活跃。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU 占用格局未变，仍无可用 2-GPU lane。

### 2026-07-26 05:50 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.8G、util 40%/24%，step52 尚未落盘但进程继续运行。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU 占用格局未变，仍无可用 2-GPU lane。

### 2026-07-26 05:51 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.8G、util 0%/100%，step52 尚未落盘但进程继续运行。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU 占用格局未变，仍无可用 2-GPU lane。

### 2026-07-26 05:52 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.8G、util 54%/48%，step52 尚未落盘但进程继续运行。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU 占用格局未变，仍无可用 2-GPU lane。

### 2026-07-26 05:54 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.8G、util 98%/29%，step52 尚未落盘但训练仍活跃。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G，仍无可用 2-GPU lane。

### 2026-07-26 05:56 巡检补充

- M2 latest rollout 仍为 `51.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.8G、util 73%/77%，step52 尚未落盘但训练仍活跃。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G，仍无可用 2-GPU lane。

### 2026-07-26 05:58 巡检补充

- M2 已写出 `rollout_dump/52.jsonl`（2026-07-26 05:55:41），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新到 step52；step52 指标：Geo3K accuracy=0.7500、text accuracy=0.4926。
- M2 训练进程继续运行，checkpoint 仍为 step50（下一 checkpoint 目标 step55），日志仍未发现 OOM/Traceback/FAILED；GPU2/3 约 38.6G/38.5G、util 39%/40%。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用，仍无可用 2-GPU lane。

### 2026-07-26 05:59 巡检补充

- M2 latest rollout 仍为 `52.jsonl`，checkpoint 仍为 step50；workers 继续运行，GPU2/3 约 38.6G/38.5G、util 39%/40%，日志无新增 OOM/Traceback/FAILED。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU 占用格局未变，仍无可用 2-GPU lane。

### 2026-07-26 06:00 巡检补充

- M2 latest rollout 仍为 `52.jsonl`，checkpoint 仍为 step50；workers 继续运行，GPU2/3 约 38.6G/38.5G、util 38%/38%，日志无新增 OOM/Traceback/FAILED。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用，仍无可用 2-GPU lane。

### 2026-07-26 06:02 巡检补充

- M2 latest rollout 仍为 `52.jsonl`，checkpoint 仍为 step50；workers 继续运行，GPU2/3 约 38.6G/38.5G、util 37%/37%，日志无新增 OOM/Traceback/FAILED。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用，仍无可用 2-GPU lane。

### 2026-07-26 06:03 巡检补充

- M2 latest rollout 仍为 `52.jsonl`，checkpoint 仍为 step50；workers 继续运行，GPU2/3 约 38.6G/38.5G、util 30%/31%，日志无新增 OOM/Traceback/FAILED。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用，仍无可用 2-GPU lane。

### 2026-07-26 06:05 巡检补充

- M2 latest rollout 仍为 `52.jsonl`，checkpoint 仍为 step50；workers 继续运行，GPU2/3 约 38.6G/38.5G、util 29%/29%，日志无新增 OOM/Traceback/FAILED。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用，仍无可用 2-GPU lane。

### 2026-07-26 06:06 巡检补充

- M2 latest rollout 仍为 `52.jsonl`，checkpoint 仍为 step50；workers 已切到 `actor_rollout_ref_compute_log_prob`，GPU2/3 约 9.8G/10.2G、util 57%/51%，说明 step53 正在推进但尚未落盘。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用，仍无可用 2-GPU lane。

### 2026-07-26 06:08 巡检补充

- M2 latest rollout 仍为 `52.jsonl`，checkpoint 仍为 step50；workers 已切到 `actor_rollout_ref_compute_ref_log_prob`，GPU2/3 约 6.6G/6.6G、util 100%/100%，step53 正在推进但尚未落盘。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用，仍无可用 2-GPU lane。

### 2026-07-26 06:10 巡检补充

- M2 latest rollout 仍为 `52.jsonl`，checkpoint 仍为 step50；workers 仍在 `actor_rollout_ref_compute_ref_log_prob`，GPU2/3 约 6.8G/6.8G、util 41%/46%，step53 尚未落盘。
- M1 仍停在 checkpoint step130，M3 未启动，evaluation supervisor 继续等待 M1 step150；GPU0 残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用，仍无可用 2-GPU lane。

### 2026-07-26 06:17 巡检补充

- M2 latest rollout 仍为 `52.jsonl`，checkpoint 仍为 step50；workers 在 `actor_rollout_ref_update_actor`，GPU2/3 约 32.0G/32.1G、util 42%/25%，step53 尚未落盘但训练进程仍活跃。
- 日志扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 继续等待 M1 step150。
- GPU0 仍残留约 74.9G 且 util 0%，GPU1 单卡空闲，GPU2/3 被 M2 占用；当前没有干净的 2-GPU lane，因此暂不启动 M3/不重启 M1。

### 2026-07-26 06:33 巡检补充

- M2 已写出 `rollout_dump/53.jsonl`（2026-07-26 06:29:33），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新到 step53。
- Step53 指标：Geo3K accuracy=0.6548（168 samples）、text accuracy=0.6023（88 samples）；M2 checkpoint 仍为 step50，下一 checkpoint 目标 step55。
- M2 进程继续运行，GPU2/3 约 38.6G/38.5G、util 42%/42%；日志仍未见 OOM/Traceback/FAILED。GPU0 仍残留约 74.9G、GPU1 单卡空闲，仍无干净 2-GPU lane，因此暂不启动 M3/不重启 M1。

### 2026-07-26 06:34 巡检补充

- M2 latest rollout 为 `53.jsonl`，CSV 与 `dashboard/mm/js/data-m2-rollouts.js` 已确认覆盖到 step53；step53 指标保持 Geo3K accuracy=0.6548、text accuracy=0.6023。
- M2 checkpoint 仍为 step50，尚无 `global_step_55/actor`；launcher/trainer/workers 仍存活，GPU2/3 约 38.6G/38.5G、util 38%/39%。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 仍等待 M1 step150。
- GPU0 仍残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用；当前无干净 2-GPU lane，因此继续不启动 M3/不重启 M1。

### 2026-07-26 06:50 巡检补充

- M2 latest rollout 仍为 `53.jsonl`，checkpoint 仍为 step50；尚无 `global_step_55/actor`，workers 在 `actor_rollout_ref_update_actor`，说明 step54/后续仍在推进但未落盘。
- M2 GPU2/3 约 31.6G/31.5G、util 61%/49%；日志扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150。
- GPU0 仍残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用；仍无干净 2-GPU lane，因此继续不启动新任务。

### 2026-07-26 07:11 巡检补充

- M2 已写出 `rollout_dump/54.jsonl`（2026-07-26 07:08:08），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=54。
- Step54 指标：Geo3K accuracy=0.6667（120 samples）、text accuracy=0.4926（136 samples）；M2 checkpoint 仍为 step50，尚无 `global_step_55/actor`，下一重点观察 step55 checkpoint。
- M2 进程继续运行，GPU2/3 约 38.7G/38.6G、util 40%/41%；日志仍未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用；仍无干净 2-GPU lane，因此继续不启动 M3/不重启 M1。evaluation supervisor 仍等待 M1 step150。

### 2026-07-26 07:32 巡检补充

- M2 latest rollout 仍为 `54.jsonl`，checkpoint 仍为 step50；尚无 `55.jsonl` 与 `global_step_55/actor`，workers 在 `actor_rollout_ref_update_actor`，训练仍活跃。
- M2 GPU2/3 约 32.3G/32.3G、util 79%/81%；日志扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150。
- GPU0 仍残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用；仍无干净 2-GPU lane，因此继续不启动新任务，下一重点继续等 M2 step55 checkpoint。

### 2026-07-26 07:54 巡检补充

- M2 已写出 `rollout_dump/55.jsonl`（2026-07-26 07:47:03），`latest_checkpointed_iteration.txt=55`；`global_step_55/actor` 已验证完整（7 files，约 25G）。
- M2 rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=55；step55 指标：Geo3K accuracy=0.6103（136 samples）、text accuracy=0.4083（120 samples）。
- M2 进程继续运行，GPU2/3 约 38.6G/38.6G、util 35%/38%；日志仍未见 OOM/Traceback/FAILED。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150。
- GPU0 仍残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用；仍无干净 2-GPU lane，因此继续不启动新任务，下一重点观察 M2 step56/60 与 GPU lane 是否释放。

### 2026-07-26 08:15 巡检补充

- M2 latest rollout 仍为 `55.jsonl`，checkpoint 仍为 step55；尚无 `56.jsonl`、`global_step_56/actor` 或 `global_step_60/actor`，workers 在 `actor_rollout_ref_update_actor`，训练仍活跃。
- M2 GPU2/3 约 32.3G/32.5G、util 75%/75%；日志扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150。
- GPU0 仍残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用；仍无干净 2-GPU lane，因此继续不启动新任务，下一重点继续等 M2 step56/60。

### 2026-07-26 08:37 巡检补充

- M2 已写出 `rollout_dump/56.jsonl`（2026-07-26 08:32:23），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=56。
- Step56 指标：Geo3K accuracy=0.6167（120 samples）、text accuracy=0.5662（136 samples）；M2 checkpoint 仍为 step55，尚无 `global_step_60/actor`。
- M2 进程继续运行，GPU2/3 约 38.5G/38.6G、util 44%/48%；日志仍未见 OOM/Traceback/FAILED。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150。
- GPU0 仍残留约 74.9G、GPU1 单卡空闲、GPU2/3 被 M2 占用；仍无干净 2-GPU lane，因此继续不启动新任务，下一重点观察 M2 step57/60 与 GPU lane 是否释放。

### 2026-07-26 08:59 巡检补充

- M2 latest rollout 仍为 `56.jsonl`，checkpoint 仍为 step55；尚无 `57.jsonl`、`global_step_57/actor` 或 `global_step_60/actor`，workers 在 `actor_rollout_ref_update_actor`，训练仍活跃。
- M2 GPU2/3 约 32.2G/32.2G、util 37%/34%；日志扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G，GPU1 也出现约 74.5G 无进程显存残留（`nvidia-smi` 进程表为空但显存占用存在），GPU2/3 被 M2 占用；当前没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step57/60 与 GPU 残留是否释放。

### 2026-07-26 09:20 巡检补充

- M2 已写出 `rollout_dump/57.jsonl`（2026-07-26 09:17:22），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=57。
- Step57 指标：Geo3K accuracy=0.4615（104 samples）、text accuracy=0.6316（152 samples）；M2 checkpoint 仍为 step55，尚无 `global_step_60/actor`。
- M2 进程继续运行，GPU2/3 约 38.5G/38.5G、util 28%/29%；日志仍未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G，GPU1 仍约 74.5G 且 util 一度 100%、但 `nvidia-smi` 进程表无可见进程；GPU2/3 被 M2 占用，仍无可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step58/60 与 GPU 残留是否释放。

### 2026-07-26 09:42 巡检补充

- M2 latest rollout 仍为 `57.jsonl`，checkpoint 仍为 step55；尚无 `58.jsonl`、`global_step_58/actor` 或 `global_step_60/actor`，workers 在 `actor_rollout_ref_update_actor`，训练仍活跃。
- M2 GPU2/3 约 32.3G/32.3G、util 62%/47%；日志扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU1 的无进程显存残留已释放（约 3 MiB），但 GPU0 仍残留约 74.9G，GPU2/3 被 M2 占用；当前仍只有单张干净空闲卡，没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step58/60 与 GPU0 残留是否释放。

### 2026-07-26 10:04 巡检补充

- M2 已写出 `rollout_dump/58.jsonl`（2026-07-26 09:54:34），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=58。
- Step58 指标：Geo3K accuracy=0.6818（176 samples）、text accuracy=0.6250（80 samples）；M2 checkpoint 仍为 step55，尚无 `global_step_60/actor`。
- M2 进程继续运行，GPU2/3 约 38.4G/38.6G、util 29%/31%；日志仍未见 OOM/Traceback/FAILED。
- GPU1 仍干净空闲（约 3 MiB），但 GPU0 仍残留约 74.9G，GPU2/3 被 M2 占用；当前仍只有单张干净空闲卡，没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step59/60 checkpoint 与 GPU0 残留是否释放。

### 2026-07-26 10:27 巡检补充

- M2 latest rollout 仍为 `58.jsonl`，checkpoint 仍为 step55；尚无 `59.jsonl`、`global_step_59/actor` 或 `global_step_60/actor`，workers 在 `actor_rollout_ref_update_actor`，训练仍活跃。
- M2 GPU2/3 约 33.8G/33.8G、util 43%/38%；日志扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU1 仍干净空闲（约 3 MiB），GPU0 仍残留约 74.9G，GPU2/3 被 M2 占用；当前仍只有单张干净空闲卡，没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点继续观察 M2 step59/60 checkpoint 与 GPU0 残留是否释放。

### 2026-07-26 10:49 巡检补充

- M2 已写出 `rollout_dump/59.jsonl`（2026-07-26 10:28:45），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=59。
- Step59 指标：Geo3K accuracy=0.8158（152 samples）、text accuracy=0.5769（104 samples）；M2 checkpoint 仍为 step55，尚无 `global_step_60/actor`。
- M2 进程继续运行，GPU2/3 约 31.4G/31.4G、util 69%/71%；日志仍未见 OOM/Traceback/FAILED。
- GPU1 仍干净空闲（约 3 MiB），GPU0 仍残留约 74.9G，GPU2/3 被 M2 占用；当前仍只有单张干净空闲卡，没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step60 checkpoint 与 GPU0 残留是否释放。

### 2026-07-26 11:10 巡检补充

- M2 已写出 `rollout_dump/60.jsonl`（2026-07-26 11:07:30），`latest_checkpointed_iteration.txt=60`；`global_step_60/actor` 已验证完整（7 files，约 25G）。
- M2 rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=60；step60 指标：Geo3K accuracy=0.7625（160 samples）、text accuracy=0.5312（96 samples）。
- M2 进程继续运行，GPU2/3 约 38.7G/38.7G、util 40%/40%；日志仍未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G，GPU1 再次出现约 74.5G 无可见进程残留且 util 100%，GPU2/3 被 M2 占用；当前没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step65/150 与 GPU 残留是否释放。

### 2026-07-26 11:33 巡检补充

- M2 latest rollout 仍为 `60.jsonl`，checkpoint 仍为 step60；尚无 `61.jsonl`、`global_step_61/actor` 或 `global_step_65/actor`，workers 在 `actor_rollout_ref_update_actor`，训练仍活跃。
- M2 GPU2/3 约 33.7G/33.7G、util 98%/95%；日志扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G，GPU1 再次出现约 74.5G 无可见进程残留，GPU2/3 被 M2 占用；当前没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step61/65 与 GPU 残留是否释放。

### 2026-07-26 11:55 巡检补充

- M2 已写出 `rollout_dump/61.jsonl`（2026-07-26 11:44:06），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=61。
- Step61 指标：Geo3K accuracy=0.7125（160 samples）、text accuracy=0.5625（96 samples）；M2 checkpoint 仍为 step60，尚无 `global_step_65/actor`。
- M2 进程继续运行，workers 在 `actor_rollout_ref_compute_log_prob`，GPU2/3 约 9.9G/10.0G、util 57%/57%；日志仍未见 OOM/Traceback/FAILED。
- GPU1 当前恢复干净空闲（约 3 MiB），但 GPU0 仍残留约 74.9G，GPU2/3 被 M2 占用；当前仍只有单张干净空闲卡，没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step62/65 checkpoint 与 GPU 残留是否释放。

### 2026-07-26 12:17 巡检补充

- M2 latest rollout 仍为 `61.jsonl`，checkpoint 仍为 step60；尚无 `62.jsonl`、`global_step_62/actor` 或 `global_step_65/actor`，workers 在 `actor_rollout_ref_update_actor`，训练仍活跃。
- M2 GPU2/3 约 33.9G/33.8G、util 45%/35%；日志扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU1 当前干净空闲（约 3 MiB），但 GPU0 仍残留约 74.9G，GPU2/3 被 M2 占用；当前仍只有单张干净空闲卡，没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step62/65 checkpoint 与 GPU 残留是否释放。

### 2026-07-26 12:39 巡检补充

- M2 已写出 `rollout_dump/62.jsonl`（2026-07-26 12:23:37），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=62。
- Step62 指标：Geo3K accuracy=0.8333（120 samples）、text accuracy=0.5147（136 samples）；M2 checkpoint 仍为 step60，尚无 `global_step_65/actor`。
- M2 进程继续运行，workers 在 `actor_rollout_ref_compute_ref_log_prob`，GPU2/3 约 7.1G/7.1G、util 57%/58%；日志仍未见 OOM/Traceback/FAILED。
- GPU1 当前干净空闲（约 3 MiB），但 GPU0 仍残留约 74.9G，GPU2/3 被 M2 占用；当前仍只有单张干净空闲卡，没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step63/65 checkpoint 与 GPU 残留是否释放。

### 2026-07-26 13:01 巡检补充

- M2 已写出 `rollout_dump/63.jsonl`（2026-07-26 13:01:14），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=63。
- Step63 指标：Geo3K accuracy=0.7143（168 samples）、text accuracy=0.5341（88 samples）；M2 checkpoint 仍为 step60，尚无 `global_step_65/actor`。
- M2 进程继续运行，GPU2/3 约 38.6G/38.6G、util 39%/40%；日志仍未见 OOM/Traceback/FAILED。
- GPU1 当前干净空闲（约 3 MiB），但 GPU0 仍残留约 74.9G，GPU2/3 被 M2 占用；当前仍只有单张干净空闲卡，没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step64/65 checkpoint 与 GPU 残留是否释放。

### 2026-07-26 13:24 巡检补充

- M2 latest rollout 仍为 `63.jsonl`，checkpoint 仍为 step60；尚无 `64.jsonl`、`global_step_64/actor` 或 `global_step_65/actor`，workers 在 `actor_rollout_ref_update_actor`，训练仍活跃。
- M2 GPU2/3 约 32.1G/32.1G、util 77%/74%；日志扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU1 当前干净空闲（约 3 MiB），但 GPU0 仍残留约 74.9G，GPU2/3 被 M2 占用；当前仍只有单张干净空闲卡，没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step64/65 checkpoint 与 GPU 残留是否释放。

### 2026-07-26 13:47 巡检补充

- M2 已写出 `rollout_dump/64.jsonl`（2026-07-26 13:35:46），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=64。
- Step64 指标：Geo3K accuracy=0.6125（160 samples）、text accuracy=0.5833（96 samples）；M2 checkpoint 仍为 step60，尚无 `global_step_65/actor`。
- M2 进程继续运行，workers 在 `actor_rollout_ref_compute_log_prob`，GPU2/3 约 9.9G/10.3G、util 48%/56%；日志仍未见 OOM/Traceback/FAILED。
- GPU1 当前干净空闲（约 3 MiB），但 GPU0 仍残留约 74.9G，GPU2/3 被 M2 占用；当前仍只有单张干净空闲卡，没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step65 checkpoint 与 GPU 残留是否释放。

### 2026-07-26 14:12 巡检补充

- M2 latest rollout 仍为 `64.jsonl`，checkpoint 仍为 step60；尚无 `65.jsonl`、`global_step_65/actor` 或 `global_step_70/actor`，workers 在 `actor_rollout_ref_update_actor`，训练仍活跃。
- M2 GPU2/3 约 33.9G/33.9G、util 53%/48%；日志扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU1 当前干净空闲（约 3 MiB），但 GPU0 仍残留约 74.9G，GPU2/3 被 M2 占用；当前仍只有单张干净空闲卡，没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点继续观察 M2 step65 checkpoint 与 GPU 残留是否释放。

### 2026-07-26 14:34 巡检补充

- M2 已写出 `rollout_dump/65.jsonl`（2026-07-26 14:15:01），`latest_checkpointed_iteration.txt=65`；`global_step_65/actor` 已验证完整（7 files，约 25G）。
- M2 rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=65；step65 指标：Geo3K accuracy=0.6691（136 samples）、text accuracy=0.6333（120 samples）。
- M2 进程继续运行，GPU2/3 约 31.3G/31.4G、util 61%/55%；日志仍未见 OOM/Traceback/FAILED。
- GPU1 当前干净空闲（约 3 MiB），但 GPU0 仍残留约 74.9G，GPU2/3 被 M2 占用；当前仍只有单张干净空闲卡，没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step66/70 checkpoint 与 GPU 残留是否释放。

### 2026-07-26 14:57 巡检补充

- M2 已写出 `rollout_dump/66.jsonl`（2026-07-26 14:51:22），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=66。
- Step66 指标：Geo3K accuracy=0.7222（144 samples）、text accuracy=0.7232（112 samples）；M2 checkpoint 仍为 step65，尚无 `global_step_70/actor`。
- M2 进程继续运行，GPU2/3 约 38.6G/38.6G、util 41%/44%；日志仍未见 OOM/Traceback/FAILED。
- GPU1 当前干净空闲（约 3 MiB），但 GPU0 仍残留约 74.9G，GPU2/3 被 M2 占用；当前仍只有单张干净空闲卡，没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step67/70 checkpoint 与 GPU 残留是否释放。

### 2026-07-26 15:19 巡检补充

- M2 latest rollout 仍为 `66.jsonl`，checkpoint 仍为 step65；尚无 `67.jsonl`、`global_step_67/actor` 或 `global_step_70/actor`，workers 在 `actor_rollout_ref_update_actor`，训练仍活跃。
- M2 GPU2/3 约 33.3G/33.4G、util 100%/94%；日志扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU1 当前干净空闲（约 3 MiB），但 GPU0 仍残留约 74.9G，GPU2/3 被 M2 占用；当前仍只有单张干净空闲卡，没有可用 2-GPU lane。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150；因此继续不启动新任务，下一重点观察 M2 step67/70 checkpoint 与 GPU 残留是否释放。

### 2026-07-26 15:22 巡检补充

- GPU1 当前是唯一干净空闲卡（约 3 MiB）；GPU0 仍有两个 `[Not Found]` CUDA 上下文合计约 74.9G，GPU2/3 被 M2 占用，因此没有可用于 M1/M3 的干净 2-GPU lane。
- M2 仍健康运行在 GPU2/3，launcher/trainer/workers 存活；latest rollout 仍为 `66.jsonl`，checkpoint 仍为 step65，尚无 `67.jsonl` 或 `global_step_70/actor`。
- M1 仍停在 checkpoint step130、无 step150；M3 未启动；evaluation supervisor 继续等待 M1 step150。
- 结论：暂不启动新任务；若之后 GPU0 残留释放或 M2 释放 GPU2/3，优先恢复 M1 到 step150，再启动 M3。

### 2026-07-26 15:27 巡检补充

- 追加等待约 2 分钟后，M2 latest rollout 仍为 `66.jsonl`，`latest_checkpointed_iteration.txt=65`，尚无 `67.jsonl` 或 `global_step_70/actor`。
- M2 launcher/trainer/workers 仍存活，GPU2/3 约 33.9G/33.9G、util 58%/58%；日志仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；继续没有可启动 M1/M3 的干净 2-GPU lane。
- evaluation supervisor 最新心跳为 2026-07-26 15:24:45，仍在等待 `m1_geo3k100_2b` step150 actor checkpoint。

### 2026-07-26 15:32 巡检补充

- 继续等待约 4 分钟后，M2 latest rollout 仍为 `66.jsonl`（2026-07-26 14:51:22），checkpoint 仍为 step65；尚无 `67.jsonl`、`global_step_67/actor` 或 `global_step_70/actor`。
- M2 launcher/trainer/workers 仍存活，workers 仍在 `actor_rollout_ref_update_actor`；训练日志尾部最新完整指标为 step66，error scan 仍只见 NUMA affinity warning。
- GPU2/3 约 33.9G/33.9G、util 65%/49%；GPU0 仍残留约 74.9G，GPU1 干净空闲，因此仍没有干净 2-GPU lane。
- evaluation supervisor 最新心跳为 2026-07-26 15:29:45，继续等待 M1 step150；M1 停在 step130，M3 未启动。

### 2026-07-26 15:34 巡检补充

- M2 新写出 `rollout_dump/67.jsonl`（2026-07-26 15:32:51），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=67。
- Step67 指标：Geo3K accuracy=0.4583（96 samples）、text accuracy=0.5500（160 samples）；M2 checkpoint 仍为 step65，尚无 `global_step_67/actor` 或 `global_step_70/actor`。
- M2 继续运行，GPU2/3 约 38.6G/38.4G、util 42%/43%；日志仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；当前仍没有干净 2-GPU lane，不启动 M1/M3。

### 2026-07-26 15:41 巡检补充

- 继续等待约 5 分钟后，M2 latest rollout 仍为 `67.jsonl`；checkpoint 仍为 step65，尚无 `68.jsonl`、`global_step_68/actor` 或 `global_step_70/actor`。
- M2 launcher/trainer/workers 仍存活，GPU2/3 约 38.6G/38.4G、util 27%/27%；错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不启动 M1/M3。
- evaluation supervisor 最新心跳为 2026-07-26 15:39:45，仍等待 M1 step150；M1 停在 step130，M3 未启动。

### 2026-07-26 15:49 巡检补充

- M2 latest rollout 仍为 `67.jsonl`，checkpoint 仍为 step65；尚无 `68.jsonl`、`global_step_68/actor` 或 `global_step_70/actor`。
- M2 进程仍健康，workers 已从 `actor_rollout_ref_compute_log_prob` 推进到 `actor_rollout_ref_compute_ref_log_prob`；GPU2/3 约 6.8G/6.8G、util 88%/88%。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 15:44:45，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不启动 M1/M3。

### 2026-07-26 15:55 巡检补充

- M2 latest rollout 仍为 `67.jsonl`，checkpoint 仍为 step65；尚无 `68.jsonl`、`global_step_68/actor` 或 `global_step_70/actor`。
- M2 workers 已回到 `actor_rollout_ref_update_actor`，GPU2/3 约 31.7G/31.6G、util 61%/69%；进程仍存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 15:54:45，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不启动 M1/M3。

### 2026-07-26 16:02 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `67.jsonl`，checkpoint 仍为 step65；尚无 `68.jsonl`、`global_step_68/actor` 或 `global_step_70/actor`。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 约 33.8G/33.8G、util 71%/76%。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 15:59:45，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不启动 M1/M3。

### 2026-07-26 16:10 巡检补充

- M2 新写出 `rollout_dump/68.jsonl`（2026-07-26 16:09:13），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=68。
- Step68 指标：Geo3K accuracy=0.5893（112 samples）、text accuracy=0.6111（144 samples）；M2 checkpoint 仍为 step65，尚无 `global_step_68/actor` 或 `global_step_70/actor`。
- M2 继续运行，GPU2/3 约 38.7G/38.7G、util 41%/40%；日志仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；当前仍没有干净 2-GPU lane，不启动 M1/M3；evaluation supervisor 继续等待 M1 step150。

### 2026-07-26 16:17 巡检补充

- M2 latest rollout 仍为 `68.jsonl`，checkpoint 仍为 step65；尚无 `69.jsonl` 或 `global_step_70/actor`。
- 训练日志已写出 step68 完整指标行，workers 继续存活；GPU2/3 约 38.7G/38.7G、util 28%/29%。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 16:14:45，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不启动 M1/M3。

### 2026-07-26 16:25 巡检补充

- M2 latest rollout 仍为 `68.jsonl`，checkpoint 仍为 step65；尚无 `69.jsonl` 或 `global_step_70/actor`。
- M2 workers 已从 `actor_rollout_ref_compute_log_prob` 推进到 `actor_rollout_ref_compute_ref_log_prob`；GPU2/3 约 7.1G/6.8G、util 55%/57%。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 16:19:45，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不启动 M1/M3。

### 2026-07-26 16:33 巡检补充

- M2 latest rollout 仍为 `68.jsonl`，checkpoint 仍为 step65；尚无 `69.jsonl` 或 `global_step_70/actor`。
- M2 workers 已回到 `actor_rollout_ref_update_actor`，GPU2/3 约 31.9G/32.0G、util 56%/56%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 16:29:45，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不启动 M1/M3。

### 2026-07-26 16:41 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `68.jsonl`，checkpoint 仍为 step65；尚无 `69.jsonl` 或 `global_step_70/actor`。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 约 33.8G/33.8G、util 57%/71%。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 16:39:45，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不启动 M1/M3。

### 2026-07-26 16:49 巡检补充

- M2 新写出 `rollout_dump/69.jsonl`（2026-07-26 16:47:44），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=69。
- Step69 指标：Geo3K accuracy=0.7875（80 samples）、text accuracy=0.5511（176 samples）；M2 checkpoint 仍为 step65，尚无 `global_step_69/actor` 或 `global_step_70/actor`。
- M2 继续运行，GPU2/3 约 38.5G/38.6G、util 40%/38%；日志仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；当前仍没有干净 2-GPU lane，不启动 M1/M3；evaluation supervisor 继续等待 M1 step150。

### 2026-07-26 16:56 巡检补充

- M2 latest rollout 仍为 `69.jsonl`，checkpoint 仍为 step65；尚无 `global_step_70/actor`，训练日志尚未打印 step69 完整指标行。
- M2 launcher/trainer/workers 均存活，GPU2/3 约 38.5G/38.6G、util 30%/28%；错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- evaluation supervisor 最新心跳为 2026-07-26 16:54:45，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不启动 M1/M3。

### 2026-07-26 17:04 巡检补充

- M2 latest rollout 仍为 `69.jsonl`，checkpoint 仍为 step65；尚无 `global_step_70/actor`。
- M2 workers 已从 `actor_rollout_ref_compute_log_prob` 推进到 `actor_rollout_ref_compute_ref_log_prob`；GPU2/3 约 7.2G/6.8G、util 64%/62%。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 16:59:45，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不启动 M1/M3。

### 2026-07-26 17:13 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `69.jsonl`，checkpoint 仍为 step65；尚无 `global_step_70/actor`。
- M2 workers 已回到 `actor_rollout_ref_update_actor`，GPU2/3 约 32.1G/32.1G、util 80%/76%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 17:09:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不启动 M1/M3。

### 2026-07-26 17:21 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `69.jsonl`，checkpoint 仍为 step65；尚无 `global_step_70/actor`，训练日志仍未打印 step69 完整指标行。
- M2 workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 34.0G/33.9G、util 70%/27%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 17:19:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不启动 M1/M3。

### 2026-07-26 17:30 巡检补充

- M2 新写出 `rollout_dump/70.jsonl`（2026-07-26 17:27:52），`latest_checkpointed_iteration.txt=70`；`global_step_70/actor` 已验证完整（7 files，约 25G）。
- M2 rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=70；step70 指标：Geo3K accuracy=0.6538（104 samples）、text accuracy=0.5592（152 samples）。
- M2 继续运行，GPU2/3 约 38.4G/38.5G、util 38%/40%；日志仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，暂不能恢复 M1 或启动 M3；evaluation supervisor 继续等待 M1 step150。

### 2026-07-26 17:37 巡检补充

- M2 latest rollout 仍为 `70.jsonl`，checkpoint 仍为 step70；尚无 `71.jsonl`、`global_step_71/actor` 或 `global_step_75/actor`。
- M2 launcher/trainer/workers 均存活，GPU2/3 显存暂降至约 1.5G/1.5G 但仍有活跃 CUDA 进程且 util 85%/100%，因此不能视为可用 lane。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 17:34:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲；当前仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 17:45 巡检补充

- M2 latest rollout 仍为 `70.jsonl`，checkpoint 仍为 step70；尚无 `71.jsonl`、`global_step_71/actor` 或 `global_step_75/actor`。
- M2 workers 从 `actor_rollout_ref_compute_log_prob` 回到 `actor_rollout_ref_update_actor`，GPU2/3 约 30.8G/30.8G、util 66%/58%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 17:44:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 17:53 巡检补充

- M2 latest rollout 仍为 `70.jsonl`，checkpoint 仍为 step70；尚无 `71.jsonl`、`global_step_71/actor` 或 `global_step_75/actor`。
- M2 workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.8G/33.8G、util 93%/0%（瞬时采样），launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 17:49:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 18:00 巡检补充

- M2 latest rollout 仍为 `70.jsonl`，checkpoint 仍为 step70；尚无 `71.jsonl`、`global_step_71/actor` 或 `global_step_75/actor`。
- M2 workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.9G/33.9G、util 49%/47%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 17:59:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 18:05 巡检补充

- M2 新写出 `rollout_dump/71.jsonl`（2026-07-26 18:02:34），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=71。
- Step71 指标：Geo3K accuracy=0.6905（168 samples）、text accuracy=0.6364（88 samples）；M2 checkpoint 仍为 step70，尚无 `global_step_71/actor` 或 `global_step_75/actor`。
- M2 继续运行，GPU2/3 约 38.5G/38.4G、util 41%/41%；日志仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；当前仍没有干净 2-GPU lane，不恢复 M1、不启动 M3；evaluation supervisor 继续等待 M1 step150。

### 2026-07-26 18:13 巡检补充

- M2 latest rollout 仍为 `71.jsonl`，checkpoint 仍为 step70；尚无 `72.jsonl`、`global_step_72/actor` 或 `global_step_75/actor`。
- M2 workers 处于 `actor_rollout_ref_compute_log_prob`，GPU2/3 约 9.9G/10.2G、util 75%/80%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 18:09:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 18:20 巡检补充

- M2 latest rollout 仍为 `71.jsonl`，checkpoint 仍为 step70；尚无 `72.jsonl`、`global_step_72/actor` 或 `global_step_75/actor`。
- M2 workers 已回到 `actor_rollout_ref_update_actor`，GPU2/3 约 31.0G/31.1G、util 63%/79%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 18:19:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 18:29 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `71.jsonl`，checkpoint 仍为 step70；尚无 `72.jsonl`、`global_step_72/actor` 或 `global_step_75/actor`。
- M2 workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.1G/33.7G、util 55%/64%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 18:24:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 18:40 巡检补充

- M2 新写出 `rollout_dump/72.jsonl`（2026-07-26 18:36:37），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=72。
- Step72 指标：Geo3K accuracy=0.7500（136 samples）、text accuracy=0.6083（120 samples）；M2 checkpoint 仍为 step70，尚无 `global_step_72/actor` 或 `global_step_75/actor`。
- M2 launcher/trainer/workers 均存活，GPU2/3 约 38.6G/38.7G、util 43%/44%；日志仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 占用；当前仍没有干净 2-GPU lane，不恢复 M1、不启动 M3；evaluation supervisor 继续等待 M1 step150。

### 2026-07-26 18:48 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `72.jsonl`，checkpoint 仍为 step70；尚无 `73.jsonl`、`global_step_73/actor` 或 `global_step_75/actor`。
- M2 workers 处于 `actor_rollout_ref_compute_ref_log_prob`，GPU2/3 约 6.5G/6.6G、util 100%/100%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 18:44:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 18:56 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `72.jsonl`，checkpoint 仍为 step70；尚无 `73.jsonl`、`global_step_73/actor` 或 `global_step_75/actor`。
- M2 workers 已回到 `actor_rollout_ref_update_actor`，GPU2/3 约 31.4G/31.4G、util 56%/65%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 18:54:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 19:03 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `72.jsonl`，checkpoint 仍为 step70；尚无 `73.jsonl`、`global_step_73/actor` 或 `global_step_75/actor`。
- M2 workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.2G/33.4G、util 74%/68%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 18:59:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 19:12 巡检补充

- M2 新写出 `rollout_dump/73.jsonl`（2026-07-26 19:11:03），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=73。
- Step73 指标：Geo3K accuracy=0.6328（128 samples）、text accuracy=0.6094（128 samples）；M2 checkpoint 仍为 step70，尚无 `global_step_73/actor` 或 `global_step_75/actor`。
- M2 继续运行，GPU2/3 约 38.6G/38.5G、util 38%/39%；训练日志显示进度已到 73/150，错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3；evaluation supervisor 继续等待 M1 step150。

### 2026-07-26 19:21 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `73.jsonl`，checkpoint 仍为 step70；尚无 `74.jsonl`、`global_step_74/actor` 或 `global_step_75/actor`。
- M2 workers 处于 `actor_rollout_ref_compute_log_prob`，GPU2/3 约 9.9G/10.0G、util 63%/53%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 19:19:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 19:28 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `73.jsonl`，checkpoint 仍为 step70；尚无 `74.jsonl`、`global_step_74/actor` 或 `global_step_75/actor`。
- M2 workers 已回到 `actor_rollout_ref_update_actor`，GPU2/3 约 31.1G/31.0G、util 68%/69%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 19:24:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 19:36 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `73.jsonl`，checkpoint 仍为 step70；尚无 `74.jsonl`、`global_step_74/actor` 或 `global_step_75/actor`。
- M2 workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.8G/33.8G、util 84%/89%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 19:34:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 19:44 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `73.jsonl`，checkpoint 仍为 step70；尚无 `74.jsonl`、`global_step_74/actor` 或 `global_step_75/actor`。
- M2 workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.8G/33.8G、util 62%/64%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 19:39:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 19:45 巡检补充

- M2 新写出 `rollout_dump/74.jsonl`（2026-07-26 19:44:46），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=74。
- Step74 指标：Geo3K accuracy=0.6597（144 samples）、text accuracy=0.4643（112 samples）；M2 checkpoint 仍为 step70，尚无 `global_step_74/actor` 或 `global_step_75/actor`。
- M2 继续运行，GPU2/3 约 38.6G/38.5G、util 39%/38%；launcher/trainer/workers 均存活，错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3；evaluation supervisor 继续等待 M1 step150。

### 2026-07-26 19:53 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `74.jsonl`，checkpoint 仍为 step70；尚无 `75.jsonl`、`global_step_75/actor` 或 `global_step_76/actor`。
- M2 launcher/trainer/workers 均存活，GPU2/3 约 38.6G/38.5G、util 29%/31%；错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- evaluation supervisor 最新心跳为 2026-07-26 19:49:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 20:01 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `74.jsonl`，checkpoint 仍为 step70；尚无 `75.jsonl`、`global_step_75/actor` 或 `global_step_76/actor`。
- M2 workers 已回到 `actor_rollout_ref_update_actor`，GPU2/3 约 30.5G/30.5G、util 66%/45%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 19:59:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 20:09 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `74.jsonl`，checkpoint 仍为 step70；尚无 `75.jsonl`、`global_step_75/actor` 或 `global_step_76/actor`。
- M2 workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 32.5G/32.5G、util 67%/86%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 20:04:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 20:16 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `74.jsonl`，checkpoint 仍为 step70；尚无 `75.jsonl`、`global_step_75/actor` 或 `global_step_76/actor`。
- M2 workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.8G/34.0G、util 50%/62%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 20:14:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 20:24 巡检补充

- M2 新写出 `rollout_dump/75.jsonl`（2026-07-26 20:21:39），`latest_checkpointed_iteration.txt=75`；`global_step_75/actor` 已验证完整（7 files，约 25G）。
- M2 rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=75；step75 指标：Geo3K accuracy=0.6029（136 samples）、text accuracy=0.7583（120 samples）。
- M2 继续运行，GPU2/3 约 38.1G/38.1G、util 35%/29%；错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；下一 checkpoint 目标 step80。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3；evaluation supervisor 继续等待 M1 step150。

### 2026-07-26 20:33 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `75.jsonl`，checkpoint 仍为 step75；`global_step_75/actor` 仍完整（7 files，约 25G），尚无 `76.jsonl`、`global_step_76/actor` 或 `global_step_80/actor`。
- M2 launcher/trainer/workers 均存活，GPU2/3 约 38.5G/38.7G、util 48%/42%；错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- evaluation supervisor 最新心跳为 2026-07-26 20:29:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 20:42 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `75.jsonl`，checkpoint 仍为 step75；`global_step_75/actor` 仍完整（7 files，约 25G），尚无 `76.jsonl`、`global_step_76/actor` 或 `global_step_80/actor`。
- M2 workers 处于 `actor_rollout_ref_compute_log_prob`，GPU2/3 约 9.9G/10.3G、util 52%/50%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 20:39:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 20:50 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `75.jsonl`，checkpoint 仍为 step75；`global_step_75/actor` 仍完整（7 files，约 25G），尚无 `76.jsonl`、`global_step_76/actor` 或 `global_step_80/actor`。
- M2 workers 已回到 `actor_rollout_ref_update_actor`，GPU2/3 约 31.2G/31.1G、util 58%/100%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 20:49:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 20:57 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `75.jsonl`，checkpoint 仍为 step75；`global_step_75/actor` 仍完整（7 files，约 25G），尚无 `76.jsonl`、`global_step_76/actor` 或 `global_step_80/actor`。
- M2 workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 32.4G/32.3G、util 82%/65%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 20:54:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 21:06 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `75.jsonl`，checkpoint 仍为 step75；`global_step_75/actor` 仍完整（7 files，约 25G），尚无 `76.jsonl`、`global_step_76/actor` 或 `global_step_80/actor`。
- M2 workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.9G/33.9G、util 24%/71%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 21:04:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 21:14 巡检补充

- M2 新写出 `rollout_dump/76.jsonl`（2026-07-26 21:12:56），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=76。
- Step76 指标：Geo3K accuracy=0.6979（96 samples）、text accuracy=0.5688（160 samples）；M2 checkpoint 仍为 step75，`global_step_75/actor` 仍完整（7 files，约 25G），尚无 `global_step_76/actor` 或 `global_step_80/actor`。
- M2 继续运行，GPU2/3 约 38.6G/38.6G、util 38%/39%；错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；下一 checkpoint 目标 step80。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3；evaluation supervisor 继续等待 M1 step150。

### 2026-07-26 21:22 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `76.jsonl`，checkpoint 仍为 step75；尚无 `77.jsonl`、`global_step_77/actor` 或 `global_step_80/actor`。
- M2 workers 处于 `actor_rollout_ref_compute_log_prob`，GPU2/3 约 9.8G/10.1G、util 74%/91%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 21:19:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 21:30 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `76.jsonl`，checkpoint 仍为 step75；尚无 `77.jsonl`、`global_step_77/actor` 或 `global_step_80/actor`。
- M2 workers 已回到 `actor_rollout_ref_update_actor`，GPU2/3 约 31.0G/30.9G、util 95%/92%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 21:29:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 21:38 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `76.jsonl`，checkpoint 仍为 step75；尚无 `77.jsonl`、`global_step_77/actor` 或 `global_step_80/actor`。
- M2 workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.8G/33.8G、util 85%/85%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 21:34:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 21:46 巡检补充

- M2 新写出 `rollout_dump/77.jsonl`（2026-07-26 21:46:36），rollout summary 与 `dashboard/mm/js/data-m2-rollouts.js` 已刷新并确认 dashboard max step=77。
- Step77 指标：Geo3K accuracy=0.7500（128 samples）、text accuracy=0.6094（128 samples）；M2 checkpoint 仍为 step75，尚无 `global_step_77/actor` 或 `global_step_80/actor`。
- M2 继续运行，GPU2/3 约 38.5G/38.5G、util 37%/39%；错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；下一 checkpoint 目标 step80。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3；evaluation supervisor 继续等待 M1 step150。

### 2026-07-26 21:56 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `77.jsonl`，checkpoint 仍为 step75；尚无 `78.jsonl`、`global_step_78/actor` 或 `global_step_80/actor`。
- M2 workers 处于 `actor_rollout_ref_compute_log_prob`，GPU2/3 约 9.8G/10.2G、util 84%/70%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 21:54:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。
