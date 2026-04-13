if command -v atuin &>/dev/null
    set -gx ATUIN_NOBIND true
    atuin init fish | source
    bind ctrl-up _atuin_search
    bind -M insert ctrl-up _atuin_search
end
