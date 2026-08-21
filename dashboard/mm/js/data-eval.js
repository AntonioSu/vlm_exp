// ---- Multimodal offline eval (Geo3K + evalscope) ----
// Auto-generated 2026-08-21 by scripts/analysis/gen_mm_eval_dashboard_data.py
// Refresh: python3 scripts/analysis/gen_mm_eval_dashboard_data.py
window.MM_EVAL = {
  "generatedAt": "2026-08-21",
  "generatedBy": "scripts/analysis/gen_mm_eval_dashboard_data.py",
  "note": "M0 文本曲线 = 2B E1 GRPO（e1_grpo_2b，10–150 /10）；Geo3K 仅 @150。 M1 formal @10/20/30/40/50/60/70；M2 formal @10/20/30/40/50/60/70/80/90/100/110/120/130；M3 formal @10/20/30/40/50/60/70/80/90。 M1 light Geo3K steps：70/100（n=1 / 512，不与 formal 横比）。 全 step 曲线只画 formal（10–150 /10）；缺测为 null。 文本 evalscope 未出报告的 step 仅有 Geo3K。",
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
      "label": "M1 · 100% 图文 (@70 formal)",
      "shortLabel": "M1@70",
      "color": "#d97706",
      "step": 70,
      "visionPct": 100,
      "config": "formal",
      "configNote": "正式口径 Geo3K n=8 / 16K。已完成 step：10/20/30/40/50/60/70。 文本 evalscope 尚未出报告。 light 探查（n=1 / 512）保留作对照，不与 formal 横比绝对值。",
      "geo3k": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step70.jsonl.summary.json",
        "questions": 601,
        "samples": 4808,
        "n": 8,
        "maxTokens": 16384,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 68.32,
        "passAtN": 89.85
      },
      "text": {
        "mmlu": null,
        "aime24": null,
        "aime25": null,
        "math500": null
      },
      "sources": {
        "geo3k": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step70.jsonl.summary.json",
        "geo3k@10": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step10.jsonl.summary.json",
        "geo3k@20": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step20.jsonl.summary.json",
        "geo3k@30": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step30.jsonl.summary.json",
        "geo3k@40": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step40.jsonl.summary.json",
        "geo3k@50": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step50.jsonl.summary.json",
        "geo3k@60": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step60.jsonl.summary.json",
        "geo3k@70": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step70.jsonl.summary.json"
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
      "label": "M2 · 50% 图文 (@130 formal)",
      "shortLabel": "M2@130",
      "color": "#059669",
      "step": 130,
      "visionPct": 50,
      "config": "formal",
      "configNote": "正式口径 Geo3K n=8 / 16K。已完成 step：10/20/30/40/50/60/70/80/90/100/110/120/130。 文本 evalscope 尚未出报告。",
      "geo3k": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step130.jsonl.summary.json",
        "questions": 601,
        "samples": 4808,
        "n": 8,
        "maxTokens": 16384,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 73.75,
        "passAtN": 92.35
      },
      "text": {
        "mmlu": null,
        "aime24": null,
        "aime25": null,
        "math500": null
      },
      "sources": {
        "geo3k": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step130.jsonl.summary.json",
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
        "geo3k@130": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step130.jsonl.summary.json"
      }
    },
    {
      "key": "m3",
      "label": "M3 · 20% 图文 (@90 formal)",
      "shortLabel": "M3@90",
      "color": "#9333ea",
      "step": 90,
      "visionPct": 20,
      "config": "formal",
      "configNote": "正式口径 Geo3K n=8 / 16K。已完成 step：10/20/30/40/50/60/70/80/90。",
      "geo3k": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step90.jsonl.summary.json",
        "questions": 601,
        "samples": 4808,
        "n": 8,
        "maxTokens": 16384,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 52.56,
        "passAtN": 80.53
      },
      "text": {
        "mmlu": 76.78,
        "aime24": 22.08,
        "aime25": 21.67,
        "math500": null
      },
      "sources": {
        "geo3k": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step90.jsonl.summary.json",
        "mmlu": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m3_mix20_2b_step90/20260821_002305/reports/models/mmlu_temp.json",
        "aime24": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m3_mix20_2b_step90/20260821_013320/reports/models/aime24.json",
        "aime25": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m3_mix20_2b_step90/20260821_013320/reports/models/aime25.json",
        "geo3k@10": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step10.jsonl.summary.json",
        "geo3k@20": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step20.jsonl.summary.json",
        "geo3k@30": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step30.jsonl.summary.json",
        "geo3k@40": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step40.jsonl.summary.json",
        "geo3k@50": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step50.jsonl.summary.json",
        "geo3k@60": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step60.jsonl.summary.json",
        "geo3k@70": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step70.jsonl.summary.json",
        "geo3k@80": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step80.jsonl.summary.json",
        "geo3k@90": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m3_mix20_2b_step90.jsonl.summary.json"
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
      "label": "M1 · 100% 图文 (@70 formal)",
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
        91.01,
        89.85,
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
        75.94,
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
        17.08,
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
        17.08,
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
      "label": "M2 · 50% 图文 (@130 formal)",
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
        91.51,
        89.52,
        92.35,
        null,
        null
      ],
      "math500": [
        79.3,
        81.1,
        84.68,
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
        76.43,
        77.13,
        77.87,
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
        21.67,
        28.75,
        28.33,
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
        19.17,
        24.17,
        27.09,
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
      "label": "M3 · 20% 图文 (@90 formal)",
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
        82.2,
        82.2,
        81.7,
        80.53,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "math500": [
        78.5,
        79.55,
        83.9,
        81.15,
        79.8,
        null,
        79.45,
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
        76.92,
        77.94,
        76.6,
        76.44,
        null,
        77.71,
        null,
        76.78,
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
        30.0,
        27.08,
        null,
        21.25,
        null,
        22.08,
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
        21.67,
        20.42,
        null,
        19.58,
        null,
        21.67,
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
