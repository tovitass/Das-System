#!/usr/bin/env python3
"""Rebuild core.js whenever core.json changes."""
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "core.json"
BUILD_SCRIPT = ROOT / "build_core.py"


def build():
    result = subprocess.run([sys.executable, str(BUILD_SCRIPT)], cwd=ROOT)
    if result.returncode:
        print("core.js rebuild failed; fix core.json to retry.", flush=True)
        return False
    print("Rebuilt core.js from core.json.", flush=True)
    return True


def main():
    last_modified = None
    print("Watching core.json for changes...", flush=True)
    while True:
        try:
            modified = DATA_PATH.stat().st_mtime_ns
            if last_modified is None or modified != last_modified:
                # Let the editor finish writing the file before parsing it.
                time.sleep(0.4)
                modified = DATA_PATH.stat().st_mtime_ns
                build()
                last_modified = modified
            time.sleep(0.5)
        except FileNotFoundError:
            print("core.json is temporarily unavailable; waiting...", flush=True)
            time.sleep(0.5)
        except KeyboardInterrupt:
            print("Stopped watching core.json.", flush=True)
            return


if __name__ == "__main__":
    main()
