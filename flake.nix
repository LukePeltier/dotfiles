{
  description = "Luke's Home Manager configuration";
  inputs = {
    nixpkgs.url = "nixpkgs/nixos-unstable";
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";

    };
  };

  outputs = { nixpkgs, home-manager, ... }:
    let
      lib = nixpkgs.lib;
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
      usernames = [ "lpeltier" "lukep" ];
      fillHolesInConfigs = f: builtins.listToAttrs (map (username: lib.attrsets.nameValuePair username (f { inherit username; })) usernames);
    in
    {
      homeConfigurations = {
        work = home-manager.lib.homeManagerConfiguration {
          inherit pkgs;
          modules = [ ./work.nix ];
          extraSpecialArgs = {
            username = "lpeltier";
          };
        };
        home = home-manager.lib.homeManagerConfiguration {
          inherit pkgs;
          modules = [ ./home.nix ];
          extraSpecialArgs = {
            username = "lukep";
          };
        };

      };
    };
}
