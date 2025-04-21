
if test "$HOME/.atuin"
  source "$HOME/.atuin/bin/env.fish"

  set -gx ATUIN_NOBIND "true"
  atuin init fish | source

  bind \ct _atuin_search
end
