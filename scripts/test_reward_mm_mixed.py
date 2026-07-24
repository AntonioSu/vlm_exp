#!/usr/bin/env python3
"""Small wiring test for both branches of reward_mm_mixed."""

from reward_mm_mixed import compute_score


def main() -> None:
    geo = compute_score(
        "hiyouga/geometry3k",
        r"<think>reasoning</think>\boxed{48}",
        "48",
    )
    text = compute_score(
        "math_dapo",
        r"reasoning \boxed{2}",
        "2",
    )
    assert geo["acc"] is True and geo["is_geo3k"] is True, geo
    assert text["acc"] is True and text["is_geo3k"] is False, text
    assert geo["score"] == 1.0, geo
    assert text["score"] == 1.0, text
    print("reward_mm_mixed: geo3k and text branches passed")


if __name__ == "__main__":
    main()
