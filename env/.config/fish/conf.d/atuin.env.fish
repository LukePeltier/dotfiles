status is-interactive || exit

if test -r "$HOME/.atuin/bin/env.fish"
    source "$HOME/.atuin/bin/env.fish"
    set -gx ATUIN_NOBIND true
    atuin init fish | source
    # Symbolic binding — works under legacy CSI encoding
    bind ctrl-up _atuin_search
    bind -M insert ctrl-up _atuin_search
    bind \cr _atuin_search
    bind -M insert \cr _atuin_search
end
