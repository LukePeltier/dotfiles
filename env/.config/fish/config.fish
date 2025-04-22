if status is-interactive

  fish_add_path "$HOME/.local/bin"
  fish_add_path "$HOME/bin"
  fish_add_path "/opt/homebrew/opt/curl/bin"

  ssh-add > /dev/null 2>/dev/null
  set -gx EDITOR nvim
  starship init fish | source
end

