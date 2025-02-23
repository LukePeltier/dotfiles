if status is-interactive
  # Commands to run in interactive sessions can go here
  # atuin init fish --disable-up-arrow | source


  zoxide init fish --cmd cd | source
  bind \cf 'zellij-sessionizer'

  set -gx BAT_THEME kanagawa
  set -gx MANPAGER "sh -c 'col -bx | batcat -l man -p'"
  set -gx MANROFFOPT -c
  # BEGIN opam configuration
  test -r "$HOME/.opam/opam-init/init.fish" && source "$HOME/.opam/opam-init/init.fish" > /dev/null 2> /dev/null; or true
  # END opam configuration

  test -r "$HOME/.asdf/asdf.fish" && source "$HOME/.asdf/asdf.fish" > /dev/null 2> /dev/null; or true
  test -r "$HOME/.asdf/plugins/golang/set-env.fish" && source "$HOME/.asdf/plugins/golang/set-env.fish"  > /dev/null 2> /dev/null; or true

  set -gx ZVM_INSTALL "$HOME/.zvm/self"
  fish_add_path "$HOME/.zvm/bin"
  fish_add_path "$ZVM_INSTALL"
end




