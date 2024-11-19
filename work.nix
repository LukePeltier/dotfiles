{
  lib,
  config,
  pkgs,
  ...
}: let
  # Override libclang to include more outputs
  libclangWithPython = pkgs.libclang.overrideAttrs (oldAttrs: {
    outputs = oldAttrs.outputs;
  });
in {
  home = {
    packages = with pkgs; [
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
      libclangWithPython
      wishlist
      gum
      nh
      nix-output-monitor
      fish
      delta
      thefuck
      lf
      nushell
      uutils-coreutils-noprefix
      dust
      porsmo
      gitui
      helix
      bear
      jujutsu
      mosh
    ];
    username = "lpeltier";
    homeDirectory = "/home/lpeltier";

    stateVersion = "24.05";
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
      ".local/bin/zellij-sessionizer" = {
        source = config.lib.file.mkOutOfStoreSymlink ./zellij/.local/bin/zellij-sessionizer;
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
      ".config/starship.toml" = {
        source = config.lib.file.mkOutOfStoreSymlink ./starship/starship.toml;
      };
    };
  };

  programs.home-manager.enable = true;

  programs.starship = {
    enable = true;
  };

  programs.git = {
    enable = true;
    userEmail = "Luke.Peltier@microchip.com";
    userName = "Luke Peltier";
    signing = {
      key = "/home/lpeltier/.ssh/id_ed25519.pub";
    };
    aliases = {
      gone = " ! git fetch -p && git for-each-ref --format '%(refname:short) %(upstream:track)' | awk '$2 == \"[gone]\" { print $1}' | xargs -r git branch -D";
    };
    extraConfig = {
      pull = {rebase = true;};
      fetch = {prune = true;};
      init = {defaultBranch = "main";};
      core = {
        editor = "nvim";
        excludesFile = "~/.gitignore";
        pager = "delta";
      };
      interactive = {
        diffFilter = "delta --color-only";
      };
      delta = {
        dark = true;
        navigate = true;
        line-numbers = true;
        features = "catppuccin-mocha";
        side-by-side = true;
      };
      merge = {
        conflictstyle = "diff3";
      };
      diff = {
        colorMoved = "no";
      };
      include = {
        path = "/home/lpeltier/.config/delta/themes/catppuccin.gitconfig";
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
