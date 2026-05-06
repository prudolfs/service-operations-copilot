# Service Operations Copilot

Mobile-first service operations app with realtime chat and AI-driven workflows. Mobile (Expo + React Native) and web (TanStack Start) clients share a single Convex backend.

See [`docs/service-operations-copilot-prd.md`](./docs/service-operations-copilot-prd.md) for the full implementation PRD.

## Stack

- **Monorepo:** bun workspaces (`apps/*`, `packages/*`)
- **Mobile:** Expo SDK 55, React Native, expo-router, NativeWind 5 + Tailwind 4
- **Web:** TanStack Start + Vite + Tailwind 4
- **Backend:** Convex (auth, data, AI actions)
- **Shared:** zod schemas + theme/glass CSS in `packages/shared`

## Setup

Prerequisites: Bun ≥ 1.3, Xcode (for iOS), Android Studio (for Android).

```sh
bun install
```

Provision a Convex dev deployment:

```sh
bun --cwd packages/convex run dev
# follow the prompt to create the `service-ops-copilot` project
```

This writes a Convex deployment URL into `packages/convex/.env.local`. Mirror it into `apps/mobile/.env.local` and `apps/web/.env.local` as `EXPO_PUBLIC_CONVEX_URL` / `VITE_CONVEX_URL`.

## Run

Run each in its own terminal:

```sh
bun run dev:convex   # convex dev (websocket + codegen)
bun run dev:mobile   # expo start
bun run dev:web      # vite dev (Phase 7+; stub for now)
```

## Quality gates

```sh
bun run check        # biome (format + lint)
bun run check:fix    # biome --write
bun run typecheck    # all workspaces
bun run test         # vitest where present
```

Pre-commit hooks run biome + typecheck via lefthook. Install once:

```sh
bun run prepare
```

## Workspace layout

```
apps/
  mobile/        Expo + RN + expo-router
  web/           TanStack Start + Vite (Phase 7)
packages/
  convex/        Convex deployment (schema, queries, mutations, actions)
  shared/        zod schemas, role helpers, Tailwind theme + glass utilities
```
