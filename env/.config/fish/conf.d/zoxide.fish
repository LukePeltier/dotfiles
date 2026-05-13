status is-interactive || exit

if command -v zoxide &>/dev/null
    zoxide init fish --cmd cd | source
end
