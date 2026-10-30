#!/usr/bin/env python3
"""Build core.js from the readable core.json game data."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "core.json"
OUTPUT_PATH = ROOT / "core.js"

# The game data is a JSON string consumed by the bundled Dendry engine. The
# engine bundle follows this assignment in core.js and is retained verbatim.
existing = OUTPUT_PATH.read_text(encoding="utf-8")
assignment_end = existing.index(" };\n;0,function") + len(" };")
suffix = existing[assignment_end:]
game = json.loads(DATA_PATH.read_text(encoding="utf-8"))
compiled = json.dumps(game, ensure_ascii=False, separators=(",", ":"))
OUTPUT_PATH.write_text(
    "window.game = { compiled: " + json.dumps(compiled, ensure_ascii=False) + " };" + suffix,
    encoding="utf-8",
)
