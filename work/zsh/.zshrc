export XDG_CONFIG_HOME="$HOME/.config"
export EDITOR='nvim'
export CC=gcc
export CXX=g++

export PATH=$PATH:$HOME/.local/bin
export PATH="$PATH:$HOME/neovim/bin"
export PATH="$PATH:/usr/games"
export PATH="$PATH:/usr/lib/llvm-18/bin"

# Go Config
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
[[ -s "$HOME/.gvm/scripts/gvm" ]] && source "$HOME/.gvm/scripts/gvm"

# Java Config
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$PATH:$JAVA_HOME/bin"
export PATH="$PATH:/opt/apache-maven-3.9.6/bin"

# Node Config
export BUN_INSTALL="$HOME/.bun"
export PATH="$PATH:$BUN_INSTALL/bin"
[[ -s "$HOME/.bun/_bun" ]] && source "$HOME/.bun/_bun"
[[ -s "$HOME/.deno" ]] && export PATH="$PATH:$HOME/.deno/bin"
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# Volta
export VOLTA_HOME="$HOME/.volta"

[[ -s "$VOLTA_HOME" ]] && export PATH="$PATH:$VOLTA_HOME/bin"

# Rust
. "$HOME/.cargo/env"

# Nix
source $HOME/.nix-profile/etc/profile.d/hm-session-vars.sh

# CLI configs
export ZOXIDE_CMD_OVERRIDE="cd"
export BAT_THEME="kanagawa"
export MANPAGER="sh -c 'col -bx | bat -l man -p'"
export MANROFFOPT="-c"
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

bindkey -s ^f "zellij-sessionizer\n"

# WSL workaround
if grep -q "microsoft" /proc/version &>/dev/null; then
    # Requires: https://sourceforge.net/projects/vcxsrv/ (or alternative)
    export DISPLAY="$(/sbin/ip route | awk '/default/ { print $3 }'):0"
fi


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
