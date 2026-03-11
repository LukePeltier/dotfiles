if test -r "$HOME/.atuin/bin/env.fish"
    source "$HOME/.atuin/bin/env.fish"
    set -gx ATUIN_NOBIND true
    atuin init fish | source
    bind ctrl-up _atuin_search
    bind -M insert ctrl-up _atuin_search
end
