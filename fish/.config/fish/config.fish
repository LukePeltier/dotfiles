if status is-interactive
  # Commands to run in interactive sessions can go here
  # atuin init fish --disable-up-arrow | source
  zoxide init fish --cmd cd | source
  bind \cf 'zellij-sessionizer'

  set -gx BAT_THEME kanagawa
  set -gx MANPAGER "sh -c 'col -bx | bat -l man -p'"
  set -gx MANROFFOPT -c
end


# BEGIN opam configuration
# This is useful if you're using opam as it adds:
#   - the correct directories to the PATH
#   - auto-completion for the opam binary
# This section can be safely removed at any time if needed.
test -r '/home/lpeltier/.opam/opam-init/init.fish' && source '/home/lpeltier/.opam/opam-init/init.fish' > /dev/null 2> /dev/null; or true
# END opam configuration


