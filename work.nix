{ lib, pkgs, ... }:
{
  home = {
    packages = with pkgs; [
      hello
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
      ".config/nvim" = {
        source = builtins.fetchGit {
          url = "https://github.com/LukePeltier/neovim-config.git";
        };
      };
      ".config/tmux" = {
        source = ./tmux/.config/tmux;
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
    };
  };

  programs.home-manager.enable = true;

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
      pull = { rebase = false; };
      fetch = { prune = true; };
      init = { defaultBranch = "main"; };
      core = { editor = "nvim"; excludesFile = "~/.gitignore"; };
      gpg = { format = "ssh"; };
      commit = { gpgsign = true; };
      pager = { branch = false; };
      column = { ui = "auto"; };
      branch = { sort = "-committerdate"; };
      rerere = { enabled = true; };
    };
  };

}
