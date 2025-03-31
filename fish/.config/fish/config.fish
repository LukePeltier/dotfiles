test -r "/opt/homebrew/bin/brew" && eval "$(/opt/homebrew/bin/brew shellenv)"

if status is-interactive

  fish_add_path "$HOME/.local/bin"
  fish_add_path "$HOME/bin"
  fish_add_path "/opt/homebrew/opt/curl/bin"

  # Commands to run in interactive sessions can go here
  # atuin init fish --disable-up-arrow | source


  zoxide init fish --cmd cd | source
  set -gx BAT_THEME kanagawa
  set -gx MANPAGER "sh -c 'col -bx | batcat -l man -p'"
  set -gx MANROFFOPT -c

  ssh-add > /dev/null 2>/dev/null

end

