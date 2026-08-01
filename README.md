# vlm_exp

Multimodal GRPO ablation on **Qwen3.5-2B** (native vision): hold model, algorithm, sequence length, and training budget fixed; vary only the **image–text mix ratio** in the training data (0% / 20% / 50% / 100%).

This repo is the multimodal track companion to the text-only RL work in [`polaris`](../polaris). Detailed design notes live in [`exp_plan_mm.md`](./exp_plan_mm.md). Static experiment dashboards are under [`dashboard/`](./dashboard/).

## Goals

1. **Vision**: how fast / how high Geo3K accuracy rises as the share of image–text samples increases.
2. **Text retention**: whether mixing Geo3K dilutes or collapses pure-text math (aime24 / math_500), compared to the text GRPO baseline (E1 / M0).

Scientific constraint: the **only** independent variable is the multimodal sample ratio. Algorithm stays GRPO (same block as E1). Other axes (vision-encoder freeze, resolution, base model) are out of scope for this round.

## Layout relative to sibling repos

```
$ROOT=/data/lijunyi
├── vlm_exp/          ← this repo (MM scripts, data slices, ckpts, logs, dashboard)
├── polaris/          ← shared infra: verl_env.sh, text parquet, aime24, weight merge, E1 baseline
├── verl-main/        ← training framework
└── evalscope/        ← text eval (mmlu / aime / math_500)
```

| Path | Role |
| --- | --- |
| `vlm_exp/` | MM-only code, Geo3K parquet, `exp2card_mm` checkpoints/logs, dashboard, eval outputs |
| `polaris/` | `scripts/verl_env.sh`, `polaris_easy_boxed.parquet`, `aime24.parquet`, E1 (`e1_grpo_2b`) as M0 |
| `verl-main/` | `python -m verl.trainer.main_ppo` |
| `evalscope/` | Offline text benchmarks after HF merge |

## Experiment groups

| Group | Image–text % | Train data | Notes |
| --- | ---: | --- | --- |
| **M0** | 0% | `polaris_easy_boxed.parquet` (full) | Reuse finished `e1_grpo_2b`; do not retrain |
| **M1** | 100% | `geo3k/train.parquet` (2101) | Pure vision extreme |
| **M2** | 50% | Geo3K + `text_subset_m2_2101.parquet` | Equal mix |
| **M3** | 20% | Geo3K + `text_subset_m3_8404.parquet` | Closer to realistic post-training mix |

**Held constant (M1–M3):** GRPO, `train_batch_size=32`, `rollout.n=8`, `max_prompt_length=1024`, `max_response_length=16384`, non-thinking, `lr=1e-6`, `total_training_steps=150`, `data.seed=1`, 2× A100 FSDP2, project `exp2card_mm`.

`total_epochs` differs only so small pools can reach 150 steps (M1: 10, M2: 5, M3: 2). Stopping is still `total_training_steps=150`.

## Repository structure

```
vlm_exp/
├── README.md
├── exp_plan_mm.md              # full experiment design & status
├── start.sh / stop.sh          # root static server (legacy / optional)
├── dashboard/                  # RL experiment dashboard (preferred)
│   ├── index.html              # hub: algo / 2B / 4B / MM
│   ├── serve.sh / restart.sh
│   ├── algo/  2b/  4b/  mm/    # track pages
│   └── common/                 # shared CSS/JS
├── data_process/
│   └── build_mm_mix.py         # text subsets + Geo3K val probe
├── scripts/
│   ├── train/                  # smoke, GRPO trainer, M1–M3 entrypoints, reward
│   ├── eval/                   # Geo3K / text eval + evaluation supervisors
│   ├── analysis/               # rollout summaries + dashboard JS generators
│   └── archive/                # metadata snapshot (no large ckpts)
├── parquet/mm/                 # gitignored: Geo3K + mix slices
├── model/exp2card_mm/          # gitignored: checkpoints
├── logs/exp2card_mm/           # gitignored: train / pipeline logs
├── evaluation/                 # gitignored: geo3k jsonl, done markers
└── tensorboard/exp2card_mm/    # gitignored
```

Large artifacts (`model/`, `parquet/`, `evaluation/`, `logs/`, `tensorboard/`) are gitignored; keep them on the shared filesystem.

## Prerequisites

- Machine: 2× A100-80GB for training (eval can use a spare GPU).
- Conda env: `verl_qwen35` (same as E1–E5 text runs).
- Model: Qwen3.5-2B with vision  
  `/mnt/data/user/tc_ai/klara/models/open_llm_vllm/qwen35_2b/train-model`
- Hugging Face: prefer `HF_ENDPOINT=https://hf-mirror.com` if `huggingface.co` TLS fails; training scripts set offline once data is local.
- Shared scripts: `source $ROOT/polaris/scripts/verl_env.sh`

## Quick start

### 1. Data (already prepared on this machine)

```bash
# Geo3K preprocess (verl example) → vlm_exp/parquet/mm/geo3k_raw/
cd $ROOT/verl-main
export HF_ENDPOINT=https://hf-mirror.com
unset HF_HUB_OFFLINE TRANSFORMERS_OFFLINE
python examples/data_preprocess/geo3k.py \
  --local_save_dir $ROOT/vlm_exp/parquet/mm/geo3k_raw

# Text subsets + 100-sample Geo3K val probe
python $ROOT/vlm_exp/data_process/build_mm_mix.py
```

Outputs under `parquet/mm/`:

- `geo3k_raw/train.parquet`, `geo3k_raw/test.parquet`
- `text_subset_m2_2101.parquet`, `text_subset_m3_8404.parquet`
- `geo3k_val_probe_100.parquet`

Mixing does **not** require a merged schema: verl concatenates `data.train_files` and returns `None` for missing modality columns.

### 2. Smoke test (required before full training)

```bash
conda activate verl_qwen35
bash scripts/train/run_smoke_mm.sh
```

Checks multimodal FSDP2 + vLLM rollout, mixed parquet batches, `reward_mm_mixed.py` dispatch, and dual val metrics (text + Geo3K).

### 3. Training

Per group:

```bash
bash scripts/train/run_m1_geo3k_2b.sh   # 100% Geo3K
bash scripts/train/run_m2_mix50_2b.sh   # 50/50
bash scripts/train/run_m3_mix20_2b.sh   # 20/80
```

Unattended M1 → M2 → M3 with auto-resume and stale-process protection:

```bash
bash scripts/train/run_mm_training_pipeline.sh
```

Resume: re-run the same entry script (`resume_mode=auto`).

Artifacts:

| Kind | Path |
| --- | --- |
| Checkpoints | `model/exp2card_mm/<exp>/` |
| Logs / rollouts | `logs/exp2card_mm/<exp>/` |
| TensorBoard | `tensorboard/exp2card_mm/<exp>/` |

### 4. Evaluation

One checkpoint (merge FSDP → HF, Geo3K 601, then text evalscope):

```bash
CUDA_VISIBLE_DEVICES=0 bash scripts/eval/evaluate_mm_checkpoint.sh <experiment_name>
# optional: EVAL_STEP=70 for mid-run checkpoints
```

Step-wise queue (every-10 formal grid; skips complete markers by default):

```bash
CUDA_VISIBLE_DEVICES=0 bash scripts/eval/run_mm_eval_queue.sh
# or per group, waiting for a free GPU / optional train PID:
CUDA_VISIBLE_DEVICES=0 bash scripts/eval/supplement_m1_eval.sh
CUDA_VISIBLE_DEVICES=0 bash scripts/eval/supplement_m2_eval.sh
CUDA_VISIBLE_DEVICES=0 ONLY_STEPS="10 20" bash scripts/eval/supplement_m3_eval.sh
```

Background waiter for M1–M3 step-150:

```bash
EVAL_GPU=2 bash scripts/eval/run_mm_evaluation_pipeline.sh
```

M0 baseline uses the existing E1 merged weights under `polaris` (`scripts/eval/evaluate_m0_text.sh` / `run_m0_baseline_supervisor.sh`).

**Scoring**

- Text: Math-Verify + forced `\boxed{}` (same as E1).
- Geo3K: verl `geo3k` grader + format reward (`reward_mm_mixed.py`).
- Text sampling: temperature 0.6, top_p 0.95, max_tokens 16384, n=8.
- `mmlu_temp` mapped to four standard MMLU subsets (5-shot) for EvalScope compatibility.

Done markers: `evaluation/completed/<exp>_step<N>.done` (plus `<exp>.done` alias at step 150).

### 5. Rollout analysis & dashboard data

```bash
# Per-step Geo3K vs text accuracy from rollout dumps
python scripts/analysis/summarize_mm_rollouts.py ...

# Feed static MM dashboard JS
python scripts/analysis/gen_mm_rollout_dashboard_data.py
python scripts/analysis/gen_mm_eval_dashboard_data.py
python scripts/analysis/gen_mm_train_dashboard_data.py   # timing / stability / efficiency
```

### 6. Archive (metadata only; no large ckpts)

```bash
bash scripts/archive/archive_mm_results.sh
# → $ROOT/polaris/archive/mm_exp2card/
```

## Reward

[`scripts/train/reward_mm_mixed.py`](./scripts/train/reward_mm_mixed.py) dispatches by `data_source`:

- `hiyouga/geometry3k` → Geo3K official-style score  
- otherwise → text boxed Math-Verify  

Unit check: `python scripts/train/test_reward_mm_mixed.py`.

## Dashboard

Zero-dependency static site (algo intro, 2B / 4B / multimodal tracks):

```bash
cd dashboard && bash serve.sh          # default port 3000
# PORT=9000 bash serve.sh
# bash restart.sh
```

| Page | URL (local) |
| --- | --- |
| Hub | http://localhost:3000/ |
| Algorithms | http://localhost:3000/algo/ |
| 2B train | http://localhost:3000/2b/ |
| 4B train | http://localhost:3000/4b/ |
| Multimodal | http://localhost:3000/mm/ |

Remote notebook: `ssh -L 3000:localhost:3000 <user>@<host>`, then open localhost.

Root `./start.sh` / `./stop.sh` also serve the repo tree on port 3000; prefer `dashboard/serve.sh` for the curated UI.

## Scripts reference

| Script | Purpose |
| --- | --- |
| `train/run_smoke_mm.sh` | 2-step multimodal smoke |
| `train/run_mm_mix_2b.sh` | Shared trainer (do not call alone) |
| `train/run_m1_geo3k_2b.sh` | M1 100% image–text |
| `train/run_m2_mix50_2b.sh` | M2 50% mix |
| `train/run_m3_mix20_2b.sh` | M3 20% mix |
| `train/run_mm_training_pipeline.sh` | Supervise M1→M2→M3 |
| `train/reward_mm_mixed.py` | Mixed reward for verl |
| `eval/run_mm_evaluation_pipeline.sh` | Wait + eval step-150 |
| `eval/run_mm_eval_queue.sh` | Eval M1–M3 every-10 checkpoints |
| `eval/supplement_m1_eval.sh` | Fill missing M1 step evals |
| `eval/supplement_m2_eval.sh` | Fill missing M2 step evals |
| `eval/supplement_m3_eval.sh` | Fill missing M3 step evals |
| `eval/evaluate_mm_checkpoint.sh` | Merge + Geo3K + text eval |
| `eval/eval_geo3k.py` | Offline Geo3K (JSONL, resumable) |
| `analysis/summarize_mm_rollouts.py` | Rollout CSV summaries |
| `analysis/gen_mm_*_dashboard_data.py` | Emit dashboard JS snapshots |
| `archive/archive_mm_results.sh` | Snapshot scripts/logs/eval (no weights) |

## Comparison metrics

| Axis | Primary metric |
| --- | --- |
| Vision gain | Geo3K test (601) sample accuracy / pass@n |
| Text keep | math_500 (vs M0 = E1) |
| General watch | mmlu_temp (≈1–2 pt drop vs base is typical) |
| Train dynamics | Per-`data_source` reward / pass rate from rollout dumps |

## Known caveats

- **`enforce_eager=True`** on MM runs (skips vLLM CUDA-graph / compile) after a torch inductor cache `PermissionError` with `enforce_eager=False`. Throughput may be lower than E1; numerics are unaffected. See `exp_plan_mm.md` §4.
- **`max_response_length=16384`** is oversized for Geo3K but kept for parity with the text block.
- HF downloads: use the mirror endpoint when direct `huggingface.co` fails.

## Status & deeper docs

**Snapshot 2026-07-24:** M1 `m1_geo3k100_2b` training **97/150** (checkpoint `global_step_90`); rollout dashboard through step 97 (overall train acc≈0.665). M0 formal Geo3K+text eval done; M1@70 light probe on dashboard「评测结果」. M2/M3 not started. Eval pipeline waiting for step-150.

Living checklist and measured timings: [`exp_plan_mm.md`](./exp_plan_mm.md) (sections 6–9). Dashboard: [`dashboard/mm/`](./dashboard/mm/).

Eval status notes (runtime, not always in git): `evaluation/mm_eval_status_*.md`.

## License / ownership

Internal experiment workspace. Coordinate with the `polaris` / `verl-main` owners before changing shared env scripts or baseline checkpoints.
