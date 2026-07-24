#!/usr/bin/env python3
"""Generate dashboard/mm/js/data-eval.js from Geo3K + evalscope multimodal reports.

Keeps a git-tracked snapshot while raw evaluation/ and evalscope outputs stay local.
Refresh after new M0–M3 offline evals land:

  python3 scripts/gen_mm_eval_dashboard_data.py
"""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any

VLM_EXP = Path("/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp")
EVALSCOPE_MM = Path("/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm")

# Prefer juicefs paths; fall back to short /data/lijunyi symlinks used in some runs.
GEO3K_DIR_CANDIDATES = [
    VLM_EXP / "evaluation" / "geo3k",
    Path("/data/lijunyi/vlm_exp/evaluation/geo3k"),
]


def pct(score: float | None, digits: int = 2) -> float | None:
    if score is None:
        return None
    return round(float(score) * 100, digits)


def score_of(path: Path) -> float:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data.get("score"), (int, float)):
        return float(data["score"])
    metrics = data.get("metrics") or [{}]
    return float(metrics[0].get("score", 0))


def latest_report(exp_dir: Path, task: str) -> Path | None:
    if not exp_dir.exists():
        return None
    cands = list(exp_dir.glob(f"*/reports/**/{task}.json"))
    if not cands:
        # also try reports/models/
        cands = list(exp_dir.glob(f"*/reports/models/{task}.json"))
    if not cands:
        return None
    return max(cands, key=lambda p: p.stat().st_mtime)


def find_geo3k_summary(name: str) -> Path | None:
    for root in GEO3K_DIR_CANDIDATES:
        path = root / name
        if path.exists():
            return path
    return None


def load_geo3k(summary_name: str) -> dict[str, Any] | None:
    path = find_geo3k_summary(summary_name)
    if path is None:
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    cfg = data.get("config") or {}
    return {
        "source": str(path),
        "questions": data.get("questions"),
        "samples": data.get("samples"),
        "n": data.get("n"),
        "maxTokens": cfg.get("max_tokens"),
        "temperature": cfg.get("temperature"),
        "topP": cfg.get("top_p"),
        "sampleAccuracy": pct(data.get("sample_accuracy")),
        "passAtN": pct(data.get("pass_at_n")),
    }


def load_text(exp_dirname: str, tasks: dict[str, str]) -> dict[str, Any]:
    """tasks maps dashboard key -> report filename stem (without .json)."""
    base = EVALSCOPE_MM / exp_dirname
    out: dict[str, Any] = {"sourceDir": str(base), "scores": {}, "sources": {}}
    for key, stem in tasks.items():
        path = latest_report(base, stem)
        if path is None:
            out["scores"][key] = None
            continue
        out["scores"][key] = pct(score_of(path))
        out["sources"][key] = str(path)
    return out


def build_payload() -> dict[str, Any]:
    m0_geo = load_geo3k("m0_e1_grpo_2b_step150.jsonl.summary.json")
    m1_geo = load_geo3k("m1_geo3k100_2b_step70_light.jsonl.summary.json")
    m1_geo_quick = load_geo3k("m1_geo3k100_2b_step70_quick.jsonl.summary.json")

    m0_text = load_text(
        "m0_e1_grpo_2b",
        {"mmlu": "mmlu", "aime24": "aime24", "aime25": "aime25", "math500": "math_500"},
    )
    # M0 report file is mmlu.json but dashboard status treats it as mmlu_temp baseline.
    if m0_text["scores"].get("mmlu") is None:
        alt = load_text("m0_e1_grpo_2b", {"mmlu": "mmlu_temp"})
        m0_text["scores"]["mmlu"] = alt["scores"].get("mmlu")
        if alt["sources"].get("mmlu"):
            m0_text["sources"]["mmlu"] = alt["sources"]["mmlu"]

    m1_text = load_text(
        "m1_geo3k100_2b_step70_text_light",
        {"mmlu": "mmlu_temp"},
    )
    m1_math = load_text(
        "m1_geo3k100_2b_step70_math_light",
        {"aime24": "aime24", "aime25": "aime25", "math500": "math_500"},
    )
    m1_scores = {
        "mmlu": m1_text["scores"].get("mmlu"),
        "aime24": m1_math["scores"].get("aime24"),
        "aime25": m1_math["scores"].get("aime25"),
        "math500": m1_math["scores"].get("math500"),
    }
    m1_sources = {**m1_text.get("sources", {}), **m1_math.get("sources", {})}

    groups = [
        {
            "key": "m0",
            "label": "M0 · 0% 图文 (E1@150)",
            "shortLabel": "M0@150",
            "color": "#2563eb",
            "step": 150,
            "visionPct": 0,
            "config": "formal",
            "configNote": "正式口径：Geo3K n=8 max_tokens=16384；文本 evalscope 正式配置",
            "geo3k": m0_geo,
            "text": m0_text["scores"],
            "sources": {"geo3k": (m0_geo or {}).get("source"), **m0_text.get("sources", {})},
        },
        {
            "key": "m1",
            "label": "M1 · 100% 图文 (@70 light)",
            "shortLabel": "M1@70 light",
            "color": "#d97706",
            "step": 70,
            "visionPct": 100,
            "config": "light",
            "configNote": (
                "轻量探查：Geo3K n=1 max_tokens=512；文本 max_tokens 很低"
                "（mmlu_temp=16，math=512），与 M0 正式结果不可直接比绝对值"
            ),
            "geo3k": m1_geo,
            "geo3kQuick": m1_geo_quick,
            "text": m1_scores,
            "sources": {"geo3k": (m1_geo or {}).get("source"), **m1_sources},
        },
        {
            "key": "m2",
            "label": "M2 · 50% 图文",
            "shortLabel": "M2",
            "color": "#059669",
            "step": None,
            "visionPct": 50,
            "config": None,
            "configNote": "尚无 checkpoint / 离线评测",
            "geo3k": None,
            "text": {"mmlu": None, "aime24": None, "aime25": None, "math500": None},
            "sources": {},
        },
        {
            "key": "m3",
            "label": "M3 · 20% 图文",
            "shortLabel": "M3",
            "color": "#9333ea",
            "step": None,
            "visionPct": 20,
            "config": None,
            "configNote": "尚无 checkpoint / 离线评测",
            "geo3k": None,
            "text": {"mmlu": None, "aime24": None, "aime25": None, "math500": None},
            "sources": {},
        },
    ]

    return {
        "generatedAt": date.today().isoformat(),
        "generatedBy": "scripts/gen_mm_eval_dashboard_data.py",
        "note": (
            "M0 为正式基线；M1@70 为 light 配置探查（非 formal n=8/16K）。"
            "M2/M3 待 checkpoint 与评测完成后补齐。"
        ),
        "metrics": [
            {"key": "geo3kAcc", "label": "Geo3K sample acc", "unit": "%"},
            {"key": "geo3kPass", "label": "Geo3K pass@n", "unit": "%"},
            {"key": "math500", "label": "MATH-500", "unit": "%"},
            {"key": "mmlu", "label": "MMLU", "unit": "%"},
            {"key": "aime24", "label": "AIME24", "unit": "%"},
            {"key": "aime25", "label": "AIME25", "unit": "%"},
        ],
        "groups": groups,
    }


def render_js(payload: dict[str, Any]) -> str:
    body = json.dumps(payload, ensure_ascii=False, indent=2)
    return (
        "// ---- Multimodal offline eval (Geo3K + evalscope) ----\n"
        f"// Auto-generated {payload['generatedAt']} by {payload['generatedBy']}\n"
        "// Refresh: python3 scripts/gen_mm_eval_dashboard_data.py\n"
        "window.MM_EVAL = "
        + body
        + ";\n"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=VLM_EXP / "dashboard" / "mm" / "js" / "data-eval.js",
        help="output dashboard JS path",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payload = build_payload()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(render_js(payload), encoding="utf-8")
    ready = [g["key"] for g in payload["groups"] if g.get("geo3k") or any(v is not None for v in (g.get("text") or {}).values())]
    print(f"Wrote {args.output} (groups with scores: {', '.join(ready) or 'none'})")


if __name__ == "__main__":
    main()
