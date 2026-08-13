# 多模态消融实验结果与运行日志

> 方案见 [`exp_plan_mm.md`](./exp_plan_mm.md)。本文只记录**进度、事故、巡检与评测数字**；方案设计不在此重复。

## 0. 当前状态摘要（2026-07-27 15:03 巡检补充）

- GPU 状态：GPU0 仍约 74.9G `[Not Found]` 残留，GPU1 约 74.5G `[Not Found]` 且 util 100%；GPU2/GPU3 由 M2 占用，当前约 9.9G/10.0G，util 53%/53%；没有干净双卡可开新任务。
- M1 `m1_geo3k100_2b`：用户已确认可停止；本轮仍停在 checkpoint 130，最新 rollout `130.jsonl`，最新 actor `global_step_130/actor`，无 step150 actor 和完成标记；不再恢复 M1。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 均存活，worker 当前处于 `actor_rollout_ref_compute_log_prob`；最新 rollout 仍为 `103.jsonl`（14:52:36，约 5.7MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整，尚无 `global_step_105/actor`。
- M2 指标：CSV/dashboard 已刷新到 step103，共 206 行；step103 Geo3K 168 samples，acc 0.7679，mean_score 0.6911；text 88 samples，acc 0.5795，mean_score 0.1591。
- 评估 pipeline：supervisor 仍心跳到 14:59:47，并继续等待 M1 step150；若正式放弃 M1 后续评估，需要后续调整/停止该评估等待逻辑。
- M3 `m3_mix20_2b`：未启动；当前无可用干净双卡，因此不启动新任务。

## 1. 已完成评测（M0 基线）

M0(=E1 step150) 正式基线评测（文本基线已完成并写入 `evaluation/completed/m0_e1_grpo_2b_text.done`：MMLU_TEMP AverageAccuracy=0.7834，AIME24 AveragePass@1=0.3542，AIME25 AveragePass@1=0.3250，MATH500 AveragePass@1=0.8635；Geo3K 601/601 已完成并写入 `evaluation/completed/m0_e1_grpo_2b_geo3k.done`：sample_accuracy=0.5732、pass@8=0.8369；输出见 `evaluation/geo3k/m0_e1_grpo_2b_step150.jsonl.summary.json`）

## 2. 评测流水线运行备注

2026-07-24 14:15 起 M2 已临时并行占用 GPU2/3；为避免 M1 step150 后评测与 M2 抢卡，2026-07-24 16:44 已将评测默认 GPU 从 2 改为 0，并重启等待中的 supervisor（`logs/exp2card_mm/evaluation_pipeline/supervisor.pid=833608`）。

## 3. 训练进度叙事（从方案文档迁出）

### 3.1 训练过程指标与 M1/M2 早期进度（原 §7）

M1 首轮正式 run 的 step 1–104 已生成早期汇总：`evaluation/mm_rollouts/m1_geo3k100_2b_rollout_summary.csv`（运行产物，因 `evaluation/` 被 `.gitignore` 忽略不入仓）和 `dashboard/mm/js/data-m1-rollouts.js`（看板数据快照，26624 samples，overall accuracy=0.6674，mean_score=0.6007；step104 单步 accuracy=0.6992，mean_score=0.6293）。2026-07-24 18:45 M1 在 step105 后同样触发 Ray node memory OOM；由于最后落盘 checkpoint 仍是 step100，2026-07-24 18:46 自动重启后实际训练状态回退到 ckpt100，step101–105 属于未 checkpoint 证据，已复制保留到 `logs/exp2card_mm/m1_geo3k100_2b_pre_oom_step105_uncheckpointed/`。2026-07-24 19:26 M1 重启 run 写出新的 step101 rollout（accuracy=0.7656，mean_score=0.6891）；为避免把 OOM 前未 checkpoint 的旧 step102–105 混入当前 run，已在确认备份一致后将 live `rollout_dump/102.jsonl`–`105.jsonl` 移到 `logs/exp2card_mm/m1_geo3k100_2b_pre_oom_step105_uncheckpointed/removed_from_live_after_resume_20260724_1927/rollout_dump/`。2026-07-24 20:04 M1 重启 run 写出新 step102（accuracy=0.6484，mean_score=0.5836），2026-07-24 20:37 写出新 step103（accuracy=0.7109，mean_score=0.6398），2026-07-24 21:10 写出新 step104（accuracy=0.7227，mean_score=0.6504），2026-07-24 21:51 写出新 step105（accuracy=0.5508，mean_score=0.4957），2026-07-24 22:26 写出新 step106（accuracy=0.5625，mean_score=0.5063），2026-07-24 22:58 写出新 step107（accuracy=0.6797，mean_score=0.6117），已越过旧 run 的 step105 OOM 点且当前无错误；2026-07-25 00:49 已确认 `latest_checkpointed_iteration.txt=110` 与 `global_step_110/actor`，live rollout/训练指标已同步到 step110（step110：accuracy=0.5586，mean_score=0.5027；`dashboard/mm/js/data-m1-rollouts.js` 与 `dashboard/mm/js/data-m1-train.js` 已刷新）；2026-07-25 01:27 M1 写出 step111 rollout（accuracy=0.5938，mean_score=0.5344），rollout dashboard 已同步；2026-07-25 02:06 M1 写出 step112 rollout（accuracy=0.6211，mean_score=0.5590），rollout/train dashboard 已同步；2026-07-25 02:40 M1 写出 step113 rollout（accuracy=0.7188，mean_score=0.6469），rollout dashboard 已同步；2026-07-25 03:17 M1 写出 step114 rollout（accuracy=0.6445，mean_score=0.5801），rollout/train dashboard 已同步；2026-07-25 03:54 M1 写出 step115 rollout（accuracy=0.6484，mean_score=0.5836），rollout dashboard 已同步；2026-07-25 04:34 M1 写出 step116 rollout（accuracy=0.6914，mean_score=0.6223），rollout/train dashboard 已同步；2026-07-25 05:10 M1 写出 step117 rollout（accuracy=0.6445，mean_score=0.5801），rollout dashboard 已同步；2026-07-25 05:44 M1 写出 step118 rollout（accuracy=0.7305，mean_score=0.6574），rollout/train dashboard 已同步；2026-07-25 06:20 M1 写出 step119 rollout（accuracy=0.6172，mean_score=0.5555），rollout dashboard 已同步；2026-07-25 07:08 已确认 `latest_checkpointed_iteration.txt=120`、`global_step_120/actor` 完整落盘（7 files，约25G）与 step120 rollout（accuracy=0.7227，mean_score=0.6504），rollout/train dashboard 已同步；2026-07-25 07:26 M1 写出 step121 rollout（accuracy=0.7148，mean_score=0.6434），rollout dashboard 已同步；2026-07-25 08:01 M1 写出 step122 rollout（accuracy=0.6992，mean_score=0.6293），rollout/train dashboard 已同步；2026-07-25 08:34 M1 写出 step123 rollout（accuracy=0.7891，mean_score=0.7102），rollout dashboard 已同步；2026-07-25 09:11 M1 写出 step124 rollout（accuracy=0.6680，mean_score=0.6012），rollout/train dashboard 已同步；2026-07-25 09:46 M1 写出 step125 rollout（accuracy=0.7656，mean_score=0.6891），rollout dashboard 已同步；2026-07-25 10:32 M1 写出 step126 rollout（accuracy=0.6797，mean_score=0.6117），rollout/train dashboard 已同步；2026-07-25 11:07 M1 写出 step127 rollout（accuracy=0.7031，mean_score=0.6328），rollout dashboard 已同步；2026-07-25 11:45 M1 写出 step128 rollout（accuracy=0.6758，mean_score=0.6082），rollout/train dashboard 已同步；2026-07-25 12:15 M1 写出 step129 rollout（accuracy=0.8125，mean_score=0.7313），rollout dashboard 已同步；2026-07-25 13:00 已确认 `latest_checkpointed_iteration.txt=130`、`global_step_130/actor` 完整落盘（7 files，约25G）与 step130 rollout（accuracy=0.7344，mean_score=0.6609），rollout/train dashboard 已同步；2026-07-25 13:25 M1 写出 step131 rollout（accuracy=0.6562，mean_score=0.5906），rollout dashboard 已同步，下一 checkpoint 目标 step140。M2 首次并行 run 在 step6 后触发 Ray node memory OOM；该 partial run 的原始日志/rollout 已归档到 `logs/exp2card_mm/m2_mix50_2b_failed_20260724_1841_oom_step6/`（step6 累计：Geo3K 672 samples，accuracy=0.5625、mean_score=0.5063；text 864 samples，accuracy=0.4236、mean_score=-0.1528）。2026-07-24 18:47 已用 `MM_SAVE_FREQ=5` 和 `MM_RAY_MEMORY_USAGE_THRESHOLD=0.99` 重启 M2，后续以新 run 的 checkpoint/rollout 为正式进度；2026-07-24 19:37 新 run 写出 step1，2026-07-24 20:18 写出 step2，2026-07-24 21:01 写出 step3，2026-07-24 21:47 写出 step4，2026-07-24 22:30 写出 step5 且 `latest_checkpointed_iteration.txt=5`、`global_step_5/actor` 已确认（actor 12 files，约 26.6GB）；2026-07-24 23:09 写出 step6；2026-07-25 01:16 已同步到新 run step9 且当前无错误；2026-07-25 01:54 已确认 `latest_checkpointed_iteration.txt=10` 与 `global_step_10/actor`（actor 约 25GB），并同步到 step10 rollout（Geo3K 144 samples，accuracy=0.6458、mean_score=0.5813；text 112 samples，accuracy=0.5536、mean_score=0.1071）；2026-07-25 02:33 M2 写出 step11 rollout（Geo3K 128 samples，accuracy=0.6250、mean_score=0.5625；text 128 samples，accuracy=0.4766、mean_score=-0.0469），summary/dashboard 已同步；2026-07-25 03:17 M2 写出 step12 rollout（Geo3K 144 samples，accuracy=0.5417、mean_score=0.4875；text 112 samples，accuracy=0.3304、mean_score=-0.3393），summary/dashboard 已同步；2026-07-25 03:53 M2 写出 step13 rollout（Geo3K 168 samples，accuracy=0.6488、mean_score=0.5839；text 88 samples，accuracy=0.5000、mean_score=0.0000），summary/dashboard 已同步；2026-07-25 04:30 M2 写出 step14 rollout（Geo3K 136 samples，accuracy=0.6324、mean_score=0.5691；text 120 samples，accuracy=0.3417、mean_score=-0.3167），summary/dashboard 已同步；2026-07-25 05:11 已确认 `latest_checkpointed_iteration.txt=15`、`global_step_15/actor` 与 step15 rollout（Geo3K 96 samples，accuracy=0.7188、mean_score=0.6469；text 160 samples，accuracy=0.4313、mean_score=-0.1375），summary/dashboard 已同步；2026-07-25 05:54 M2 写出 step16 rollout（Geo3K 96 samples，accuracy=0.6771、mean_score=0.6094；text 160 samples，accuracy=0.4938、mean_score=-0.0125），summary/dashboard 已同步；2026-07-25 06:33 M2 写出 step17 rollout（Geo3K 120 samples，accuracy=0.5250、mean_score=0.4725；text 136 samples，accuracy=0.4779、mean_score=-0.0441），summary/dashboard 已同步；2026-07-25 07:11 M2 写出 step18 rollout（Geo3K 88 samples，accuracy=0.6591、mean_score=0.5932；text 168 samples，accuracy=0.5238、mean_score=0.0476），summary/dashboard 已同步；2026-07-25 07:53 M2 写出 step19 rollout（Geo3K 120 samples，accuracy=0.5250、mean_score=0.4725；text 136 samples，accuracy=0.3971、mean_score=-0.2059），summary/dashboard 已同步；2026-07-25 08:30 已确认 `latest_checkpointed_iteration.txt=20`、`global_step_20/actor` 完整落盘（7 files，约25G）与 step20 rollout（Geo3K 176 samples，accuracy=0.5909、mean_score=0.5318；text 80 samples，accuracy=0.5250、mean_score=0.0500），summary/dashboard 已同步；2026-07-25 09:13 M2 写出 step21 rollout（Geo3K 112 samples，accuracy=0.4107、mean_score=0.3696；text 144 samples，accuracy=0.5625、mean_score=0.1250），summary/dashboard 已同步；2026-07-25 10:02 M2 写出 step22 rollout（Geo3K 96 samples，accuracy=0.4062、mean_score=0.3656；text 160 samples，accuracy=0.4125、mean_score=-0.1750），summary/dashboard 已同步；2026-07-25 10:44 M2 写出 step23 rollout（Geo3K 128 samples，accuracy=0.6250、mean_score=0.5625；text 128 samples，accuracy=0.4453、mean_score=-0.1094），summary/dashboard 已同步；2026-07-25 11:22 M2 写出 step24 rollout（Geo3K 136 samples，accuracy=0.6544、mean_score=0.5890；text 120 samples，accuracy=0.5500、mean_score=0.1000），summary/dashboard 已同步；2026-07-25 12:05 已确认 `latest_checkpointed_iteration.txt=25`、`global_step_25/actor` 完整落盘（7 files，约25G）与 step25 rollout（Geo3K 152 samples，accuracy=0.7434、mean_score=0.6691；text 104 samples，accuracy=0.5000、mean_score=0.0000），summary/dashboard 已同步；2026-07-25 12:54 M2 写出 step26 rollout（Geo3K 96 samples，accuracy=0.6458、mean_score=0.5813；text 160 samples，accuracy=0.4813、mean_score=-0.0375），summary/dashboard 已同步；`logs/exp2card_mm/m2_mix50_2b/launcher.pid=903677` 仍在运行，下一 checkpoint 目标为 step30。

### 3.2 M1 → M2 → M3 正式训练进度（原 §9 待办展开）

M1 已于 2026-07-22 用脱离会话的后台进程重新启动，首轮正式 rollout 推进到 step105 后于 2026-07-24 18:45 触发 Ray node memory OOM；`global_step_100/actor` 已落盘且 `latest_checkpointed_iteration.txt=100`，因此 2026-07-24 18:46 自动重启后实际从 ckpt100 恢复，未 checkpoint 的 step101–105 证据已复制到 `logs/exp2card_mm/m1_geo3k100_2b_pre_oom_step105_uncheckpointed/`；2026-07-24 19:26 M1 重启 run 写出新 step101，旧 step102–105 已从 live rollout 目录移到 `logs/exp2card_mm/m1_geo3k100_2b_pre_oom_step105_uncheckpointed/removed_from_live_after_resume_20260724_1927/rollout_dump/`，避免污染当前汇总和后续写文件；2026-07-24 20:04 M1 写出新 step102，2026-07-24 20:37 写出新 step103，2026-07-24 21:10 写出新 step104，2026-07-24 21:51 写出新 step105，2026-07-24 22:26 写出新 step106，2026-07-24 22:58 写出新 step107，已越过旧 run 的 step105 OOM 点；2026-07-25 00:49 确认 step110 checkpoint，2026-07-25 07:08 checkpoint/dashboard 已同步到 step120（actor 7 files，约25G；step120 accuracy=0.7227），2026-07-25 07:26 rollout/dashboard 已同步到 step121（accuracy=0.7148），2026-07-25 08:01 rollout/train dashboard 已同步到 step122（accuracy=0.6992），2026-07-25 08:34 rollout dashboard 已同步到 step123（accuracy=0.7891），2026-07-25 09:11 rollout/train dashboard 已同步到 step124（accuracy=0.6680），2026-07-25 09:46 rollout dashboard 已同步到 step125（accuracy=0.7656），2026-07-25 10:32 rollout/train dashboard 已同步到 step126（accuracy=0.6797），2026-07-25 11:07 rollout dashboard 已同步到 step127（accuracy=0.7031），2026-07-25 11:45 rollout/train dashboard 已同步到 step128（accuracy=0.6758），2026-07-25 12:15 rollout dashboard 已同步到 step129（accuracy=0.8125），2026-07-25 13:00 checkpoint/rollout/train dashboard 已同步到 step130（actor 7 files，约25G；accuracy=0.7344），2026-07-25 13:25 rollout dashboard 已同步到 step131（accuracy=0.6562），2026-07-25 14:02 rollout/train dashboard 已同步到 step132（accuracy=0.6133，mean_score=0.5520），2026-07-25 14:38 rollout dashboard 已同步到 step133（accuracy=0.7500，mean_score=0.6750；train dashboard 暂滞后到 step132），2026-07-25 15:18 rollout/train dashboard 已同步到 step134（accuracy=0.6875，mean_score=0.6188），2026-07-25 15:55 rollout dashboard 已同步到 step135（accuracy=0.6641，mean_score=0.5977；train dashboard 暂滞后到 step134），2026-07-25 16:30 M1 写出未 checkpoint 的 step136 后触发 Ray node memory OOM；最后可信 checkpoint 仍为 step130，pipeline 已于 16:31 自动重启新 run，并在 16:36 从 `global_step_130` 加载 model/optimizer/rng/lr_scheduler。为避免污染当前汇总，已将 live `rollout_dump/131.jsonl`–`136.jsonl` 移到 `logs/exp2card_mm/m1_geo3k100_2b_pre_oom_step136_uncheckpointed/removed_from_live_after_resume_20260725_1642/rollout_dump/`，M1 rollout dashboard 回退并同步到可信 step130，train dashboard 已裁剪到 checkpointed/live-clean step130；2026-07-25 17:03 新 run 仍在进行（actor_rollout_ref_update_actor），期间 raylet 报告 4 个 worker 因 memory pressure 被杀；随后该 run 在重新写出未 checkpoint step131 后再次 Ray OOM 退出，pipeline 已于 17:09 第三次从 `global_step_130` 自动恢复。2026-07-25 17:20 已将此次失败的 live `rollout_dump/131.jsonl` 移到 `logs/exp2card_mm/m1_geo3k100_2b_pre_oom_step131_retry_uncheckpointed/removed_from_live_after_resume_20260725_1720/rollout_dump/`，M1 rollout/train dashboard 均保持 checkpointed/live-clean step130；后续多次自动 retry 均卡在 GPU0 CUDA OOM（GPU0 约74.9G 显存被无 nvidia-smi PID 的残留上下文占用，`nvidia-smi --gpu-reset -i 0` 因权限不足失败），2026-07-25 23:17 已终止当前 M1 retry 进程树并暂停 `scripts/train/run_mm_training_pipeline.sh`，避免继续消耗；最新一次未 checkpoint `rollout_dump/131.jsonl` 已移到 `logs/exp2card_mm/m1_geo3k100_2b_pre_oom_step131_retry2_uncheckpointed/removed_from_live_after_pause_20260725_2318/rollout_dump/`；M1 下一步需等待 GPU0 被管理员/root reset 或等 M2 释放 GPU2/3 后改用空闲 2-GPU lane 从 step130 恢复；`scripts/eval/run_mm_evaluation_pipeline.sh` 仍在等待 step150 actor checkpoint，默认使用 GPU0 评测以避开 M2 的 GPU2/3；supervisor 已补充 7200s 无文件进展的保守 stale 保护；M2 首次并行 run 在 step6 后因 Ray node memory OOM 退出，已归档到 `logs/exp2card_mm/m2_mix50_2b_failed_20260724_1841_oom_step6/`；由于尚无 step10 checkpoint，2026-07-24 18:47 已从头重启 M2，`logs/exp2card_mm/m2_mix50_2b/launcher.pid=903677`，使用 `MM_CUDA_VISIBLE_DEVICES=2,3`、`MM_SAVE_FREQ=5`、`MM_RAY_MEMORY_USAGE_THRESHOLD=0.99`；2026-07-24 19:37 M2 新 run 写出 step1 rollout，2026-07-24 20:18 写出 step2 rollout，2026-07-24 21:01 写出 step3 rollout，2026-07-24 21:47 写出 step4 rollout，2026-07-24 22:30 写出 step5 rollout且无错误，并已确认 `latest_checkpointed_iteration.txt=5` 与 `global_step_5/actor`；2026-07-24 23:09 写出 step6 rollout，2026-07-25 01:54 确认 step10 checkpoint，2026-07-25 05:11 checkpoint/rollout/summary/dashboard 已同步到 step15（step15：Geo3K accuracy=0.7188、text accuracy=0.4313），2026-07-25 05:54 rollout/summary/dashboard 已同步到 step16（Geo3K accuracy=0.6771、text accuracy=0.4938），2026-07-25 06:33 rollout/summary/dashboard 已同步到 step17（Geo3K accuracy=0.5250、text accuracy=0.4779），2026-07-25 07:11 rollout/summary/dashboard 已同步到 step18（Geo3K accuracy=0.6591、text accuracy=0.5238），2026-07-25 07:53 rollout/summary/dashboard 已同步到 step19（Geo3K accuracy=0.5250、text accuracy=0.3971），2026-07-25 08:30 checkpoint/rollout/summary/dashboard 已同步到 step20（actor 7 files，约25G；Geo3K accuracy=0.5909、text accuracy=0.5250），2026-07-25 09:13 rollout/summary/dashboard 已同步到 step21（Geo3K accuracy=0.4107、text accuracy=0.5625），2026-07-25 10:02 rollout/summary/dashboard 已同步到 step22（Geo3K accuracy=0.4062、text accuracy=0.4125），2026-07-25 10:44 rollout/summary/dashboard 已同步到 step23（Geo3K accuracy=0.6250、text accuracy=0.4453），2026-07-25 11:22 rollout/summary/dashboard 已同步到 step24（Geo3K accuracy=0.6544、text accuracy=0.5500），2026-07-25 12:05 checkpoint/rollout/summary/dashboard 已同步到 step25（actor 7 files，约25G；Geo3K accuracy=0.7434、text accuracy=0.5000），2026-07-25 12:54 rollout/summary/dashboard 已同步到 step26（Geo3K accuracy=0.6458、text accuracy=0.4813），2026-07-25 13:39 rollout/summary/dashboard 已同步到 step27（Geo3K accuracy=0.6833、text accuracy=0.3750），2026-07-25 14:18 rollout/summary/dashboard 已同步到 step28（Geo3K accuracy=0.6912、text accuracy=0.5250），2026-07-25 14:57 rollout/summary/dashboard 已同步到 step29（Geo3K accuracy=0.7569、text accuracy=0.3750），2026-07-25 15:38 checkpoint/rollout/summary/dashboard 已同步到 step30（actor 7 files，约25G；Geo3K accuracy=0.7404、text accuracy=0.5789），2026-07-25 16:14 rollout/summary/dashboard 已同步到 step31（Geo3K accuracy=0.7583、text accuracy=0.7279），2026-07-25 16:53 rollout/summary/dashboard 已同步到 step32（Geo3K accuracy=0.6080、text accuracy=0.6000），2026-07-25 23:15 rollout/summary/dashboard 已同步到 step41，并确认 checkpoint step35/step40 actor 均为 7 files、约25G（step40：Geo3K accuracy=0.7885、text accuracy=0.5987；step41：Geo3K accuracy=0.7019、text accuracy=0.6447），2026-07-25 23:37 rollout/summary/dashboard 已同步到 step42（Geo3K accuracy=0.8250、text accuracy=0.5588），2026-07-26 00:15 rollout/summary/dashboard 已同步到 step43（Geo3K accuracy=0.7500、text accuracy=0.5250），2026-07-26 00:53 rollout/summary/dashboard 已同步到 step44（Geo3K accuracy=0.6250、text accuracy=0.4922），2026-07-26 01:34 checkpoint/rollout/summary/dashboard 已同步到 step45（actor 7 files，约25G；Geo3K accuracy=0.6458、text accuracy=0.5125），2026-07-26 02:12 rollout/summary/dashboard 已同步到 step46（Geo3K accuracy=0.7431、text accuracy=0.5804），2026-07-26 02:48 rollout/summary/dashboard 已同步到 step47（Geo3K accuracy=0.8235、text accuracy=0.5250），2026-07-26 03:26 rollout/summary/dashboard 已同步到 step48（Geo3K accuracy=0.5781、text accuracy=0.5469），2026-07-26 04:01 rollout/summary/dashboard 已同步到 step49（Geo3K accuracy=0.6500、text accuracy=0.5735），2026-07-26 04:33 checkpoint/rollout/summary/dashboard 已同步到 step50（actor 7 files，约25G；Geo3K accuracy=0.6806、text accuracy=0.5089），当前无错误，下一 checkpoint 目标 step60；M3 等待下一条空闲 2-GPU lane

## 4. 巡检日志

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

### 2026-07-26 22:04 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `77.jsonl`，checkpoint 仍为 step75；尚无 `78.jsonl`、`global_step_78/actor` 或 `global_step_80/actor`。
- M2 workers 已回到 `actor_rollout_ref_update_actor`，GPU2/3 约 30.9G/30.8G、util 45%/35%；launcher/trainer/workers 均存活。
- 错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED；evaluation supervisor 最新心跳为 2026-07-26 21:59:46，仍等待 M1 step150。
- GPU0 仍残留约 74.9G，GPU1 干净空闲，GPU2/3 被 M2 活跃占用；仍无干净 2-GPU lane，继续不恢复 M1、不启动 M3。

### 2026-07-26 22:12 巡检补充

- 继续等待约 6 分钟后，M2 latest rollout 仍为 `77.jsonl`，checkpoint 仍为 step75；尚无 `78.jsonl`、`global_step_78/actor` 或 `global_step_80/actor`。
- M2 workers 仍在 `actor_rollout_ref_update_actor`，GPU2/3 约 33.7G/33.9G、util 0%/100%（瞬时采样）；launcher/trainer/workers 均存活，错误扫描仍只见 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU1 从此前空闲变为约 74.5G 占用；`nvidia-smi --query-compute-apps` 显示 GPU1 上 PID 4003403 `[Not Found]` 占用约 74.5G，未找到可见进程，按泄漏/残留 CUDA context 处理，不视为可用。
- GPU0 仍残留约 74.9G，GPU2/3 被 M2 活跃占用；当前已无空闲干净 GPU，更无干净 2-GPU lane，继续不恢复 M1、不启动 M3；evaluation supervisor 最新心跳为 2026-07-26 22:09:46，仍等待 M1 step150。

### 2026-07-26 22:15 巡检补充
- GPU 状态：GPU0 仍有约 74.9G 无可见进程占用；GPU1 约 74.5G 且 `nvidia-smi --query-compute-apps` 显示 PID 4003403 `[Not Found]`，判定为泄漏/不可用；GPU2/3 由 M2 正常占用运行。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍在，最新 rollout 仍为 `77.jsonl`，尚无 `78.jsonl`；checkpoint 仍为 step75，尚无 `global_step_80/actor` 或 `global_step_150/actor`。
- M1 `m1_geo3k100_2b`：仍停在 checkpoint step130，`global_step_130/actor` 完整，尚无 step150；评测 supervisor 仍在等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动。
- 结论：当前没有干净的 2-GPU 空闲通道，不能安全恢复 M1，也不能开启 M3 或新任务；继续等待 GPU0/GPU1 泄漏释放或 M2 结束释放 GPU2/3。

### 2026-07-26 22:22 巡检补充
- M2 `m2_mix50_2b` 新增 `78.jsonl`（mtime 2026-07-26 22:19:53），已刷新 `evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv`、`.summary.json` 与 `dashboard/mm/js/data-m2-rollouts.js`，dashboard 最大 step 已到 78。
- step78 指标：Geo3K 160 samples，accuracy 0.7625，mean_score 0.68625；text 96 samples，accuracy 0.6250，mean_score 0.25。
- M2 进程仍存活并运行在 GPU2/3；checkpoint 仍为 step75，尚无 `global_step_80/actor`、`global_step_150/actor`。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用；GPU2/3 被 M2 占用，因此仍无干净 2-GPU lane。
- evaluation supervisor 最新心跳到 2026-07-26 22:19:46，仍等待 M1 `global_step_150/actor`；completion markers 中仍无 M1/M2/M3。
- 决策：继续让 M2 跑；不恢复 M1、不启动 M3，直到出现干净 2-GPU 通道。

### 2026-07-26 22:28 巡检补充
- M2 `m2_mix50_2b` 继续运行，最新 rollout 仍为 `78.jsonl`，尚无 `79.jsonl`；checkpoint 仍为 step75，尚无 `global_step_80/actor` 或 `global_step_150/actor`。
- GPU2/3 仍由 M2 占用（约 38.6G/38.6G，util 约 30%/25%）；M2 launcher/trainer/workers 均存活，错误扫描仍仅见 NUMA affinity warning。
- GPU0/GPU1 仍为约 74.9G/74.5G `[Not Found]` 残留占用，当前没有可用 2-GPU 通道。
- evaluation supervisor 最新心跳到 2026-07-26 22:24:46，仍等待 M1 `global_step_150/actor`。
- 决策不变：继续监督 M2；不恢复 M1、不启动 M3，等待干净 2-GPU lane。

### 2026-07-26 22:30 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `78.jsonl`，尚无 `79.jsonl`；checkpoint 仍为 step75，尚无 `global_step_80/actor` 或 step150。
- M2 workers 正在 `actor_rollout_ref_compute_log_prob`，GPU2/3 当前约 9.8G/10.1G、util 87%/100%，进程存活；错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍为约 74.9G/74.5G `[Not Found]` 残留占用，不可作为干净通道。
- M1 仍在 checkpoint step130，无 step150；M3 未启动；evaluation supervisor 心跳到 22:29:46，仍等待 M1 step150。
- 决策：继续等待 M2 推进；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-26 22:38 巡检补充
- M2 `m2_mix50_2b` 仍在运行，最新 rollout 仍为 `78.jsonl`，尚无 `79.jsonl`；checkpoint 仍为 step75，尚无 `global_step_80/actor` 或 step150。
- GPU2/3 仍由 M2 占用（约 30.7G/30.8G，util 约 51%/53%），workers 正在 `actor_rollout_ref_update_actor`。
- GPU0/GPU1 仍为约 74.9G/74.5G `[Not Found]` 残留占用；仍无干净 2-GPU lane。
- evaluation supervisor 心跳到 2026-07-26 22:34:46，仍等待 M1 `global_step_150/actor`；M1 停 step130，M3 未启动。
- 决策不变：继续监督 M2；不恢复 M1、不启动 M3、不新开任务。

### 2026-07-26 22:40 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `78.jsonl`，尚无 `79.jsonl`；checkpoint 仍为 step75，尚无 `global_step_80/actor` 或 step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 约 31.3G/31.3G，util 约 38%/28%。
- GPU0/GPU1 仍为约 74.9G/74.5G `[Not Found]` 残留占用；没有干净 2-GPU lane。
- M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 22:39:46，仍等待 M1 step150。
- 决策：继续监督 M2；不恢复 M1、不启动 M3、不新开任务。

### 2026-07-26 22:49 巡检补充
- 等待约 8 分钟后，M2 `m2_mix50_2b` 最新 rollout 仍为 `78.jsonl`，尚无 `79.jsonl`；checkpoint 仍为 step75，尚无 `global_step_80/actor` 或 step150。
- M2 进程均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 约 33.7G/33.8G，util 约 78%/77%，仍表现为正常训练中。
- 错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留占用，无干净 2-GPU lane。
- evaluation supervisor 心跳到 2026-07-26 22:44:46，仍等待 M1 `global_step_150/actor`；M1 停 step130，M3 未启动。
- 决策：继续监督 M2，不恢复 M1、不启动 M3、不新开任务。

### 2026-07-26 22:50 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `78.jsonl`，尚无 `79.jsonl`；checkpoint 仍为 step75，尚无 `global_step_80/actor` 或 step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 约 33.7G/33.8G，util 约 76%/52%。
- 错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留占用；没有干净 2-GPU lane。
- M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 22:49:46，仍等待 M1 step150。
- 决策不变：继续监督 M2，不恢复 M1、不启动 M3、不新开任务。

### 2026-07-26 23:04 巡检补充
- M2 `m2_mix50_2b` 新增 `79.jsonl`（mtime 2026-07-26 22:57:56），已刷新 `evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv`、`.summary.json` 与 `dashboard/mm/js/data-m2-rollouts.js`，dashboard 最大 step 已到 79。
- step79 指标：Geo3K 120 samples，accuracy 0.8083，mean_score 0.7275；text 136 samples，accuracy 0.5956，mean_score 0.1912。
- 短等后 M2 checkpoint 仍为 step75，尚无 `global_step_80/actor`、`global_step_150/actor`；M2 进程仍存活，GPU2/3 仍被占用。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用；连续多轮无干净 2-GPU lane，无法安全恢复 M1 或启动 M3。
- evaluation supervisor 最新心跳仍在等待 M1 `global_step_150/actor`；M1 停 step130，M3 未启动，completion markers 仍无 M1/M2/M3。
- 结论：M2 有进展但完整 M1→M2→M3 目标受外部 GPU 资源阻塞；已按阻塞状态处理，需等待 GPU0/GPU1 残留释放或 M2 释放 GPU2/3 后再继续。

### 2026-07-27 00:51 巡检补充
- 过夜复查：M2 `m2_mix50_2b` 已新增 `80.jsonl`（2026-07-26 23:38:44）与 `81.jsonl`（2026-07-27 00:15:30），checkpoint 已推进到 step80，`global_step_80/actor` 完整（7 files，约 25G）。
- 已刷新 `evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv`、`.summary.json` 与 `dashboard/mm/js/data-m2-rollouts.js`；dashboard 最大 step 到 81。
- step80 指标：Geo3K 88 samples，accuracy 0.7955，mean_score 0.7159；text 168 samples，accuracy 0.5655，mean_score 0.1310。
- step81 指标：Geo3K 136 samples，accuracy 0.7353，mean_score 0.6618；text 120 samples，accuracy 0.6000，mean_score 0.2000。
- M2 launcher/trainer/workers 均存活，错误扫描仍仅 NUMA affinity warning；GPU2/3 仍由 M2 占用（约 33.9G/33.9G）。
- GPU0 仍约 74.9G `[Not Found]` 残留；GPU1 降至约 7.8G 但仍有 PID 2251578 `[Not Found]` 占用，不视为干净 2-GPU lane。
- M1 仍停 checkpoint step130，尚无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 00:49:46，仍等待 M1 step150。
- 决策：继续让 M2 跑；当前仍不恢复 M1、不启动 M3，等待 GPU 残留清理或 M2 释放 GPU2/3。

### 2026-07-27 00:52 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `81.jsonl`，尚无 `82.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整（7 files，约 25G），尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 约 33.9G/33.9G，util 约 56%/62%。
- 错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED。
- GPU0 仍约 74.9G `[Not Found]` 残留；GPU1 又显示约 74.5G `[Not Found]` 残留（PID 2251578），不可用；仍无干净 2-GPU lane。
- M1 仍停 checkpoint step130，尚无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 00:49:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 00:54 巡检补充
- M2 `m2_mix50_2b` 新增 `82.jsonl`（mtime 2026-07-27 00:52:53），已刷新 `evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv`、`.summary.json` 与 `dashboard/mm/js/data-m2-rollouts.js`，dashboard 最大 step 已到 82。
- step82 指标：Geo3K 96 samples，accuracy 0.7708，mean_score 0.6938；text 160 samples，accuracy 0.5688，mean_score 0.1375。
- M2 checkpoint 仍为 step80，`global_step_80/actor` 完整（7 files，约 25G），尚无 step85/step100/step150；M2 launcher/trainer/workers 均存活。
- GPU2/3 仍由 M2 占用（约 38.6G/38.5G，util 约 40%/36%）；GPU0 仍约 74.9G `[Not Found]` 残留，GPU1 约 74.5G `[Not Found]` 残留，仍无干净 2-GPU lane。
- M1 仍停 checkpoint step130，尚无 `global_step_150/actor`；M3 未启动；evaluation supervisor 仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 00:55 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活；GPU2/3 仍由 M2 占用（约 38.6G/38.5G，util 约 40%/34%），错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 00:54:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 00:56 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活；GPU2/3 仍由 M2 占用（约 38.6G/38.5G，util 约 41%/40%），错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 00:54:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 00:58 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活；GPU2/3 仍由 M2 占用（约 38.6G/38.5G，util 约 39%/43%），错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 最近心跳仍在等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:01 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活；GPU2/3 仍由 M2 占用（约 38.6G/38.5G，util 约 28%/29%），错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 00:59:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:02 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活；GPU2/3 仍由 M2 占用（约 38.6G/38.5G，util 约 26%/27%），错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 00:59:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:04 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 正在 `actor_rollout_ref_compute_log_prob`；GPU2/3 当前约 9.9G/10.2G，util 约 52%/76%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 最近心跳仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:05 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_compute_log_prob`；GPU2/3 当前约 10.0G/10.3G，util 约 52%/45%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 01:04:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:06 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 正在 `actor_rollout_ref_compute_ref_log_prob`；GPU2/3 当前约 6.7G/6.6G，util 约 81%/70%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 最近心跳仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:08 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_compute_ref_log_prob`；GPU2/3 当前约 7.1G/6.8G，util 约 51%/49%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 最近心跳仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:09 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_compute_ref_log_prob`；GPU2/3 当前约 7.1G/6.8G，util 约 87%/68%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 最近心跳仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:10 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 回到 `actor_rollout_ref_update_actor`；GPU2/3 当前约 30.5G/30.5G，util 约 53%/37%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 01:09:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:12 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 当前约 31.2G/31.2G，util 约 49%/30%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 01:09:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:13 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 当前约 31.5G/31.5G，util 约 95%/71%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 01:09:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:15 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 当前约 31.7G/31.7G，util 约 65%/50%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 01:14:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:16 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 当前约 31.9G/31.9G，util 约 72%/56%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 01:14:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:18 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 当前约 32.1G/32.1G，util 约 71%/62%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 最近心跳仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:19 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 当前约 32.2G/32.2G，util 约 81%/71%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 最近心跳仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:20 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 当前约 33.8G/33.7G，util 约 99%/89%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 01:19:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:22 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 当前约 33.8G/33.8G，util 约 50%/100%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 01:19:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:23 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 当前约 33.8G/33.8G，util 约 69%/67%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 最近心跳仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:25 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 当前约 33.8G/33.8G，util 约 66%/44%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 01:24:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:26 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 当前约 33.8G/33.8G，util 约 56%/65%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 01:24:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:28 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 当前约 33.8G/33.8G，util 约 58%/42%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 最近心跳仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:29 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 当前约 33.8G/33.8G，util 约 77%/84%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 最近心跳仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:31 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `82.jsonl`，尚无 `83.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活，workers 仍在 `actor_rollout_ref_update_actor`；GPU2/3 当前约 33.8G/33.8G，util 约 47%/56%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 01:29:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:33 巡检补充
- M2 `m2_mix50_2b` 新增 `83.jsonl`（mtime 2026-07-27 01:32:11），已刷新 `evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv`、`.summary.json` 与 `dashboard/mm/js/data-m2-rollouts.js`，dashboard 最大 step 已到 83。
- step83 指标：Geo3K 104 samples，accuracy 0.7308，mean_score 0.6577；text 152 samples，accuracy 0.6382，mean_score 0.2763。
- M2 checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150；M2 launcher/trainer/workers 均存活。
- GPU2/3 仍由 M2 占用（约 38.6G/38.6G，util 约 36%/32%）；GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留占用，仍无干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 01:29:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:35 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `83.jsonl`，尚无 `84.jsonl`；checkpoint 仍为 step80，`global_step_80/actor` 完整，尚无 step85/step100/step150。
- M2 launcher/trainer/workers 均存活；GPU2/3 当前约 38.6G/38.6G，util 约 43%/40%，错误扫描仍仅 NUMA affinity warning。
- GPU0/GPU1 仍分别约 74.9G/74.5G `[Not Found]` 残留占用，没有干净 2-GPU lane。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；M3 未启动；evaluation supervisor 心跳到 2026-07-27 01:34:46，仍等待 M1 step150。
- 决策：继续监督 M2；当前不恢复 M1、不启动 M3、不新开任务。

### 2026-07-27 01:37 巡检补充
- GPU0/GPU1 仍被 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可作为新任务双卡通道。
- GPU2/GPU3 正在运行 `m2_mix50_2b`，worker 健康，最新 rollout 仍为 `83.jsonl`，尚未出现 `84.jsonl` 或 `global_step_85/actor`。
- `m1_geo3k100_2b` 仍停在 step130，评估 supervisor 继续等待 M1 step150；`m3_mix20_2b` 未启动。
- 结论：当前无空余可用 GPU，不启动新任务；继续保留 M2 运行，等待 GPU0/1 残留释放或 M2 完成释放 GPU2/3 后优先恢复 M1。

### 2026-07-27 01:38 巡检补充
- GPU0/GPU1 仍被 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU2/GPU3 仍由 `m2_mix50_2b` 占用（约 38.6G/38.6G），当前无干净 2-GPU lane。
- M2 launcher/trainer/workers 仍存活，GPU2/3 util 约 40%/37%；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`（mtime 2026-07-27 01:32:11），checkpoint 仍为 step80，尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，本轮无需刷新 dashboard。
- M1 仍停 checkpoint step130，`global_step_130/actor` 完整但无 step150；evaluation supervisor 心跳到 2026-07-27 01:34:46，仍等待 M1 step150。
- M3 仍未启动；决策：不启动新任务，继续监督 M2，等待可用双卡后优先恢复 M1。

### 2026-07-27 01:39 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU2/GPU3 仍由 `m2_mix50_2b` 占用（约 38.6G/38.6G），无可用干净双卡。
- M2 launcher/trainer/workers 仍存活，GPU2/3 util 约 32%/32%；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80，尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 step150；evaluation supervisor 最新可见心跳仍在 2026-07-27 01:34:46，继续等待 M1 step150。
- M3 未启动；决策：不启动新任务，继续监督 M2，等双卡可用后优先恢复 M1。

### 2026-07-27 01:40 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU2/GPU3 仍由 `m2_mix50_2b` 占用（约 38.6G/38.6G），当前无干净 2-GPU lane。
- M2 launcher/trainer/workers 仍存活，GPU2/3 util 约 31%/26%；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`（mtime 2026-07-27 01:32:11），checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，本轮无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 01:39:46，继续等待 M1 step150。
- M3 未启动；决策：不启动新任务，继续监督 M2，等双卡可用后优先恢复 M1。

### 2026-07-27 01:41 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU2/GPU3 仍由 `m2_mix50_2b` 占用（约 38.6G/38.6G），当前无干净 2-GPU lane。
- M2 launcher/trainer/workers 仍存活，GPU2/3 util 约 27%/24%；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`（mtime 2026-07-27 01:32:11），checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，本轮无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:39:46，继续等待 M1 step150。
- M3 未启动；决策：不启动新任务，继续监督 M2，等双卡可用后优先恢复 M1。

### 2026-07-27 01:42 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU2/GPU3 仍由 `m2_mix50_2b` 占用（约 38.6G/38.6G），当前无干净 2-GPU lane。
- M2 launcher/trainer/workers 仍存活，GPU2/3 util 约 26%/26%；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`（mtime 2026-07-27 01:32:11），checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，本轮无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:39:46，继续等待 M1 step150。
- M3 未启动；决策：不启动新任务，继续监督 M2，等双卡可用后优先恢复 M1。

### 2026-07-27 01:42 巡检补充（二）
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU2/GPU3 仍由 `m2_mix50_2b` 占用（约 38.6G/38.6G），当前无干净 2-GPU lane。
- M2 launcher/trainer/workers 仍存活，GPU2/3 util 约 26%/24%；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`（mtime 2026-07-27 01:32:11），checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，本轮无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:39:46，继续等待 M1 step150。
- M3 未启动；决策：不启动新任务，继续监督 M2，等双卡可用后优先恢复 M1。

### 2026-07-27 01:43 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 进程占用；本轮显存阶段性降至约 9.9G/10.0G，util 约 61%/53%，worker 状态为 `actor_rollout_ref_compute_log_prob`，说明 M2 仍在活跃计算中，不抢占。
- M2 launcher/trainer/workers 仍存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，本轮无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:39:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；若 GPU2/3 真正释放或 GPU0/1 残留清理，再优先恢复 M1。

### 2026-07-27 01:44 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 9.9G/10.2G，util 约 54%/43%；worker 仍在 `actor_rollout_ref_compute_log_prob`，说明 M2 活跃计算中，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:39:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:45 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 10.0G/10.3G，util 升至约 90%/92%；worker 仍在 `actor_rollout_ref_compute_log_prob`，M2 活跃计算中，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:39:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:45 巡检补充（二）
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时到 100% 但仍为残留上下文。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 10.0G/10.3G，util 约 72%/54%；worker 仍在 `actor_rollout_ref_compute_log_prob`，M2 活跃计算中，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 01:44:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:46 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存降至约 6.6G/6.6G，util 约 91%/88%；worker 阶段从 `compute_log_prob` 推进到 `actor_rollout_ref_compute_ref_log_prob`，M2 活跃计算中，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:44:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:47 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 6.6G/6.6G，util 约 60%/53%；worker 仍在 `actor_rollout_ref_compute_ref_log_prob`，M2 活跃计算中，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:44:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:47 巡检补充（二）
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 6.8G/6.8G，util 约 39%/57%；worker 仍在 `actor_rollout_ref_compute_ref_log_prob`，M2 活跃计算中，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:44:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:48 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 6.8G/6.8G，util 约 59%/63%；worker 仍在 `actor_rollout_ref_compute_ref_log_prob`，M2 活跃计算中，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:44:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:49 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 6.8G/6.8G，util 约 90%/88%；worker 仍在 `actor_rollout_ref_compute_ref_log_prob`，M2 活跃计算中，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:44:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:50 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存回升至约 30.3G/30.3G，util 约 83%/90%；worker 阶段推进到 `actor_rollout_ref_update_actor`，M2 正在更新 actor，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:44:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:51 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 30.6G/30.7G，util 约 62%/50%；worker 仍在 `actor_rollout_ref_update_actor`，M2 正在更新 actor，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 01:49:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:51 巡检补充（二）
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 31.0G/31.0G，util 约 50%/8%；worker 仍在 `actor_rollout_ref_update_actor`，M2 正在更新 actor，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:49:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:52 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 31.3G/31.2G，util 约 72%/64%；worker 仍在 `actor_rollout_ref_update_actor`，M2 正在更新 actor，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:49:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:53 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 31.4G/31.3G，util 约 70%/68%；worker 仍在 `actor_rollout_ref_update_actor`，M2 正在更新 actor，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:49:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:54 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 31.5G/31.4G，util 约 47%/32%；worker 仍在 `actor_rollout_ref_update_actor`，M2 正在更新 actor，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:49:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:54 巡检补充（二）
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 31.6G/31.7G，util 约 62%/60%；worker 仍在 `actor_rollout_ref_update_actor`，M2 正在更新 actor，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:49:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:55 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 31.7G/31.7G，util 约 42%/29%；worker 仍在 `actor_rollout_ref_update_actor`，M2 正在更新 actor，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:49:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:56 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 31.9G/31.9G，util 约 15%/0%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 01:54:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:57 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 31.9G/32.0G，util 约 70%/68%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:54:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:57 巡检补充（二）
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 32.1G/32.1G，util 约 60%/71%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:54:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:58 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 32.2G/32.3G，util 约 52%/42%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:54:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 01:59 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.3G/33.4G，util 约 37%/28%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:54:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 02:00 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.7G，util 约 73%/81%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 01:59:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 02:01 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.7G，util 约 0%/87%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:59:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 02:02 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.7G，GPU3 util 瞬时 100%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:59:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 02:03 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.7G，util 短暂降至约 1%/1%；worker 仍在 `actor_rollout_ref_update_actor`，尚不能视为释放，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:59:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 02:04 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 瞬时 100%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.7G，util 约 45%/23%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:59:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 02:04 巡检补充（二）
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU1 util 本轮降为 0% 但显存仍未释放。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.7G，util 约 52%/62%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 01:59:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 02:05 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU0/1 util 本轮为 0%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.7G，util 约 100%/54%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 02:04:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 02:06 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU0/1 util 本轮为 0%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.7G，util 约 61%/70%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:04:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 02:07 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），不可用于新任务；GPU0/1 util 本轮为 0%。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.7G，util 约 73%/26%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:04:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2，不启动新任务；待 GPU 真正释放后优先恢复 M1。

### 2026-07-27 02:07 巡检补充（二）
- GPU1 残留显存已释放（约 3MiB，util 0%），但 GPU0 仍为 `[Not Found]` 残留显存占用（约 74.9G），因此仍没有干净 2-GPU lane；暂不启动 M1/M3 或新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.7G，util 约 56%/56%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:04:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2；若 GPU0 也释放或 GPU2/3 完成释放，优先恢复 M1。

### 2026-07-27 02:08 巡检补充
- GPU0 仍为 `[Not Found]` 残留显存占用（约 74.9G）；GPU1 本轮又出现 `[Not Found]` 残留占用（约 7.7G），因此仍没有干净 2-GPU lane，暂不启动 M1/M3 或新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.7G，util 约 56%/48%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:04:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2；若 GPU0/1 清空或 GPU2/3 完成释放，优先恢复 M1。

### 2026-07-27 02:09 巡检补充
- GPU0 仍为 `[Not Found]` 残留显存占用（约 74.9G）；GPU1 仍有 `[Not Found]` 残留占用（约 7.7G），因此仍没有干净 2-GPU lane，暂不启动 M1/M3 或新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.7G，util 约 52%/55%；worker 仍在 `actor_rollout_ref_update_actor`，M2 仍未完成该阶段，不抢占。
- M2 launcher/trainer/workers 均存活；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 最新 rollout 仍为 `83.jsonl`，checkpoint 仍为 step80；尚无 `84.jsonl`、`global_step_85/actor`、`global_step_150/actor`，无需刷新 dashboard。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:04:46，继续等待 M1 step150。
- M3 未启动；决策：继续监督 M2；若 GPU0/1 清空或 GPU2/3 完成释放，优先恢复 M1。

### 2026-07-27 02:10 巡检补充
- M2 `m2_mix50_2b` 新增 `84.jsonl`（mtime 2026-07-27 02:09:17），已刷新 `evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv`、`.summary.json` 与 `dashboard/mm/js/data-m2-rollouts.js`，dashboard 最大 step 已到 84。
- step84 指标：Geo3K 144 samples，accuracy 0.6667，mean_score 0.6000；text 112 samples，accuracy 0.6071，mean_score 0.2143。
- M2 launcher/trainer/workers 均存活；worker 从 `actor_rollout_ref_update_actor` 回到普通 `ray::WorkerDict` 状态；GPU2/GPU3 仍由 M2 占用，显存约 38.6G/38.6G，util 约 41%/41%。
- M2 checkpoint 仍为 step80，尚无 `global_step_85/actor`、`global_step_100/actor`、`global_step_150/actor`；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- GPU0 仍有约 74.9G `[Not Found]` 残留；GPU1 仍有约 7.7G `[Not Found]` 残留；当前仍无干净 2-GPU lane，不启动 M1/M3 或新任务。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳为 2026-07-27 02:04:46，继续等待 M1 step150；M3 未启动。
- 决策：继续保留 M2 运行；等待 `global_step_85/actor` 并验证，若 GPU0/1 清空或 GPU2/3 完成释放，优先恢复 M1。

### 2026-07-27 02:11 巡检补充
- M2 `m2_mix50_2b` 最新 rollout 仍为 `84.jsonl`，checkpoint 仍为 step80，尚无 `global_step_85/actor`；dashboard 已保持到 step84，无需重复刷新。
- M2 launcher/trainer/workers 均存活，worker 为普通 `ray::WorkerDict` 状态；GPU2/GPU3 仍由 M2 占用，显存约 38.6G/38.6G，util 约 38%/39%。
- 错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- GPU0 仍有约 74.9G `[Not Found]` 残留；GPU1 又回到约 74.5G `[Not Found]` 残留；当前无干净 2-GPU lane，不启动 M1/M3 或新任务。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 02:09:46，继续等待 M1 step150。
- M3 未启动；决策：继续保留 M2 运行；等待 `global_step_85/actor` 并验证，若 GPU0/1 清空或 GPU2/3 释放，优先恢复 M1。

### 2026-07-27 02:12 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 93%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 38.6G/38.6G，util 约 40%/42%；M2 launcher/trainer/workers 均存活。
- M2 最新 rollout 仍为 `84.jsonl`，checkpoint 仍为 step80；尚无 `global_step_85/actor`、`global_step_100/actor`、`global_step_150/actor`，dashboard 已保持到 step84，无需重复刷新。
- 错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 02:09:46，继续等待 M1 step150。
- M3 未启动；决策：当前无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，若 GPU0/1 清空或 GPU2/3 释放，优先恢复 M1。

### 2026-07-27 02:14 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 38.6G/38.6G，util 约 40%/40%；M2 launcher/trainer/workers 均存活。
- M2 最新 rollout 仍为 `84.jsonl`，checkpoint 仍为 step80；尚无 `global_step_85/actor`、`global_step_100/actor`、`global_step_150/actor`，dashboard 已保持到 step84，无需重复刷新。
- 错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:09:46，继续等待 M1 step150。
- M3 未启动；决策：当前无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，若 GPU0/1 清空或 GPU2/3 释放，优先恢复 M1。

### 2026-07-27 02:15 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 96%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 38.6G/38.6G，util 约 35%/37%；M2 launcher/trainer/workers 均存活。
- M2 最新 rollout 仍为 `84.jsonl`，checkpoint 仍为 step80；尚无 `global_step_85/actor`、`global_step_100/actor`、`global_step_150/actor`，dashboard 已保持到 step84，无需重复刷新。
- 错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 02:14:46，继续等待 M1 step150。
- M3 未启动；决策：当前无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，若 GPU0/1 清空或 GPU2/3 释放，优先恢复 M1。

### 2026-07-27 02:16 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 38.6G/38.6G，util 约 30%/32%；M2 launcher/trainer/workers 均存活。
- M2 最新 rollout 仍为 `84.jsonl`，checkpoint 仍为 step80；尚无 `85.jsonl`、`global_step_85/actor`、`global_step_100/actor`、`global_step_150/actor`，dashboard 已保持到 step84，无需重复刷新。
- 错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:14:46，继续等待 M1 step150。
- M3 未启动；决策：当前无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，若 GPU0/1 清空或 GPU2/3 释放，优先恢复 M1。

### 2026-07-27 02:17 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 38.6G/38.6G，util 约 28%/31%；M2 launcher/trainer/workers 均存活。
- M2 最新 rollout 仍为 `84.jsonl`，checkpoint 仍为 step80；尚无 `85.jsonl`、`global_step_85/actor`、`global_step_100/actor`、`global_step_150/actor`，dashboard 已保持到 step84，无需重复刷新。
- 错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:14:46，继续等待 M1 step150。
- M3 未启动；决策：当前无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，若 GPU0/1 清空或 GPU2/3 释放，优先恢复 M1。

### 2026-07-27 02:18 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 38.6G/38.6G，util 约 28%/25%；M2 launcher/trainer/workers 均存活。
- M2 最新 rollout 仍为 `84.jsonl`，checkpoint 仍为 step80；尚无 `85.jsonl`、`global_step_85/actor`、`global_step_100/actor`、`global_step_150/actor`，dashboard 已保持到 step84，无需重复刷新。
- 错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:14:46，继续等待 M1 step150。
- M3 未启动；决策：当前无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，若 GPU0/1 清空或 GPU2/3 释放，优先恢复 M1。

### 2026-07-27 02:19 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 38.6G/38.6G，util 约 26%/26%；M2 launcher/trainer/workers 均存活。
- M2 训练日志尾部最新完整 step 为 84，日志 mtime 为 2026-07-27 02:09:20；最新 rollout 仍为 `84.jsonl`，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:14:46，继续等待 M1 step150。
- M3 未启动；决策：当前无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点确认 M2 是否推进到 step85 或 GPU 是否释放。

### 2026-07-27 02:20 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存本轮降至约 9.8G/10.2G，util 约 79%/69%；worker 处于 `actor_rollout_ref_compute_log_prob`，说明 M2 仍在 step84 后续计算阶段，不抢占。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:14:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否产出 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:21 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮降为 0% 但显存未释放，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 9.9G/10.2G，util 约 60%/50%；worker 仍处于 `actor_rollout_ref_compute_log_prob`，M2 未释放 GPU。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 02:19:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:21 巡检补充（二）
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 10.0G/10.2G，util 约 58%/50%；worker 仍处于 `actor_rollout_ref_compute_log_prob`，M2 未释放 GPU。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:19:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:22 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 10.0G/10.2G，util 约 96%/91%；worker 仍处于 `actor_rollout_ref_compute_log_prob`，M2 仍在 step84 后续计算阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:19:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:23 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮为 0%，但显存未释放，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 6.5G/6.6G，util 约 100%/100%；worker 已从 `actor_rollout_ref_compute_log_prob` 推进到 `actor_rollout_ref_compute_ref_log_prob`，M2 仍在 step84 后续计算阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:19:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:24 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 6.6G/6.6G，util 约 57%/64%；worker 仍处于 `actor_rollout_ref_compute_ref_log_prob`，M2 仍在 step84 后续计算阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:19:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:24 巡检补充（二）
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 6.6G/6.6G，util 约 75%/82%；worker 仍处于 `actor_rollout_ref_compute_ref_log_prob`，M2 仍在 step84 后续计算阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:19:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:25 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 6.8G/6.8G，util 约 97%/65%；worker 仍处于 `actor_rollout_ref_compute_ref_log_prob`，M2 仍在 step84 后续计算阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:19:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:26 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 6.8G/6.8G，util 约 95%/95%；worker 仍处于 `actor_rollout_ref_compute_ref_log_prob`，M2 仍在 step84 后续计算阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 02:24:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:27 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存升至约 30.4G/30.3G，util 约 62%/62%；worker 已推进到 `actor_rollout_ref_update_actor`，M2 仍在 step84 后续更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:24:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:27 巡检补充（二）
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 30.5G/30.5G，util 约 43%/62%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:24:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:28 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮为 0% 但显存未释放，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 30.9G/30.9G，util 约 1%/100%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:24:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:29 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮为 0% 但显存未释放，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 31.2G/31.3G，util 约 62%/46%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:24:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:30 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 31.5G/31.4G，util 约 57%/68%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:24:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:31 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 31.7G/31.6G，util 约 0%/100%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 02:29:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:31 巡检补充（二）
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 31.7G/31.7G，util 约 67%/56%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:29:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:32 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 31.8G/31.8G，util 约 65%/82%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:29:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:33 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 31.9G/31.9G，util 约 74%/77%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:29:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:34 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮为 0% 但显存未释放，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 32.2G/32.1G，util 约 74%/87%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:29:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:35 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮为 0% 但显存未释放，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 32.3G/32.2G，util 约 32%/26%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:29:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:36 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮为 0% 但显存未释放，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 32.5G/32.4G，util 约 0%/80%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 02:34:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:36 巡检补充（二）
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮为 0% 但显存未释放，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存升至约 33.8G/33.8G，util 约 95%/70%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:34:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:37 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 75%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.8G，util 约 70%/54%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:34:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:38 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 98%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.8G，util 约 41%/33%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:34:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:39 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.8G，util 约 73%/70%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:34:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:39 巡检补充（二）
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.8G，util 约 82%/69%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:34:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:40 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.8G，util 约 24%/32%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 02:39:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:41 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.8G，util 约 73%/53%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:39:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:42 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.8G，util 约 45%/38%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:39:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:42 巡检补充（二）
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.8G，util 约 65%/64%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:39:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:43 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.8G，util 约 34%/37%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:39:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:44 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.8G，util 约 48%/49%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:39:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:45 巡检补充
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），GPU1 util 本轮约 100%，不可用于新任务。
- GPU2/GPU3 仍由 `m2_mix50_2b` 占用，显存约 33.8G/33.8G，util 约 38%/60%；worker 仍处于 `actor_rollout_ref_update_actor`，M2 仍在 step84 更新阶段。
- M2 launcher/trainer/workers 均存活；训练日志 mtime 仍为 2026-07-27 02:09:20，最新完整 step 仍为 84，尚无 `85.jsonl` 或 `global_step_85/actor`。
- M2 checkpoint 仍为 step80；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:39:46，继续等待 M1 step150。
- M3 未启动；决策：当前仍无干净 2-GPU lane，不启动新任务；继续保留 M2 运行，下一轮重点看 M2 是否完成 step85 或 GPU2/3 是否真正释放。

### 2026-07-27 02:46 巡检补充
- M2 `m2_mix50_2b` 已写出 `85.jsonl`（mtime 2026-07-27 02:46:03），并完成 `global_step_85/actor` checkpoint；`latest_checkpointed_iteration.txt=85`，actor 目录 7 files，约 25G。
- 已刷新 `evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv`、`.summary.json` 与 `dashboard/mm/js/data-m2-rollouts.js`，dashboard 最大 step 已到 85。
- step85 指标：Geo3K 152 samples，accuracy 0.7500，mean_score 0.6750；text 104 samples，accuracy 0.5481，mean_score 0.0962。
- M2 launcher/trainer/workers 均存活；checkpoint 保存后 worker 回到普通 `ray::WorkerDict` 状态，GPU2/GPU3 仍由 M2 占用，显存约 38.5G/38.5G，继续运行后续 step，不抢占。
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），当前仍无干净 2-GPU lane，不启动 M1/M3 或新任务。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 02:44:46，继续等待 M1 step150；M3 未启动。
- 决策：继续保留 M2 运行；下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或 GPU2/3 释放，若释放则优先恢复 M1。

### 2026-07-27 02:48 巡检补充
- M2 `m2_mix50_2b` 的 `global_step_85/actor` 稳定完整：`latest_checkpointed_iteration.txt=85`，actor 目录 7 files，约 25G；最新 rollout 为 `85.jsonl`（mtime 2026-07-27 02:46:03）。
- M2 训练日志 mtime 已更新到 2026-07-27 02:46:05；错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED。
- M2 launcher/trainer/workers 均存活，worker 为普通 `ray::WorkerDict` 状态；GPU2/GPU3 仍由 M2 占用，显存约 38.5G/38.5G，util 约 40%/39%，继续运行后续 step，不抢占。
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），当前仍无干净 2-GPU lane，不启动 M1/M3 或新任务。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 02:44:46，继续等待 M1 step150。
- M3 未启动；决策：继续保留 M2 运行；下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或 GPU2/3 释放，若释放则优先恢复 M1。

### 2026-07-27 02:49 巡检补充
- M2 `m2_mix50_2b` 仍在 step85 后继续运行：latest checkpoint 仍为 85，最新 rollout 仍为 `85.jsonl`；尚无 `86.jsonl`、`global_step_86/actor`、`global_step_90/actor`。
- M2 launcher/trainer/workers 均存活，worker 为普通 `ray::WorkerDict` 状态；GPU2/GPU3 仍由 M2 占用，显存约 38.5G/38.5G，util 约 40%/39%，不抢占。
- M2 错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED；训练日志 mtime 仍为 2026-07-27 02:46:05。
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），当前仍无干净 2-GPU lane，不启动 M1/M3 或新任务。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:44:46，继续等待 M1 step150。
- M3 未启动；决策：继续保留 M2 运行；下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或 GPU2/3 释放，若释放则优先恢复 M1。

### 2026-07-27 02:50 巡检补充
- M2 `m2_mix50_2b` 仍在 step85 后继续运行：latest checkpoint 仍为 85，最新 rollout 仍为 `85.jsonl`；尚无 `86.jsonl`、`global_step_86/actor`、`global_step_90/actor`。
- M2 launcher/trainer/workers 均存活，worker 为普通 `ray::WorkerDict` 状态；GPU2/GPU3 仍由 M2 占用，显存约 38.5G/38.5G，util 约 41%/38%，不抢占。
- M2 错误扫描仍仅 NUMA affinity warning，无 OOM/Traceback/FAILED；训练日志 mtime 仍为 2026-07-27 02:46:05。
- GPU0/GPU1 仍为 `[Not Found]` 残留显存占用（约 74.9G/74.5G），当前仍无干净 2-GPU lane，不启动 M1/M3 或新任务。
- M1 仍停 checkpoint step130，无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:44:46，继续等待 M1 step150。
- M3 未启动；决策：继续保留 M2 运行；下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或 GPU2/3 释放，若释放则优先恢复 M1。

### 2026-07-27 02:51 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464 且 util 100%；GPU2/3 由 M2 占用，各约 38.5G，暂无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，当前 `latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` / `global_step_90` / `global_step_150`。
- M1 `m1_geo3k100_2b`：仍停在 step130，`global_step_130/actor` 为 7 文件约 25G，尚无 step150；评估 supervisor 仍等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动。
- 错误扫描：M2 日志仅见 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 决策：当前没有可用空余 GPU，不启动新任务；继续保持 M2 运行，若之后出现干净双卡，优先恢复 M1 到 step150，再考虑 M3。

### 2026-07-27 02:52 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464 且 util 100%；GPU2/3 由 M2 占用，各约 38.5G，当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker CPU 活跃；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl`、`global_step_90/actor`、`global_step_150/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，`global_step_130/actor` 为 7 文件约 25G，尚无 step135/140/145/150；evaluation supervisor 最新心跳 2026-07-27 02:49:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：不启动新任务，不抢占 M2；继续等待 M2 后续 rollout/checkpoint 或 GPU 释放。若出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 02:53 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464 且 util 100%；GPU2/GPU3 仍由 M2 占用，各约 38.5G，暂无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker CPU 活跃；当前 `latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl`/`87.jsonl`/`88.jsonl`/`89.jsonl`/`90.jsonl`，也无 `global_step_90/actor` 或 `global_step_150/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，`global_step_130/actor` 为 7 文件约 25G，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:49:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：当前不启动新任务、不抢占 M2；继续等待 M2 后续 rollout/checkpoint 或 GPU 释放。若出现干净双卡，优先恢复 M1 到 step150，再启动 M3。

### 2026-07-27 02:54 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464 且 util 100%；GPU2/GPU3 仍由 M2 占用，各约 38.5G，util 约 25%/23%，当前无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker CPU 活跃；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 至 `90.jsonl`，也无 `global_step_90/actor` 或 `global_step_150/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，`global_step_130/actor` 为 7 文件约 25G，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:49:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：不启动新任务、不抢占 M2；继续等待 M2 新 rollout/checkpoint 或 GPU 释放。若出现干净双卡，优先恢复 M1 到 step150，再启动 M3。

### 2026-07-27 02:55 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464 且 util 100%；GPU2/GPU3 显存降至约 3.4G/3.1G，但仍有 M2 相关 `[Not Found]` 上下文与 worker 活跃，当前不能当作空闲双卡抢占。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 状态为 `actor_rollout_ref_compute_log_prob`，CPU 活跃；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新心跳 2026-07-27 02:54:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：虽然 GPU2/GPU3 显存阶段性降低，但 M2 正在计算 log_prob，继续保留 M2，不启动 M1/M3；待 M2 释放或出现干净双卡后，优先恢复 M1 到 step150。

### 2026-07-27 02:57 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464 且 util 100%；GPU2/GPU3 仍有 M2 相关上下文，显存约 9.9G/10.2G，util 约 64%/78%，不是空闲双卡。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_compute_log_prob`，CPU/GPU 均活跃；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳 2026-07-27 02:54:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 02:58 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464 且 util 100%；GPU2/GPU3 仍有 M2 相关上下文，显存约 10.0G/10.3G，util 约 69%/56%，不是空闲双卡。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_compute_log_prob`；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳 2026-07-27 02:54:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 02:59 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464 且 util 100%；GPU2/GPU3 仍有 M2 相关上下文，显存约 6.6G/6.6G，util 约 64%/69%，不是空闲双卡。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 从 `actor_rollout_ref_compute_log_prob` 推进到 `actor_rollout_ref_compute_ref_log_prob`，CPU/GPU 仍活跃；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:54:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:00 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464 且 util 100%；GPU2/GPU3 仍有 M2 相关上下文，显存约 6.8G/6.8G，util 约 59%/61%，不是空闲双卡。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_compute_ref_log_prob`，CPU/GPU 活跃；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 02:59:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:01 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464 且 util 100%；GPU2/GPU3 仍有 M2 相关上下文，显存约 6.8G/6.8G，util 约 86%/87%，不是空闲双卡。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_compute_ref_log_prob`，CPU/GPU 活跃；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:59:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:02 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464 且 util 100%；GPU2/GPU3 仍有 M2 相关上下文，显存升至约 30.4G/30.5G，util 约 46%/59%，不是空闲双卡。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 已从 `actor_rollout_ref_compute_ref_log_prob` 推进到 `actor_rollout_ref_update_actor`，说明 step85 后训练仍在推进；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:59:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:04 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464 且 util 100%；GPU2/GPU3 仍有 M2 相关上下文，显存约 31.1G/31.1G，util 约 100%/95%，不是空闲双卡。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_update_actor`，GPU 利用率高，说明训练仍在健康推进；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 02:59:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:05 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464 且 util 100%；GPU2/GPU3 仍有 M2 相关上下文，显存约 31.3G/31.4G，util 约 28%/42%，不是空闲双卡。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_update_actor`；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 03:04:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:07 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464 且 util 100%；GPU2/GPU3 仍有 M2 相关上下文，显存约 31.5G/31.6G，util 约 60%/58%，不是空闲双卡。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_update_actor`；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 03:04:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:08 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464，当前 util 0% 但显存仍满占，不能使用；GPU2/GPU3 仍有 M2 相关上下文，显存约 31.7G/31.7G，util 约 57%/23%，不是空闲双卡。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_update_actor`；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 03:04:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:09 巡检补充
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 3441464，当前 util 0% 但显存仍满占，不能使用；GPU2/GPU3 仍有 M2 相关上下文，显存约 31.8G/31.9G，util 约 69%/58%，不是空闲双卡。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_update_actor`；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 03:09:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:10 巡检补充
- GPU 状态：GPU1 显存已从约 74.5G 降至 3MiB，但 GPU0 仍约 74.9G `[Not Found]` 残留上下文；GPU2/GPU3 仍有 M2 相关上下文，显存约 32.1G/32.1G，util 约 77%/91%，当前仍没有干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_update_actor`；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 03:09:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：GPU1 已可作为候选，但缺少第二张干净卡；继续保留 M2，不启动/恢复 M1 或 M3。若 GPU0 清理或 M2 释放 GPU2/3，优先恢复 M1 到 step150。

### 2026-07-27 03:12 巡检补充
- GPU 状态：GPU0 仍约 74.9G `[Not Found]` 残留上下文；GPU1 又出现约 7.7G `[Not Found]` PID 232968 占用；GPU2/GPU3 仍有 M2 相关上下文，显存约 33.7G/33.7G，util 约 84%/78%，当前无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_update_actor`；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 03:09:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:13 巡检补充
- GPU 状态：GPU0 仍约 74.9G `[Not Found]` 残留上下文；GPU1 约 7.8G `[Not Found]` PID 232968 占用；GPU2/GPU3 仍有 M2 相关上下文，显存约 33.7G/33.7G，util 约 65%/64%，当前无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_update_actor`；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 03:09:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:15 巡检补充
- GPU 状态：GPU0 仍约 74.9G `[Not Found]` 残留上下文；GPU1 又回到约 74.5G `[Not Found]` PID 232968 占用；GPU2/GPU3 仍有 M2 相关上下文，显存约 33.7G/33.7G，util 约 65%/61%，当前无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_update_actor`；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 03:14:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:16 巡检补充
- GPU 状态：GPU0 仍约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 232968 占用且 util 100%；GPU2/GPU3 仍有 M2 相关上下文，显存约 33.7G/33.7G，util 约 49%/58%，当前无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_update_actor`；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 03:14:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:17 巡检补充
- GPU 状态：GPU0 仍约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 232968 占用且 util 98%；GPU2/GPU3 仍有 M2 相关上下文，显存约 33.7G/33.7G，util 约 38%/0%，但显存未释放，当前无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_update_actor`；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 03:14:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:19 巡检补充
- GPU 状态：GPU0 仍约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 232968 占用且 util 96%；GPU2/GPU3 仍有 M2 相关上下文，显存约 33.7G/33.7G，util 约 64%/33%，当前无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_update_actor`；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 03:14:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:20 巡检补充
- GPU 状态：GPU0 仍约 74.9G `[Not Found]` 残留上下文；GPU1 约 74.5G `[Not Found]` PID 232968 占用且 util 100%；GPU2/GPU3 仍有 M2 相关上下文，显存约 33.7G/33.7G，util 约 100%/80%，当前无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；worker 仍处于 `actor_rollout_ref_update_actor`，GPU 高负载；`latest_checkpointed_iteration.txt=85`，`global_step_85/actor` 为 7 文件约 25G；最新 rollout 仍为 `85.jsonl`（2026-07-27 02:46:03），尚无 `86.jsonl` 或 `global_step_90/actor`。
- M2 日志：mtime 仍为 2026-07-27 02:46:05；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 03:19:46，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；等待 M2 释放 GPU 或新 rollout/checkpoint。若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:21 巡检补充
- M2 `m2_mix50_2b` 已写出新 rollout `86.jsonl`（mtime 2026-07-27 03:21:16），训练日志 mtime 更新到 2026-07-27 03:21:19；`latest_checkpointed_iteration.txt` 仍为 85，尚无 `global_step_86/actor`、`global_step_90/actor` 或 `global_step_150/actor`。
- 已刷新 `evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv`、`.summary.json` 与 `dashboard/mm/js/data-m2-rollouts.js`；dashboard 最大 step 已到 86，summary rows=172。
- step86 指标：Geo3K 144 samples，accuracy 0.7014，mean_score 0.6313；text 112 samples，accuracy 0.6696，mean_score 0.3393。
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留；GPU1 约 74.5G `[Not Found]` PID 232968；GPU2/GPU3 仍由 M2 占用，显存约 38.6G/38.6G，util 约 37%/38%，当前无干净 2-GPU 通道。
- M2 launcher/trainer/worker 进程仍存活，worker 回到普通 `ray::WorkerDict` 状态；错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b` 仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 03:19:46，继续等待 M1 step150。
- M3 `m3_mix20_2b` 尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或 GPU 释放，若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:23 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `86.jsonl`（2026-07-27 03:21:16），上一轮已刷新 CSV/dashboard 到 step86；`latest_checkpointed_iteration.txt` 仍为 85，尚无 `global_step_86/actor`、`global_step_90/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留；GPU1 约 74.5G `[Not Found]` PID 232968；GPU2/GPU3 仍由 M2 占用，显存约 38.6G/38.6G，util 约 42%/42%，当前无干净 2-GPU 通道。
- M2 launcher/trainer/worker 进程仍存活，worker 为普通 `ray::WorkerDict` 状态；训练日志 mtime 仍为 2026-07-27 03:21:19；错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b` 仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 03:19:46，继续等待 M1 step150。
- M3 `m3_mix20_2b` 尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或 GPU 释放，若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:24 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `86.jsonl`（2026-07-27 03:21:16），dashboard/CSV 已保持到 step86；`latest_checkpointed_iteration.txt` 仍为 85，尚无 `global_step_86/actor`、`global_step_90/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留；GPU1 约 74.5G `[Not Found]` PID 232968；GPU2/GPU3 仍由 M2 占用，显存约 38.6G/38.6G，util 约 43%/37%，当前无干净 2-GPU 通道。
- M2 launcher/trainer/worker 进程仍存活，worker 为普通 `ray::WorkerDict` 状态；训练日志 mtime 仍为 2026-07-27 03:21:19；错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b` 仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 03:24:46，继续等待 M1 step150。
- M3 `m3_mix20_2b` 尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或 GPU 释放，若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:26 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `86.jsonl`（2026-07-27 03:21:16），dashboard/CSV 已保持到 step86；`latest_checkpointed_iteration.txt` 仍为 85，尚无 `global_step_86/actor`、`global_step_90/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留；GPU1 约 74.5G `[Not Found]` PID 232968；GPU2/GPU3 仍由 M2 占用，显存约 38.6G/38.6G，util 约 39%/37%，当前无干净 2-GPU 通道。
- M2 launcher/trainer/worker 进程仍存活，worker 为普通 `ray::WorkerDict` 状态；训练日志 mtime 仍为 2026-07-27 03:21:19；错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b` 仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 03:24:46，继续等待 M1 step150。
- M3 `m3_mix20_2b` 尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或 GPU 释放，若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:27 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `86.jsonl`（2026-07-27 03:21:16），dashboard/CSV 已保持到 step86；`latest_checkpointed_iteration.txt` 仍为 85，尚无 `global_step_86/actor`、`global_step_90/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留；GPU1 约 74.5G `[Not Found]` PID 232968；GPU2/GPU3 仍由 M2 占用，显存约 38.6G/38.6G，util 约 33%/32%，当前无干净 2-GPU 通道。
- M2 launcher/trainer/worker 进程仍存活，worker 为普通 `ray::WorkerDict` 状态；训练日志 mtime 仍为 2026-07-27 03:21:19；错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b` 仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 03:24:46，继续等待 M1 step150。
- M3 `m3_mix20_2b` 尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或 GPU 释放，若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:29 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `86.jsonl`（2026-07-27 03:21:16），dashboard/CSV 已保持到 step86；`latest_checkpointed_iteration.txt` 仍为 85，尚无 `global_step_86/actor`、`global_step_90/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留；GPU1 约 74.5G `[Not Found]` PID 232968；GPU2/GPU3 仍由 M2 占用，显存约 38.6G/38.6G，util 约 26%/27%，当前无干净 2-GPU 通道。
- M2 launcher/trainer/worker 进程仍存活，worker 为普通 `ray::WorkerDict` 状态；训练日志 mtime 仍为 2026-07-27 03:21:19；错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b` 仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 03:24:46，继续等待 M1 step150。
- M3 `m3_mix20_2b` 尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或 GPU 释放，若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:30 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `86.jsonl`（2026-07-27 03:21:16），dashboard/CSV 已保持到 step86；`latest_checkpointed_iteration.txt` 仍为 85，尚无 `global_step_86/actor`、`global_step_90/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留；GPU1 约 74.5G `[Not Found]` PID 232968；GPU2/GPU3 仍由 M2 占用，显存约 38.6G/38.6G，util 约 22%/27%，当前无干净 2-GPU 通道。
- M2 launcher/trainer/worker 进程仍存活，worker 为普通 `ray::WorkerDict` 状态；训练日志 mtime 仍为 2026-07-27 03:21:19；错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b` 仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 03:29:46，继续等待 M1 step150。
- M3 `m3_mix20_2b` 尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或 GPU 释放，若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:31 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `86.jsonl`（2026-07-27 03:21:16），dashboard/CSV 已保持到 step86；worker 已进入 `actor_rollout_ref_compute_log_prob`，说明 step86 后的新一轮训练正在推进；`latest_checkpointed_iteration.txt` 仍为 85，尚无 `87.jsonl`、`global_step_90/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留；GPU1 约 74.5G `[Not Found]` PID 232968；GPU2/GPU3 仍由 M2 占用，显存约 9.8G/10.2G，util 约 87%/75%，当前无干净 2-GPU 通道。
- M2 launcher/trainer/worker 进程仍存活；训练日志 mtime 仍为 2026-07-27 03:21:19；错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b` 仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 心跳已到 2026-07-27 03:29:46，继续等待 M1 step150。
- M3 `m3_mix20_2b` 尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或 GPU 释放，若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:33 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `86.jsonl`（2026-07-27 03:21:16），dashboard/CSV 已保持到 step86；worker 仍处于 `actor_rollout_ref_compute_log_prob`，新一轮训练继续推进；`latest_checkpointed_iteration.txt` 仍为 85，尚无 `87.jsonl`、`global_step_90/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0 约 74.9G `[Not Found]` 残留；GPU1 约 74.5G `[Not Found]` PID 232968；GPU2/GPU3 仍由 M2 占用，显存约 10.0G/10.2G，util 约 73%/49%，当前无干净 2-GPU 通道。
- M2 launcher/trainer/worker 进程仍存活；训练日志 mtime 仍为 2026-07-27 03:21:19；错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b` 仍停 checkpoint step130，尚无 `global_step_150/actor`；evaluation supervisor 最新可见心跳仍为 2026-07-27 03:29:46，继续等待 M1 step150。
- M3 `m3_mix20_2b` 尚未启动；无 completion marker。
- 决策：继续保留 M2，不启动/恢复 M1 或 M3；下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或 GPU 释放，若之后出现干净双卡，优先恢复 M1 到 step150。

### 2026-07-27 03:36 巡检补充
- GPU 状态：GPU0 约 74.9G 残留 `[Not Found]` 上下文；GPU1 约 74.5G 残留进程且 util 100%；GPU2/3 由 M2 占用，当前各约 6.8G，worker 处于 `actor_rollout_ref_compute_ref_log_prob` 活跃阶段。
- 训练状态：M1 仍停在 checkpoint 130，无 `global_step_150/actor`；M2 运行健康，最新 checkpoint 85，最新 rollout 86；M3 尚未启动。
- 错误扫描：M2 日志仅见 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed 等异常。
- 调度结论：当前没有可安全利用的空闲双 GPU，不启动新任务；继续保持 M2 运行，等待 GPU0/1 清理或 GPU2/3 释放后优先恢复 M1。

### 2026-07-27 03:51 巡检补充
- GPU 状态：GPU0 仍约 74.9G `[Not Found]` 残留；GPU1 仍约 74.5G `[Not Found]` 且 util 100%；GPU2/GPU3 由 M2 占用，约 33.8G/33.8G，util 68%/76%，当前无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 均存活，worker 处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `86.jsonl`（03:21:16），`latest_checkpointed_iteration.txt` 仍为 85，尚无 `87.jsonl`、`global_step_90/actor` 或 `global_step_150/actor`。
- 错误扫描：M2 日志 mtime 仍为 03:21:19；仅见 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 03:49:46，继续等待 M1 step150；completion marker 仍为空。
- 调度结论：不打断 M2，不启动 M3，不恢复 M1；下一轮继续等 M2 产出 `87.jsonl` 或 GPU 释放。一旦有干净双卡，优先恢复 M1。

### 2026-07-27 04:00 巡检补充
- M2 `m2_mix50_2b`：新产出 `87.jsonl`（03:58:33，约 5.0MB），训练进程仍存活；当前 `latest_checkpointed_iteration.txt` 仍为 85，尚无 `global_step_90/actor` 或 `global_step_150/actor`。
- M2 rollout 指标已刷新到 step87：Geo3K 104 samples，acc 0.7788，mean_score 0.7010；text 152 samples，acc 0.5724，mean_score 0.1447。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 174 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 87。
- GPU 状态：GPU0/GPU1 仍分别约 74.9G/74.5G 残留，不可作为干净双卡；GPU2/GPU3 仍由 M2 占用，约 38.4G/38.4G，util 38%/40%。
- M1/M3/评估：M1 仍停在 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 03:59:46，仍等待 M1 step150。
- 调度结论：继续保留 M2；未出现可安全启动 M3 或恢复 M1 的空闲双卡。下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或任意干净双卡释放。

### 2026-07-27 04:11 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `87.jsonl`（03:58:33），CSV/看板已保持到 step87；worker 当前进入 `actor_rollout_ref_compute_log_prob`，说明 step88 正在推进；`latest_checkpointed_iteration.txt` 仍为 85，尚无 `global_step_90/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，不可用；GPU2/GPU3 由 M2 占用，约 10.0G/10.3G，util 76%/67%，当前仍无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 04:09:46，继续等待 M1 step150；completion marker 仍为空。
- 错误状态：M2 训练日志 mtime 仍为 03:58:35；此前错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2，不启动 M3，不恢复 M1。下一关键点为 M2 `88.jsonl`、`90.jsonl`/`global_step_90/actor` 或 GPU 释放；若出现干净双卡，优先恢复 M1。

### 2026-07-27 04:28 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `87.jsonl`（03:58:33），CSV/看板已保持到 step87；worker 从 ref/log_prob 阶段推进到 `actor_rollout_ref_update_actor`，说明 step88 仍在正常计算；`latest_checkpointed_iteration.txt` 仍为 85，尚无 `88.jsonl`、`global_step_90/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 99%；GPU2/GPU3 由 M2 占用，约 33.7G/33.8G，util 100%/83%；当前无可安全利用的干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 04:24:46，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2，不启动 M3，不恢复 M1。下一关键点为 M2 `88.jsonl`、`90.jsonl`/`global_step_90/actor` 或 GPU 释放；若出现干净双卡，优先恢复 M1。

### 2026-07-27 04:44 巡检补充
- M2 `m2_mix50_2b`：新产出 `88.jsonl`（04:37:35，约 5.7MB），训练进程仍存活；当前 `latest_checkpointed_iteration.txt` 仍为 85，尚无 `global_step_90/actor` 或 `global_step_150/actor`。
- M2 rollout 指标已刷新到 step88：Geo3K 128 samples，acc 0.7109，mean_score 0.6398；text 128 samples，acc 0.5078，mean_score 0.0156。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 176 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 88。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 95%；GPU2/GPU3 由 M2 占用，约 38.6G/38.6G，util 33%/31%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 04:44:46，继续等待 M1 step150；completion marker 仍为空。
- 调度结论：继续保持 M2，不启动 M3，不恢复 M1。下一关键点为 M2 `90.jsonl`/`global_step_90/actor` 或 GPU 释放；若出现干净双卡，优先恢复 M1。

### 2026-07-27 05:06 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `88.jsonl`（04:37:35），CSV/看板已保持到 step88；worker 当前处于 `actor_rollout_ref_update_actor`，step89 尚未落盘；`latest_checkpointed_iteration.txt` 仍为 85，尚无 `89.jsonl`、`global_step_90/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 100%；GPU2/GPU3 由 M2 占用，约 33.9G/33.9G，util 47%/24%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 05:04:46，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2，不启动 M3，不恢复 M1。下一关键点为 M2 `89.jsonl`、`90.jsonl`/`global_step_90/actor` 或 GPU 释放；若出现干净双卡，优先恢复 M1。

### 2026-07-27 05:23 巡检补充
- M2 `m2_mix50_2b`：新产出 `89.jsonl`（05:13:35，约 4.8MB），训练进程仍存活；当前 worker 已进入下一轮 `actor_rollout_ref_compute_log_prob`，说明 step90 正在推进；`latest_checkpointed_iteration.txt` 仍为 85，尚无 `global_step_90/actor` 或 `global_step_150/actor`。
- M2 rollout 指标已刷新到 step89：Geo3K 144 samples，acc 0.6806，mean_score 0.6125；text 112 samples，acc 0.7054，mean_score 0.4107。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 178 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 89。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 87%；GPU2/GPU3 由 M2 占用，约 5.7G/5.7G，util 14%/6%；当前仍无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 05:19:46，继续等待 M1 step150；completion marker 仍为空。
- 调度结论：继续保持 M2，不启动 M3，不恢复 M1。下一关键点为 M2 `90.jsonl` 与 `global_step_90/actor`；若 GPU 释放，优先恢复 M1。

### 2026-07-27 05:45 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `89.jsonl`（05:13:35），CSV/看板已保持到 step89；worker 当前处于 `actor_rollout_ref_update_actor`，step90 尚未落盘；`latest_checkpointed_iteration.txt` 仍为 85，尚无 `90.jsonl`、`global_step_90/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 100%；GPU2/GPU3 由 M2 占用，约 33.7G/33.7G，util 97%/70%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 05:44:46，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2，不启动 M3，不恢复 M1。下一关键点为 M2 `90.jsonl` 与 `global_step_90/actor`；若 GPU 释放，优先恢复 M1。

### 2026-07-27 06:11 巡检补充
- M2 `m2_mix50_2b`：新产出 `90.jsonl`（05:52:07，约 5.4MB），`latest_checkpointed_iteration.txt` 已更新为 90；`global_step_90/actor` 已验证完整，7 个文件，总量约 25G（含 2 个 model shard、2 个 optim shard、2 个 extra_state、`fsdp_config.json`）。
- M2 rollout 指标已刷新到 step90：Geo3K 136 samples，acc 0.6029，mean_score 0.5426；text 120 samples，acc 0.6333，mean_score 0.2667。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 180 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 90。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 100%；GPU2/GPU3 仍由 M2 占用，约 31.3G/31.2G，util 51%/66%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 06:09:46，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：M2 已通过 step90 关键点，继续运行至 step150；不启动 M3、不恢复 M1，除非出现干净双卡。若 GPU 释放，优先恢复 M1 到 step150。

### 2026-07-27 06:28 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `90.jsonl`（05:52:07），`latest_checkpointed_iteration.txt` 为 90，`global_step_90/actor` 仍完整；worker 当前处于 `actor_rollout_ref_update_actor`，step91 尚未落盘；尚无 `global_step_95/actor`、`global_step_100/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 100%；GPU2/GPU3 由 M2 占用，约 33.8G/33.8G，util 60%/61%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 06:24:46，继续等待 M1 step150；completion marker 仍为空。
- 错误状态：M2 最近错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2 向 step150 运行；不启动 M3、不恢复 M1，除非出现干净双卡。下一关键点为 M2 `91.jsonl`、`95.jsonl`/`global_step_95/actor` 或 GPU 释放。

### 2026-07-27 06:50 巡检补充
- M2 `m2_mix50_2b`：新产出 `91.jsonl`（06:32:47，约 6.0MB），训练进程仍存活；`latest_checkpointed_iteration.txt` 仍为 90，尚无 `global_step_95/actor`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 rollout 指标已刷新到 step91：Geo3K 104 samples，acc 0.6635，mean_score 0.5971；text 152 samples，acc 0.5000，mean_score 0.0000。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 182 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 91。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 100%；GPU2/GPU3 由 M2 占用，约 30.6G/30.6G，util 59%/47%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 06:49:46，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2 向 step150 运行；不启动 M3、不恢复 M1，除非出现干净双卡。下一关键点为 M2 `95.jsonl`/`global_step_95/actor` 或 GPU 释放。

### 2026-07-27 07:12 巡检补充
- M2 `m2_mix50_2b`：新产出 `92.jsonl`（07:12:07，约 5.4MB），训练进程仍存活；`latest_checkpointed_iteration.txt` 仍为 90，尚无 `global_step_95/actor`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 rollout 指标已刷新到 step92：Geo3K 120 samples，acc 0.8167，mean_score 0.7350；text 136 samples，acc 0.5368，mean_score 0.0735。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 184 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 92。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 100%；GPU2/GPU3 由 M2 占用，约 38.7G/38.6G，util 40%/39%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 07:09:47，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2 向 step150 运行；不启动 M3、不恢复 M1，除非出现干净双卡。下一关键点为 M2 `95.jsonl`/`global_step_95/actor` 或 GPU 释放。

### 2026-07-27 07:35 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `92.jsonl`（07:12:07），CSV/看板已保持到 step92；worker 当前处于 `actor_rollout_ref_update_actor`，step93 尚未落盘；`latest_checkpointed_iteration.txt` 仍为 90，尚无 `global_step_95/actor`、`global_step_100/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 100%；GPU2/GPU3 由 M2 占用，约 31.9G/31.8G，util 100%/73%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 07:34:47，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2 向 step150 运行；不启动 M3、不恢复 M1，除非出现干净双卡。下一关键点为 M2 `93.jsonl`、`95.jsonl`/`global_step_95/actor` 或 GPU 释放。

### 2026-07-27 07:56 巡检补充
- M2 `m2_mix50_2b`：新产出 `93.jsonl`（07:53:02，约 5.8MB），训练进程仍存活；`latest_checkpointed_iteration.txt` 仍为 90，尚无 `global_step_95/actor`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 rollout 指标已刷新到 step93：Geo3K 104 samples，acc 0.6442，mean_score 0.5798；text 152 samples，acc 0.5329，mean_score 0.0658。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 186 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 93。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 99%；GPU2/GPU3 由 M2 占用，约 38.6G/38.6G，util 45%/48%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 07:54:47，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2 向 step150 运行；不启动 M3、不恢复 M1，除非出现干净双卡。下一关键点为 M2 `95.jsonl`/`global_step_95/actor` 或 GPU 释放。

### 2026-07-27 08:19 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `93.jsonl`（07:53:02），CSV/看板已保持到 step93；worker 当前处于 `actor_rollout_ref_update_actor`，step94 尚未落盘；`latest_checkpointed_iteration.txt` 仍为 90，尚无 `global_step_95/actor`、`global_step_100/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留；GPU2/GPU3 由 M2 占用，约 32.2G/32.1G，util 65%/63%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 08:14:47，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2 向 step150 运行；不启动 M3、不恢复 M1，除非出现干净双卡。下一关键点为 M2 `94.jsonl`、`95.jsonl`/`global_step_95/actor` 或 GPU 释放。

### 2026-07-27 08:45 巡检补充
- M2 `m2_mix50_2b`：新产出 `94.jsonl`（08:34:28，约 6.1MB），训练进程仍存活；当前 worker 进入下一轮 `actor_rollout_ref_compute_log_prob`，说明 step95 正在推进；`latest_checkpointed_iteration.txt` 仍为 90，尚无 `global_step_95/actor`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 rollout 指标已刷新到 step94：Geo3K 104 samples，acc 0.7788，mean_score 0.7010；text 152 samples，acc 0.6382，mean_score 0.2763。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 188 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 94。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留；GPU2/GPU3 由 M2 占用，约 9.8G/10.1G，util 97%/58%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 08:44:47，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2 向 step150 运行；不启动 M3、不恢复 M1，除非出现干净双卡。下一关键点为 M2 `95.jsonl` 与 `global_step_95/actor`。

### 2026-07-27 09:08 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `94.jsonl`（08:34:28），CSV/看板已保持到 step94；worker 当前处于 `actor_rollout_ref_update_actor`，step95 尚未落盘；`latest_checkpointed_iteration.txt` 仍为 90，尚无 `95.jsonl`、`global_step_95/actor`、`global_step_100/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 100%；GPU2/GPU3 由 M2 占用，约 33.9G/33.9G，util 89%/90%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 09:04:47，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2 向 step150 运行；不启动 M3、不恢复 M1，除非出现干净双卡。下一关键点为 M2 `95.jsonl` 与 `global_step_95/actor`。

### 2026-07-27 09:35 巡检补充
- M2 `m2_mix50_2b`：新产出 `95.jsonl`（09:18:21，约 6.5MB），`latest_checkpointed_iteration.txt` 已更新为 95；`global_step_95/actor` 已验证完整，7 个文件，总量约 25G（2 个 model shard、2 个 optim shard、2 个 extra_state、`fsdp_config.json`）。
- M2 rollout 指标已刷新到 step95：Geo3K 160 samples，acc 0.5375，mean_score 0.4838；text 96 samples，acc 0.6042，mean_score 0.2083。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 190 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 95。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 100%；GPU2/GPU3 由 M2 占用，约 7.1G/7.1G，util 70%/64%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 09:34:47，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：M2 已通过 step95 关键点，继续运行至 step150；不启动 M3、不恢复 M1，除非出现干净双卡。下一关键点为 M2 `100.jsonl`/`global_step_100/actor` 或 GPU 释放。

### 2026-07-27 09:57 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 仍为 `95.jsonl`（09:18:21），CSV/看板已保持到 step95；worker 当前处于 `actor_rollout_ref_update_actor`，step96 尚未落盘；`latest_checkpointed_iteration.txt` 仍为 95，尚无 `96.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 100%；GPU2/GPU3 由 M2 占用，约 34.0G/34.0G，util 51%/59%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 09:54:47，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2 向 step150 运行；不启动 M3、不恢复 M1，除非出现干净双卡。下一关键点为 M2 `96.jsonl`、`100.jsonl`/`global_step_100/actor` 或 GPU 释放。

### 2026-07-27 10:19 巡检补充
- M2 `m2_mix50_2b`：新产出 `96.jsonl`（09:59:37，约 5.8MB），训练进程仍存活；`latest_checkpointed_iteration.txt` 仍为 95，尚无 `global_step_100/actor` 或 `global_step_150/actor`。
- M2 rollout 指标已刷新到 step96：Geo3K 112 samples，acc 0.3839，mean_score 0.3455；text 144 samples，acc 0.4653，mean_score -0.0694。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 192 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 96。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留，GPU1 util 约 100%；GPU2/GPU3 由 M2 占用，约 31.4G/31.4G，util 70%/51%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 10:19:47，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2 向 step150 运行；不启动 M3、不恢复 M1，除非出现干净双卡。下一关键点为 M2 `100.jsonl`/`global_step_100/actor` 或 GPU 释放。

### 2026-07-27 10:23 巡检补充
- M2 `m2_mix50_2b`：最新 rollout 为 `96.jsonl`（09:59:37，约 5.8MB），CSV/看板已确认同步到 step96；`latest_checkpointed_iteration.txt` 仍为 95，尚无 `global_step_100/actor` 或 `global_step_150/actor`。
- M2 step96 指标：Geo3K 112 samples，acc 0.3839，mean_score 0.3455；text 144 samples，acc 0.4653，mean_score -0.0694。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 192 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 96。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留；GPU2/GPU3 由 M2 占用，约 31.9G/31.8G，util 62%/59%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 10:19:47，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2 向 step150 运行；不启动 M3、不恢复 M1，除非出现干净双卡。下一关键点为 M2 `100.jsonl`/`global_step_100/actor` 或 GPU 释放。

### 2026-07-27 10:49 巡检补充
- M2 `m2_mix50_2b`：新产出 `97.jsonl`（10:39:38，约 5.8MB），训练进程仍存活；`latest_checkpointed_iteration.txt` 仍为 95，尚无 `global_step_100/actor` 或 `global_step_150/actor`。
- M2 rollout 指标已刷新到 step97：Geo3K 120 samples，acc 0.4667，mean_score 0.4200；text 136 samples，acc 0.6618，mean_score 0.3235。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 194 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 97。
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G 残留；GPU2/GPU3 由 M2 占用，约 38.6G/38.6G，util 25%/30%；当前无干净 2-GPU 通道。
- M1/M3/评估：M1 仍停 step130，无 step150；M3 未启动；evaluation supervisor 心跳到 10:49:47，继续等待 M1 step150；completion marker 仍为空。
- 错误扫描：M2 日志仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- 调度结论：继续保持 M2 向 step150 运行；不启动 M3、不恢复 M1，除非出现干净双卡。下一关键点为 M2 `100.jsonl`/`global_step_100/actor` 或 GPU 释放。

### 2026-07-27 10:54 巡检补充
- GPU 状态：GPU0 仍有约 74.9G `[Not Found]` 残留上下文；GPU1 降至约 5.5G `[Not Found]`，但 GPU2/3 仍被 M2 worker 使用且有活跃 util，当前没有干净的 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，最新 checkpoint 仍为 `latest_checkpointed_iteration.txt=95`，`global_step_95/actor` 完整 7 文件约 25G；最新 rollout 仍为 `97.jsonl`，尚未出现 `98.jsonl` 或 `global_step_100/actor`。
- M2 日志扫描：仅见 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed 等关键错误；训练日志 mtime 停在 `2026-07-27 10:39:46 +0800`，需继续观察是否产出 step98。
- M1 `m1_geo3k100_2b`：仍停在 checkpoint 130，`global_step_130/actor` 完整，未出现 `global_step_150/actor`；评估 supervisor 仍每 5 分钟等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；因无干净双卡资源，本轮不启动新任务，也不恢复 M1。

### 2026-07-27 10:56 巡检补充
- GPU 状态：GPU0 仍约 74.9G `[Not Found]` 残留；GPU1 约 7.8G `[Not Found]` 残留；GPU2/GPU3 由 M2 worker 占用，约 7.1G/7.1G，util 88%/90%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，最新 rollout 仍为 `97.jsonl`（10:39:38），`latest_checkpointed_iteration.txt=95`，`global_step_95/actor` 完整 7 文件约 25G；尚无 `98.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 10:39:46 +0800`，仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1 `m1_geo3k100_2b`：仍停 checkpoint 130，`global_step_130/actor` 完整，未到 step150；evaluation supervisor 心跳到 10:54:47，继续等待 M1 step150。
- M3 `m3_mix20_2b`：尚未启动；本轮继续不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 10:57 巡检补充
- GPU 状态：GPU0/GPU1 再次显示约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 13.7G/13.4G，util 36%/99%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `97.jsonl`（10:39:38），`latest_checkpointed_iteration.txt=95`，`global_step_95/actor` 完整；尚无 `98.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 10:39:46 +0800`，仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，未出现 `global_step_150/actor`；evaluation supervisor 心跳到 10:54:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮继续不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 10:59 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 31.1G/31.0G，util 59%/57%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 继续处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `97.jsonl`（10:39:38），`latest_checkpointed_iteration.txt=95`，`global_step_95/actor` 完整 7 文件约 25G；尚无 `98.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 10:39:46 +0800`，仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 10:54:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮继续不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 11:00 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 31.4G/31.4G，util 58%/60%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 继续处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `97.jsonl`（10:39:38），`latest_checkpointed_iteration.txt=95`，`global_step_95/actor` 完整 7 文件约 25G；尚无 `98.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 10:39:46 +0800`，仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed；继续观察 update_actor 是否完成并产出 step98。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 10:59:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮继续不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 11:03 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 31.9G/31.9G，util 73%/68%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 继续处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `97.jsonl`（10:39:38），`latest_checkpointed_iteration.txt=95`，`global_step_95/actor` 完整；尚无 `98.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志状态：日志 mtime 仍为 `2026-07-27 10:39:46 +0800`；tail 显示 step96 已完成并进入 `Training Progress: 97/150`，当前应仍在 step97 后续计算/更新阶段；错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 10:59:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮继续不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 11:08 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 32.7G/32.7G，util 26%/58%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 继续处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `97.jsonl`（10:39:38），`latest_checkpointed_iteration.txt=95`，`global_step_95/actor` 完整；尚无 `98.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 10:39:46 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed；继续观察 step97 update_actor 是否完成。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 11:04:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮继续不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 11:12 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 33.9G/33.9G，util 63%/23%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 继续处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `97.jsonl`（10:39:38），`latest_checkpointed_iteration.txt=95`，`global_step_95/actor` 完整；尚无 `98.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 10:39:46 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed；继续观察 step97 update_actor 是否完成。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 11:09:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮继续不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 11:14 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 33.9G/33.9G，util 63%/57%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 继续处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `97.jsonl`（10:39:38），`latest_checkpointed_iteration.txt=95`，`global_step_95/actor` 完整；尚无 `98.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 10:39:46 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed；step97 update_actor 已持续较久但 GPU util/worker CPU 仍活跃，继续观察。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 11:09:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮继续不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 11:17 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 33.9G/33.9G，util 68%/63%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 继续处于 `actor_rollout_ref_update_actor`，CPU/GPU 仍活跃；最新 rollout 仍为 `97.jsonl`（10:39:38），`latest_checkpointed_iteration.txt=95`，`global_step_95/actor` 完整；尚无 `98.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 10:39:46 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed；距 step97 rollout 约 38 分钟，仍接近此前单步 update/step 耗时范围，继续观察。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 11:14:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮继续不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 11:24 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 38.6G/38.7G，util 42%/48%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：新产出 `98.jsonl`（11:21:59，约 6.2MB），launcher/trainer/worker 进程仍存活；`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `global_step_100/actor` 或 `global_step_150/actor`。
- M2 rollout 指标已刷新到 step98：Geo3K 152 samples，acc 0.5724，mean_score 0.5151；text 104 samples，acc 0.6731，mean_score 0.3462。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 196 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 98。
- M2 日志扫描：日志 mtime 更新到 `2026-07-27 11:22:02 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 11:19:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 11:28 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 38.6G/38.7G，util 39%/35%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；最新 rollout 仍为 `98.jsonl`（11:21:59，约 6.2MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `99.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 11:22:02 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 11:24:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 11:30 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 38.6G/38.7G，util 32%/35%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；最新 rollout 仍为 `98.jsonl`（11:21:59，约 6.2MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `99.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 11:22:02 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 11:29:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 11:33 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 9.9G/10.2G，util 100%/84%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_compute_log_prob`；最新 rollout 仍为 `98.jsonl`（11:21:59，约 6.2MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `99.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 11:22:02 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 11:29:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 11:37 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 6.8G/6.8G，util 56%/62%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_compute_ref_log_prob`；最新 rollout 仍为 `98.jsonl`（11:21:59，约 6.2MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `99.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 11:22:02 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 11:34:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 11:43 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 31.4G/31.4G，util 58%/51%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `98.jsonl`（11:21:59，约 6.2MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `99.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 11:22:02 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 11:39:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 11:47 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 32.1G/32.1G，util 26%/29%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `98.jsonl`（11:21:59，约 6.2MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `99.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 11:22:02 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 11:44:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 11:56 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 33.8G/33.8G，util 100%/59%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `98.jsonl`（11:21:59，约 6.2MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `99.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 11:22:02 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 11:54:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 12:01 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 33.8G/33.8G，util 35%/27%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `98.jsonl`（11:21:59，约 6.2MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `99.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 11:22:02 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 11:59:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。

### 2026-07-27 12:05 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 38.5G/38.4G，util 39%/37%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：新产出 `99.jsonl`（12:04:32，约 6.4MB），launcher/trainer/worker 进程仍存活；`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `global_step_100/actor` 或 `global_step_150/actor`。
- M2 rollout 指标已刷新到 step99：Geo3K 136 samples，acc 0.4926，mean_score 0.4434；text 120 samples，acc 0.5583，mean_score 0.1167。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 198 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 99。
- M2 日志扫描：日志 mtime 更新到 `2026-07-27 12:04:36 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:04:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。下一关键点为 M2 `100.jsonl` 与 `global_step_100/actor`。

### 2026-07-27 12:10 巡检补充
- GPU 状态：GPU0 仍约 74.9G `[Not Found]` 残留；GPU1 当前约 0G 空闲但单卡不足以启动 2B 双卡任务；GPU2/GPU3 由 M2 占用，约 38.5G/38.4G，util 40%/41%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；最新 rollout 仍为 `99.jsonl`（12:04:32，约 6.4MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `100.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 12:04:36 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:09:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。下一关键点仍为 M2 `100.jsonl` 与 `global_step_100/actor`。

### 2026-07-27 12:14 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 9.8G/10.0G，util 63%/55%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_compute_log_prob`；最新 rollout 仍为 `99.jsonl`（12:04:32，约 6.4MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `100.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 12:04:36 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:09:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。下一关键点仍为 M2 `100.jsonl` 与 `global_step_100/actor`。

### 2026-07-27 12:18 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 6.6G/6.6G，util 97%/97%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_compute_ref_log_prob`；最新 rollout 仍为 `99.jsonl`（12:04:32，约 6.4MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `100.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 12:04:36 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:14:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。下一关键点仍为 M2 `100.jsonl` 与 `global_step_100/actor`。

### 2026-07-27 12:23 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 30.9G/30.8G，util 68%/60%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `99.jsonl`（12:04:32，约 6.4MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `100.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 12:04:36 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:19:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。下一关键点仍为 M2 `100.jsonl` 与 `global_step_100/actor`。

### 2026-07-27 12:26 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 31.5G/31.5G，util 17%/100%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `99.jsonl`（12:04:32，约 6.4MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `100.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 12:04:36 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:24:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。下一关键点仍为 M2 `100.jsonl` 与 `global_step_100/actor`。

### 2026-07-27 12:30 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 32.1G/32.1G，util 59%/68%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `99.jsonl`（12:04:32，约 6.4MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `100.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 12:04:36 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:29:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。下一关键点仍为 M2 `100.jsonl` 与 `global_step_100/actor`。

### 2026-07-27 12:34 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 34.0G/34.1G，util 99%/96%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `99.jsonl`（12:04:32，约 6.4MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `100.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 12:04:36 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:29:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。下一关键点仍为 M2 `100.jsonl` 与 `global_step_100/actor`。

### 2026-07-27 12:39 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 34.0G/34.1G，util 56%/100%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `99.jsonl`（12:04:32，约 6.4MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `100.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 12:04:36 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:34:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。下一关键点仍为 M2 `100.jsonl` 与 `global_step_100/actor`。

### 2026-07-27 12:42 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 34.0G/34.1G，util 62%/70%；当前仍无干净 2-GPU 通道。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `99.jsonl`（12:04:32，约 6.4MB），`latest_checkpointed_iteration.txt` 仍为 95，`global_step_95/actor` 完整；尚无 `100.jsonl`、`global_step_100/actor` 或 `global_step_150/actor`。
- M2 日志扫描：日志 mtime 仍为 `2026-07-27 12:04:36 +0800`，错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:39:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1。下一关键点仍为 M2 `100.jsonl` 与 `global_step_100/actor`。

### 2026-07-27 12:48 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 38.1G/38.0G，util 35%/36%；当前仍无干净 2-GPU 通道，不能安全启动新的双卡任务。
- M2 `m2_mix50_2b`：launcher/trainer/worker 进程仍存活；新产出 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 已完整（7 files，约 25G）；尚无 `global_step_150/actor`。
- M2 rollout 指标已刷新到 step100：Geo3K 136 samples，acc 0.6838，mean_score 0.6154；text 120 samples，acc 0.6583，mean_score 0.3167。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 200 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 100。
- M2 日志扫描：错误扫描仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:44:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；本轮不启动新任务，等待干净双卡释放后优先恢复 M1（评估流水线当前阻塞于 M1 step150）。

### 2026-07-27 12:52 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，其中 GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，约 38.1G/38.0G，util 32%/27%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：dashboard/CSV 已在上一轮刷新到 step100，本轮无新增 rollout，无需重复刷新；step100 仍为 Geo3K acc 0.6838、mean_score 0.6154，text acc 0.6583、mean_score 0.3167。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:49:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 12:54 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 仍瞬时 100%；GPU2/GPU3 由 M2 占用，约 38.1G/38.0G，util 29%/31%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100；训练日志 mtime 为 `2026-07-27 12:46:43 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:49:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 12:56 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时约 99%；GPU2/GPU3 仍被 M2 上下文占用，约 38.1G/38.0G，util 当前瞬时 0%；由于显存仍占用，当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100；训练日志 mtime 仍为 `2026-07-27 12:46:43 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:54:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 12:58 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，约 38.6G/38.5G，util 31%/41%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活；训练日志 mtime 更新到 `2026-07-27 12:56:44 +0800`，说明进程仍有活动；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:54:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:01 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 38.6G/38.5G，util 36%/35%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100；训练日志 mtime 仍为 `2026-07-27 12:56:44 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:59:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:04 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，约 38.6G/38.5G，util 28%/30%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100；训练日志 mtime 仍为 `2026-07-27 12:56:44 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 12:59:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:07 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 9.9G/10.2G，util 59%/56%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 当前处于 `actor_rollout_ref_compute_log_prob`；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100；训练日志 mtime 仍为 `2026-07-27 12:56:44 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:04:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:09 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 10.0G/10.2G，util 99%/92%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 当前仍处于 `actor_rollout_ref_compute_log_prob`；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100；训练日志 mtime 仍为 `2026-07-27 12:56:44 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:04:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:11 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 6.8G/6.7G，util 90%/94%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 已推进到 `actor_rollout_ref_compute_ref_log_prob`；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100；训练日志 mtime 仍为 `2026-07-27 12:56:44 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:09:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:13 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 97%；GPU2/GPU3 由 M2 占用，当前约 30.3G/30.3G，util 59%/59%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 已推进到 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100；训练日志 mtime 仍为 `2026-07-27 12:56:44 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:09:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:15 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 31.2G/31.2G，util 55%/68%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 仍处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100；训练日志 mtime 仍为 `2026-07-27 12:56:44 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:14:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:18 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 31.7G/31.7G，util 100%/94%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 仍处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100；训练日志 mtime 仍为 `2026-07-27 12:56:44 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:14:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:21 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 32.6G/32.5G，util 62%/53%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 仍处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100；训练日志 mtime 仍为 `2026-07-27 12:56:44 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:19:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:25 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，当前约 33.7G/33.4G，util 46%/25%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 仍处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100；训练日志 mtime 仍为 `2026-07-27 12:56:44 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:24:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:27 巡检补充
- GPU 状态：GPU0 仍约 74.9G `[Not Found]` 残留；GPU1 降到约 5.5G `[Not Found]`，但单卡不足以安全启动 2B 双卡任务；GPU2/GPU3 由 M2 占用，当前约 33.7G/33.4G，util 59%/60%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 仍处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100；训练日志 mtime 仍为 `2026-07-27 12:56:44 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:24:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:31 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，当前约 33.7G/33.4G，util 43%/46%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 仍处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `100.jsonl`（12:46:49，约 6.3MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `101.jsonl` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step100；训练日志 mtime 仍为 `2026-07-27 12:56:44 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:29:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:34 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 38.6G/38.6G，util 40%/41%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：新产出 `101.jsonl`（13:32:11，约 4.8MB），launcher/trainer/tee/worker 进程仍存活；`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `global_step_105/actor` 或 `global_step_150/actor`。
- M2 rollout 指标已刷新到 step101：Geo3K 144 samples，acc 0.6875，mean_score 0.6188；text 112 samples，acc 0.5804，mean_score 0.1607。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 202 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 101。
- M2 日志扫描：训练日志 mtime 更新到 `2026-07-27 13:32:14 +0800`；错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:29:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:38 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 38.6G/38.6G，util 40%/38%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活；最新 rollout 仍为 `101.jsonl`（13:32:11，约 4.8MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `102.jsonl`、`global_step_105/actor` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step101；训练日志 mtime 仍为 `2026-07-27 13:32:14 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:34:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:42 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 9.8G/10.1G，util 77%/67%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 已进入下一轮 `actor_rollout_ref_compute_log_prob`；最新 rollout 仍为 `101.jsonl`（13:32:11，约 4.8MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `102.jsonl`、`global_step_105/actor` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step101；训练日志 mtime 仍为 `2026-07-27 13:32:14 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:39:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:45 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 10.0G/10.1G，util 76%/58%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 仍处于 `actor_rollout_ref_compute_log_prob`；最新 rollout 仍为 `101.jsonl`（13:32:11，约 4.8MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `102.jsonl`、`global_step_105/actor` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step101；训练日志 mtime 仍为 `2026-07-27 13:32:14 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:44:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:49 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，当前约 7.1G/6.8G，util 97%/97%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 已推进到 `actor_rollout_ref_compute_ref_log_prob`；最新 rollout 仍为 `101.jsonl`（13:32:11，约 4.8MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `102.jsonl`、`global_step_105/actor` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step101；训练日志 mtime 仍为 `2026-07-27 13:32:14 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:44:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:52 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，当前约 31.3G/31.3G，util 45%/16%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 已推进到 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `101.jsonl`（13:32:11，约 4.8MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `102.jsonl`、`global_step_105/actor` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step101；训练日志 mtime 仍为 `2026-07-27 13:32:14 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:49:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 13:56 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 32.2G/32.1G，util 73%/66%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 仍处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `101.jsonl`（13:32:11，约 4.8MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `102.jsonl`、`global_step_105/actor` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step101；训练日志 mtime 仍为 `2026-07-27 13:32:14 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:54:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 14:00 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，当前约 33.1G/33.2G，util 29%/0%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 仍处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `101.jsonl`（13:32:11，约 4.8MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `102.jsonl`、`global_step_105/actor` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step101；训练日志 mtime 仍为 `2026-07-27 13:32:14 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 13:59:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 14:05 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 33.8G/33.9G，util 73%/79%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 仍处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `101.jsonl`（13:32:11，约 4.8MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `102.jsonl`、`global_step_105/actor` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step101；训练日志 mtime 仍为 `2026-07-27 13:32:14 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 14:04:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 14:19 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 38.6G/38.7G，util 33%/32%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：新产出 `102.jsonl`（14:13:17，约 5.9MB），launcher/trainer/tee/worker 进程仍存活；`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `global_step_105/actor` 或 `global_step_150/actor`。
- M2 rollout 指标已刷新到 step102：Geo3K 152 samples，acc 0.7237，mean_score 0.6513；text 104 samples，acc 0.3942，mean_score -0.2115。`evaluation/mm_rollouts/m2_mix50_2b_rollout_summary.csv` 共 204 行，`dashboard/mm/js/data-m2-rollouts.js` 最大 step 已确认 102。
- M2 日志扫描：训练日志 mtime 更新到 `2026-07-27 14:13:20 +0800`；错误扫描仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 14:14:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 14:27 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留；GPU2/GPU3 由 M2 占用，当前约 6.8G/6.6G，util 59%/61%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 已进入 `actor_rollout_ref_compute_ref_log_prob`；最新 rollout 仍为 `102.jsonl`（14:13:17，约 5.9MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `103.jsonl`、`global_step_105/actor` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step102；训练日志 mtime 仍为 `2026-07-27 14:13:20 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 14:24:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 14:33 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 31.4G/31.4G，util 71%/77%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 仍处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `102.jsonl`（14:13:17，约 5.9MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `103.jsonl`、`global_step_105/actor` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step102；训练日志 mtime 仍为 `2026-07-27 14:13:20 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 14:29:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 14:40 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 32.8G/33.0G，util 86%/84%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 仍处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `102.jsonl`（14:13:17，约 5.9MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `103.jsonl`、`global_step_105/actor` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step102；训练日志 mtime 仍为 `2026-07-27 14:13:20 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 14:39:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 14:46 巡检补充
- GPU 状态：GPU0/GPU1 仍约 74.9G/74.5G `[Not Found]` 残留，GPU1 util 瞬时 100%；GPU2/GPU3 由 M2 占用，当前约 34.0G/33.9G，util 51%/30%；当前仍无干净 2-GPU 通道，不能安全启动 M1 恢复或 M3 新任务。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 进程仍存活，worker 仍处于 `actor_rollout_ref_update_actor`；最新 rollout 仍为 `102.jsonl`（14:13:17，约 5.9MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整（7 files，约 25G）；尚无 `103.jsonl`、`global_step_105/actor` 或 `global_step_150/actor`。
- M2 指标：本轮无新增 rollout，dashboard/CSV 保持 step102；训练日志 mtime 仍为 `2026-07-27 14:13:20 +0800`。
- M2 日志扫描：仍仅 NUMA affinity warning，未见 OOM/Traceback/FAILED/Killed。
- M1/评估：M1 仍停 checkpoint 130，`global_step_130/actor` 完整但无 `global_step_150/actor`；evaluation supervisor 心跳到 14:44:47，继续等待 M1 step150；completion marker 仍为空。
- M3：尚未启动；继续等待干净双卡释放，释放后优先恢复 M1 以解除评估流水线阻塞。

### 2026-07-27 14:57 巡检补充
- 用户确认：`m1_geo3k100_2b` 已停滞约 2 天 2 小时，M1 任务可以停止，不再作为待恢复训练优先项处理。
- 进程核查：按 `m1_geo3k100_2b|geo3k100|run_mm.*m1` 检索未发现存活的 M1 launcher/trainer/worker，因此无需发送 kill；M1 当前实际状态为已停在 `latest_checkpointed_iteration.txt=130`。
- 产物状态：M1 最新 rollout 为 `130.jsonl`，最新 actor 为 `global_step_130/actor`，未生成 `global_step_150/actor`，也无 `evaluation/completed/` 下的 M1 完成标记。
- GPU 状态：GPU2/3 仍由 `m2_mix50_2b` 使用；GPU0 仍有高显存 `[Not Found]` 残留上下文；GPU1 本轮显示高显存 `[Not Found]` 残留，未作为干净双卡使用。
- 调度决定：不恢复 M1，不启动 M3；保持 M2 继续运行。评估 supervisor 仍在等待 M1 step-150，如后续正式取消整条 M1 评估依赖，需要单独处理 evaluation pipeline。

### 2026-07-27 15:03 巡检补充
- GPU 状态：GPU0 仍约 74.9G `[Not Found]` 残留，GPU1 约 74.5G `[Not Found]` 且 util 100%；GPU2/GPU3 由 M2 占用，当前约 9.9G/10.0G，util 53%/53%；没有干净双卡可开新任务。
- M1 `m1_geo3k100_2b`：用户已确认可停止；本轮仍停在 checkpoint 130，最新 rollout `130.jsonl`，最新 actor `global_step_130/actor`，无 step150 actor 和完成标记；不再恢复 M1。
- M2 `m2_mix50_2b`：launcher/trainer/tee/worker 均存活，worker 当前处于 `actor_rollout_ref_compute_log_prob`；最新 rollout 仍为 `103.jsonl`（14:52:36，约 5.7MB），`latest_checkpointed_iteration.txt=100`，`global_step_100/actor` 完整，尚无 `global_step_105/actor`。
- M2 指标：CSV/dashboard 已刷新到 step103，共 206 行；step103 Geo3K 168 samples，acc 0.7679，mean_score 0.6911；text 88 samples，acc 0.5795，mean_score 0.1591。
- 评估 pipeline：supervisor 仍心跳到 14:59:47，并继续等待 M1 step150；若正式放弃 M1 后续评估，需要后续调整/停止该评估等待逻辑。
- M3 `m3_mix20_2b`：未启动；当前无可用干净双卡，因此不启动新任务。
