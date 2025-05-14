# XDG Desktop Portal
set -gx XDG_SESSION_TYPE wayland

# QT
set -gx QT_QPA_PLATFORM "wayland;xcb"
set -gx QT_QPA_PLATFORMTHEME qt6ct
set -gx QT_QPA_PLATFORMTHEME qt5ct
set -gx QT_WAYLAND_DISABLE_WINDOWDECORATION 1
set -gx QT_AUTO_SCREEN_SCALE_FACTOR 1

# GDK
set -gx GDK_SCALE 1

# Toolkit Backend
set -gx GDK_BACKEND wayland,x11
set -gx CLUTTER_BACKEND wayland

# Mozilla
set -gx MOZ_ENABLE_WAYLAND 1

# Set the cursor size for xcursor
set -gx XCURSOR_SIZE 24

set -gx ELECTRON_OZONE_PLATFORM_HINT wayland

# -----------------------------------------------------
# Environment Variables
# name: "Nvidia"
# -----------------------------------------------------

# NVIDIA https://wiki.hyprland.org/Nvidia/
set -gx GBM_BACKEND nvidia-drm
set -gx NVD_BACKEND direct
set -gx LIBVA_DRIVER_NAME nvidia
set -gx SDL_VIDEODRIVER wayland
set -gx WLR_DRM_NO_ATOMIC 1
set -gx __GL_VRR_ALLOWED 1
set -gx __GLX_VENDOR_LIBRARY_NAME nvidia
set -gx __NV_PRIME_RENDER_OFFLOAD 1
set -gx __VK_LAYER_NV_optimus NVIDIA_only

# FOR VM and POSSIBLY NVIDIA
set -gx WLR_NO_HARDWARE_CURSORS 1 # On hyprland >v0.41, now configured on variable cursor section
set -gx WLR_RENDERER_ALLOW_SOFTWARE 1

# nvidia firefox (for hardware acceleration on FF)?
# check this post https://github.com/elFarto/nvidia-vaapi-driver#configuration
set -gx MOZ_DISABLE_RDD_SANDBOX 1
set -gx EGL_PLATFORM wayland

