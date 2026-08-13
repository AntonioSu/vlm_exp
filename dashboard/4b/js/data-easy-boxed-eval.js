// ---- Evaluation results (evalscope offline, auto-synced 2026-08-06) ----
// Source: evalscope/outputs/exp2card/<exp>_4b_<step>/*/reports/<model>/*.json
// 评测配置: eval_exp4b.sh + verl_qwen35 vLLM 0.24；
// aime24/aime25 temperature=0.6 top_p=0.95 max_tokens=16384 n=8（30题×n8=240 采样）；
// mmlu_temp n=2；enable_thinking=False；batch_size=64。
// null = 该 step 尚无对应 offline report（曲线断开）。刷新：python3 scripts/monitoring/4b/sync_4b_eval_dashboard.py

const EVAL_EASY_BOXED_STEPS = ["50", "100", "150"];

const EVAL_EASY_BOXED = {
  e1: { label: "E1 GRPO",       color: COLORS.e1, mmlu: [90.44, 91.81, 91.65], aime25: [50.00, 58.33, 57.92] },
  e2: { label: "E2 DAPO",       color: COLORS.e2, mmlu: [91.17, 92.38, 91.17], aime25: [52.50, 57.09, 59.59] },
  e3: { label: "E3 Dr.GRPO",    color: COLORS.e3, mmlu: [90.84, 91.49, 91.97], aime25: [55.00, 49.59, 55.00] },
  e4: { label: "E4 RLOO",       color: COLORS.e4, mmlu: [90.76, 91.33, 91.89], aime25: [49.17, 50.00, 52.92] },
  e5: { label: "E5 REINFORCE++", color: COLORS.e5, mmlu: [91.24, 91.49, 91.25], aime25: [52.50, 55.84, 57.50] },
};

const EVAL_EASY_BOXED_ORDER = ["e1", "e2", "e3", "e4", "e5"];

// ---- 全 step 明细（10–150）；已完成的填入，缺失为 null ----
const EVAL_EASY_BOXED_FULL_STEPS = ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "110", "120", "130", "140", "150"];

const EVAL_EASY_BOXED_FULL = {
  e1: {
    label: "E1 GRPO", color: COLORS.e1,
    mmlu:   [91.25, 91.00, 90.52, 90.85, 90.44, 90.76, 90.84, 91.81, 91.33, 91.81, 91.82, 91.00, 91.09, 92.14, 91.65],
    aime24: [72.08, 72.50, 68.75, 62.08, 70.00, 67.08, 70.42, 72.08, 71.25, 70.00, 68.33, 67.50, 66.25, 66.25, 70.42],
    aime25: [48.34, 44.59, 50.42, 46.66, 50.00, 51.25, 58.75, 55.42, 55.42, 58.33, 56.25, 53.75, 55.84, 54.58, 57.92],
    math500:[null, null, null, null, 94.62, null, null, null, null, 94.80, null, null, null, null, 94.32],
  },
  e2: {
    label: "E2 DAPO", color: COLORS.e2,
    mmlu:   [91.17, 90.92, 91.24, 91.08, 91.17, 91.90, 91.89, 91.57, 91.97, 92.38, 91.57, 91.82, 91.49, 91.73, 91.17],
    aime24: [67.92, 73.75, 74.17, 76.67, 72.92, 69.58, 74.58, 80.42, 77.08, 74.17, 73.75, 72.50, 74.58, 72.92, 74.58],
    aime25: [50.00, 57.08, 52.50, 50.83, 52.50, 53.33, 59.59, 62.50, 59.17, 57.09, 53.75, 54.58, 55.83, 53.33, 59.59],
    math500:[null, null, null, null, 94.42, null, null, null, null, 95.38, null, null, null, null, 95.55],
  },
  e3: {
    label: "E3 Dr.GRPO", color: COLORS.e3,
    mmlu:   [90.52, 91.00, 90.03, 90.19, 90.84, 91.41, 90.84, 92.22, 91.33, 91.49, 91.57, 92.47, 92.22, 92.30, 91.97],
    aime24: [67.08, 68.33, 70.83, 72.92, 73.75, 74.17, 73.33, 70.00, 70.42, 73.75, 72.50, 75.00, 74.58, 73.33, 71.67],
    aime25: [51.25, 49.17, 50.41, 49.59, 55.00, 55.42, 56.25, 56.25, 58.75, 49.59, 50.00, 57.08, 57.92, 57.08, 55.00],
    math500:[null, null, null, null, 94.35, null, null, null, null, 94.50, null, null, null, null, 94.75],
  },
  e4: {
    label: "E4 RLOO", color: COLORS.e4,
    mmlu:   [90.68, 89.95, 91.16, 90.36, 90.76, 91.00, 91.17, 91.65, 90.76, 91.33, 90.52, 91.00, 91.65, 91.01, 91.89],
    aime24: [67.50, 70.83, 64.17, 72.08, 70.83, 72.08, 62.50, 62.92, 72.50, 72.08, 60.42, 69.17, 73.75, 76.67, 76.25],
    aime25: [51.25, 50.42, 47.92, 52.50, 49.17, 51.67, 44.17, 46.67, 54.59, 50.00, 42.91, 49.59, 51.25, 55.84, 52.92],
    math500:[null, null, null, null, 93.92, null, null, null, null, 94.55, null, null, null, null, 94.75],
  },
  e5: {
    label: "E5 REINFORCE++", color: COLORS.e5,
    mmlu:   [90.27, 90.92, 90.92, 90.68, 91.24, 91.32, 90.36, 91.01, 91.09, 91.49, 90.76, 91.49, 91.01, 91.41, 91.25],
    aime24: [67.50, 69.17, 70.42, 71.25, 72.92, 73.75, 73.75, 74.58, 75.83, 77.92, 75.00, 75.42, 75.00, 78.75, 77.08],
    aime25: [46.25, 46.67, 47.08, 50.83, 52.50, 55.84, 52.50, 57.08, 54.59, 55.84, 57.50, 56.25, 58.34, 52.92, 57.50],
    math500:[null, null, null, null, 95.15, null, null, null, null, 95.13, null, null, null, null, 94.40],
  },
};

// 全 step 曲线：E1–E5
const EVAL_EASY_BOXED_FULL_ORDER = ["e1", "e2", "e3", "e4", "e5"];

// ---- Stage-3/S3 offline (Source: .../exp2card/<exp>_4b_s3_<step>/... ) ----
// Only exps with ≥1 report appear; null = missing S3 offline report.
const EVAL_FULL_S3 = {
  e1: {
    mmlu:   [90.35, 91.09, 90.84, 91.41, 91.41, 90.27, 90.76, 90.44, 90.68, 91.25, 90.84, 91.32, 90.60, 90.59, 90.93],
    aime24: [69.17, 56.67, 52.92, 48.33, 47.50, 51.67, 51.67, 52.92, 52.92, 50.83, 72.50, 73.33, 74.17, 78.33, 76.25],
    aime25: [44.17, 40.00, 40.00, 33.75, 36.25, 35.83, 36.25, 35.00, 38.34, 35.84, 45.42, 51.67, 54.17, 54.17, 55.84],
    math500:[94.58, 93.17, 92.70, 92.48, 92.98, 92.88, 92.52, 93.42, 92.87, 93.03, null, null, null, null, null],
  },
  e2: {
    mmlu:   [90.52, 90.85, 90.19, 91.25, 90.35, 91.17, 90.93, 90.35, 90.12, 90.60, 90.60, 90.76, 90.60, 90.44, 90.11],
    aime24: [74.58, 55.42, 56.67, 55.42, 50.42, 67.50, 65.83, 65.00, 69.58, 65.83, 67.08, 70.83, 62.50, 66.67, 72.50],
    aime25: [46.25, 38.33, 39.17, 37.50, 37.50, 48.75, 46.66, 44.59, 49.59, 45.42, 45.83, 49.58, 45.00, 48.33, 51.67],
    math500:[95.12, 92.70, 93.30, 92.80, 92.95, null, null, null, null, null, null, null, null, null, null],
  },
  e3: {
    mmlu:   [90.44, 90.84, 90.59, 91.33, 91.08, 91.81, 92.06, null, null, null, null, null, null, null, null],
    aime24: [67.50, 70.00, 74.17, 69.17, 73.75, 75.00, 75.42, null, null, null, null, null, null, null, null],
    aime25: [45.84, 47.92, 49.17, 50.83, 56.25, 58.75, null, null, null, null, null, null, null, null, null],
    math500:[95.03, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  },
  e4: {
    mmlu:   [90.35, 90.12, 90.52, 90.44, 91.16, null, null, null, null, null, null, null, null, null, null],
    aime24: [47.92, 45.42, 45.83, 47.50, 45.42, null, null, null, null, null, null, null, null, null, null],
    aime25: [34.58, 33.75, 37.08, 36.67, 36.25, null, null, null, null, null, null, null, null, null, null],
    math500:[92.18, 91.35, 90.95, 90.90, 89.70, null, null, null, null, null, null, null, null, null, null],
  },
};
// ---- Agent / tool-use benchmarks (evalscope, auto-synced 2026-08-06) ----
// Source: /data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/agent2/<ts>/reports/<exp>_4b_<step>/{bfcl_v3,tau_bench}.json
// Coverage: bfcl=75 · tau=75 · steps with any report: 10/20/30/40/50/60/70/80/90/100/110/120/130/140/150
// BFCL-v3: 10 subset ×30；bfcl=OVERALL（新版无聚合项时用 macro_score）；bfcl_mt=MULTI_TURN。
// tau-bench: retail+airline×20，user-sim=gpt-5p5-apipro。null = 尚未评测。
// Refresh: python3 scripts/monitoring/4b/sync_4b_agent_dashboard.py

const AGENT_STEPS = ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "110", "120", "130", "140", "150"];

const AGENT = {
  e1: {
    label: "E1 GRPO",       color: COLORS.e1,
    bfcl:   [43.7, 43.3, 41.0, 45.2, 43.0, 47.6, 43.9, 40.8, 45.2, 42.5, 44.5, 43.7, 45.9, 44.0, 42.9],
    bfcl_mt:[9.4, 7.2, 6.7, 7.2, 7.8, 8.9, 8.9, 6.1, 7.2, 4.5, 10.6, 8.3, 9.4, 8.9, 5.6],
    tau:    [57.5, 62.5, 72.5, 55.0, 60.0, 55.0, 67.5, 67.5, 65.0, 57.5, 55.0, 65.0, 65.0, 67.5, 65.0],
  },
  e2: {
    label: "E2 DAPO",       color: COLORS.e2,
    bfcl:   [45.7, 45.9, 45.2, 44.3, 47.5, 43.9, 41.8, 22.2, 45.8, 46.4, 42.8, 45.6, 43.3, 41.2, 42.1],
    bfcl_mt:[8.3, 8.9, 7.2, 6.7, 10.0, 8.9, 7.2, 4.2, 10.0, 10.6, 5.6, 6.7, 8.9, 6.7, 8.3],
    tau:    [55.0, 55.0, 42.5, 55.0, 55.0, 65.0, 52.5, 62.5, 60.0, 60.0, 55.0, 60.0, 65.0, 52.5, 70.0],
  },
  e3: {
    label: "E3 Dr.GRPO",    color: COLORS.e3,
    bfcl:   [45.5, 44.0, 43.5, 45.4, 45.3, 47.4, 44.5, 42.7, 47.8, 45.4, 44.7, 46.3, 45.2, 48.3, 46.9],
    bfcl_mt:[9.4, 5.0, 7.2, 7.8, 7.2, 7.8, 6.7, 6.7, 5.6, 7.8, 7.8, 8.9, 8.9, 10.6, 6.7],
    tau:    [55.0, 60.0, 65.0, 65.0, 62.5, 62.5, 50.0, 57.5, 62.5, 52.5, 60.0, 57.5, 65.0, 72.5, 55.0],
  },
  e4: {
    label: "E4 RLOO",       color: COLORS.e4,
    bfcl:   [43.0, 47.0, 47.4, 42.9, 45.9, 41.1, 47.4, 48.3, 44.8, 46.9, 46.8, 44.8, 43.1, 44.1, 47.0],
    bfcl_mt:[6.7, 7.2, 7.8, 7.2, 9.4, 7.8, 3.3, 11.1, 6.1, 6.7, 7.2, 6.1, 6.1, 3.9, 8.9],
    tau:    [55.0, 52.5, 55.0, 57.5, 57.5, 52.5, 62.5, 70.0, 60.0, 60.0, 62.5, 65.0, 52.5, 60.0, 57.5],
  },
  e5: {
    label: "E5 REINFORCE++", color: COLORS.e5,
    bfcl:   [44.0, 43.5, 44.2, 44.9, 45.7, 41.0, 42.5, 43.5, 41.3, 46.4, 41.5, 39.4, 42.1, 44.0, 41.5],
    bfcl_mt:[8.3, 7.8, 11.1, 6.7, 8.9, 6.1, 10.0, 7.8, 7.2, 10.6, 3.9, 7.2, 4.4, 6.1, 7.2],
    tau:    [55.0, 55.0, 57.5, 57.5, 55.0, 62.5, 60.0, 57.5, 77.5, 52.5, 70.0, 62.5, 52.5, 60.0, 55.0],
  },
};

const AGENT_ORDER = ["e1", "e2", "e3", "e4", "e5"];

// ---- Agent / tool-use benchmarks (S3) (evalscope, auto-synced 2026-08-06) ----
// Source: /data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/agent2/<ts>/reports/<exp>_4b_s3_<step>/{bfcl_v3,tau_bench}.json
// Coverage: bfcl=50 · tau=50 · steps with any report: 10/20/30/40/50/60/70/80/90/100/110/120/130/140/150
// BFCL-v3: 10 subset ×30；bfcl=OVERALL（新版无聚合项时用 macro_score）；bfcl_mt=MULTI_TURN。
// tau-bench: retail+airline×20，user-sim=gpt-5p5-apipro。null = 尚未评测。
// Refresh: python3 scripts/monitoring/4b/sync_4b_agent_dashboard.py

const AGENT_S3 = {
  e1: {
    label: "E1 GRPO S3",       color: COLORS.e1,
    bfcl:   [62.5, 60.9, 61.6, 63.3, 65.3, 65.3, 63.0, 61.4, 62.8, 62.0, 63.1, 65.0, 60.4, 62.0, 63.9],
    bfcl_mt:[35.0, 31.1, 27.8, 35.0, 34.4, 40.0, 29.4, 33.9, 31.7, 32.8, 35.6, 38.3, 30.0, 31.7, 31.1],
    tau:    [62.5, 67.5, 62.5, 65.0, 67.5, 70.0, 62.5, 60.0, 67.5, 70.0, 70.0, 65.0, 70.0, 52.5, 62.5],
  },
  e2: {
    label: "E2 DAPO S3",       color: COLORS.e2,
    bfcl:   [64.2, 59.1, 60.7, 61.1, 62.8, 65.7, 16.7, 24.6, 26.5, 24.4, 28.3, 26.7, 24.8, 24.6, 24.6],
    bfcl_mt:[36.7, 26.1, 32.8, 32.2, 31.7, 35.0, 0.0, 23.9, 29.4, 23.3, 35.0, 30.0, 24.4, 23.9, 23.9],
    tau:    [70.0, 65.0, 62.5, 70.0, 60.0, 62.5, 60.0, 75.0, 62.5, 62.5, 60.0, 47.5, 55.0, 60.0, 52.5],
  },
  e3: {
    label: "E3 Dr.GRPO S3",    color: COLORS.e3,
    bfcl:   [25.7, 28.1, 28.7, 28.9, null, null, null, null, null, null, null, null, null, null, null],
    bfcl_mt:[27.2, 34.4, 36.1, 36.7, null, null, null, null, null, null, null, null, null, null, null],
    tau:    [62.5, 72.5, 65.0, 60.0, null, null, null, null, null, null, null, null, null, null, null],
  },
  e4: {
    label: "E4 RLOO S3",       color: COLORS.e4,
    bfcl:   [63.3, 59.9, 62.6, 61.9, 57.4, 60.9, 60.3, 57.2, 66.0, 63.1, 64.3, 58.8, 58.8, 62.8, 60.0],
    bfcl_mt:[32.8, 29.4, 28.9, 31.1, 29.4, 29.4, 32.2, 30.6, 36.1, 33.9, 30.6, 26.1, 25.6, 33.3, 28.9],
    tau:    [55.0, 67.5, 70.0, 67.5, 55.0, 67.5, 57.5, 60.0, 62.5, 65.0, 55.0, 70.0, 57.5, 55.0, 65.0],
  },
  e5: {
    label: "E5 REINFORCE++ S3", color: COLORS.e5,
    bfcl:   [null, null, 45.3, null, null, null, null, null, null, null, null, null, null, null, null],
    bfcl_mt:[null, null, 7.2, null, null, null, null, null, null, null, null, null, null, null, null],
    tau:    [null, null, 60.0, null, null, null, null, null, null, null, null, null, null, null, null],
  },
};

const AGENT_S3_ORDER = ["e1", "e2", "e3", "e4", "e5"];
