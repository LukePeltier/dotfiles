# pnpm
set -gx PNPM_HOME "$HOME/.local/share/pnpm"
if test -d "$PNPM_HOME/bin"; and not string match -q -- "$PNPM_HOME/bin" $PATH
    set -gx PATH "$PNPM_HOME/bin" $PATH
end
# pnpm end
