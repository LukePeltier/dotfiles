if test -r '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.fish'
  . '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.fish'
  replay $HOME/.nix-profile/etc/profile.d/hm-session-vars.sh
end
