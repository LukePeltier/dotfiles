#    ___           __
#   / _ \___  ____/ /__
#  / // / _ \/ __/  '_/
# /____/\___/\__/_/\_\
#


config="$HOME/.config/gtk-3.0/settings.ini"
killall nwg-dock-hyprland
sleep 0.5
prefer_dark_theme="$(grep 'gtk-application-prefer-dark-theme' "$config" | sed 's/.*\s*=\s*//')"
style="style-dark.css"
nwg-dock-hyprland -i 32 -w 5 -mb 10 -ml 10 -mr 10 -x -s $style -c  "rofi -show drun"
