#!/usr/bin/env bash
set -euo pipefail

if command -v uv &>/dev/null; then
  echo "uv already installed"
  exit 0
fi

curl -LsSf https://astral.sh/uv/install.sh | sh
