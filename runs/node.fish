#!/usr/bin/env fish

mise install nodejs@latest

# Set it as the default Node.js version
mise use -g nodejs@latest

# Verify the installation
set NODE_VERSION $(mise exec nodejs -- node --version)
echo "Successfully installed Node.js $NODE_VERSION"

# Show available npm version
set NPM_VERSION $(mise exec nodejs -- npm --version)
echo "npm version: $NPM_VERSION"

npm install -g pnpm

