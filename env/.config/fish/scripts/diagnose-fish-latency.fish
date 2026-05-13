#!/usr/bin/env fish

set -l profile_file (mktemp /tmp/fish-latency-profile.XXXXXX)

echo "== Fish latency diagnostics =="
echo "Run this from the slow interactive shell:"
echo "  fish scripts/diagnose-fish-latency.fish"
echo

echo "== Shell info =="
echo "fish: "(fish --version)
echo "pwd:  "(pwd)
echo "term: "(status terminal 2>/dev/null)
echo

echo "== Active event handlers =="
functions --handlers
echo

echo "== Enter bindings =="
for mode in default insert
    echo "-- mode: $mode"
    bind -M $mode enter 2>/dev/null; or true
    bind -M $mode \r 2>/dev/null; or true
    bind -M $mode \n 2>/dev/null; or true
end
echo

echo "== Prompt functions present =="
for fn in fish_prompt fish_right_prompt fish_mode_prompt __mise_env_eval __mise_env_eval_2 __mise_cd_hook _atuin_preexec _atuin_postexec
    if functions -q $fn
        echo "present: $fn"
    else
        echo "absent:  $fn"
    end
end
echo

echo "== Timings: direct prompt functions =="
if functions -q fish_prompt
    echo "-- fish_prompt"
    for i in (seq 1 5)
        time fish_prompt >/dev/null
    end
else
    echo "fish_prompt missing"
end

if functions -q fish_right_prompt
    echo "-- fish_right_prompt"
    for i in (seq 1 5)
        time fish_right_prompt >/dev/null
    end
else
    echo "fish_right_prompt missing"
end
echo

echo "== Timings: event handlers =="
for ev in fish_prompt fish_preexec fish_postexec fish_read
    echo "-- emit $ev"
    for i in (seq 1 3)
        time emit $ev >/dev/null
    end
end
echo

echo "== Timings: external tools =="
if command -q starship
    echo "-- starship prompt"
    for i in (seq 1 5)
        time starship prompt >/dev/null
    end

    echo "-- starship prompt --right"
    for i in (seq 1 5)
        time starship prompt --right >/dev/null
    end

    echo "-- starship timings"
    starship timings
else
    echo "starship not found"
end

if command -q mise
    echo "-- mise hook-env"
    for i in (seq 1 5)
        time mise hook-env -s fish >/dev/null
    end
else
    echo "mise not found"
end

echo

echo "== Optional real Enter profiler =="
echo "Starting a nested fish with profiling enabled."
echo "In the nested shell: press Enter 3-5 times, then type: exit"
echo "Profile will be saved to: $profile_file"
echo "Press Enter to start nested profiler, or Ctrl-C to stop."
read --local --silent _confirm

fish --profile=$profile_file -i

echo
echo "== Profile top entries =="
echo "profile: $profile_file"
sort -nr $profile_file | head -100

echo
 echo "To share later:"
echo "  sort -nr $profile_file | head -100"
