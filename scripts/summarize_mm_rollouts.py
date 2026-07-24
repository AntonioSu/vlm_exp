#!/usr/bin/env python3
"""Summarize rollout reward/accuracy curves by modality data source.

M2/M3 dumps contain ``is_geo3k`` from ``reward_mm_mixed.compute_score``.
Historical M1 dumps predate that field but are unambiguous because M1 is
Geo3K-only; pass ``--default-source geo3k`` for those files.
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
from collections import defaultdict
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("rollout_dir", type=Path)
    parser.add_argument("--output", required=True, type=Path, help="CSV output path")
    parser.add_argument("--default-source", choices=("geo3k", "text"))
    return parser.parse_args()


def source_for(record: dict[str, Any], default: str | None) -> str:
    if "is_geo3k" in record:
        value = record["is_geo3k"]
        if isinstance(value, str):
            value = value.lower() in {"1", "true", "yes"}
        return "geo3k" if value else "text"
    if default is None:
        raise ValueError(
            "rollout record has no is_geo3k field; use --default-source only for a single-source experiment"
        )
    return default


def mean(values: list[float]) -> float:
    return statistics.fmean(values) if values else 0.0


def main() -> None:
    args = parse_args()
    paths = sorted(args.rollout_dir.glob("*.jsonl"), key=lambda path: int(path.stem))
    if not paths:
        raise FileNotFoundError(f"no step JSONL files found in {args.rollout_dir}")

    groups: dict[tuple[int, str], list[dict[str, Any]]] = defaultdict(list)
    for path in paths:
        with path.open(encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, 1):
                if not line.strip():
                    continue
                record = json.loads(line)
                try:
                    source = source_for(record, args.default_source)
                except ValueError as exc:
                    raise ValueError(f"{path}:{line_number}: {exc}") from exc
                groups[(int(record.get("step", path.stem)), source)].append(record)

    rows = []
    for (step, source), records in sorted(groups.items()):
        scores = [float(record["score"]) for record in records]
        accuracies = [bool(record.get("acc", score > 0)) for record, score in zip(records, scores, strict=True)]
        output_chars = [len(str(record.get("output", ""))) for record in records]
        rows.append(
            {
                "step": step,
                "source": source,
                "samples": len(records),
                "accuracy": mean([float(value) for value in accuracies]),
                "mean_score": mean(scores),
                "score_std": statistics.pstdev(scores) if len(scores) > 1 else 0.0,
                "mean_output_chars": mean([float(value) for value in output_chars]),
            }
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    summary: dict[str, Any] = {"rollout_dir": str(args.rollout_dir.resolve()), "steps": rows, "overall": {}}
    for source in sorted({row["source"] for row in rows}):
        source_records = [record for (key_step, key_source), values in groups.items() if key_source == source for record in values]
        scores = [float(record["score"]) for record in source_records]
        acc = [bool(record.get("acc", score > 0)) for record, score in zip(source_records, scores, strict=True)]
        summary["overall"][source] = {
            "samples": len(source_records),
            "accuracy": mean([float(value) for value in acc]),
            "mean_score": mean(scores),
        }
    json_path = args.output.with_suffix(args.output.suffix + ".summary.json")
    json_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output} and {json_path}")


if __name__ == "__main__":
    main()
