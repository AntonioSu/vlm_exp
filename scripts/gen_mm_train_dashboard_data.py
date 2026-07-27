#!/usr/bin/env python3
"""Compatibility shim → analysis/gen_mm_train_dashboard_data.py. Prefer the categorized path."""
from __future__ import annotations

import runpy
import sys
from pathlib import Path

_TARGET = Path(__file__).resolve().parent / "analysis/gen_mm_train_dashboard_data.py"
sys.argv[0] = str(_TARGET)
runpy.run_path(str(_TARGET), run_name="__main__")
