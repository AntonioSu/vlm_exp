#!/usr/bin/env python3
"""Generate dashboard/mm/js/data-eval.js from Geo3K + evalscope multimodal reports.

Keeps a git-tracked snapshot while raw evaluation/ and evalscope outputs stay local.
Refresh after new M0–M3 offline evals land:

  python3 scripts/analysis/gen_mm_eval_dashboard_data.py
"""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
# Eval artifacts often live in the sibling /data/lijunyi/vlm_exp tree (gitignored),
# while this script refreshes the git-tracked dashboard under REPO_ROOT.
VLM_EXP_DATA = Path("/data/lijunyi/vlm_exp")
EVALSCOPE_MM_CANDIDATES = [
    Path("/data/lijunyi/evalscope/outputs/exp2card_mm"),
    Path("/data/juicefs-white/5281-gpu-a100/lijunyi/evalscope/outputs/exp2card_mm"),
]
GEO3K_DIR_CANDIDATES = [
    VLM_EXP_DATA / "evaluation" / "geo3k",
    REPO_ROOT / "evaluation" / "geo3k",
    Path("/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp/evaluation/geo3k"),
]


def evalscope_mm_root() -> Path:
    for root in EVALSCOPE_MM_CANDIDATES:
        if root.exists():
            return root
    return EVALSCOPE_MM_CANDIDATES[0]


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
    base = evalscope_mm_root() / exp_dirname
    out: dict[str, Any] = {"sourceDir": str(base), "scores": {}, "sources": {}}
    for key, stem in tasks.items():
        path = latest_report(base, stem)
        if path is None:
            out["scores"][key] = None
            continue
        out["scores"][key] = pct(score_of(path))
        out["sources"][key] = str(path)
    return out


FULL_STEPS = list(range(10, 160, 10))  # same cadence as 4B E1 EVAL_FULL


def empty_series() -> dict[str, list[float | None]]:
    n = len(FULL_STEPS)
    return {
        "geo3kAcc": [None] * n,
        "geo3kPass": [None] * n,
        "math500": [None] * n,
        "mmlu": [None] * n,
        "aime24": [None] * n,
        "aime25": [None] * n,
    }


def put_at(series: dict[str, list[float | None]], step: int, values: dict[str, float | None]) -> None:
    if step not in FULL_STEPS:
        return
    idx = FULL_STEPS.index(step)
    for key, val in values.items():
        if key in series:
            series[key][idx] = val


def discover_m1_light_geo() -> list[tuple[int, dict[str, Any]]]:
    """Return sorted (step, geo3k_summary) for M1 light Geo3K summaries."""
    found: list[tuple[int, dict[str, Any]]] = []
    for root in GEO3K_DIR_CANDIDATES:
        if not root.is_dir():
            continue
        for path in root.glob("m1_geo3k100_2b_step*_light.jsonl.summary.json"):
            # m1_geo3k100_2b_step70_light.jsonl.summary.json
            stem = path.name.replace(".jsonl.summary.json", "")
            try:
                step = int(stem.rsplit("_step", 1)[1].rsplit("_", 1)[0])
            except (IndexError, ValueError):
                continue
            data = load_geo3k(path.name)
            if data:
                found.append((step, data))
    # de-dupe by step (prefer first candidate root which is /data/lijunyi)
    by_step: dict[int, dict[str, Any]] = {}
    for step, data in sorted(found):
        by_step.setdefault(step, data)
    return sorted(by_step.items())


def load_m1_text_light(step: int) -> tuple[dict[str, float | None], dict[str, str]]:
    text = load_text(
        f"m1_geo3k100_2b_step{step}_text_light",
        {"mmlu": "mmlu_temp"},
    )
    math = load_text(
        f"m1_geo3k100_2b_step{step}_math_light",
        {"aime24": "aime24", "aime25": "aime25", "math500": "math_500"},
    )
    scores = {
        "mmlu": text["scores"].get("mmlu"),
        "aime24": math["scores"].get("aime24"),
        "aime25": math["scores"].get("aime25"),
        "math500": math["scores"].get("math500"),
    }
    sources = {**text.get("sources", {}), **math.get("sources", {})}
    return scores, sources


def build_payload() -> dict[str, Any]:
    m0_geo = load_geo3k("m0_e1_grpo_2b_step150.jsonl.summary.json")
    m1_lights = discover_m1_light_geo()
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

    # Latest M1 light checkpoint is the headline group; earlier lights go into full curves.
    latest_m1_step, latest_m1_geo = m1_lights[-1] if m1_lights else (None, None)
    m1_scores, m1_sources = (
        load_m1_text_light(latest_m1_step) if latest_m1_step is not None else (
            {"mmlu": None, "aime24": None, "aime25": None, "math500": None},
            {},
        )
    )
    # Fall back to step70 text light if latest has no text reports yet.
    if latest_m1_step is not None and all(v is None for v in m1_scores.values()):
        m1_scores, m1_sources = load_m1_text_light(70)

    m1_steps_str = "/".join(str(s) for s, _ in m1_lights) if m1_lights else "none"

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
            "label": (
                f"M1 · 100% 图文 (@{latest_m1_step} light)"
                if latest_m1_step is not None
                else "M1 · 100% 图文"
            ),
            "shortLabel": (
                f"M1@{latest_m1_step} light" if latest_m1_step is not None else "M1"
            ),
            "color": "#d97706",
            "step": latest_m1_step,
            "visionPct": 100,
            "config": "light" if latest_m1_geo else None,
            "configNote": (
                f"轻量探查（Geo3K n=1 max_tokens=512）。已有 light Geo3K step：{m1_steps_str}。"
                "文本 light 仅在有对应 evalscope 产物时填入；与 M0 正式结果不可直接比绝对值。"
                if latest_m1_geo
                else "尚无 M1 light / formal 离线评测"
            ),
            "geo3k": latest_m1_geo,
            "geo3kQuick": m1_geo_quick,
            "text": m1_scores,
            "sources": {
                "geo3k": (latest_m1_geo or {}).get("source"),
                **m1_sources,
                **{f"geo3k@{step}": geo.get("source") for step, geo in m1_lights},
            },
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

    # Dense mid-step series (4B E1 EVAL_FULL style). Missing checkpoints stay null.
    full: dict[str, dict[str, Any]] = {}
    for g in groups:
        series = empty_series()
        entry: dict[str, Any] = {
            "label": g["label"],
            "shortLabel": g["shortLabel"],
            "color": g["color"],
            "config": g["config"],
            **series,
        }
        full[g["key"]] = entry

    put_at(
        full["m0"],
        150,
        {
            "geo3kAcc": (m0_geo or {}).get("sampleAccuracy"),
            "geo3kPass": (m0_geo or {}).get("passAtN"),
            "math500": m0_text["scores"].get("math500"),
            "mmlu": m0_text["scores"].get("mmlu"),
            "aime24": m0_text["scores"].get("aime24"),
            "aime25": m0_text["scores"].get("aime25"),
        },
    )
    for step, geo in m1_lights:
        text_scores, _ = load_m1_text_light(step)
        put_at(
            full["m1"],
            step,
            {
                "geo3kAcc": geo.get("sampleAccuracy"),
                "geo3kPass": geo.get("passAtN"),
                "math500": text_scores.get("math500"),
                "mmlu": text_scores.get("mmlu"),
                "aime24": text_scores.get("aime24"),
                "aime25": text_scores.get("aime25"),
            },
        )

    # Sparse summary steps (like 4B EVAL 50/100/150) for quick glance.
    summary_steps = [50, 100, 150]
    summary: dict[str, dict[str, list[float | None]]] = {}
    for key, series in full.items():
        summary[key] = {
            metric: [series[metric][FULL_STEPS.index(s)] if s in FULL_STEPS else None for s in summary_steps]
            for metric in ("geo3kAcc", "math500", "mmlu", "aime25")
        }

    return {
        "generatedAt": date.today().isoformat(),
        "generatedBy": "scripts/analysis/gen_mm_eval_dashboard_data.py",
        "note": (
            f"M0 为正式基线；M1 light Geo3K steps：{m1_steps_str}"
            "（n=1 max_tokens=512，非 formal n=8/16K）。"
            "全 step 曲线对齐 4B E1 EVAL_FULL（10–150 /10）；缺测为 null。"
            "M2/M3 待 formal 评测完成后补齐。"
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
        "fullSteps": [str(s) for s in FULL_STEPS],
        "fullOrder": ["m0", "m1", "m2", "m3"],
        "full": full,
        "summarySteps": [str(s) for s in summary_steps],
        "summary": summary,
    }


def render_js(payload: dict[str, Any]) -> str:
    body = json.dumps(payload, ensure_ascii=False, indent=2)
    return (
        "// ---- Multimodal offline eval (Geo3K + evalscope) ----\n"
        f"// Auto-generated {payload['generatedAt']} by {payload['generatedBy']}\n"
        "// Refresh: python3 scripts/analysis/gen_mm_eval_dashboard_data.py\n"
        "window.MM_EVAL = "
        + body
        + ";\n"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=REPO_ROOT / "dashboard" / "mm" / "js" / "data-eval.js",
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
