#!/usr/bin/env python3
"""Generate dashboard/mm/js/data-eval.js from Geo3K + evalscope multimodal reports.

Keeps a git-tracked snapshot while raw evaluation/ and evalscope outputs stay local.
Refresh after new M0–M3 offline evals land:

  python3 scripts/analysis/gen_mm_eval_dashboard_data.py
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import date
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]  # polaris/vlm_exp (git-tracked)
_WS = REPO_ROOT.parent
if (_WS / "polaris").is_dir() and (_WS / "vlm_exp").is_dir():
    WORKSPACE_ROOT = _WS
else:
    WORKSPACE_ROOT = _WS.parent if (_WS.parent / "vlm_exp").is_dir() else _WS
WORKSPACE_ROOT = Path(os.environ.get("WORKSPACE_ROOT", WORKSPACE_ROOT))

# Eval artifacts often live in the sibling vlm_exp tree (gitignored),
# while this script refreshes the git-tracked dashboard under REPO_ROOT.
VLM_EXP_DATA = WORKSPACE_ROOT / "vlm_exp"
EVALSCOPE_MM_CANDIDATES = [
    WORKSPACE_ROOT / "evalscope" / "outputs" / "exp2card_mm",
]
GEO3K_DIR_CANDIDATES = [
    VLM_EXP_DATA / "evaluation" / "geo3k",
    REPO_ROOT / "evaluation" / "geo3k",
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
    # de-dupe by step (prefer first candidate root which is $WORKSPACE_ROOT)
    by_step: dict[int, dict[str, Any]] = {}
    for step, data in sorted(found):
        by_step.setdefault(step, data)
    return sorted(by_step.items())


FORMAL_EXPS = {
    "m1": ("m1_geo3k100_2b", "M1 · 100% 图文", "M1", "#d97706", 100),
    "m2": ("m2_mix50_2b", "M2 · 50% 图文", "M2", "#059669", 50),
    "m3": ("m3_mix20_2b", "M3 · 20% 图文", "M3", "#9333ea", 20),
}


def discover_formal_geo(exp_name: str) -> list[tuple[int, dict[str, Any]]]:
    """Return sorted (step, geo3k_summary) for formal Geo3K (not light/quick)."""
    found: dict[int, dict[str, Any]] = {}
    for root in GEO3K_DIR_CANDIDATES:
        if not root.is_dir():
            continue
        for path in root.glob(f"{exp_name}_step*.jsonl.summary.json"):
            name = path.name
            if "_light" in name or "_quick" in name:
                continue
            prefix = f"{exp_name}_step"
            if not name.startswith(prefix):
                continue
            step_str = name[len(prefix):].split(".", 1)[0]
            if not step_str.isdigit():
                continue
            data = load_geo3k(name)
            if data and data.get("questions") == 601:
                found.setdefault(int(step_str), data)
    return sorted(found.items())


def load_formal_text(exp_name: str, step: int) -> dict[str, Any]:
    dirname = f"{exp_name}_step{step}"
    text = load_text(
        dirname,
        {"mmlu": "mmlu_temp", "aime24": "aime24", "aime25": "aime25", "math500": "math_500"},
    )
    if text["scores"].get("mmlu") is None:
        alt = load_text(dirname, {"mmlu": "mmlu"})
        text["scores"]["mmlu"] = alt["scores"].get("mmlu")
        if alt["sources"].get("mmlu"):
            text["sources"]["mmlu"] = alt["sources"]["mmlu"]
    return text


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


def build_mm_group(
    key: str,
    *,
    formals: list[tuple[int, dict[str, Any]]],
    lights: list[tuple[int, dict[str, Any]]] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    exp, base_label, short, color, vision = FORMAL_EXPS[key]
    lights = lights or []
    extra = extra or {}
    if formals:
        step, geo = formals[-1]
        text = load_formal_text(exp, step)
        steps_str = "/".join(str(s) for s, _ in formals)
        missing_text = all(v is None for v in text["scores"].values())
        note = f"正式口径 Geo3K n=8 / 16K。已完成 step：{steps_str}。"
        if missing_text:
            note += " 文本 evalscope 尚未出报告。"
        if lights:
            note += " light 探查（n=1 / 512）保留作对照，不与 formal 横比绝对值。"
        return {
            "key": key,
            "label": f"{base_label} (@{step} formal)",
            "shortLabel": f"{short}@{step}",
            "color": color,
            "step": step,
            "visionPct": vision,
            "config": "formal",
            "configNote": note,
            "geo3k": geo,
            "text": text["scores"],
            "sources": {
                "geo3k": geo.get("source"),
                **text.get("sources", {}),
                **{f"geo3k@{s}": g.get("source") for s, g in formals},
            },
            **extra,
        }

    if lights:
        step, geo = lights[-1]
        scores, sources = load_m1_text_light(step)
        if all(v is None for v in scores.values()):
            scores, sources = load_m1_text_light(70)
        steps_str = "/".join(str(s) for s, _ in lights)
        return {
            "key": key,
            "label": f"{base_label} (@{step} light)",
            "shortLabel": f"{short}@{step} light",
            "color": color,
            "step": step,
            "visionPct": vision,
            "config": "light",
            "configNote": (
                f"轻量探查（Geo3K n=1 max_tokens=512）。已有 light Geo3K step：{steps_str}。"
                "与 M0 正式结果不可直接比绝对值。"
            ),
            "geo3k": geo,
            "text": scores,
            "sources": {"geo3k": geo.get("source"), **sources, **{f"geo3k@{s}": g.get("source") for s, g in lights}},
            **extra,
        }

    return {
        "key": key,
        "label": base_label,
        "shortLabel": short,
        "color": color,
        "step": None,
        "visionPct": vision,
        "config": None,
        "configNote": "尚无 checkpoint / 离线评测",
        "geo3k": None,
        "text": {"mmlu": None, "aime24": None, "aime25": None, "math500": None},
        "sources": {},
        **extra,
    }


def build_payload() -> dict[str, Any]:
    m0_geo = load_geo3k("m0_e1_grpo_2b_step150.jsonl.summary.json")
    m1_lights = discover_m1_light_geo()
    m1_geo_quick = load_geo3k("m1_geo3k100_2b_step70_quick.jsonl.summary.json")
    m1_formals = discover_formal_geo("m1_geo3k100_2b")
    m2_formals = discover_formal_geo("m2_mix50_2b")
    m3_formals = discover_formal_geo("m3_mix20_2b")

    m0_text = load_text(
        "m0_e1_grpo_2b",
        {"mmlu": "mmlu", "aime24": "aime24", "aime25": "aime25", "math500": "math_500"},
    )
    if m0_text["scores"].get("mmlu") is None:
        alt = load_text("m0_e1_grpo_2b", {"mmlu": "mmlu_temp"})
        m0_text["scores"]["mmlu"] = alt["scores"].get("mmlu")
        if alt["sources"].get("mmlu"):
            m0_text["sources"]["mmlu"] = alt["sources"]["mmlu"]

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
        build_mm_group("m1", formals=m1_formals, lights=m1_lights, extra={"geo3kQuick": m1_geo_quick}),
        build_mm_group("m2", formals=m2_formals),
        build_mm_group("m3", formals=m3_formals),
    ]

    full: dict[str, dict[str, Any]] = {}
    for g in groups:
        series = empty_series()
        short = {"m0": "M0", "m1": "M1", "m2": "M2", "m3": "M3"}[g["key"]]
        full[g["key"]] = {
            "label": g["label"],
            "shortLabel": short,
            "color": g["color"],
            "config": "formal" if g["key"] == "m0" or g.get("config") == "formal" else g.get("config"),
            **series,
        }

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
    for key, formals in (("m1", m1_formals), ("m2", m2_formals), ("m3", m3_formals)):
        exp = FORMAL_EXPS[key][0]
        for step, geo in formals:
            text = load_formal_text(exp, step)
            put_at(
                full[key],
                step,
                {
                    "geo3kAcc": geo.get("sampleAccuracy"),
                    "geo3kPass": geo.get("passAtN"),
                    "math500": text["scores"].get("math500"),
                    "mmlu": text["scores"].get("mmlu"),
                    "aime24": text["scores"].get("aime24"),
                    "aime25": text["scores"].get("aime25"),
                },
            )

    summary_steps = [50, 100, 150]
    summary: dict[str, dict[str, list[float | None]]] = {}
    for key, series in full.items():
        summary[key] = {
            metric: [series[metric][FULL_STEPS.index(s)] if s in FULL_STEPS else None for s in summary_steps]
            for metric in ("geo3kAcc", "math500", "mmlu", "aime25")
        }

    formal_bits = []
    for key, formals in (("M1", m1_formals), ("M2", m2_formals), ("M3", m3_formals)):
        if formals:
            formal_bits.append(f"{key} formal @{'/'.join(str(s) for s, _ in formals)}")
    light_steps = "/".join(str(s) for s, _ in m1_lights) if m1_lights else "none"
    note = (
        "M0 为正式基线。"
        + (" " + "；".join(formal_bits) + "。" if formal_bits else "")
        + f" M1 light Geo3K steps：{light_steps}（n=1 / 512，不与 formal 横比）。"
        " 全 step 曲线只画 formal（10–150 /10）；缺测为 null。"
        " 文本 evalscope 未出报告的 step 仅有 Geo3K。"
    )

    return {
        "generatedAt": date.today().isoformat(),
        "generatedBy": "scripts/analysis/gen_mm_eval_dashboard_data.py",
        "note": note,
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
