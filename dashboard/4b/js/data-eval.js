// ---- Evaluation results (evalscope, 2026-07-22) ----
// Source: /data/lijunyi/evalscope/outputs/exp2card/<exp>_<step>/*/reports/<model>/*.json
// 评测配置: eval_exp4b.sh + verl_qwen35 vLLM 0.24；aime25 temperature=0.6 top_p=0.95 max_tokens=16384 n=8；
// mmlu_temp n=2；enable_thinking=False。汇总表见 archive/eval_4b/summary.md。

const EVAL_STEPS = ["50", "100", "150"];

const EVAL = {
  e1: { label: "E1 GRPO",        color: COLORS.e1, mmlu: [90.43, 91.01, 91.25], aime25: [50.00, 58.33, 57.92] },
  e2: { label: "E2 DAPO",        color: COLORS.e2, mmlu: [91.17, 92.38, 91.17], aime25: [52.50, 57.09, 59.59] },
  e3: { label: "E3 Dr.GRPO",     color: COLORS.e3, mmlu: [90.84, 91.49, 91.97], aime25: [55.00, 49.59, 55.00] },
  e4: { label: "E4 RLOO",        color: COLORS.e4, mmlu: [90.35, 91.08, 90.68], aime25: [49.17, 50.00, 52.92] },
  e5: { label: "E5 REINFORCE++", color: COLORS.e5, mmlu: [91.24, 91.49, 91.25], aime25: [52.50, 55.84, 57.50] },
};

const EVAL_ORDER = ["e1", "e2", "e3", "e4", "e5"];

// ---- 补充明细：E1 GRPO / E4 RLOO 全 step（含 aime24），2026-07-23 ----
// E1、E4 已跑完全部 checkpoint 的 mmlu_temp + aime24 + aime25；每个 step 取最新一次 report 的 score。
// aime24 在被排除的 50/100/150 未评测（null，曲线自动断开）。
// 评测配置: eval_exp4b.sh + verl_qwen35 vLLM 0.24；aime24/aime25 temperature=0.6 top_p=0.95
// max_tokens=16384 n=8（30 题×n8=240 采样）；mmlu_temp n=2；enable_thinking=False；batch_size=64。
const EVAL_FULL_STEPS = ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "110", "120", "130", "140", "150"];

const EVAL_FULL = {
  e1: {
    label: "E1 GRPO", color: COLORS.e1,
    mmlu:   [91.25, 91.00, 90.52, 90.85, 90.43, 90.76, 90.84, 91.81, 91.33, 91.01, 91.82, 91.00, 91.09, 92.14, 91.25],
    aime24: [72.08, 72.50, 68.75, 62.08, null, 67.08, 70.42, 72.08, 71.25, null, 68.33, 67.50, 66.25, 66.25, null],
    aime25: [48.34, 44.59, 50.42, 46.66, 50.00, 51.25, 58.75, 55.42, 55.42, 58.33, 56.25, 53.75, 55.84, 54.58, 57.92],
  },
  e4: {
    label: "E4 RLOO", color: COLORS.e4,
    mmlu:   [90.68, 89.95, 91.16, 90.36, 90.35, 91.00, 91.17, 91.65, 90.76, 91.08, 90.52, 91.00, 91.65, 91.01, 90.68],
    aime24: [67.50, 70.83, 64.17, 72.08, null, 72.08, 62.50, 62.92, 72.50, null, 60.42, 69.17, 73.75, 76.67, null],
    aime25: [51.25, 50.42, 47.92, 52.50, 49.17, 51.67, 44.17, 46.67, 54.59, 50.00, 42.91, 49.59, 51.25, 55.84, 52.92],
  },
};

const EVAL_FULL_ORDER = ["e1", "e4"];
