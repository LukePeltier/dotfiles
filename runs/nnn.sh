#!/usr/bin/env bash

git clone git@github.com:jarun/nnn.git $HOME/ThirdParty/nnn

sudo apt-get install pkg-config libncursesw5-dev libreadline-dev

git -C $HOME/ThirdParty/nnn fetch --all

git -C $HOME/ThirdParty/nnn checkout v5.1

pushd $HOME/ThirdParty/nnn

sudo make O_NERD=1 strip install
