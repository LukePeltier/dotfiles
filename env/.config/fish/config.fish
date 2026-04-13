set -p fish_function_path $__fish_config_dir/custom_functions

if status is-interactive

    # Only run on TTY1
    if test (tty) = /dev/tty1
        if command -v uwsm >/dev/null
            if uwsm check may-start
                exec uwsm start hyprland.desktop
            end
        end
    end
  fish_add_path "/opt/homebrew/opt/curl/bin"
  fish_add_path "$HOME/bin"

  ssh-add > /dev/null 2>/dev/null
  set -gx EDITOR nvim
  set -gx MANPAGER "nvim -c 'Man!' -"
  starship init fish | source
  if test -r "$HOME/.atuin/bin/env.fish"
    atuin init fish | source
  end

  fastfetch
end

fish_add_path --append /home/luke/.spicetify

# opencode
fish_add_path --append /home/luke/.opencode/bin

fish_add_path -m "$HOME/.local/bin"
