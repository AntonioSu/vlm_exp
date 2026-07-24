// ---- Multimodal offline eval (Geo3K + evalscope) ----
// Auto-generated 2026-07-24 by scripts/gen_mm_eval_dashboard_data.py
// Refresh: python3 scripts/gen_mm_eval_dashboard_data.py
window.MM_EVAL = {
  "generatedAt": "2026-07-24",
  "generatedBy": "scripts/gen_mm_eval_dashboard_data.py",
  "note": "M0 为正式基线；M1@70 为 light 配置探查（非 formal n=8/16K）。全 step 曲线对齐 4B E1 EVAL_FULL（10–150 /10）；缺测为 null。M2/M3 待 checkpoint 与评测完成后补齐。",
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
      "label": "M1 · 100% 图文 (@70 light)",
      "shortLabel": "M1@70 light",
      "color": "#d97706",
      "step": 70,
      "visionPct": 100,
      "config": "light",
      "configNote": "轻量探查：Geo3K n=1 max_tokens=512；文本 max_tokens 很低（mmlu_temp=16，math=512），与 M0 正式结果不可直接比绝对值",
      "geo3k": {
        "source": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step70_light.jsonl.summary.json",
        "questions": 601,
        "samples": 601,
        "n": 1,
        "maxTokens": 512,
        "temperature": 0.6,
        "topP": 0.95,
        "sampleAccuracy": 13.64,
        "passAtN": 13.64
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
      },
      "text": {
        "mmlu": 0.97,
        "aime24": 0.0,
        "aime25": 6.67,
        "math500": 23.6
      },
      "sources": {
        "geo3k": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k/m1_geo3k100_2b_step70_light.jsonl.summary.json",
        "mmlu": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m1_geo3k100_2b_step70_text_light/20260724_000305/reports/models/mmlu_temp.json",
        "aime24": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m1_geo3k100_2b_step70_math_light/20260724_001013/reports/models/aime24.json",
        "aime25": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m1_geo3k100_2b_step70_math_light/20260724_001013/reports/models/aime25.json",
        "math500": "/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm/m1_geo3k100_2b_step70_math_light/20260724_001013/reports/models/math_500.json"
      }
    },
    {
      "key": "m2",
      "label": "M2 · 50% 图文",
      "shortLabel": "M2",
      "color": "#059669",
      "step": null,
      "visionPct": 50,
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
      "shortLabel": "M0@150",
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
      "label": "M1 · 100% 图文 (@70 light)",
      "shortLabel": "M1@70 light",
      "color": "#d97706",
      "config": "light",
      "geo3kAcc": [
        null,
        null,
        null,
        null,
        null,
        null,
        13.64,
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
        13.64,
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
        23.6,
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
        0.97,
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
        0.0,
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
        6.67,
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
      "label": "M2 · 50% 图文",
      "shortLabel": "M2",
      "color": "#059669",
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
