#!/usr/bin/env fish
set -e

command -v mise &>/dev/null; or begin; echo "mise required (run mise.sh first)"; exit 1; end

mise install nodejs@latest
mise use -g nodejs@latest

echo "Node: $(mise exec nodejs -- node --version)"
echo "npm:  $(mise exec nodejs -- npm --version)"

npm install -g pnpm
