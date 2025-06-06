#!/usr/bin/env bash

cat << EOF
██╗     ██╗   ██╗██╗  ██╗███████╗    ██████╗  ██████╗ ████████╗███████╗██╗██╗     ███████╗███████╗
██║     ██║   ██║██║ ██╔╝██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝██╔════╝██║██║     ██╔════╝██╔════╝
██║     ██║   ██║█████╔╝ █████╗      ██║  ██║██║   ██║   ██║   █████╗  ██║██║     █████╗  ███████╗
██║     ██║   ██║██╔═██╗ ██╔══╝      ██║  ██║██║   ██║   ██║   ██╔══╝  ██║██║     ██╔══╝  ╚════██║
███████╗╚██████╔╝██║  ██╗███████╗    ██████╔╝╚██████╔╝   ██║   ██║     ██║███████╗███████╗███████║
╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝    ╚═════╝  ╚═════╝    ╚═╝   ╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝
EOF

dry_run="0"

if [ -z "$XDG_CONFIG_HOME" ]; then
   echo "no xdg config hom"
   echo "using ~/.config"
   XDG_CONFIG_HOME=$HOME/.config
fi

if [[ $1 == "--dry" ]]; then
   dry_run="1"
fi

log() {
   if [[ $dry_run == "1" ]]; then
      echo "[DRY_RUN]: $1"
   else
      echo "$1"
   fi
}

setup_tmux() {
   if [ ! -d ~/.config/tmux/plugins/tpm ]; then
      mkdir -p ~/.config/tmux/plugins
      git clone https://github.com/tmux-plugins/tpm ~/.config/tmux/plugins/tpm
   fi
}

if [[ "${dry_run}" == "1" ]]; then
   log "DRY RUN stow:"
   log "$(stow -nv env)"
else
   log "Stowing..."
   stow env
   ln -sf ~/dotfiles/tmux-sessionizer/tmux-sessionizer ~/.local/bin/tmux-sessionizer
fi

log "Done"
