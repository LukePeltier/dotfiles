#!/usr/bin/env bash

brew install fish


curl -sL https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source && fisher install jorgebucaran/fisher


sudo bash -c 'echo $(which fish) >> /etc/shells'
chsh -s $(which fish)
