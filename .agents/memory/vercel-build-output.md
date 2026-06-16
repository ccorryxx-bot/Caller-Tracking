---
name: Vercel Build Output API for this project
description: How to deploy Express API + Vite static SPA on Vercel without a framework preset
---

## Rule
Use Vercel Build Output API v3 (`.vercel/output/`) when deploying an Express API + static SPA with `framework: null` and a custom `buildCommand`. Vercel's `api/` directory function auto-detection does NOT work with `framework: null`.

**Why:** Vercel only auto-detects `api/` serverless functions for known framework presets. With `framework: null`, the `api/` directory is ignored entirely — it only serves static files from `outputDirectory`.

**How to apply:** `build-vercel.sh` creates:
```
.vercel/output/
  config.json               # version:3, routes: /api/(*) → function, filesystem, /(.*) → /index.html
  static/                   # copy of artifacts/web/dist/public/*
  functions/api/[...path].func/
    .vc-config.json          # runtime:nodejs20.x, handler:index.js, launcherType:Nodejs
    index.js                 # CJS wrapper: imports ./app.mjs, exports handler
    app.mjs                  # copied from artifacts/api-server/dist/app.mjs (self-contained esbuild bundle)
    pino-worker.mjs          # pino worker files copied from dist/ alongside app.mjs
    (other pino .mjs files)
```

The Express app is fully bundled by esbuild (no node_modules needed in function dir). `__dirname` in app.mjs resolves to the function directory, so pino workers are found correctly.

`vercel.json` only needs: `buildCommand`, `installCommand`, `framework: null` — no `outputDirectory` or `rewrites` (those go in `config.json`).
