// ---- Evaluation results (evalscope offline, auto-synced 2026-07-27) ----
// Source: /data/lijunyi/evalscope/outputs/exp2card/<exp>_2b_<step>/*/reports/<model>/*.json
// 评测配置: eval_exp4b.sh + verl_qwen35 vLLM 0.24；
// aime24/aime25/math_500 temperature=0.6 top_p=0.95 max_tokens=16384 n=8（AIME 30题×n8=240 采样）；
// mmlu_temp n=2；enable_thinking=False；batch_size=64。
// null = 该 step 尚无对应 offline report（曲线断开）。刷新：python3 scripts/monitoring/2b/sync_2b_eval_dashboard.py

const EVAL_STEPS = ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "110", "120", "130", "140", "150"];

const EVAL = {
  e1: { label: "E1 GRPO",       color: COLORS.e1, mmlu: [76.98, null, null, null, 78.04, null, null, null, null, 77.47, null, null, null, null, 78.12], aime25: [19.58, null, null, null, 27.08, null, null, null, null, 32.50, null, null, null, null, null], aime24: [19.17, null, null, null, 38.33, null, null, null, null, 33.33, null, null, null, null, null], math500: [null, null, null, null, 85.05, null, null, null, null, 85.82, null, null, null, null, 86.70] },
  e2: { label: "E2 DAPO",       color: COLORS.e2, mmlu: [null, null, null, null, 78.69, null, null, null, null, 78.20, null, null, null, null, 77.71], aime25: [null, null, null, null, 23.75, null, null, null, null, 28.75, null, null, null, null, 30.00], aime24: [null, null, null, null, 36.25, null, null, null, null, 42.50, null, null, null, null, 35.42], math500: [null, null, null, null, 85.18, null, null, null, null, 86.40, null, null, null, null, 84.47] },
  e3: { label: "E3 Dr.GRPO",    color: COLORS.e3, mmlu: [73.82, null, null, null, 79.58, null, null, null, null, 82.42, null, null, null, null, 79.66], aime25: [21.25, null, null, null, 33.33, null, null, null, null, 37.50, null, null, null, null, 35.00], aime24: [20.00, null, null, null, 34.17, null, null, null, null, 35.83, null, null, null, null, 40.83], math500: [null, null, null, null, 86.00, null, null, null, null, 88.05, null, null, null, null, 88.13] },
  e4: { label: "E4 RLOO",       color: COLORS.e4, mmlu: [null, null, null, null, 78.61, null, null, null, null, 79.09, null, null, null, null, 79.74], aime25: [null, null, null, null, 30.42, null, null, null, null, 30.42, null, null, null, null, 37.50], aime24: [null, null, null, null, 31.67, null, null, null, null, 30.83, null, null, null, null, 35.00], math500: [null, null, null, null, 85.40, null, null, null, null, 86.50, null, null, null, null, 87.40] },
  e5: { label: "E5 REINFORCE++", color: COLORS.e5, mmlu: [74.31, null, null, null, 77.39, null, null, null, null, 77.79, null, null, null, null, 81.93], aime25: [20.84, null, null, null, 25.41, null, null, null, null, 31.25, null, null, null, null, 36.66], aime24: [25.83, null, null, null, 30.42, null, null, null, null, 39.17, null, null, null, null, null], math500: [null, null, null, null, 82.60, null, null, null, null, null, null, null, null, null, null] },
};

const EVAL_ORDER = ["e1", "e2", "e3", "e4", "e5"];

// ---- 全 step 明细（10–150）；已完成的填入，缺失为 null ----
const EVAL_FULL_STEPS = ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "110", "120", "130", "140", "150"];

const EVAL_FULL = {
  e1: {
    label: "E1 GRPO", color: COLORS.e1,
    mmlu:   [76.98, null, null, null, 78.04, null, null, null, null, 77.47, null, null, null, null, 78.12],
    aime24: [19.17, null, null, null, 38.33, null, null, null, null, 33.33, null, null, null, null, null],
    aime25: [19.58, null, null, null, 27.08, null, null, null, null, 32.50, null, null, null, null, null],
    math500:[null, null, null, null, 85.05, null, null, null, null, 85.82, null, null, null, null, 86.70],
  },
  e2: {
    label: "E2 DAPO", color: COLORS.e2,
    mmlu:   [null, null, null, null, 78.69, null, null, null, null, 78.20, null, null, null, null, 77.71],
    aime24: [null, null, null, null, 36.25, null, null, null, null, 42.50, null, null, null, null, 35.42],
    aime25: [null, null, null, null, 23.75, null, null, null, null, 28.75, null, null, null, null, 30.00],
    math500:[null, null, null, null, 85.18, null, null, null, null, 86.40, null, null, null, null, 84.47],
  },
  e3: {
    label: "E3 Dr.GRPO", color: COLORS.e3,
    mmlu:   [73.82, null, null, null, 79.58, null, null, null, null, 82.42, null, null, null, null, 79.66],
    aime24: [20.00, null, null, null, 34.17, null, null, null, null, 35.83, null, null, null, null, 40.83],
    aime25: [21.25, null, null, null, 33.33, null, null, null, null, 37.50, null, null, null, null, 35.00],
    math500:[null, null, null, null, 86.00, null, null, null, null, 88.05, null, null, null, null, 88.13],
  },
  e4: {
    label: "E4 RLOO", color: COLORS.e4,
    mmlu:   [null, null, null, null, 78.61, null, null, null, null, 79.09, null, null, null, null, 79.74],
    aime24: [null, null, null, null, 31.67, null, null, null, null, 30.83, null, null, null, null, 35.00],
    aime25: [null, null, null, null, 30.42, null, null, null, null, 30.42, null, null, null, null, 37.50],
    math500:[null, null, null, null, 85.40, null, null, null, null, 86.50, null, null, null, null, 87.40],
  },
  e5: {
    label: "E5 REINFORCE++", color: COLORS.e5,
    mmlu:   [74.31, null, null, null, 77.39, null, null, null, null, 77.79, null, null, null, null, 81.93],
    aime24: [25.83, null, null, null, 30.42, null, null, null, null, 39.17, null, null, null, null, null],
    aime25: [20.84, null, null, null, 25.41, null, null, null, null, 31.25, null, null, null, null, 36.66],
    math500:[null, null, null, null, 82.60, null, null, null, null, null, null, null, null, null, null],
  },
};

// 全 step 曲线：E1–E5（缺 step 为 null，charts 会断开）
const EVAL_FULL_ORDER = ["e1", "e2", "e3", "e4", "e5"];

const EVAL_STAGE_S3_150 = {
  label: "E1 GRPO 2B S3 step150",
  model: "model/exp2card/e1_grpo_2b_s3/merged_150",
  reports: {
    aime24: "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card/e1_grpo_2b_s3_150/20260726_084042/reports/e1_grpo_2b_s3_150/aime24.json",
    aime25: "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card/e1_grpo_2b_s3_150/20260726_084042/reports/e1_grpo_2b_s3_150/aime25.json",
    mmlu_temp: "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card/e1_grpo_2b_s3_150/20260726_091746/reports/e1_grpo_2b_s3_150/mmlu.json",
    bfcl_v3: "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/agent2/20260726_110431/reports/e1_grpo_2b_s3_150/bfcl_v3.json",
    tau_bench: "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/agent2/20260726_112538/reports/e1_grpo_2b_s3_150/tau_bench.json",
  },
  rows: [
    { task: "aime24", metric: "AveragePass@1", num: 30, score: 23.75, detail: "default 23.75" },
    { task: "aime25", metric: "AveragePass@1", num: 30, score: 25.84, detail: "AIME2025-I 27.50 / AIME2025-II 24.17" },
    { task: "mmlu_temp", metric: "AverageAccuracy", num: 617, score: 76.98, detail: "anatomy 63.70 / medical_genetics 76.50 / high_school_mathematics 89.81 / machine_learning 62.50" },
    { task: "BFCL-v3", metric: "AverageAccuracy", num: 288, score: 10.42, detail: "limit=30/subset；irrelevance 100.00，其余子集 0.00" },
    { task: "tau_bench", metric: "Pass^1", num: 40, score: 55.00, detail: "retail 65.00 / airline 45.00" },
  ],
};
