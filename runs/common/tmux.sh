#!/usr/bin/env bash
set -euo pipefail

command -v tmux &>/dev/null || { echo "tmux required (install via packages)"; exit 1; }

tpm_dir="$HOME/.config/tmux/plugins/tpm"

if [ -d "$tpm_dir" ]; then
  echo "TPM already installed"
  exit 0
fi

mkdir -p "$(dirname "$tpm_dir")"
git clone https://github.com/tmux-plugins/tpm "$tpm_dir"
