{
  lib,
  pkgs,
  username,
  ...
}: {
  home = {
    packages = with pkgs; [
      atuin
      neovim
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
      php84
      php84Packages.composer
      unzip
      lazygit
      alejandra
      libgcc
      clang
    ];
    username = "lukep";
    homeDirectory = "/home/lukep";

    sessionVariables = {
      EDITOR = "nvim";
    };
    file = {
      ".zshrc" = {
        source = ./personal/zsh/.zshrc;
      };
      ".config/tmux/tmux.conf" = {
        source = ./tmux/.config/tmux/tmux.conf;
      };
      ".local/bin/tmux-sessionizer" = {
        source = ./scripts/.local/bin/tmux-sessionizer;
      };
      ".wezterm.lua" = {
        source = ./wezterm/.wezterm.lua;
      };
    };

    stateVersion = "24.05";
  };
  programs.zsh.enable = true;
  programs.home-manager.enable = true;
  programs.starship.enable = true;
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
