#!/usr/bin/env bash

sudo -v

# Keep-alive: update existing `sudo` time stamp until the script has finished
while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &

brew update
brew upgrade

brew install stow
brew install neovim
brew install zoxide
brew install git
brew install fzf
brew install bat
brew install ripgrep
brew install fd
brew install eza
brew install starship
brew install zsh

brew cleanup
