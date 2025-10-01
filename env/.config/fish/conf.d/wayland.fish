# Set the cursor size for xcursor
set -gx XCURSOR_SIZE 24
set -gx HYPRCURSOR_SIZE 24

# XDG Desktop Portal
set -gx XDG_SESSION_TYPE wayland
set -gx XDG_MENU_PREFIX arch-

set -gx QT_QPA_PLATFORM wayland
set -gx SDL_VIDEODRIVER wayland
set -gx MOZ_ENABLE_WAYLAND 1
set -gx ELECTRON_OZONE_PLATFORM_HINT wayland
set -gx OZONE_PLATFORM wayland

# Use XCompose file
set -gx XCOMPOSEFILE $HOME/.XCompose

set -gx QT_STYLE_OVERRIDE kvantum
