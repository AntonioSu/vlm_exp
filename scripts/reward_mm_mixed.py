#!/usr/bin/env python3
"""Compatibility shim → train/reward_mm_mixed.py. Prefer the categorized path."""
from __future__ import annotations

import runpy
import sys
from pathlib import Path

_TARGET = Path(__file__).resolve().parent / "train/reward_mm_mixed.py"
sys.argv[0] = str(_TARGET)
runpy.run_path(str(_TARGET), run_name="__main__")
