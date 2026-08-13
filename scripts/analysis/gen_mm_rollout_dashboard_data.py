#!/usr/bin/env python3
"""Generate dashboard JS data from a multimodal rollout summary CSV.

Input is the CSV emitted by ``scripts/analysis/summarize_mm_rollouts.py`` plus its
sidecar ``.summary.json``. The output is a small JavaScript file loaded by the
static dashboard, so the dashboard can keep a git-tracked snapshot while the
raw ``evaluation/`` directory remains ignored.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", required=True, type=Path, help="rollout summary CSV")
    parser.add_argument("--output", required=True, type=Path, help="output dashboard JS")
    parser.add_argument("--var-name", default="MM_M1_ROLLOUT_SUMMARY", help="window variable name")
    parser.add_argument("--source-label", help="source path to show in dashboard captions")
    parser.add_argument("--generated-by", default="scripts/analysis/summarize_mm_rollouts.py")
    return parser.parse_args()


def number(value: str) -> int | float:
    parsed = float(value)
    return int(parsed) if parsed.is_integer() else parsed


def public_source(path_or_label: str) -> str:
    """Strip absolute home/user prefixes from paths shown in dashboard data."""
    if not path_or_label:
        return path_or_label
    text = str(path_or_label)
    if not text.startswith("/"):
        return text
    parts = Path(text).parts
    if "vlm_exp" in parts:
        i = parts.index("vlm_exp")
        return str(Path(*parts[i:]))
    if "logs" in parts:
        i = parts.index("logs")
        return str(Path(*parts[i:]))
    if "evaluation" in parts:
        i = parts.index("evaluation")
        return str(Path(*parts[i:]))
    return Path(text).name


def main() -> None:
    args = parse_args()
    summary_path = args.csv.with_suffix(args.csv.suffix + ".summary.json")
    if not args.csv.exists():
        raise FileNotFoundError(args.csv)
    if not summary_path.exists():
        raise FileNotFoundError(summary_path)

    with args.csv.open(encoding="utf-8", newline="") as handle:
        rows = [
            {
                "step": int(row["step"]),
                "source": row["source"],
                "samples": int(row["samples"]),
                "accuracy": number(row["accuracy"]),
                "meanScore": number(row["mean_score"]),
                "meanOutputChars": number(row["mean_output_chars"]),
            }
            for row in csv.DictReader(handle)
        ]

    sidecar: dict[str, Any] = json.loads(summary_path.read_text(encoding="utf-8"))
    overall_by_source = sidecar.get("overall", {})
    if len(overall_by_source) == 1:
        overall = next(iter(overall_by_source.values()))
    else:
        total_samples = sum(int(item["samples"]) for item in overall_by_source.values())
        overall = {
            "samples": total_samples,
            "accuracy": sum(float(item["accuracy"]) * int(item["samples"]) for item in overall_by_source.values()) / total_samples,
            "mean_score": sum(float(item["mean_score"]) * int(item["samples"]) for item in overall_by_source.values()) / total_samples,
        }

    data = {
        "source": public_source(args.source_label or str(args.csv)),
        "generatedFrom": public_source(sidecar.get("rollout_dir", "")),
        "generatedBy": args.generated_by,
        "note": "Training rollout metrics; not Geo3K test-set evaluation.",
        "overall": {
            "samples": int(overall["samples"]),
            "accuracy": float(overall["accuracy"]),
            "meanScore": float(overall["mean_score"]),
        },
        "rows": rows,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        f"window.{args.var_name} = {json.dumps(data, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
