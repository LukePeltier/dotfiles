#!/usr/bin/env bash
set -euo pipefail

command -v paru &>/dev/null || { echo "paru required"; exit 1; }

# Clean up legacy manual fzf install
rm -rf ~/.fzf

paru -S --noconfirm --needed \
  unzip curl git base-devel stow \
  fish \
  tmux zellij \
  bat eza fd ripgrep git-delta tealdeer \
  fzf zoxide \
  lazygit lazydocker curlie \
  yazi \
  bob \
  atuin \
  sesh \
  zig
