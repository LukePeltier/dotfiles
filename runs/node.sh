#!/usr/bin/env bash

mise install nodejs@latest

# Set it as the default Node.js version
mise use -g nodejs@latest

# Verify the installation
NODE_VERSION=$(mise exec nodejs -- node --version)
echo "Successfully installed Node.js $NODE_VERSION"

# Show available npm version
NPM_VERSION=$(mise exec nodejs -- npm --version)
echo "npm version: $NPM_VERSION"

npm install -g pnpm

