#!/usr/bin/env fish

command -v mise &>/dev/null; or begin; echo "mise required (run mise.sh first)"; exit 1; end

mise install go@latest
mise use -g go@latest

echo "Go: $(mise exec go -- go version)"
