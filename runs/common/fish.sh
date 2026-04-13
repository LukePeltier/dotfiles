#!/usr/bin/env bash
set -euo pipefail

command -v fish &>/dev/null || { echo "fish required (install via packages)"; exit 1; }

fish_path="$(which fish)"

if [ "$SHELL" != "$fish_path" ]; then
  echo "Changing default shell to fish..."
  if ! grep -q "$fish_path" /etc/shells; then
    echo "$fish_path" | sudo tee -a /etc/shells
  fi
  chsh -s "$fish_path"
fi

echo "Bootstrapping fisher and installing plugins..."
fish -c 'curl -sL https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source && fisher install jorgebucaran/fisher && fisher update'
