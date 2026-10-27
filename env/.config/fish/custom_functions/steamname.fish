function steamname
    set -l appid $argv[1]

    curl -s "https://store.steampowered.com/api/appdetails?appids=$appid" \
        | jq -r --arg id "$appid" '.[$id].data.name'
end
