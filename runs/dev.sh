#!/usr/bin/env bash

sudo apt-get install unzip curl git build-essential stow
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sudo snap install zig --classic --beta
curl -LsSf https://astral.sh/uv/install.sh | sh

sudo apt-get install bat

cargo install eza fd-find ripgrep git-delta tlrc sleek

git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf
~/.fzf/install --all

curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh

curl https://mise.run | sh

# Install the latest stable version of Go
echo "Installing latest stable version of Go..."
mise install go@latest

# Set the installed version as the default
echo "Setting latest Go version as default..."
mise use -g go@latest

# Verify the installation
go_version=$(mise exec go -- go version)
echo "Successfully installed Go: $go_version"

go install github.com/jesseduffield/lazygit@latest
