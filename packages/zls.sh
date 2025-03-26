#!/usr/bin/env bash

git clone https://github.com/zigtools/zls $HOME/personal/zls
cd $HOME/personal/zls
git checkout 30b0da0
zig build -Doptimize=ReleaseSafe


