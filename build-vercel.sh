#!/bin/bash
set -e

echo "=== Building api-server ==="
pnpm --filter @workspace/api-server run build

echo "=== Building web frontend ==="
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/web run build

echo "=== Creating Vercel Build Output structure ==="
rm -rf .vercel/output
mkdir -p .vercel/output/static
FUNC_DIR=".vercel/output/functions/api/[...path].func"
mkdir -p "$FUNC_DIR"

# Vercel Output config with routing
cat > .vercel/output/config.json << 'VERCEL_CONFIG'
{
  "version": 3,
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/[...path]" },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
VERCEL_CONFIG

# Static web files
cp -r artifacts/web/dist/public/* .vercel/output/static/

# Function runtime config
cat > "$FUNC_DIR/.vc-config.json" << 'FUNC_CONFIG'
{
  "runtime": "nodejs20.x",
  "handler": "index.js",
  "launcherType": "Nodejs",
  "shouldAddHelpers": true
}
FUNC_CONFIG

# Copy all built api-server dist files (self-contained bundle)
cp artifacts/api-server/dist/*.mjs "$FUNC_DIR/"
cp artifacts/api-server/dist/*.map "$FUNC_DIR/" 2>/dev/null || true

# Function entry point — wraps Express app
cat > "$FUNC_DIR/index.js" << 'FUNC_JS'
let _app;

async function getApp() {
  if (!_app) {
    const mod = await import('./app.mjs');
    _app = mod.default;
  }
  return _app;
}

module.exports = async function handler(req, res) {
  const app = await getApp();
  app(req, res);
};
FUNC_JS

echo "=== Output structure ==="
find .vercel/output -type f | head -20

echo "=== Done ==="
