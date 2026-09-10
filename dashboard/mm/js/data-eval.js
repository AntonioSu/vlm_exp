// ---- Multimodal offline eval (Geo3K + evalscope) ----
// Auto-generated 2026-08-27 by scripts/analysis/gen_mm_eval_dashboard_data.py
// Refresh: python3 scripts/analysis/gen_mm_eval_dashboard_data.py
window.MM_EVAL = {
  "generatedAt": "2026-08-27",
  "generatedBy": "scripts/analysis/gen_mm_eval_dashboard_data.py",
  "note": "M0 文本曲线 = 2B E1 GRPO（e1_grpo_2b，10–150 /10）；Geo3K formal @10/20/30/40/50/60/70/80/90/100/110/120/130/140/150。 M1 formal @10/20/30/40/50/60/70/80/90/100/110/120/130/140/150；M2 formal @10/20/30/40/50/60/70/80/90/100/110/120/130/140/150；M3 formal @10/20/30/40/50/60/70/80/90/100/110/120/130/140/150。 M1 light Geo3K steps：70/100（n=1 / 512，不与 formal 横比）。 全 step 曲线只画 formal（10–150 /10）；缺测为 null。 文本 evalscope 未出报告的 step 仅有 Geo3K。",
  "metrics": [
    {
      "key": "geo3kAcc",
      "label": "Geo3K sample acc",
      "unit": "%"
    },
    {
      "key": "geo3kPass",
      "label": "Geo3K pass@n",
      "unit": "%"
    },
    {
      "key": "math500",
      "label": "MATH-500",
      "unit": "%"
    },
    {
      "key": "mmlu",
      "label": "MMLU",
      "unit": "%"
    },
    {
      "key": "aime24",
      "label": "AIME24",
      "unit": "%"
    },
    {
      "key": "aime25",
      "label": "AIME25",
      "unit": "%"
    }
  ],
  "groups": [
    {
      "key": "m0",
      "label": "M0 · 0% 图文 (E1 GRPO)",
      "shortLabel": "M0 GRPO",
      "color": "#2563eb",
      "step": 150,
      "visionPct": 0,
      "config": "formal",
      "configNote": "文本曲线复用 e1_grpo_2b 全 step（10–150 /10）正式 evalscope。 Geo3K formal 已完成 step：10/20/30/40/50/60/70/80/90/100/110/120/130/140/150（n=8 / 16K）。",
      "geo3k": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step150.jsonl.summary.json",
        "questions": 601,
        "samples": 4808,
        "n": 8,
        "maxTokens": 16384,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 57.26,
        "passAtN": 83.69
      },
      "text": {
        "mmlu": 78.34,
        "aime24": 35.42,
        "aime25": 32.5,
        "math500": 86.35
      },
      "sources": {
        "geo3k": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step150.jsonl.summary.json",
        "mmlu": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m0_e1_grpo_2b/20260722_124641/reports/models/mmlu.json",
        "aime24": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m0_e1_grpo_2b/20260722_133001/reports/models/aime24.json",
        "aime25": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m0_e1_grpo_2b/20260722_133001/reports/models/aime25.json",
        "math500": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m0_e1_grpo_2b/20260722_133001/reports/models/math_500.json",
        "geo3k@10": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step10.jsonl.summary.json",
        "geo3k@20": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step20.jsonl.summary.json",
        "geo3k@30": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step30.jsonl.summary.json",
        "geo3k@40": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step40.jsonl.summary.json",
        "geo3k@50": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step50.jsonl.summary.json",
        "geo3k@60": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step60.jsonl.summary.json",
        "geo3k@70": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step70.jsonl.summary.json",
        "geo3k@80": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step80.jsonl.summary.json",
        "geo3k@90": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step90.jsonl.summary.json",
        "geo3k@100": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step100.jsonl.summary.json",
        "geo3k@110": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step110.jsonl.summary.json",
        "geo3k@120": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step120.jsonl.summary.json",
        "geo3k@130": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step130.jsonl.summary.json",
        "geo3k@140": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step140.jsonl.summary.json",
        "geo3k@150": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step150.jsonl.summary.json"
      }
    },
    {
      "key": "m1",
      "label": "M1 · 100% 图文 (@150 formal)",
      "shortLabel": "M1@150",
      "color": "#d97706",
      "step": 150,
      "visionPct": 100,
      "config": "formal",
      "configNote": "正式口径 Geo3K n=8 / 16K。已完成 step：10/20/30/40/50/60/70/80/90/100/110/120/130/140/150。 light 探查（n=1 / 512）保留作对照，不与 formal 横比绝对值。",
      "geo3k": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step150.jsonl.summary.json",
        "questions": 601,
        "samples": 4808,
        "n": 8,
        "maxTokens": 16384,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 71.07,
        "passAtN": 91.68
      },
      "text": {
        "mmlu": 78.0,
        "aime24": 15.0,
        "aime25": 20.41,
        "math500": 79.15
      },
      "sources": {
        "geo3k": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step150.jsonl.summary.json",
        "mmlu": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m1_geo3k100_2b_step150/20260825_024336/reports/models/mmlu_temp.json",
        "aime24": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m1_geo3k100_2b_step150/20260825_035706/reports/models/aime24.json",
        "aime25": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m1_geo3k100_2b_step150/20260825_035706/reports/models/aime25.json",
        "math500": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m1_geo3k100_2b_step150/20260825_035706/reports/models/math_500.json",
        "geo3k@10": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step10.jsonl.summary.json",
        "geo3k@20": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step20.jsonl.summary.json",
        "geo3k@30": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step30.jsonl.summary.json",
        "geo3k@40": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step40.jsonl.summary.json",
        "geo3k@50": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step50.jsonl.summary.json",
        "geo3k@60": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step60.jsonl.summary.json",
        "geo3k@70": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step70.jsonl.summary.json",
        "geo3k@80": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step80.jsonl.summary.json",
        "geo3k@90": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step90.jsonl.summary.json",
        "geo3k@100": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step100.jsonl.summary.json",
        "geo3k@110": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step110.jsonl.summary.json",
        "geo3k@120": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step120.jsonl.summary.json",
        "geo3k@130": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step130.jsonl.summary.json",
        "geo3k@140": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step140.jsonl.summary.json",
        "geo3k@150": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step150.jsonl.summary.json"
      },
      "geo3kQuick": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step70_quick.jsonl.summary.json",
        "questions": 10,
        "samples": 10,
        "n": 1,
        "maxTokens": 2048,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 50.0,
        "passAtN": 50.0
      }
    },
    {
      "key": "m2",
      "label": "M2 · 50% 图文 (@150 formal)",
      "shortLabel": "M2@150",
      "color": "#059669",
      "step": 150,
      "visionPct": 50,
      "config": "formal",
      "configNote": "正式口径 Geo3K n=8 / 16K。已完成 step：10/20/30/40/50/60/70/80/90/100/110/120/130/140/150。",
      "geo3k": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step150.jsonl.summary.json",
        "questions": 601,
        "samples": 4808,
        "n": 8,
        "maxTokens": 16384,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 70.15,
        "passAtN": 89.02
      },
      "text": {
        "mmlu": 80.61,
        "aime24": 36.67,
        "aime25": 28.75,
        "math500": 87.77
      },
      "sources": {
        "geo3k": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step150.jsonl.summary.json",
        "mmlu": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m2_mix50_2b_step150/20260823_190331/reports/models/mmlu_temp.json",
        "aime24": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m2_mix50_2b_step150/20260823_204049/reports/models/aime24.json",
        "aime25": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m2_mix50_2b_step150/20260823_204049/reports/models/aime25.json",
        "math500": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m2_mix50_2b_step150/20260823_204049/reports/models/math_500.json",
        "geo3k@10": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step10.jsonl.summary.json",
        "geo3k@20": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step20.jsonl.summary.json",
        "geo3k@30": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step30.jsonl.summary.json",
        "geo3k@40": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step40.jsonl.summary.json",
        "geo3k@50": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step50.jsonl.summary.json",
        "geo3k@60": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step60.jsonl.summary.json",
        "geo3k@70": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step70.jsonl.summary.json",
        "geo3k@80": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step80.jsonl.summary.json",
        "geo3k@90": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step90.jsonl.summary.json",
        "geo3k@100": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step100.jsonl.summary.json",
        "geo3k@110": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step110.jsonl.summary.json",
        "geo3k@120": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step120.jsonl.summary.json",
        "geo3k@130": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step130.jsonl.summary.json",
        "geo3k@140": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step140.jsonl.summary.json",
        "geo3k@150": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step150.jsonl.summary.json"
      }
    },
    {
      "key": "m3",
      "label": "M3 · 20% 图文 (@150 formal)",
      "shortLabel": "M3@150",
      "color": "#9333ea",
      "step": 150,
      "visionPct": 20,
      "config": "formal",
      "configNote": "正式口径 Geo3K n=8 / 16K。已完成 step：10/20/30/40/50/60/70/80/90/100/110/120/130/140/150。",
      "geo3k": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step150.jsonl.summary.json",
        "questions": 601,
        "samples": 4808,
        "n": 8,
        "maxTokens": 16384,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 53.99,
        "passAtN": 80.2
      },
      "text": {
        "mmlu": 78.02,
        "aime24": 24.17,
        "aime25": 20.41,
        "math500": 80.12
      },
      "sources": {
        "geo3k": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step150.jsonl.summary.json",
        "mmlu": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m3_mix20_2b_step150/20260824_225704/reports/models/mmlu_temp.json",
        "aime24": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m3_mix20_2b_step150/20260825_001919/reports/models/aime24.json",
        "aime25": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m3_mix20_2b_step150/20260825_001919/reports/models/aime25.json",
        "math500": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m3_mix20_2b_step150/20260825_001919/reports/models/math_500.json",
        "geo3k@10": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step10.jsonl.summary.json",
        "geo3k@20": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step20.jsonl.summary.json",
        "geo3k@30": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step30.jsonl.summary.json",
        "geo3k@40": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step40.jsonl.summary.json",
        "geo3k@50": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step50.jsonl.summary.json",
        "geo3k@60": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step60.jsonl.summary.json",
        "geo3k@70": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step70.jsonl.summary.json",
        "geo3k@80": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step80.jsonl.summary.json",
        "geo3k@90": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step90.jsonl.summary.json",
        "geo3k@100": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step100.jsonl.summary.json",
        "geo3k@110": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step110.jsonl.summary.json",
        "geo3k@120": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step120.jsonl.summary.json",
        "geo3k@130": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step130.jsonl.summary.json",
        "geo3k@140": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step140.jsonl.summary.json",
        "geo3k@150": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step150.jsonl.summary.json"
      }
    }
  ],
  "fullSteps": [
    "10",
    "20",
    "30",
    "40",
    "50",
    "60",
    "70",
    "80",
    "90",
    "100",
    "110",
    "120",
    "130",
    "140",
    "150"
  ],
  "fullOrder": [
    "m0",
    "m1",
    "m2",
    "m3"
  ],
  "full": {
    "m0": {
      "label": "M0 · 0% 图文 (E1 GRPO)",
      "shortLabel": "M0 GRPO",
      "color": "#2563eb",
      "config": "formal",
      "geo3kAcc": [
        65.06,
        66.35,
        65.93,
        64.73,
        66.64,
        66.62,
        65.37,
        65.74,
        63.37,
        61.86,
        61.48,
        62.62,
        58.49,
        58.78,
        57.26
      ],
      "geo3kPass": [
        89.35,
        90.52,
        90.68,
        89.18,
        88.69,
        90.18,
        88.85,
        89.35,
        88.52,
        87.02,
        87.02,
        88.02,
        84.86,
        85.69,
        83.69
      ],
      "math500": [
        79.95,
        82.2,
        82.6,
        83.35,
        85.05,
        86.95,
        86.98,
        86.6,
        87.4,
        85.82,
        86.87,
        86.97,
        86.97,
        87.35,
        86.7
      ],
      "mmlu": [
        76.98,
        76.83,
        77.23,
        77.88,
        77.39,
        76.58,
        77.88,
        77.8,
        77.31,
        79.09,
        77.07,
        79.09,
        77.39,
        78.28,
        78.12
      ],
      "aime24": [
        19.17,
        31.67,
        35.83,
        31.25,
        38.33,
        40.83,
        42.08,
        41.25,
        36.67,
        33.33,
        37.08,
        37.08,
        35.42,
        37.5,
        38.33
      ],
      "aime25": [
        19.58,
        21.25,
        25.41,
        25.84,
        27.08,
        31.67,
        31.25,
        27.91,
        30.83,
        32.5,
        29.58,
        35.41,
        36.66,
        32.5,
        34.16
      ]
    },
    "m1": {
      "label": "M1 · 100% 图文 (@150 formal)",
      "shortLabel": "M1",
      "color": "#d97706",
      "config": "formal",
      "geo3kAcc": [
        66.1,
        66.49,
        68.28,
        68.68,
        66.62,
        69.09,
        68.32,
        68.95,
        68.66,
        70.11,
        70.59,
        72.19,
        71.98,
        71.05,
        71.07
      ],
      "geo3kPass": [
        91.68,
        92.35,
        90.35,
        91.68,
        89.68,
        91.01,
        89.85,
        90.85,
        90.85,
        91.68,
        90.02,
        90.35,
        91.35,
        89.68,
        91.68
      ],
      "math500": [
        75.23,
        76.0,
        76.63,
        75.3,
        76.02,
        76.08,
        75.13,
        76.68,
        76.97,
        77.42,
        77.2,
        77.88,
        76.63,
        78.25,
        79.15
      ],
      "mmlu": [
        76.4,
        76.22,
        77.33,
        76.6,
        76.46,
        76.92,
        77.65,
        77.79,
        77.59,
        76.92,
        77.25,
        77.78,
        77.94,
        77.95,
        78.0
      ],
      "aime24": [
        14.17,
        16.25,
        19.17,
        17.92,
        15.42,
        19.58,
        16.67,
        19.17,
        21.25,
        18.75,
        21.25,
        20.0,
        19.17,
        25.0,
        15.0
      ],
      "aime25": [
        19.17,
        19.59,
        19.59,
        18.33,
        12.5,
        16.25,
        18.75,
        17.91,
        19.59,
        22.91,
        18.34,
        18.33,
        14.16,
        20.84,
        20.41
      ]
    },
    "m2": {
      "label": "M2 · 50% 图文 (@150 formal)",
      "shortLabel": "M2",
      "color": "#059669",
      "config": "formal",
      "geo3kAcc": [
        65.6,
        68.01,
        70.38,
        71.63,
        71.94,
        71.07,
        71.84,
        72.09,
        71.82,
        73.13,
        72.88,
        72.19,
        73.75,
        72.34,
        70.15
      ],
      "geo3kPass": [
        91.18,
        89.68,
        91.01,
        90.85,
        90.52,
        92.01,
        91.85,
        91.85,
        90.85,
        92.35,
        91.51,
        89.52,
        92.35,
        91.18,
        89.02
      ],
      "math500": [
        79.15,
        81.35,
        83.03,
        84.1,
        84.3,
        85.4,
        85.05,
        86.68,
        87.65,
        87.32,
        87.62,
        87.65,
        88.17,
        88.28,
        87.77
      ],
      "mmlu": [
        76.05,
        76.5,
        77.87,
        78.33,
        78.6,
        79.53,
        79.62,
        79.66,
        79.23,
        80.94,
        80.65,
        80.92,
        80.67,
        80.89,
        80.61
      ],
      "aime24": [
        17.92,
        27.08,
        28.75,
        31.67,
        32.08,
        36.25,
        38.75,
        32.5,
        38.33,
        33.75,
        37.08,
        39.58,
        35.83,
        36.67,
        36.67
      ],
      "aime25": [
        21.67,
        21.25,
        25.83,
        22.5,
        29.58,
        27.5,
        27.08,
        32.08,
        29.58,
        30.83,
        30.83,
        30.84,
        31.66,
        35.83,
        28.75
      ]
    },
    "m3": {
      "label": "M3 · 20% 图文 (@150 formal)",
      "shortLabel": "M3",
      "color": "#9333ea",
      "config": "formal",
      "geo3kAcc": [
        65.87,
        65.22,
        64.75,
        59.26,
        55.35,
        53.7,
        54.66,
        54.35,
        52.56,
        51.93,
        56.39,
        56.95,
        56.91,
        54.22,
        53.99
      ],
      "geo3kPass": [
        89.35,
        89.18,
        87.02,
        85.02,
        83.53,
        82.2,
        82.2,
        81.7,
        80.53,
        80.53,
        83.03,
        82.53,
        81.7,
        80.2,
        80.2
      ],
      "math500": [
        78.6,
        79.32,
        83.87,
        81.5,
        80.17,
        80.25,
        78.48,
        79.6,
        77.83,
        78.17,
        77.05,
        75.25,
        80.7,
        80.87,
        80.12
      ],
      "mmlu": [
        77.02,
        75.73,
        77.94,
        76.74,
        76.94,
        76.25,
        76.86,
        76.99,
        76.44,
        75.77,
        75.95,
        76.5,
        77.3,
        77.51,
        78.02
      ],
      "aime24": [
        20.0,
        25.83,
        30.42,
        27.08,
        28.33,
        23.75,
        22.5,
        23.75,
        21.67,
        17.92,
        17.5,
        18.33,
        22.92,
        23.33,
        24.17
      ],
      "aime25": [
        16.67,
        21.67,
        24.58,
        22.92,
        22.09,
        20.41,
        18.33,
        18.75,
        15.42,
        15.0,
        15.0,
        14.16,
        16.66,
        20.84,
        20.41
      ]
    }
  },
  "summarySteps": [
    "50",
    "100",
    "150"
  ],
  "summary": {
    "m0": {
      "geo3kAcc": [
        66.64,
        61.86,
        57.26
      ],
      "math500": [
        85.05,
        85.82,
        86.7
      ],
      "mmlu": [
        77.39,
        79.09,
        78.12
      ],
      "aime25": [
        27.08,
        32.5,
        34.16
      ]
    },
    "m1": {
      "geo3kAcc": [
        66.62,
        70.11,
        71.07
      ],
      "math500": [
        76.02,
        77.42,
        79.15
      ],
      "mmlu": [
        76.46,
        76.92,
        78.0
      ],
      "aime25": [
        12.5,
        22.91,
        20.41
      ]
    },
    "m2": {
      "geo3kAcc": [
        71.94,
        73.13,
        70.15
      ],
      "math500": [
        84.3,
        87.32,
        87.77
      ],
      "mmlu": [
        78.6,
        80.94,
        80.61
      ],
      "aime25": [
        29.58,
        30.83,
        28.75
      ]
    },
    "m3": {
      "geo3kAcc": [
        55.35,
        51.93,
        53.99
      ],
      "math500": [
        80.17,
        78.17,
        80.12
      ],
      "mmlu": [
        76.94,
        75.77,
        78.02
      ],
      "aime25": [
        22.09,
        15.0,
        20.41
      ]
    }
  }
};
