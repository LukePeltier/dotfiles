#!/usr/bin/env bash
set -euo pipefail

command -v bob &>/dev/null || { echo "bob required (install via packages)"; exit 1; }

bob install stable
bob use stable

echo "Neovim: $(bob nvim --version | head -1)"
