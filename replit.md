# Caller Tracking

Telemarketing agent tool — agents call customers one-by-one from an assigned phone list; admin manages agents, uploads numbers in bulk, and monitors per-agent performance.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, paths: /api)
- `pnpm --filter @workspace/web run dev` — run the React frontend (port 22333, path: /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Credentials

- Admin: username=`admin`, password=`admin123`
- Agent (KyawG): username=`KyawG`, password=`agent123`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + shadcn/ui + wouter (mobile-first, Myanmar language)
- API: Express 5 + cookie-based JWT auth
- DB: Supabase PostgreSQL (project: vuywhhmwrqykukcemifd)
- Validation: Zod (via Orval codegen from OpenAPI spec)
- API codegen: Orval (from OpenAPI spec at lib/api-spec/openapi.yaml)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas used by server
- `artifacts/api-server/src/routes/` — auth.ts, agent.ts, admin.ts route handlers
- `artifacts/api-server/src/lib/supabase.ts` — Supabase client
- `artifacts/api-server/src/lib/auth.ts` — JWT + password hashing (SHA256)
- `artifacts/web/src/pages/` — login, agent/, admin/ pages
- `artifacts/web/src/lib/auth-context.tsx` — auth state + useAuth hook

## Architecture decisions

- Password hashing: SHA256 (crypto built-in) stored in ct_users.password_hash
- Auth: HTTP-only cookie (ct_session) containing JWT, 30-day expiry
- Phone number assignment: each phone number row has agent_id; agent sees only their own numbers
- "Next number" logic: finds uncalled numbers by comparing ct_call_logs.phone_number_id against ct_phone_numbers for the agent
- All UI in Myanmar language; 5 call outcomes: interested/will_buy/phone_off/no_answer/hung_up

## Product

- **Agent Dashboard**: Shows one phone number at a time with a big tap-to-dial tel: link. Five large Myanmar-language outcome buttons. Submit → auto-load next number. Progress indicator.
- **Admin Dashboard**: Per-agent call stats overview, agent management (create/deactivate/reset password), bulk phone number upload, per-agent call log detail with time-between-calls.

## User preferences

- Myanmar language UI throughout
- Mobile-first layout (agent flow especially)
- Push completed code to GitHub: https://github.com/ccorryxx-bot/Caller-Tracking

## Gotchas

- After changing OpenAPI spec, run `pnpm --filter @workspace/api-spec run codegen` before typechecking
- After adding new route files to api-server, must restart workflow to rebuild (esbuild bundles on startup)
- ct_phone_numbers.called_count and last_called_at columns were added manually via Supabase management API
- ct_call_logs.phone_number_id was added as a nullable FK column

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
