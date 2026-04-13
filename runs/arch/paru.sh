#!/usr/bin/env bash
set -euo pipefail

if command -v paru &>/dev/null; then
  echo "paru already installed"
  exit 0
fi

command -v pacman &>/dev/null || { echo "pacman not found — is this Arch?"; exit 1; }

sudo pacman -S --needed --noconfirm base-devel git

tmpdir="$(mktemp -d)"
git clone https://aur.archlinux.org/paru.git "$tmpdir/paru"
cd "$tmpdir/paru"
makepkg -si --noconfirm
rm -rf "$tmpdir"
