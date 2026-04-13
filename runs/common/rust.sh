#!/usr/bin/env bash
set -euo pipefail

if command -v rustup &>/dev/null; then
  echo "rustup already installed"
  exit 0
fi

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
