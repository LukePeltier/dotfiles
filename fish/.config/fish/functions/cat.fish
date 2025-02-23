function cat --wraps='batcat --paging=never' --description 'alias cat=batcat --paging=never'
  batcat --paging=never $argv
end
