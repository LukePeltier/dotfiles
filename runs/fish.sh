#!/usr/bin/env bash

paru -S --noconfirm --needed fish
chsh -s $(which fish)

fish -c "curl -sL https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source && fisher install jorgebucaran/fisher"

