"""Keep Kaggle's injected Python startup paths out of the service environment."""
from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys


def clean_env(source: dict[str, str] | None = None) -> dict[str, str]:
    env = dict(os.environ if source is None else source)
    for name in ("PYTHONPATH", "PYTHONHOME", "PYTHONSTARTUP", "PYTHONUSERBASE"):
        env.pop(name, None)
    env["PYTHONNOUSERSITE"] = "1"
    return env


def prepare_runtime(environment: Path) -> Path:
    """Create or repair a venv, including one left behind by an interrupted setup."""
    env = clean_env()
    executable = environment / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    if not executable.exists():
        subprocess.run([sys.executable, "-I", "-m", "venv", "--without-pip", str(environment)],
                       env=env, check=True)
    probe = subprocess.run([str(executable), "-I", "-m", "pip", "--version"],
                           env=env, capture_output=True, text=True)
    if probe.returncode:
        bootstrap = subprocess.run([str(executable), "-I", "-m", "ensurepip", "--upgrade"],
                                   env=env, capture_output=True, text=True)
        if bootstrap.returncode:
            # The notebook interpreter's pip can manage a target interpreter without pip.
            subprocess.run([sys.executable, "-I", "-m", "pip", "--python", str(executable),
                            "install", "--upgrade", "pip"], env=env, check=True)
    subprocess.run([str(executable), "-I", "-m", "pip", "install", "--upgrade", "pip", "wrapt"],
                   env=env, check=True)
    return executable
