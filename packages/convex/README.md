# @service-ops/convex

Convex-owned package. Houses the schema, queries, mutations, actions, and Better Auth + AI Agent components for Service Operations Copilot.

## First-time setup

```sh
cd packages/convex
bunx convex dev --configure new
```

Choose:

- Project name: `service-ops-copilot`
- Team: your personal team (or whichever org owns the deployment)

This generates `convex/_generated/` (api, server, dataModel) and writes a deployment URL into `.env.local`. Mirror `CONVEX_URL` into:

- `apps/mobile/.env.local` as `EXPO_PUBLIC_CONVEX_URL`
- `apps/web/.env.local` as `VITE_CONVEX_URL`

After the first provision, `bun --cwd packages/convex run dev` (or `bun run dev:convex` from the repo root) keeps the dev deployment in sync as you edit functions.

## Phase 0 status

Schema and auth config are placeholders. Phase 1 introduces the `users` table and Better Auth wiring; later phases add the rest.
