#!/usr/bin/env bash
set -euo pipefail

command -v brew &>/dev/null || {
  echo "Homebrew required — install from https://brew.sh"
  exit 1
}

# Clean up legacy manual fzf install
rm -rf ~/.fzf

brew install \
  curl git stow \
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
