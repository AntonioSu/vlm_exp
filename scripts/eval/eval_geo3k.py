#!/usr/bin/env python3
"""Offline Geo3K evaluation for a merged Qwen3.5 vision checkpoint.

The prompt/image preprocessing and answer grading intentionally match the
training path: Qwen's processor builds multimodal prompt token IDs and
``reward_mm_mixed._score_geo3k`` supplies the official Geo3K grader.

Results are appended one dataset row at a time, so an interrupted evaluation
can be resumed safely with the same output path and configuration.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import io
import json
import os
from pathlib import Path
from typing import Any

# The image processor imports torch/torchvision before vLLM starts its engine.
# vLLM's default ``fork`` worker cannot safely inherit that CUDA state.
os.environ.setdefault("VLLM_WORKER_MULTIPROC_METHOD", "spawn")
# This machine uses CUDA 13 userspace on a CUDA 12.4 kernel driver. Match the
# training environment's forward-compatibility library for spawned workers.
_ROOT = Path(__file__).resolve().parents[3]
_SCRIPTS_TRAIN = Path(__file__).resolve().parents[1] / "train"
_CUDA_COMPAT = str(_ROOT / "cuda_compat" / "cuda-13.0" / "compat")
if Path(_CUDA_COMPAT).is_dir():
    _ld_paths = os.environ.get("LD_LIBRARY_PATH", "").split(":")
    if _CUDA_COMPAT not in _ld_paths:
        os.environ["LD_LIBRARY_PATH"] = ":".join([_CUDA_COMPAT, *_ld_paths]).rstrip(":")

import sys

sys.path.insert(0, str(_SCRIPTS_TRAIN))

import pandas as pd
from PIL import Image
from transformers import AutoProcessor
from vllm import LLM, SamplingParams

from reward_mm_mixed import _score_geo3k


DEFAULT_DATA = _ROOT / "vlm_exp" / "parquet" / "mm" / "geo3k_raw" / "test.parquet"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, help="Merged Hugging Face checkpoint directory")
    parser.add_argument("--output", required=True, type=Path, help="Per-question JSONL output")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--max-tokens", type=int, default=16384)
    parser.add_argument("--temperature", type=float, default=0.6)
    parser.add_argument("--top-p", type=float, default=0.95)
    parser.add_argument("--n", type=int, default=8, help="Samples per question")
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument("--tensor-parallel-size", type=int, default=1)
    parser.add_argument("--gpu-memory-utilization", type=float, default=0.8)
    parser.add_argument("--max-model-len", type=int, default=17408)
    parser.add_argument("--limit", type=int, default=None, help="Debug-only row limit")
    parser.add_argument("--enforce-eager", action="store_true")
    args = parser.parse_args()
    if args.n < 1 or args.batch_size < 1:
        parser.error("--n and --batch-size must be positive")
    if args.temperature == 0 and args.n != 1:
        parser.error("deterministic temperature=0 evaluation requires --n 1")
    return args


def image_from_record(record: Any) -> Image.Image:
    if isinstance(record, Image.Image):
        return record.convert("RGB")
    if not isinstance(record, dict):
        raise TypeError(f"unsupported image record type: {type(record)!r}")
    if record.get("bytes") is not None:
        return Image.open(io.BytesIO(record["bytes"])).convert("RGB")
    path = record.get("path") or record.get("image")
    if path:
        return Image.open(path).convert("RGB")
    raise ValueError("image record contains neither bytes nor a path")


def build_request(processor: Any, row: pd.Series) -> tuple[dict[str, Any], str]:
    messages = copy.deepcopy(list(row["prompt"]))
    images = [image_from_record(item) for item in list(row["images"])]
    image_offset = 0
    for message in messages:
        content = message["content"]
        if not isinstance(content, str):
            continue
        parts: list[dict[str, Any]] = []
        segments = content.split("<image>")
        for index, segment in enumerate(segments):
            if index:
                if image_offset >= len(images):
                    raise ValueError("prompt contains more <image> placeholders than images")
                parts.append({"type": "image", "image": images[image_offset]})
                image_offset += 1
            if segment:
                parts.append({"type": "text", "text": segment})
        message["content"] = parts
    if image_offset != len(images):
        raise ValueError(f"used {image_offset} images but row contains {len(images)}")

    raw_prompt = processor.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=False,
        enable_thinking=False,
    )
    model_inputs = processor(
        text=[raw_prompt],
        images=images,
        add_special_tokens=False,
        return_tensors="pt",
    )
    prompt_token_ids = model_inputs["input_ids"][0].tolist()
    return {
        "prompt_token_ids": prompt_token_ids,
        "multi_modal_data": {"image": images},
    }, raw_prompt


def config_dict(args: argparse.Namespace) -> dict[str, Any]:
    return {
        "model": str(Path(args.model).resolve()),
        "data": str(args.data.resolve()),
        "max_tokens": args.max_tokens,
        "temperature": args.temperature,
        "top_p": args.top_p,
        "n": args.n,
        "seed": args.seed,
        "limit": args.limit,
    }


def config_id(config: dict[str, Any]) -> str:
    payload = json.dumps(config, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()[:16]


def load_completed(path: Path, expected_config_id: str) -> dict[int, dict[str, Any]]:
    completed: dict[int, dict[str, Any]] = {}
    if not path.exists():
        return completed
    with path.open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            record = json.loads(line)
            if record.get("config_id") != expected_config_id:
                raise RuntimeError(
                    f"{path}:{line_number} was produced with a different evaluation configuration; "
                    "choose another --output path"
                )
            completed[int(record["dataset_index"])] = record
    return completed


def summarize(records: list[dict[str, Any]], n: int) -> dict[str, Any]:
    questions = len(records)
    correct_samples = sum(sum(bool(x) for x in row["correct"]) for row in records)
    sample_count = sum(len(row["correct"]) for row in records)
    pass_count = sum(any(row["correct"]) for row in records)
    return {
        "questions": questions,
        "samples": sample_count,
        "n": n,
        "sample_accuracy": correct_samples / sample_count if sample_count else 0.0,
        "pass_at_n": pass_count / questions if questions else 0.0,
    }


def main() -> None:
    args = parse_args()
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

    frame = pd.read_parquet(args.data)
    if args.limit is not None:
        frame = frame.iloc[: args.limit]
    config = config_dict(args)
    run_id = config_id(config)
    completed = load_completed(args.output, run_id)
    pending = [index for index in range(len(frame)) if index not in completed]

    print(json.dumps({"config_id": run_id, **config}, ensure_ascii=False, indent=2))
    print(f"Geo3K rows: {len(frame)} | completed: {len(completed)} | pending: {len(pending)}")
    if pending:
        processor = AutoProcessor.from_pretrained(args.model, trust_remote_code=True)
        llm = LLM(
            model=args.model,
            tensor_parallel_size=args.tensor_parallel_size,
            gpu_memory_utilization=args.gpu_memory_utilization,
            max_model_len=args.max_model_len,
            enforce_eager=args.enforce_eager,
            trust_remote_code=True,
            limit_mm_per_prompt={"image": 1},
        )
        sampling = SamplingParams(
            n=args.n,
            temperature=args.temperature,
            top_p=args.top_p,
            max_tokens=args.max_tokens,
            seed=args.seed,
        )
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("a", encoding="utf-8", buffering=1) as handle:
            for start in range(0, len(pending), args.batch_size):
                indices = pending[start : start + args.batch_size]
                requests = []
                prompts = []
                for index in indices:
                    request, prompt = build_request(processor, frame.iloc[index])
                    requests.append(request)
                    prompts.append(prompt)
                outputs = llm.generate(requests, sampling, use_tqdm=True)
                for index, prompt, output in zip(indices, prompts, outputs, strict=True):
                    row = frame.iloc[index]
                    ground_truth = str(row["reward_model"]["ground_truth"])
                    responses = [candidate.text for candidate in output.outputs]
                    scores = [_score_geo3k(text, ground_truth) for text in responses]
                    record = {
                        "config_id": run_id,
                        "dataset_index": index,
                        "source_index": row["extra_info"].get("index"),
                        "ground_truth": ground_truth,
                        "prompt": prompt,
                        "responses": responses,
                        "scores": [score["score"] for score in scores],
                        "correct": [bool(score["acc"]) for score in scores],
                        "predictions": [score["pred"] for score in scores],
                    }
                    handle.write(json.dumps(record, ensure_ascii=False) + "\n")
                    completed[index] = record
                summary = summarize([completed[i] for i in sorted(completed)], args.n)
                print(json.dumps(summary, ensure_ascii=False))

    records = [completed[index] for index in range(len(frame))]
    summary = {"config_id": run_id, "config": config, **summarize(records, args.n)}
    summary_path = args.output.with_suffix(args.output.suffix + ".summary.json")
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output} and {summary_path}")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
