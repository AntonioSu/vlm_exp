window.MM_M2_ROLLOUT_SUMMARY = {
  "source": "m2_mix50_2b rollout summary",
  "generatedFrom": "/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/logs/exp2card_mm/m2_mix50_2b/rollout_dump",
  "generatedBy": "scripts/summarize_mm_rollouts.py",
  "note": "Training rollout metrics; not Geo3K test-set evaluation.",
  "overall": {
    "samples": 256,
    "accuracy": 0.4765625,
    "meanScore": 0.14140625
  },
  "rows": [
    {
      "step": 1,
      "source": "geo3k",
      "samples": 112,
      "accuracy": 0.5178571428571429,
      "meanScore": 0.4660714285714286,
      "meanOutputChars": 21622.875
    },
    {
      "step": 1,
      "source": "text",
      "samples": 144,
      "accuracy": 0.4444444444444444,
      "meanScore": -0.1111111111111111,
      "meanOutputChars": 23540.979166666668
    }
  ]
};
