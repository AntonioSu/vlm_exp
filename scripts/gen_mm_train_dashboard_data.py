#!/usr/bin/env python3
"""Parse multimodal train logs into dashboard/mm/js/data-m1-train.js.

Mirrors polaris parse_4b_logs.py field set (timing / stability / efficiency)
so the MM dashboard can show the same mid-step indices as 4B E1 GRPO.

  python3 scripts/gen_mm_train_dashboard_data.py
"""

from __future__ import annotations

import argparse
import glob
import json
import re
from datetime import date
from pathlib import Path
from typing import Any

VLM_EXP = Path("/data/juicefs-white/5281-gpu-a100/lijunyi/vlm_exp")
DEFAULT_LOG_DIR = VLM_EXP / "logs" / "exp2card_mm" / "m1_geo3k100_2b"
DEFAULT_OUT = VLM_EXP / "dashboard" / "mm" / "js" / "data-m1-train.js"

NUM = r"np\.float64\(([\-\d\.eE]+)\)|np\.int32\(([\-\d\.eE]+)\)|([\-\d\.eE]+)"


def grab(pattern: str, line: str) -> float | None:
    m = re.search(pattern + r":(?:" + NUM + r")", line)
    if not m:
        return None
    for g in m.groups():
        if g is not None:
            return float(g)
    return None


def parse_logs(log_dir: Path) -> dict[str, Any] | None:
    files = sorted(glob.glob(str(log_dir / "train_*.log")))
    steps: dict[int, dict[str, float | None]] = {}
    last_progress = None
    for fp in files:
        with open(fp, "r", errors="ignore") as handle:
            for line in handle:
                pm = re.search(
                    r"Training Progress:\s*\d+%\|[^|]*\|\s*(\d+)/(\d+)\s*\[([^\]<]+)<",
                    line,
                )
                if pm:
                    last_progress = pm
                if "training/global_step:" not in line:
                    continue
                gstep = grab("training/global_step", line)
                if gstep is None:
                    continue
                gstep_i = int(gstep)
                steps[gstep_i] = {
                    "reward_mean": grab(r"critic/rewards/mean", line),
                    "len": grab(r"response_length/mean", line),
                    "entropy": grab(r"actor/entropy", line),
                    "grad_norm": grab(r"actor/grad_norm", line),
                    "loss": grab(r"actor/loss", line),
                    "ppo_kl": grab(r"actor/ppo_kl", line),
                    "kl_loss": grab(r"actor/kl_loss", line),
                    "clip": grab(r"actor/pg_clipfrac", line),
                    "clip_lower": grab(r"actor/pg_clipfrac_lower", line),
                    "trunc": grab(r"response_length/clip_ratio", line),
                    "corr": grab(r"training/rollout_actor_probs_pearson_corr", line),
                    "rollout_kl": grab(r"rollout_corr/kl", line),
                    "mfu": grab(r"perf/mfu/actor", line),
                    "throughput": grab(r"perf/throughput", line),
                    "t_step": grab(r"timing_s/step", line),
                    "t_gen": grab(r"timing_s/gen", line),
                    "t_update_actor": grab(r"timing_s/update_actor", line),
                    "t_ref": grab(r"timing_s/ref", line),
                    "t_old_log_prob": grab(r"timing_s/old_log_prob", line),
                    "t_update_weights": grab(r"timing_s/update_weights", line),
                    "t_adv": grab(r"timing_s/adv", line),
                    "t_reward": grab(r"timing_s/reward", line),
                }

    if not steps:
        return None

    n = max(steps)
    ordered = sorted(steps)

    def series(key: str, scale: float = 1.0, rnd: int = 4) -> list[float | None]:
        out: list[float | None] = []
        for s in range(1, n + 1):
            v = steps.get(s, {}).get(key)
            out.append(round(v * scale, rnd) if v is not None else None)
        return out

    def mean_of(lst: list[float | None], rnd: int = 1) -> float | None:
        vals = [v for v in lst if v is not None]
        return round(sum(vals) / len(vals), rnd) if vals else None

    mfu_raw = series("mfu", 1.0, 6)
    mfu = []
    for v in mfu_raw:
        if v is None:
            mfu.append(None)
        elif v <= 1.0:
            mfu.append(round(v * 100, 2))
        else:
            mfu.append(round(v, 2))

    timing = {
        "step": [round(v, 1) if v is not None else None for v in series("t_step", 1.0, 6)],
        "gen": [round(v, 1) if v is not None else None for v in series("t_gen", 1.0, 6)],
        "update_actor": [round(v, 1) if v is not None else None for v in series("t_update_actor", 1.0, 6)],
        "ref": [round(v, 1) if v is not None else None for v in series("t_ref", 1.0, 6)],
        "old_log_prob": [round(v, 1) if v is not None else None for v in series("t_old_log_prob", 1.0, 6)],
        "update_weights": [round(v, 1) if v is not None else None for v in series("t_update_weights", 1.0, 6)],
        "adv": [round(v, 2) if v is not None else None for v in series("t_adv", 1.0, 6)],
        "reward": [round(v, 2) if v is not None else None for v in series("t_reward", 1.0, 6)],
    }
    timing_mean = {k: mean_of(v, 1) for k, v in timing.items()}
    step_min = [round(v / 60.0, 2) if v is not None else None for v in series("t_step", 1.0, 6)]

    elapsed_h = None
    elapsed_str = None
    progress_done = None
    progress_total = None
    if last_progress:
        done, total, elapsed = last_progress.groups()
        progress_done, progress_total = int(done), int(total)
        parts = [int(x) for x in elapsed.split(":")]
        if len(parts) == 3:
            h, m, s = parts
        elif len(parts) == 2:
            h, m, s = 0, parts[0], parts[1]
        else:
            h, m, s = 0, 0, parts[0]
        elapsed_h = round(h + m / 60 + s / 3600, 2)
        elapsed_str = f"{h}h{m:02d}m"

    cats = [str(s) if (s == 1 or s % 10 == 0) else "" for s in range(1, n + 1)]

    return {
        "generatedAt": date.today().isoformat(),
        "generatedBy": "scripts/gen_mm_train_dashboard_data.py",
        "source": str(log_dir),
        "logFiles": [Path(f).name for f in files],
        "label": "M1 · 100% Geo3K",
        "shortLabel": "M1",
        "color": "#d97706",
        "nSteps": n,
        "coveredSteps": ordered,
        "firstStep": ordered[0],
        "lastStep": ordered[-1],
        "nFiles": len(files),
        "elapsedHours": elapsed_h,
        "elapsedStr": elapsed_str,
        "progressDone": progress_done,
        "progressTotal": progress_total,
        "cats": cats,
        "pass": [
            round((v + 1) / 2 * 100, 1) if v is not None else None
            for v in series("reward_mean", 1.0, 6)
        ],
        "len": [round(v) if v is not None else None for v in series("len", 1.0, 6)],
        "ent": series("entropy", 1.0, 3),
        "grad": series("grad_norm", 1.0, 3),
        "loss": series("loss", 1.0, 5),
        "ppokl": series("ppo_kl", 1e5, 4),
        "klLoss": series("kl_loss", 100.0, 3),
        "clip": series("clip", 100.0, 4),
        "trunc": series("trunc", 100.0, 2),
        "pearsonDev": [
            round((1 - v) * 1e4, 1) if v is not None else None
            for v in series("corr", 1.0, 6)
        ],
        "rolloutKl": series("rollout_kl", 1e4, 2),
        "mfu": mfu,
        "throughput": [round(v) if v is not None else None for v in series("throughput", 1.0, 6)],
        "stepMin": step_min,
        "timing": timing,
        "timingMean": timing_mean,
        "summary": {
            "stepMinMean": mean_of(step_min, 2),
            "mfuMean": mean_of(mfu, 2),
            "throughputMean": mean_of(
                [round(v) if v is not None else None for v in series("throughput", 1.0, 6)],
                0,
            ),
            "gradMean": mean_of(series("grad_norm", 1.0, 3), 3),
            "entLast": next((v for v in reversed(series("entropy", 1.0, 3)) if v is not None), None),
            "truncMean": mean_of(series("trunc", 100.0, 2), 2),
        },
    }


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--log-dir", type=Path, default=DEFAULT_LOG_DIR)
    p.add_argument("--output", type=Path, default=DEFAULT_OUT)
    return p.parse_args()


def main() -> None:
    args = parse_args()
    data = parse_logs(args.log_dir)
    if data is None:
        raise SystemExit(f"No train steps found under {args.log_dir}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(data, ensure_ascii=False, indent=2)
    args.output.write_text(
        "// ---- M1 train-log metrics (timing / stability / efficiency) ----\n"
        f"// Auto-generated {data['generatedAt']} by {data['generatedBy']}\n"
        "// Refresh: python3 scripts/gen_mm_train_dashboard_data.py\n"
        "window.MM_M1_TRAIN = "
        + body
        + ";\n",
        encoding="utf-8",
    )
    s = data["summary"]
    print(
        f"Wrote {args.output} · steps {data['firstStep']}–{data['lastStep']} "
        f"(n={data['nSteps']}) · elapsed={data['elapsedStr']} · "
        f"stepMin≈{s['stepMinMean']} · mfu≈{s['mfuMean']}% · thru≈{s['throughputMean']}"
    )


if __name__ == "__main__":
    main()
