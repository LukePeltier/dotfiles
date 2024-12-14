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
      stow
      gcc
      libclang
    ];
    username = "lukep";
    homeDirectory = "/home/lukep";

    sessionVariables = {
      EDITOR = "nvim";
    };

    stateVersion = "24.05";
  };
  programs.home-manager.enable = true;
  programs.git = {
    enable = true;
    userEmail = "luke@lukepeltier.com";
    userName = "Luke Peltier";
    signing = {
      key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFtnS35NfuQUYjtWIGg+aZDK5Wsb1hA1t60xf/zMU3pj";
    };
    extraConfig = {
      pull = {rebase = false;};
      fetch = {prune = true;};
      init = {defaultBranch = "main";};
      core = {
        editor = "nvim";
        excludesFile = "~/.gitignore";
        sshCommand = "ssh.exe";
      };
      gpg = {
        format = "ssh";
        ssh = {
          program = "/mnt/c/Users/lukep/AppData/Local/1Password/app/8/op-ssh-sign-wsl";
        };
      };
      commit = {gpgsign = true;};
      pager = {branch = false;};
      column = {ui = "auto";};
      branch = {sort = "-committerdate";};
      rerere = {enabled = true;};
    };
  };
}
