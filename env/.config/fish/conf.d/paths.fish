test -d "$HOME/.local/bin"; and fish_add_path -m "$HOME/.local/bin"
test -d "$HOME/bin"; and fish_add_path "$HOME/bin"
test -d "$HOME/.opencode/bin"; and fish_add_path --append "$HOME/.opencode/bin"
test -d "$HOME/.pi/agent/bin"; and fish_add_path "$HOME/.pi/agent/bin"
