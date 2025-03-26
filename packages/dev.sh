#!/usr/bin/env bash

sudo apt-get install unzip curl git python3.12-venv build-essential stow

git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.14.1

sudo apt install dirmngr gpg curl gawk coreutils

asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git

asdf install nodejs latest

asdf plugin add golang https://github.com/asdf-community/asdf-golang.git

asdf install golang latest

npm install -g pnpm

curl -fsSL https://bun.sh/install | bash

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

curl -LsSf https://astral.sh/uv/install.sh | sh

sudo snap install zig --classic --beta

asdf reshim golang
asdf reshim nodejs
