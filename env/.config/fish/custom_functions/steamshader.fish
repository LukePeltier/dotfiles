function steamshader
    set -l appid (grep 'Still replaying' ~/.local/share/Steam/logs/shader_log.txt \
        | tail -n 1 \
        | string match -rg 'Still replaying ([0-9]+)')

    steamname $appid
end
