// ---- Multimodal offline eval (Geo3K + evalscope) ----
// Auto-generated 2026-08-20 by scripts/analysis/gen_mm_eval_dashboard_data.py
// Refresh: python3 scripts/analysis/gen_mm_eval_dashboard_data.py
window.MM_EVAL = {
  "generatedAt": "2026-08-20",
  "generatedBy": "scripts/analysis/gen_mm_eval_dashboard_data.py",
  "note": "M0 文本曲线 = 2B E1 GRPO（e1_grpo_2b，10–150 /10）；Geo3K 仅 @150。 M1 formal @10/20/30/40/50；M2 formal @10/20/30/40/50/60/70/80/90/100；M3 formal @10/20/30/40/50。 M1 light Geo3K steps：70/100（n=1 / 512，不与 formal 横比）。 全 step 曲线只画 formal（10–150 /10）；缺测为 null。 文本 evalscope 未出报告的 step 仅有 Geo3K。",
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
      "configNote": "文本曲线复用 e1_grpo_2b 全 step（10–150 /10）正式 evalscope；Geo3K 仅有 @150 正式基线（n=8 / 16K）。柱状图取 @150 端点。",
      "geo3k": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m0_e1_grpo_2b_step150.jsonl.summary.json",
        "questions": 601,
        "samples": 4808,
        "n": 8,
        "maxTokens": 16384,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 57.32,
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
        "math500": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m0_e1_grpo_2b/20260722_133001/reports/models/math_500.json"
      }
    },
    {
      "key": "m1",
      "label": "M1 · 100% 图文 (@50 formal)",
      "shortLabel": "M1@50",
      "color": "#d97706",
      "step": 50,
      "visionPct": 100,
      "config": "formal",
      "configNote": "正式口径 Geo3K n=8 / 16K。已完成 step：10/20/30/40/50。 light 探查（n=1 / 512）保留作对照，不与 formal 横比绝对值。",
      "geo3k": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step50.jsonl.summary.json",
        "questions": 601,
        "samples": 4808,
        "n": 8,
        "maxTokens": 16384,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 66.62,
        "passAtN": 89.68
      },
      "text": {
        "mmlu": 77.25,
        "aime24": 18.33,
        "aime25": 17.5,
        "math500": 76.02
      },
      "sources": {
        "geo3k": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step50.jsonl.summary.json",
        "mmlu": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m1_geo3k100_2b_step50/20260819_211042/reports/models/mmlu_temp.json",
        "aime24": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m1_geo3k100_2b_step50/20260819_221805/reports/models/aime24.json",
        "aime25": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m1_geo3k100_2b_step50/20260819_221805/reports/models/aime25.json",
        "math500": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m1_geo3k100_2b_step50/20260819_221805/reports/models/math_500.json",
        "geo3k@10": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step10.jsonl.summary.json",
        "geo3k@20": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step20.jsonl.summary.json",
        "geo3k@30": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step30.jsonl.summary.json",
        "geo3k@40": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step40.jsonl.summary.json",
        "geo3k@50": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step50.jsonl.summary.json"
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
      "label": "M2 · 50% 图文 (@100 formal)",
      "shortLabel": "M2@100",
      "color": "#059669",
      "step": 100,
      "visionPct": 50,
      "config": "formal",
      "configNote": "正式口径 Geo3K n=8 / 16K。已完成 step：10/20/30/40/50/60/70/80/90/100。",
      "geo3k": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step100.jsonl.summary.json",
        "questions": 601,
        "samples": 4808,
        "n": 8,
        "maxTokens": 16384,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 73.13,
        "passAtN": 92.35
      },
      "text": {
        "mmlu": 79.92,
        "aime24": 37.08,
        "aime25": 28.75,
        "math500": 87.22
      },
      "sources": {
        "geo3k": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step100.jsonl.summary.json",
        "mmlu": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m2_mix50_2b_step100/20260819_202455/reports/models/mmlu_temp.json",
        "aime24": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m2_mix50_2b_step100/20260819_221702/reports/models/aime24.json",
        "aime25": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m2_mix50_2b_step100/20260819_221702/reports/models/aime25.json",
        "math500": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m2_mix50_2b_step100/20260819_221702/reports/models/math_500.json",
        "geo3k@10": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step10.jsonl.summary.json",
        "geo3k@20": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step20.jsonl.summary.json",
        "geo3k@30": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step30.jsonl.summary.json",
        "geo3k@40": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step40.jsonl.summary.json",
        "geo3k@50": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step50.jsonl.summary.json",
        "geo3k@60": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step60.jsonl.summary.json",
        "geo3k@70": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step70.jsonl.summary.json",
        "geo3k@80": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step80.jsonl.summary.json",
        "geo3k@90": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step90.jsonl.summary.json",
        "geo3k@100": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step100.jsonl.summary.json"
      }
    },
    {
      "key": "m3",
      "label": "M3 · 20% 图文 (@50 formal)",
      "shortLabel": "M3@50",
      "color": "#9333ea",
      "step": 50,
      "visionPct": 20,
      "config": "formal",
      "configNote": "正式口径 Geo3K n=8 / 16K。已完成 step：10/20/30/40/50。",
      "geo3k": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step50.jsonl.summary.json",
        "questions": 601,
        "samples": 4808,
        "n": 8,
        "maxTokens": 16384,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 55.35,
        "passAtN": 83.53
      },
      "text": {
        "mmlu": 76.44,
        "aime24": 27.08,
        "aime25": 20.42,
        "math500": 79.8
      },
      "sources": {
        "geo3k": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step50.jsonl.summary.json",
        "mmlu": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m3_mix20_2b_step50/20260819_192233/reports/models/mmlu_temp.json",
        "aime24": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m3_mix20_2b_step50/20260819_202942/reports/models/aime24.json",
        "aime25": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m3_mix20_2b_step50/20260819_202942/reports/models/aime25.json",
        "math500": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m3_mix20_2b_step50/20260819_202942/reports/models/math_500.json",
        "geo3k@10": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step10.jsonl.summary.json",
        "geo3k@20": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step20.jsonl.summary.json",
        "geo3k@30": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step30.jsonl.summary.json",
        "geo3k@40": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step40.jsonl.summary.json",
        "geo3k@50": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step50.jsonl.summary.json"
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
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        57.32
      ],
      "geo3kPass": [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
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
      "label": "M1 · 100% 图文 (@50 formal)",
      "shortLabel": "M1",
      "color": "#d97706",
      "config": "formal",
      "geo3kAcc": [
        66.1,
        66.49,
        68.28,
        68.68,
        66.62,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "geo3kPass": [
        91.68,
        92.35,
        90.35,
        91.68,
        89.68,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "math500": [
        75.55,
        76.12,
        77.0,
        76.1,
        76.02,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "mmlu": [
        76.22,
        77.19,
        76.69,
        77.47,
        77.25,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "aime24": [
        15.0,
        17.5,
        15.83,
        17.5,
        18.33,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "aime25": [
        17.5,
        16.66,
        21.25,
        16.67,
        17.5,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    "m2": {
      "label": "M2 · 50% 图文 (@100 formal)",
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
        null,
        null,
        null,
        null,
        null
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
        null,
        null,
        null,
        null,
        null
      ],
      "math500": [
        79.3,
        81.1,
        83.82,
        84.37,
        83.1,
        84.95,
        85.6,
        87.08,
        87.65,
        87.22,
        null,
        null,
        null,
        null,
        null
      ],
      "mmlu": [
        76.88,
        77.13,
        78.32,
        78.5,
        78.59,
        78.93,
        79.1,
        79.2,
        80.1,
        79.92,
        null,
        null,
        null,
        null,
        null
      ],
      "aime24": [
        24.58,
        28.75,
        32.08,
        35.0,
        30.83,
        34.17,
        31.25,
        33.75,
        37.08,
        37.08,
        null,
        null,
        null,
        null,
        null
      ],
      "aime25": [
        20.41,
        24.17,
        27.08,
        27.08,
        28.33,
        27.08,
        23.34,
        32.92,
        30.84,
        28.75,
        null,
        null,
        null,
        null,
        null
      ]
    },
    "m3": {
      "label": "M3 · 20% 图文 (@50 formal)",
      "shortLabel": "M3",
      "color": "#9333ea",
      "config": "formal",
      "geo3kAcc": [
        65.87,
        65.22,
        64.75,
        59.26,
        55.35,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "geo3kPass": [
        89.35,
        89.18,
        87.02,
        85.02,
        83.53,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "math500": [
        78.5,
        79.1,
        83.9,
        81.6,
        79.8,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "mmlu": [
        76.16,
        76.7,
        77.94,
        76.82,
        76.44,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "aime24": [
        21.67,
        23.33,
        35.0,
        30.42,
        27.08,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "aime25": [
        19.58,
        20.0,
        24.17,
        22.08,
        20.42,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
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
        null,
        null,
        57.32
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
        null,
        null
      ],
      "math500": [
        76.02,
        null,
        null
      ],
      "mmlu": [
        77.25,
        null,
        null
      ],
      "aime25": [
        17.5,
        null,
        null
      ]
    },
    "m2": {
      "geo3kAcc": [
        71.94,
        73.13,
        null
      ],
      "math500": [
        83.1,
        87.22,
        null
      ],
      "mmlu": [
        78.59,
        79.92,
        null
      ],
      "aime25": [
        28.33,
        28.75,
        null
      ]
    },
    "m3": {
      "geo3kAcc": [
        55.35,
        null,
        null
      ],
      "math500": [
        79.8,
        null,
        null
      ],
      "mmlu": [
        76.44,
        null,
        null
      ],
      "aime25": [
        20.42,
        null,
        null
      ]
    }
  }
};
