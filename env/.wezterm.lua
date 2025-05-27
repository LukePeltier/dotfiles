local wezterm = require("wezterm")
-- Some empty tables for later use
local launch_menu = {}

if wezterm.target_triple == "x86_64-pc-windows-msvc" then
	--- Grab the ver info for later use.
	table.insert(launch_menu, {
		label = "PowerShell",
		args = {
			"pwsh.exe",
			"-NoLogo",
		},
		domain = { DomainName = "local" },
	})
end

local config = {
	launch_menu = launch_menu,
	automatically_reload_config = true,
	window_close_confirmation = "NeverPrompt",
	default_cursor_style = "SteadyBlock",
	color_scheme_dirs = { "C:\\Users\\C2184\\.config\\wezterm\\colors" },
	color_scheme = "tokyonight_night",
	font_size = 12.0,
	font = wezterm.font_with_fallback({ "JetBrainsMono Nerd Font", "Symbols Nerd Font" }),
	unicode_version = 13,
	leader = { key = "a", mods = "CTRL" },
	switch_to_last_active_tab_when_closing_tab = true,
	enable_kitty_graphics = true,
	use_fancy_tab_bar = false,
	hide_tab_bar_if_only_one_tab = true,
}

if wezterm.target_triple == "x86_64-pc-windows-msvc" then
	config.default_domain = "WSL:archlinux"
	config.default_prog = { "pwsh.exe", "-NoLogo" }
end

return config
