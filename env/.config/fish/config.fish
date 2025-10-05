if status is-interactive

  # Only run on TTY1
  if test (tty) = "/dev/tty1"
    if command -v uwsm >/dev/null
      if uwsm check may-start
        exec uwsm start hyprland.desktop
      end
    end
  end

  fish_add_path "$HOME/.local/bin"
  fish_add_path "$HOME/bin"
  fish_add_path "/opt/homebrew/opt/curl/bin"

  ssh-add > /dev/null 2>/dev/null
  set -gx EDITOR nvim
  set -gx MANPAGER "nvim -c 'Man!' -"
  starship init fish | source
end


fish_add_path /home/luke/.spicetify
