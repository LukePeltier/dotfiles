#!/usr/bin/env bash

sudo sh -c "echo $(which zsh) >> /etc/shells"

sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
