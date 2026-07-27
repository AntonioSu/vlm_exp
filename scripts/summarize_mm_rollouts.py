#!/usr/bin/env python3
"""Compatibility shim → analysis/summarize_mm_rollouts.py. Prefer the categorized path."""
from __future__ import annotations

import runpy
import sys
from pathlib import Path

_TARGET = Path(__file__).resolve().parent / "analysis/summarize_mm_rollouts.py"
sys.argv[0] = str(_TARGET)
runpy.run_path(str(_TARGET), run_name="__main__")
