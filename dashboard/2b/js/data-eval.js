// ---- Evaluation results (evalscope, 2026-07-21) ----
// Source: /data/lijunyi/evalscope/outputs/exp2card/<exp>_<step>/*/reports/models/*.json
// 评测配置: local vLLM 0.24 serving, math 类 temperature=0.6 top_p=0.95 max_tokens=16384 n=8；mmlu_temp 默认配置。
// aime24 只在 E1-150（早期 smoke test）跑过一次，其余组按计划只跑 mmlu_temp + aime25。

const EVAL_STEPS = ["50", "100", "150"];

const EVAL = {
  e1: { label: "E1 GRPO",        color: COLORS.e1, mmlu: [77.39, 79.09, 79.99], aime25: [27.08, 32.50, 30.42], aime24: [null, null, 38.75] },
  e2: { label: "E2 DAPO",        color: COLORS.e2, mmlu: [78.12, 79.33, 80.15], aime25: [23.75, 28.75, 30.00], aime24: [null, null, null] },
  e3: { label: "E3 Dr.GRPO",     color: COLORS.e3, mmlu: [79.25, 80.47, 80.63], aime25: [33.33, 37.50, 35.00], aime24: [null, null, null] },
  e4: { label: "E4 RLOO",        color: COLORS.e4, mmlu: [77.63, 79.42, 78.61], aime25: [30.42, 30.42, 37.50], aime24: [null, null, null] },
  e5: { label: "E5 REINFORCE++", color: COLORS.e5, mmlu: [77.15, 79.58, 81.93], aime25: [25.41, 31.25, 36.66], aime24: [null, null, null] },
};

const EVAL_ORDER = ["e1", "e2", "e3", "e4", "e5"];
