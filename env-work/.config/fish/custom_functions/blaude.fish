function blaude --wraps='rm -rf ~/.claude/statsig && claude' --description 'alias blaude rm -rf ~/.claude/statsig && claude'
    rm -rf ~/.claude/statsig && claude $argv
end
