set -p fish_function_path $__fish_config_dir/custom_functions

# Added by LM Studio CLI (lms)
test -d "$HOME/.lmstudio/bin"; and fish_add_path --append "$HOME/.lmstudio/bin"
# End of LM Studio CLI section

