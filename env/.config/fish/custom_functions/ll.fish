function ll --wraps='eza --group --header --group-directories-first --long' --wraps='eza --group --header --group-directories-first --long --git' --description 'alias ll=eza --group --header --group-directories-first --long --git'
  eza --group --header --group-directories-first --long --git $argv
        
end
