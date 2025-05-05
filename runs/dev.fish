#!/usr/bin/env fish

paru -S --noconfirm --needed unzip curl git base-devel stow go
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
paru -S --no-confirm zig-bin
curl -LsSf https://astral.sh/uv/install.sh | sh

sudo paru -S --noconfirm bat eza fd ripgrep git-delta tlrc 

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
set go_version $(mise exec go -- go version)
echo "Successfully installed Go: $go_version"

go install github.com/jesseduffield/lazygit@latest
go install github.com/jesseduffield/lazydocker@latest
go install github.com/rs/curlie@latest
