{
  inputs = {
    flake-parts.url = "github:hercules-ci/flake-parts";
    nix-packages.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    nix-systems.url = "github:nix-systems/default";
  };
  outputs = inputs @ {
    flake-parts,
    nix-packages,
    nix-systems,
    ...
  }: let
    packagesModule = {
      perSystem = {system, ...}: {
        _module.args.packages = import nix-packages {
          inherit system;
        };
      };
    };

    systemsModule = {
      systems = import nix-systems;
    };
  in
    flake-parts.lib.mkFlake {inherit inputs;} {
      imports = [
        packagesModule
        systemsModule
      ];

      perSystem = {packages, ...}: {
        devShells.default = packages.mkShell {
          nativeBuildInputs = with packages; [
            # Nix
            alejandra
            nil

            # Node
            nodejs
          ];
        };
      };
    };
}
