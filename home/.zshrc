export XDG_CONFIG_HOME="$HOME/.config"
export EDITOR='nvim'

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


# Rust
 . "$HOME/.cargo/env"

# CLI configs
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

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

# bun completions
[ -s "/home/lukep/.bun/_bun" ] && source "/home/lukep/.bun/_bun"

# pnpm
export PNPM_HOME="/home/lukep/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end
