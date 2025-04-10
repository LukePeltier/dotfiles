#!/usr/bin/env bash

# neovim btw
if [ ! -d $HOME/neovim ]; then
   git clone https://github.com/neovim/neovim.git $HOME/neovim
fi

sudo apt-get -y install cmake gettext lua5.1 liblua5.1-0-dev

git -C ~/neovim fetch --all
git -C ~/neovim checkout stable

make -C ~/neovim clean
make -C ~/neovim CMAKE_BUILD_TYPE=Release
sudo make -C ~/neovim install
