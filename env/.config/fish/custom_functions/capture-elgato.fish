function capture-elgato --wraps='mpv'
    mpv av://v4l2:/dev/video0 --demuxer-lavf-o=input_format=nv12,video_size=2560x1440,framerate=60,use_wallclock_as_timestamps=yes --profile=low-latency --untimed --video-latency-hacks=yes --cache=no --hwdec=auto-copy --audio-file="av://pulse:alsa_input.usb-Elgato_Elgato_4K_S_AC8KB60110GQ2D-02.analog-stereo" --audio-buffer=0.01 --input-default-bindings=no --input-conf=/dev/null --no-osc $argv
end
