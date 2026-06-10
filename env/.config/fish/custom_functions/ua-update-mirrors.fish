function ua-update-mirrors
    export TMPFILE_CHAOTIC="$(mktemp)"
    and sudo true
    and rate-mirrors --save=$TMPFILE_CHAOTIC chaotic-aur
    and sudo mv /etc/pacman.d/chaotic-mirrorlist /etc/pacman.d/chaotic-mirrorlist-backup
    and sudo mv $TMPFILE_CHAOTIC /etc/pacman.d/chaotic-mirrorlist
    and sudo chmod 644 /etc/pacman.d/chaotic-mirrorlist
    and sudo cachyos-rate-mirrors
end
