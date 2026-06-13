#!/bin/bash

# Install dependencies
pnpm install

# Build frontend
pnpm exec vite build

# Ensure dist folder exists
mkdir -p dist

echo "Build completed successfully"
