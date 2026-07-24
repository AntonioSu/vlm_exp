"""图文混合训练用的 reward dispatcher（verl custom_reward_function）。

同一个训练 batch 里会混有纯文本数学样本（data_source=math_dapo/aime24）和 Geo3K 图文样本
（data_source=hiyouga/geometry3k）。verl 的 reward manager 对每一行都会带上该行的 data_source
调用本函数，因此这里按 data_source 分支到各自的判分逻辑：

- 纯文本数学：复用 reward_boxed.py 的逻辑（Math-Verify 符号等价判定，强制 \\boxed{}）。
- Geo3K 图文：复用 verl 官方 verl/utils/reward_score/geo3k.py 的逻辑（mathruler 的
  grade_answer + 0.1 权重的 <think></think>\\boxed{} 格式奖励），与官方 Geo3K GRPO 示例一致，
  便于结果与社区基线可比。
"""

from mathruler.grader import extract_boxed_content, grade_answer

from verl.utils.reward_score import math_verify as _mv
from verl.utils.reward_score.geo3k import format_reward as _geo3k_format_reward
from verl.utils.reward_score.math_dapo import last_boxed_only_string

_TIMEOUT = 15.0
_GEO3K_FORMAT_WEIGHT = 0.1


def _score_text_math(solution_str: str, ground_truth: str) -> dict:
    box = last_boxed_only_string(solution_str)
    if box is None:
        return {"score": -1.0, "acc": False, "pred": "[NO_BOX]"}
    try:
        s = _mv.compute_score(box, ground_truth, timeout_score=0.0, timeout=_TIMEOUT)
    except Exception:
        s = 0.0
    correct = float(s) > 0
    return {"score": 1.0 if correct else -1.0, "acc": correct, "pred": box}


def _score_geo3k(solution_str: str, ground_truth: str) -> dict:
    box = extract_boxed_content(solution_str)
    correct = bool(grade_answer(box, ground_truth))
    fmt = _geo3k_format_reward(solution_str)
    score = (1.0 - _GEO3K_FORMAT_WEIGHT) * (1.0 if correct else 0.0) + _GEO3K_FORMAT_WEIGHT * fmt
    return {"score": score, "acc": correct, "pred": box}


def compute_score(data_source, solution_str, ground_truth, extra_info=None):
    if data_source == "hiyouga/geometry3k":
        result = _score_geo3k(solution_str, ground_truth)
        result["is_geo3k"] = True
        return result
    result = _score_text_math(solution_str, ground_truth)
    result["is_geo3k"] = False
    return result
