STOW_PACKAGES := fish zellij scripts wezterm
.PHONY: default

default: help

.PHONY: help
help:
	@awk 'BEGIN {FS = ":.*?## "}; \
	/^[^\t][a-zA-Z0-9_-]+:.*?##/ \
	{ printf "\033[36m%-24s$(CLR) %s\n", $$1, $$2 } \
	/^##/ { printf "$(YELLOW)%s$(CLR)\n", substr($$0, 4) }' $(MAKEFILE_LIST)

.PHONY: run
run: ## Symlink all dotfiles w/Stow
	@for pkg in $(STOW_PACKAGES); do \
		stow $$pkg; \
	done
	@echo "Dotfiles stowed successfully"

.PHONY: work
work: run
	$(MAKE) stow pkg=work



.PHONY: stow add
stow: ## Add individual packages w/Stow
	@if [ -z "${pkg}" ]; then \
		echo "Error: Please specify a package to stow. \n$(YELLOW)ie: $(YELLOW)make stow pkg=<pacakgeName>$(CLR) \n$(WHITE)Available packages:$(CLR) $(STOW_PACKAGES)"; \
		exit 1; \
	fi
	stow ${pkg}
	@echo "${pkg} was added"

.PHONY: unstow remove
unstow: ## Remove individual packages w/Stow
	@if [ -z "${pkg}" ]; then \
		echo "Error: Please specify a package to unstow. \n$(YELLOW)ie: $(YELLOW)make unstow pkg=<pacakgeName>$(CLR) \n$(WHITE)Available packages:$(CLR) $(STOW_PACKAGES)"; \
		exit 1; \
	fi
	@if [[ ! " ${STOW_PACKAGES} " =~ " ${pkg} " ]]; then \
		echo "Error: Package '${pkg}' not found in STOW_PACKAGES: $(STOW_PACKAGES)"; \
		exit 1; \
	fi
	stow --delete ${pkg}
	@echo "${pkg} was removed"

.PHONY: update up
update:
	@for pkg in $(STOW_PACKAGES); do \
		stow --restow $$pkg; \
	done
	@echo "$(GREEN)Dotfiles updated successfully$(CLR) - run $(YELLOW)reload$(CLR) to apply changes to Fish"

.PHONY: delete
delete: ## Delete all dotfiles w/Stow
	@for pkg in $(STOW_PACKAGES); do \
		stow --delete $$pkg; \
	done
	@echo "$(WHITE)Dotfiles zapped! ⚡️"

up: update ## Same as update command
add: stow ## Same as stow command
remove: unstow ## Same as unstow command
