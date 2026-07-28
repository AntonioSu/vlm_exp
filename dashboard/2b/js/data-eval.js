// ---- Evaluation results (evalscope offline, auto-synced 2026-07-28) ----
// Source: /data/lijunyi/evalscope/outputs/exp2card/<exp>_2b_<step>/*/reports/<model>/*.json
// 评测配置: eval_exp4b.sh + verl_qwen35 vLLM 0.24；
// aime24/aime25/math_500 temperature=0.6 top_p=0.95 max_tokens=16384 n=8（AIME 30题×n8=240 采样）；
// mmlu_temp n=2；enable_thinking=False；batch_size=64。
// null = 该 step 尚无对应 offline report（曲线断开）。刷新：python3 scripts/monitoring/2b/sync_2b_eval_dashboard.py

const EVAL_STEPS = ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "110", "120", "130", "140", "150"];

const EVAL = {
  e1: { label: "E1 GRPO",       color: COLORS.e1, mmlu: [76.98, 76.83, 77.23, 77.88, 78.04, 76.58, 77.88, 77.80, 77.31, 77.47, 77.07, 79.09, 77.39, 78.28, 78.12], aime25: [19.58, 21.25, 25.41, 25.84, 27.08, 31.67, 31.25, 27.91, 30.83, 32.50, 29.58, 35.41, 36.66, 32.50, null], aime24: [19.17, 31.67, 35.83, 31.25, 38.33, 40.83, 42.08, 41.25, 36.67, 33.33, 37.08, 37.08, 35.42, 37.50, null], math500: [79.95, 82.20, 82.60, 83.35, 85.05, 86.95, 86.98, 86.60, 87.40, 85.82, 86.87, 86.97, 86.97, null, 86.70] },
  e2: { label: "E2 DAPO",       color: COLORS.e2, mmlu: [76.01, 74.56, 75.04, 76.41, 78.69, 77.15, 78.28, 78.60, 77.88, 78.20, 78.85, 76.82, null, null, 77.71], aime25: [22.09, 22.50, 26.67, 23.75, 23.75, 26.66, 33.75, 28.75, 27.08, 28.75, 29.17, 25.41, null, null, 30.00], aime24: [22.92, 25.00, 30.00, 32.50, 36.25, 32.50, 40.00, 38.75, 37.08, 42.50, 38.33, 38.75, null, null, 35.42], math500: [77.88, 79.78, 82.70, 83.45, 85.18, 85.18, 86.93, 86.87, 86.67, 86.40, 87.00, null, null, null, 84.47] },
  e3: { label: "E3 Dr.GRPO",    color: COLORS.e3, mmlu: [73.82, 76.01, 76.83, 78.76, 79.58, 77.71, 78.20, 79.58, 79.58, 82.42, 79.09, 81.28, 80.39, null, 79.66], aime25: [21.25, 26.25, 25.41, 29.17, 33.33, 33.33, 32.08, 34.17, 36.67, 37.50, 32.91, 32.92, 33.75, null, 35.00], aime24: [20.00, 26.25, 27.08, 34.58, 34.17, 33.75, 30.83, 37.50, 40.00, 35.83, 36.67, 37.08, 36.25, null, 40.83], math500: [78.82, 82.05, 83.07, 84.65, 86.00, 85.82, 86.05, 87.35, 88.53, 88.05, 87.63, 87.15, null, null, 88.13] },
  e4: { label: "E4 RLOO",       color: COLORS.e4, mmlu: [75.36, 76.41, 75.69, 76.01, 78.61, 78.61, 78.12, 78.45, 79.66, 79.09, 78.77, 79.82, null, null, 79.74], aime25: [18.34, 21.25, 24.59, 32.50, 30.42, 29.17, 30.42, 32.08, 32.91, 30.42, 33.75, null, null, null, 37.50], aime24: [22.92, 27.50, 30.00, 29.58, 31.67, 33.33, 39.17, 42.50, 35.42, 30.83, 35.42, null, null, null, 35.00], math500: [78.90, 80.83, 83.10, 85.08, 85.40, 85.60, 86.35, 87.05, 86.82, 86.50, 86.55, null, null, null, 87.40] },
  e5: { label: "E5 REINFORCE++", color: COLORS.e5, mmlu: [74.31, 74.80, 75.04, 75.94, 77.39, null, null, null, null, 77.79, null, null, null, null, 79.25], aime25: [20.84, 24.59, 25.42, 25.41, 25.41, null, null, null, null, 31.25, null, null, null, null, 36.66], aime24: [25.83, 23.33, 25.83, 29.58, 30.42, null, null, null, null, 39.17, null, null, null, null, 36.67], math500: [78.47, 80.60, 82.17, 83.60, 82.60, null, null, null, null, 85.90, null, null, null, null, 86.50] },
};

const EVAL_ORDER = ["e1", "e2", "e3", "e4", "e5"];

// ---- 全 step 明细（10–150）；已完成的填入，缺失为 null ----
const EVAL_FULL_STEPS = ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "110", "120", "130", "140", "150"];

const EVAL_FULL = {
  e1: {
    label: "E1 GRPO", color: COLORS.e1,
    mmlu:   [76.98, 76.83, 77.23, 77.88, 78.04, 76.58, 77.88, 77.80, 77.31, 77.47, 77.07, 79.09, 77.39, 78.28, 78.12],
    aime24: [19.17, 31.67, 35.83, 31.25, 38.33, 40.83, 42.08, 41.25, 36.67, 33.33, 37.08, 37.08, 35.42, 37.50, null],
    aime25: [19.58, 21.25, 25.41, 25.84, 27.08, 31.67, 31.25, 27.91, 30.83, 32.50, 29.58, 35.41, 36.66, 32.50, null],
    math500:[79.95, 82.20, 82.60, 83.35, 85.05, 86.95, 86.98, 86.60, 87.40, 85.82, 86.87, 86.97, 86.97, null, 86.70],
  },
  e2: {
    label: "E2 DAPO", color: COLORS.e2,
    mmlu:   [76.01, 74.56, 75.04, 76.41, 78.69, 77.15, 78.28, 78.60, 77.88, 78.20, 78.85, 76.82, null, null, 77.71],
    aime24: [22.92, 25.00, 30.00, 32.50, 36.25, 32.50, 40.00, 38.75, 37.08, 42.50, 38.33, 38.75, null, null, 35.42],
    aime25: [22.09, 22.50, 26.67, 23.75, 23.75, 26.66, 33.75, 28.75, 27.08, 28.75, 29.17, 25.41, null, null, 30.00],
    math500:[77.88, 79.78, 82.70, 83.45, 85.18, 85.18, 86.93, 86.87, 86.67, 86.40, 87.00, null, null, null, 84.47],
  },
  e3: {
    label: "E3 Dr.GRPO", color: COLORS.e3,
    mmlu:   [73.82, 76.01, 76.83, 78.76, 79.58, 77.71, 78.20, 79.58, 79.58, 82.42, 79.09, 81.28, 80.39, null, 79.66],
    aime24: [20.00, 26.25, 27.08, 34.58, 34.17, 33.75, 30.83, 37.50, 40.00, 35.83, 36.67, 37.08, 36.25, null, 40.83],
    aime25: [21.25, 26.25, 25.41, 29.17, 33.33, 33.33, 32.08, 34.17, 36.67, 37.50, 32.91, 32.92, 33.75, null, 35.00],
    math500:[78.82, 82.05, 83.07, 84.65, 86.00, 85.82, 86.05, 87.35, 88.53, 88.05, 87.63, 87.15, null, null, 88.13],
  },
  e4: {
    label: "E4 RLOO", color: COLORS.e4,
    mmlu:   [75.36, 76.41, 75.69, 76.01, 78.61, 78.61, 78.12, 78.45, 79.66, 79.09, 78.77, 79.82, null, null, 79.74],
    aime24: [22.92, 27.50, 30.00, 29.58, 31.67, 33.33, 39.17, 42.50, 35.42, 30.83, 35.42, null, null, null, 35.00],
    aime25: [18.34, 21.25, 24.59, 32.50, 30.42, 29.17, 30.42, 32.08, 32.91, 30.42, 33.75, null, null, null, 37.50],
    math500:[78.90, 80.83, 83.10, 85.08, 85.40, 85.60, 86.35, 87.05, 86.82, 86.50, 86.55, null, null, null, 87.40],
  },
  e5: {
    label: "E5 REINFORCE++", color: COLORS.e5,
    mmlu:   [74.31, 74.80, 75.04, 75.94, 77.39, null, null, null, null, 77.79, null, null, null, null, 79.25],
    aime24: [25.83, 23.33, 25.83, 29.58, 30.42, null, null, null, null, 39.17, null, null, null, null, 36.67],
    aime25: [20.84, 24.59, 25.42, 25.41, 25.41, null, null, null, null, 31.25, null, null, null, null, 36.66],
    math500:[78.47, 80.60, 82.17, 83.60, 82.60, null, null, null, null, 85.90, null, null, null, null, 86.50],
  },
};

// 全 step 曲线：E1–E5（缺 step 为 null，charts 会断开）
const EVAL_FULL_ORDER = ["e1", "e2", "e3", "e4", "e5"];

// S3 阶段 offline 评测（目前仅有报告的实验才会出现在这里；其余留空，
// charts.js 会据此判断是否叠加 S3 曲线/图例）。
// Source: /data/lijunyi/evalscope/outputs/exp2card/<exp>_s3_<step>/*/reports/*/*.json
const EVAL_FULL_S3 = {
  e1: {
    mmlu:   [null, null, null, null, null, null, null, null, null, null, null, null, null, null, 76.98],
    aime24: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, 23.75],
    aime25: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, 25.84],
  },
};

const EVAL_STAGE_S3_150 = {
  label: "E1 GRPO 2B S3 step150",
  model: "model/exp2card/e1_grpo_2b_s3/merged_150",
  reports: {
    aime24: "/data/lijunyi/evalscope/outputs/exp2card/e1_grpo_2b_s3_150/20260726_084042/reports/e1_grpo_2b_s3_150/aime24.json",
    aime25: "/data/lijunyi/evalscope/outputs/exp2card/e1_grpo_2b_s3_150/20260726_084042/reports/e1_grpo_2b_s3_150/aime25.json",
    mmlu_temp: "/data/lijunyi/evalscope/outputs/exp2card/e1_grpo_2b_s3_150/20260726_091746/reports/e1_grpo_2b_s3_150/mmlu.json",
    bfcl_v3: "/data/lijunyi/evalscope/outputs/agent2/20260726_110431/reports/e1_grpo_2b_s3_150/bfcl_v3.json",
    tau_bench: "/data/lijunyi/evalscope/outputs/agent2/20260726_112538/reports/e1_grpo_2b_s3_150/tau_bench.json",
  },
  rows: [
    { task: "aime24", metric: "AveragePass@1", num: 30, score: 23.75, detail: "default 23.75" },
    { task: "aime25", metric: "AveragePass@1", num: 30, score: 25.84, detail: "AIME2025-I 27.50 / AIME2025-II 24.17" },
    { task: "mmlu_temp", metric: "AverageAccuracy", num: 617, score: 76.98, detail: "anatomy 63.70 / medical_genetics 76.50 / high_school_mathematics 89.81 / machine_learning 62.50" },
    { task: "BFCL-v3", metric: "AverageAccuracy", num: 288, score: 10.42, detail: "limit=30/subset；irrelevance 100.00，其余子集 0.00" },
    { task: "tau_bench", metric: "Pass^1", num: 40, score: 55.00, detail: "retail 65.00 / airline 45.00" },
  ],
};
