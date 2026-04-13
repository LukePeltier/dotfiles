if status is-interactive && command -v starship &>/dev/null
    starship init fish | source
end
