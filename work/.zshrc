export XDG_CONFIG_HOME="$HOME/.config"
export EDITOR='nvim'
export CC=gcc
export CXX=g++

export PATH=$PATH:$HOME/.local/bin
export PATH="$PATH:$HOME/neovim/bin"
export PATH="$PATH:/usr/games"
export PATH="$PATH:/usr/lib/llvm-18/bin"


# Node Config
export BUN_INSTALL="$HOME/.bun"
export PATH="$PATH:$BUN_INSTALL/bin"
[[ -s "$HOME/.bun/_bun" ]] && source "$HOME/.bun/_bun"
[[ -s "$HOME/.deno" ]] && export PATH="$PATH:$HOME/.deno/bin"
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# Rust
. "$HOME/.cargo/env"

# CLI configs
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

# WSL workaround
# if grep -q "microsoft" /proc/version &>/dev/null; then
#     # Requires: https://sourceforge.net/projects/vcxsrv/ (or alternative)
#     export DISPLAY="$(/sbin/ip route | awk '/default/ { print $3 }'):0"
# fi


# fish
if [[ $(ps --no-header --pid=$PPID --format=comm) != "fish" && -z ${BASH_EXECUTION_STRING} && ${SHLVL} == 1 ]]
then
    if [[ -o login ]]; then
        LOGIN_OPTION='--login'
    else
        LOGIN_OPTION=''
    fi
    exec fish $LOGIN_OPTION
fi

