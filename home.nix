{ lib, pkgs, username, ... }: {
  home = {
    packages = with pkgs; [
      hello
    ];
    username = "lukep";
    homeDirectory = "/home/lukep";


    stateVersion = "24.05";
  };
  programs.git = {
    enable = true;
    userEmail = "luke@lukepeltier.com";
    userName = "Luke Peltier";
  };
}
