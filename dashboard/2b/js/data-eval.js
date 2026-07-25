// ---- Evaluation results (evalscope offline, auto-synced 2026-07-25) ----
// Source: /data/lijunyi/evalscope/outputs/exp2card/<exp>_2b_<step>/*/reports/<model>/*.json
// 评测配置: eval_exp4b.sh + verl_qwen35 vLLM 0.24；
// aime24/aime25 temperature=0.6 top_p=0.95 max_tokens=16384 n=8（30题×n8=240 采样）；
// mmlu_temp n=2；enable_thinking=False；batch_size=64。
// null = 该 step 尚无对应 offline report（曲线断开）。刷新：python3 scripts/sync_2b_eval_dashboard.py

const EVAL_STEPS = ["50", "100", "150"];

const EVAL = {
  e1: { label: "E1 GRPO",       color: COLORS.e1, mmlu: [77.39, 79.09, 79.99], aime25: [27.08, 32.50, 30.42], aime24: [null, null, 38.75] },
  e2: { label: "E2 DAPO",       color: COLORS.e2, mmlu: [78.12, 79.33, 80.15], aime25: [23.75, 28.75, 30.00], aime24: [null, null, null] },
  e3: { label: "E3 Dr.GRPO",    color: COLORS.e3, mmlu: [79.25, 80.47, 80.63], aime25: [33.33, 37.50, 35.00], aime24: [null, null, null] },
  e4: { label: "E4 RLOO",       color: COLORS.e4, mmlu: [77.63, 79.42, 78.61], aime25: [30.42, 30.42, 37.50], aime24: [null, null, null] },
  e5: { label: "E5 REINFORCE++", color: COLORS.e5, mmlu: [77.15, 79.58, 81.93], aime25: [25.41, 31.25, 36.66], aime24: [null, null, null] },
};

const EVAL_ORDER = ["e1", "e2", "e3", "e4", "e5"];

// ---- 全 step 明细（10–150）；已完成的填入，缺失为 null ----
const EVAL_FULL_STEPS = ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "110", "120", "130", "140", "150"];

const EVAL_FULL = {
  e1: {
    label: "E1 GRPO", color: COLORS.e1,
    mmlu:   [null, null, null, null, 77.39, null, null, null, null, 79.09, null, null, null, null, 79.99],
    aime24: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, 38.75],
    aime25: [null, null, null, null, 27.08, null, null, null, null, 32.50, null, null, null, null, 30.42],
  },
  e2: {
    label: "E2 DAPO", color: COLORS.e2,
    mmlu:   [null, null, null, null, 78.12, null, null, null, null, 79.33, null, null, null, null, 80.15],
    aime24: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    aime25: [null, null, null, null, 23.75, null, null, null, null, 28.75, null, null, null, null, 30.00],
  },
  e3: {
    label: "E3 Dr.GRPO", color: COLORS.e3,
    mmlu:   [null, null, null, null, 79.25, null, null, null, null, 80.47, null, null, null, null, 80.63],
    aime24: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    aime25: [null, null, null, null, 33.33, null, null, null, null, 37.50, null, null, null, null, 35.00],
  },
  e4: {
    label: "E4 RLOO", color: COLORS.e4,
    mmlu:   [null, null, null, null, 77.63, null, null, null, null, 79.42, null, null, null, null, 78.61],
    aime24: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    aime25: [null, null, null, null, 30.42, null, null, null, null, 30.42, null, null, null, null, 37.50],
  },
  e5: {
    label: "E5 REINFORCE++", color: COLORS.e5,
    mmlu:   [null, null, null, null, 77.15, null, null, null, null, 79.58, null, null, null, null, 81.93],
    aime24: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    aime25: [null, null, null, null, 25.41, null, null, null, null, 31.25, null, null, null, null, 36.66],
  },
};

// 全 step 曲线：E1–E5（缺 step 为 null，charts 会断开）
const EVAL_FULL_ORDER = ["e1", "e2", "e3", "e4", "e5"];
