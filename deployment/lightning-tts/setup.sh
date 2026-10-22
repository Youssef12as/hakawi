#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"

# Lightning Studios permit one managed conda environment. Use that environment.
python -c "import sys; assert sys.version_info >= (3, 11), 'Use a Studio with Python 3.11 or newer (3.12 recommended)'; print('Using:', sys.executable)"
python -m pip install -r requirements.txt
python -m pip check
python prepare_assets.py
python preflight.py
# This is an environment inventory, not a portable Docker dependency lock.
python -m pip freeze > installed-versions.txt
echo "Setup complete. Start with: python server.py"
