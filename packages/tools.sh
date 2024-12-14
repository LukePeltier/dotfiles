#!/usr/bin/env bash

sudo apt-get install bat

cargo install eza fd-find ripgrep git-delta

git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf
~/.fzf/install

curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh

go install github.com/jesseduffield/lazygit@latest

sudo apt-get install python3-dev python3-pip python3-setuptools
pip3 install thefuck --user

env CGO_ENABLED=0 go install -ldflags="-s -w" github.com/gokcehan/lf@latest
asdf reshim golang

npm install -g tldr
