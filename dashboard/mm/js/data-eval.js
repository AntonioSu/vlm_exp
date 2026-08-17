// ---- Multimodal offline eval (Geo3K + evalscope) ----
// Auto-generated 2026-08-17 by scripts/analysis/gen_mm_eval_dashboard_data.py
// Refresh: python3 scripts/analysis/gen_mm_eval_dashboard_data.py
window.MM_EVAL = {
  "generatedAt": "2026-08-17",
  "generatedBy": "scripts/analysis/gen_mm_eval_dashboard_data.py",
  "note": "M0 为正式基线。 M1 formal @10/20/30；M2 formal @10/20/30/40。 M1 light Geo3K steps：70/100（n=1 / 512，不与 formal 横比）。 全 step 曲线只画 formal（10–150 /10）；缺测为 null。 文本 evalscope 未出报告的 step 仅有 Geo3K。",
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
      "label": "M0 · 0% 图文 (E1@150)",
      "shortLabel": "M0@150",
      "color": "#2563eb",
      "step": 150,
      "visionPct": 0,
      "config": "formal",
      "configNote": "正式口径：Geo3K n=8 max_tokens=16384；文本 evalscope 正式配置",
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
      "label": "M1 · 100% 图文 (@30 formal)",
      "shortLabel": "M1@30",
      "color": "#d97706",
      "step": 30,
      "visionPct": 100,
      "config": "formal",
      "configNote": "正式口径 Geo3K n=8 / 16K。已完成 step：10/20/30。 文本 evalscope 尚未出报告。 light 探查（n=1 / 512）保留作对照，不与 formal 横比绝对值。",
      "geo3k": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step30.jsonl.summary.json",
        "questions": 601,
        "samples": 4808,
        "n": 8,
        "maxTokens": 16384,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 68.28,
        "passAtN": 90.35
      },
      "text": {
        "mmlu": null,
        "aime24": null,
        "aime25": null,
        "math500": null
      },
      "sources": {
        "geo3k": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step30.jsonl.summary.json",
        "geo3k@10": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step10.jsonl.summary.json",
        "geo3k@20": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step20.jsonl.summary.json",
        "geo3k@30": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step30.jsonl.summary.json"
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
      "label": "M2 · 50% 图文 (@40 formal)",
      "shortLabel": "M2@40",
      "color": "#059669",
      "step": 40,
      "visionPct": 50,
      "config": "formal",
      "configNote": "正式口径 Geo3K n=8 / 16K。已完成 step：10/20/30/40。",
      "geo3k": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step40.jsonl.summary.json",
        "questions": 601,
        "samples": 4808,
        "n": 8,
        "maxTokens": 16384,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 71.63,
        "passAtN": 90.85
      },
      "text": {
        "mmlu": 78.5,
        "aime24": 35.0,
        "aime25": 27.08,
        "math500": null
      },
      "sources": {
        "geo3k": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step40.jsonl.summary.json",
        "mmlu": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m2_mix50_2b_step40/20260816_230317/reports/models/mmlu_temp.json",
        "aime24": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m2_mix50_2b_step40/20260817_002325/reports/models/aime24.json",
        "aime25": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m2_mix50_2b_step40/20260817_002325/reports/models/aime25.json",
        "geo3k@10": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step10.jsonl.summary.json",
        "geo3k@20": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step20.jsonl.summary.json",
        "geo3k@30": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step30.jsonl.summary.json",
        "geo3k@40": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m2_mix50_2b_step40.jsonl.summary.json"
      }
    },
    {
      "key": "m3",
      "label": "M3 · 20% 图文",
      "shortLabel": "M3",
      "color": "#9333ea",
      "step": null,
      "visionPct": 20,
      "config": null,
      "configNote": "尚无 checkpoint / 离线评测",
      "geo3k": null,
      "text": {
        "mmlu": null,
        "aime24": null,
        "aime25": null,
        "math500": null
      },
      "sources": {}
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
      "label": "M0 · 0% 图文 (E1@150)",
      "shortLabel": "M0",
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
        86.35
      ],
      "mmlu": [
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
        78.34
      ],
      "aime24": [
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
        35.42
      ],
      "aime25": [
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
        32.5
      ]
    },
    "m1": {
      "label": "M1 · 100% 图文 (@30 formal)",
      "shortLabel": "M1",
      "color": "#d97706",
      "config": "formal",
      "geo3kAcc": [
        66.1,
        66.49,
        68.28,
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
        null
      ],
      "geo3kPass": [
        91.68,
        92.35,
        90.35,
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
        null
      ],
      "math500": [
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
        null
      ],
      "mmlu": [
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
        null
      ],
      "aime24": [
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
        null
      ],
      "aime25": [
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
        null
      ]
    },
    "m2": {
      "label": "M2 · 50% 图文 (@40 formal)",
      "shortLabel": "M2",
      "color": "#059669",
      "config": "formal",
      "geo3kAcc": [
        65.6,
        68.01,
        70.38,
        71.63,
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
        null
      ],
      "geo3kPass": [
        91.18,
        89.68,
        91.01,
        90.85,
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
        null
      ],
      "math500": [
        null,
        null,
        83.82,
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
        null
      ],
      "mmlu": [
        null,
        null,
        78.32,
        78.5,
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
        null
      ],
      "aime24": [
        null,
        null,
        32.08,
        35.0,
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
        null
      ],
      "aime25": [
        null,
        null,
        27.08,
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
        null,
        null
      ]
    },
    "m3": {
      "label": "M3 · 20% 图文",
      "shortLabel": "M3",
      "color": "#9333ea",
      "config": null,
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
        null
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
        null
      ],
      "math500": [
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
        null
      ],
      "mmlu": [
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
        null
      ],
      "aime24": [
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
        null
      ],
      "aime25": [
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
        null,
        null,
        86.35
      ],
      "mmlu": [
        null,
        null,
        78.34
      ],
      "aime25": [
        null,
        null,
        32.5
      ]
    },
    "m1": {
      "geo3kAcc": [
        null,
        null,
        null
      ],
      "math500": [
        null,
        null,
        null
      ],
      "mmlu": [
        null,
        null,
        null
      ],
      "aime25": [
        null,
        null,
        null
      ]
    },
    "m2": {
      "geo3kAcc": [
        null,
        null,
        null
      ],
      "math500": [
        null,
        null,
        null
      ],
      "mmlu": [
        null,
        null,
        null
      ],
      "aime25": [
        null,
        null,
        null
      ]
    },
    "m3": {
      "geo3kAcc": [
        null,
        null,
        null
      ],
      "math500": [
        null,
        null,
        null
      ],
      "mmlu": [
        null,
        null,
        null
      ],
      "aime25": [
        null,
        null,
        null
      ]
    }
  }
};
