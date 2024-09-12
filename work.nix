{
  lib,
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
      atuin
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
    ];
    username = "lpeltier";
    homeDirectory = "/home/lpeltier";

    stateVersion = "24.05";
    sessionVariables = {
      EDITOR = "nvim";
    };
    file = {
      ".zshrc" = {
        source = ./work/zsh/.zshrc;
      };
      ".config/tmux/tmux.conf" = {
        source = ./tmux/.config/tmux/tmux.conf;
      };
      ".local/bin/go.sh" = {
        source = ./work_scripts/.local/bin/go.sh;
      };
      ".local/bin/tmux-sessionizer" = {
        source = ./scripts/.local/bin/tmux-sessionizer;
      };
      ".wezterm.lua" = {
        source = ./wezterm/.wezterm.lua;
      };
      ".config/starship.toml" = {
        source = ./starship/starship.toml;
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
