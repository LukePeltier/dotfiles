#!/usr/bin/env bash

#!/usr/bin/env bash
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


if [[ $dry_run == "0" ]]; then
   stow env
else
   log "$(stow -nv env)"
fi
