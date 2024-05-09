#!/usr/bin/env bash

DEFAULT_DIRECTORIES=("zsh" "tmux" "nvim")

for d in "${DEFAULT_DIRECTORIES[@]}"; do
   ( stow --restow $d )
done
