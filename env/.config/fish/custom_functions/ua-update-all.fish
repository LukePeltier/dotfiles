function ua-update-all
    export TMPFILE_ARCH="$(mktemp)"
    and export TMPFILE_CHAOTIC="$(mktemp)"
    and sudo true
    and rate-mirrors --save=$TMPFILE_ARCH arch --max-delay=21600
    and rate-mirrors --save=$TMPFILE_CHAOTIC chaotic-aur
    and sudo mv /etc/pacman.d/mirrorlist /etc/pacman.d/mirrorlist-backup
    and sudo mv $TMPFILE_ARCH /etc/pacman.d/mirrorlist
    and sudo mv /etc/pacman.d/chaotic-mirrorlist /etc/pacman.d/chaotic-mirrorlist-backup
    and sudo mv $TMPFILE_CHAOTIC /etc/pacman.d/chaotic-mirrorlist
    and sudo chmod 644 /etc/pacman.d/mirrorlist /etc/pacman.d/chaotic-mirrorlist
    and ua-drop-caches
    and paru
end
