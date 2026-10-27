# dotfiles

Personal config for Arch (niri, Dank Material Shell) and macOS. Files under `env/` mirror `$HOME` and are linked into place with [GNU Stow](https://www.gnu.org/software/stow/).

## Layout

| Path | Purpose |
| --- | --- |
| `env/` | Dotfiles, stowed into `$HOME` (`.config/`, `.local/bin/`, `.gitconfig`, ...) |
| `env-work/` | Work-only overrides (e.g. `.gitconfig-work`) |
| `init` | Initialises submodules |
| `run-arch`, `run-macos` | Machine bootstrap, calling the scripts in `runs/` |
| `runs/{arch,macos,common}/` | Individual setup steps: package managers, packages, shell, toolchains |

## Submodules

| Path | Repo |
| --- | --- |
| `env/.pi/agent` | `pi-config`: pi (coding agent) extensions and settings. Contains its own nested submodule, `extensions/pi-ask-user-question`. |

Edits inside a submodule are committed and pushed in that repo first. Then commit the updated submodule pointer here.

## Setup

```sh
git clone --recurse-submodules <url> ~/dotfiles
cd ~/dotfiles

./run-arch        # or ./run-macos: packages, fish, toolchains, tmux, neovim
stow env          # link dotfiles into $HOME (run from ~/dotfiles; stow targets the parent dir)
```

If you cloned without `--recurse-submodules`, run `./init` (or `git submodule update --init --recursive`).

`run-*` installs `stow`, sets fish as the login shell and bootstraps [fisher](https://github.com/jorgebucaran/fisher) plugins (`fish_plugins`).

### Post-install

- **yazi:** plugins and flavors listed in `env/.config/yazi/package.toml` are not tracked. Install them with `ya pkg install`. Custom plugins (`folder-rules`, `smart-tab`) and the `tokyonight_night` flavor are tracked.
- **tmux:** TPM is cloned by `runs/common/tmux.sh`. Press `prefix + I` to install plugins.
- **neovim:** installed through `bob` by `runs/common/neovim.sh`. The config lives in its own repo ([neovim-config](https://github.com/LukePeltier/neovim-config)), not here.
- **pi:** run `/login` in pi to restore credentials. `auth.json` and sessions are intentionally not tracked.

## Not tracked

Some files are ignored on purpose because tools regenerate them:

- **fish:** plugin files in `functions/`, `themes/`, and some of `conf.d/` and `completions/`, plus `fish_variables`. Put your own functions in `custom_functions/`, which is added to `fish_function_path`. `functions/` is ignored.
- **yazi:** plugins and flavors managed by `ya pkg`.
- **tmux:** `plugins/`.

## Theming

Colors come from [matugen](https://github.com/InioX/matugen) (templates in `env/.config/matugen/`) and are regenerated when the wallpaper changes (`wallpaper-set`). Files such as `niri/colors.kdl`, `mako/colors`, `swaync/colors-matugen.css` and `ghostty/themes/matugen` are generated output that is committed, so they will show up as diffs after changing the wallpaper.
