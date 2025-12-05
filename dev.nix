{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.openssh
    pkgs.sudo
    pkgs.git-lfs
  ];
}
