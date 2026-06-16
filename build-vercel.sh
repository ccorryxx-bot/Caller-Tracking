#!/bin/bash
set -e

echo "=== Building api-server ==="
pnpm --filter @workspace/api-server run build

echo "=== Building web frontend ==="
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/web run build

echo "=== Copying web output to dist/ ==="
mkdir -p dist
cp -r artifacts/web/dist/public/* dist/

echo "=== Done ==="
