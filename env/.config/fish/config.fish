if status is-interactive

  fish_add_path "$HOME/.local/bin"
  fish_add_path "$HOME/bin"
  fish_add_path "/opt/homebrew/opt/curl/bin"

  ssh-add > /dev/null 2>/dev/null
  set -gx EDITOR nvim
  oh-my-posh init fish --config "https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/refs/heads/main/themes/spaceship.omp.json" | source
end

