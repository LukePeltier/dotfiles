{
  lib,
  config,
  pkgs,
  username,
  ...
}: {
  home = {
    packages = with pkgs; [
      tmux
      zoxide
      git
      fzf
      bat
      ripgrep
      fd
      eza
      starship
      zsh
      sshs
      bun
      volta
      pnpm
      zig
      rustup
      go
      rye
      php82
      php82Packages.composer
      unzip
      lazygit
      btop
      wishlist
      gum
      nh
      nix-output-monitor
      fish
      delta
      thefuck
      lf
      tlrc
      mosh
      zellij
    ];
    username = "lukep";
    homeDirectory = "/home/lukep";

    sessionVariables = {
      EDITOR = "nvim";
    };
    file = {
      ".zshrc" = {
        source = config.lib.file.mkOutOfStoreSymlink ./work/zsh/.zshrc;
      };
      ".config/tmux/tmux.conf" = {
        source = config.lib.file.mkOutOfStoreSymlink ./tmux/.config/tmux/tmux.conf;
      };
      ".config/zellij" = {
        source = config.lib.file.mkOutOfStoreSymlink ./zellij/.config/zellij;
      };
      ".local/bin/tmux-sessionizer" = {
        source = config.lib.file.mkOutOfStoreSymlink ./scripts/.local/bin/tmux-sessionizer;
      };
      ".wezterm.lua" = {
        source = config.lib.file.mkOutOfStoreSymlink ./wezterm/.wezterm.lua;
      };
    };

    stateVersion = "24.05";
  };
  programs.home-manager.enable = true;
  programs.git = {
    enable = true;
    userEmail = "luke@lukepeltier.com";
    userName = "Luke Peltier";
    signing = {
      key = "/home/lukep/.ssh/id_ed25519.pub";
    };
    extraConfig = {
      pull = {rebase = false;};
      fetch = {prune = true;};
      init = {defaultBranch = "main";};
      core = {
        editor = "nvim";
        excludesFile = "~/.gitignore";
      };
      gpg = {format = "ssh";};
      commit = {gpgsign = true;};
      pager = {branch = false;};
      column = {ui = "auto";};
      branch = {sort = "-committerdate";};
      rerere = {enabled = true;};
    };
  };
}
