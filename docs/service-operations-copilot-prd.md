# Service Operations Copilot — PRD

Implementation PRD derived from `docs/service-operations-copilot-plan.md` with all architectural decisions locked.

This document is a checklist. Mark tasks `[x]` when complete. Phases are sequential; do not start Phase N+1 until Phase N is demoable end-to-end.

---

## Locked Decisions

| Decision | Choice | Why |
|---|---|---|
| Monorepo | bun workspaces | Match seniory; native bun lockfile; fast |
| Workspace shape | `apps/{mobile,web}` + `packages/{convex,shared}` | Per request; no `apps/server` |
| Web framework | TanStack Start + Vite + TanStack Router | Latest stack, matches seniory; deploys cleanly to Vercel via Nitro |
| Web hosting | Vercel | Convex websocket bypasses CDN — no caching conflicts |
| Backend | Convex (deployment-owning package) | Single source of truth for data, auth, AI |
| Auth | `@convex-dev/better-auth` component | No separate server; Google + GitHub + email/password |
| AI runtime | Convex actions + Vercel AI SDK (`ai` package) | Same `generateObject` pattern as seniory, runs in Convex |
| AI streaming | `@convex-dev/agent` over websocket | Reactive token streaming; no SSE plumbing |
| Audio transcription | Groq Whisper (`whisper-large-v3`) via fetch | Free tier covers dev; copy seniory's pattern |
| Mobile framework | Expo SDK 55 + React Native 0.85+ | Latest stable |
| Mobile styling | NativeWind 5.0.0-preview.3 + Tailwind 4 + react-native-css 3.0.7 | Newer than seniory; stable RN-CSS line |
| Web styling | Tailwind 4 + `@tailwindcss/vite` | Shared theme tokens with mobile via CSS-first config |
| UI design | Motion parallax glass on mobile; static glass on web | See `docs/motion-parallax-glass.md` |
| State on mobile | Convex queries + react-hook-form + Context (no Zustand) | Convex eliminates global store need |
| Forms | react-hook-form + zod resolver | Schemas live in `packages/shared` |
| Code quality | Biome 2.4.14 (qd-editor base) + lefthook pre-commit | Strict rules need automated gating |
| Tests | vitest in `packages/shared` + `convex-test` in `packages/convex`; manual on apps | MVP-appropriate; expand post-launch |
| Build order | Strict mobile-first through Phase 6, then web in Phase 7 | Validate UX on mobile before duplicating |
| Production deployment | OUT of scope of this PRD | Will be a separate doc |

### Identifiers

| Thing | Value |
|---|---|
| Workspace package scope | `@service-ops` |
| Repo display name | Service Operations Copilot |
| Short slug | `service-ops` |
| Mobile display name | Service Ops |
| Expo app slug | `service-ops` |
| Expo deep link scheme | `serviceops` |
| iOS bundle identifier | `com.serviceops.app` (placeholder; swap before submission) |
| Android package | `com.serviceops.app` |
| Convex project name | `service-ops-copilot` (create new) |
| Vercel project name | `service-ops-web` (Phase 7) |

---

## Phase 0 — Monorepo Bootstrap & Design Tokens

**Demo at end of phase:** `bun install && bun run dev` works on mobile. Empty role-agnostic screens render with the shared Tailwind 4 theme and static glass utilities. Biome + lefthook gate every commit. Convex dev deployment is live with empty schema. `apps/web` exists as a stub workspace but is not feature-built.

### Repo root

- [ ] Initialize `package.json` with bun workspaces (`apps/*`, `packages/*`), `packageManager: bun@1.x`
- [ ] Add `tsconfig.base.json` with `strict: true`, `moduleResolution: "bundler"`, path aliases
- [ ] Add `biome.json` (qd-editor base + adaptations from PRD §Locked Decisions); pin `@biomejs/biome@^2.4.14`
- [ ] Add `lefthook.yml` with pre-commit `biome check --write` + `bun run typecheck`
- [ ] Add `bunfig.toml` for workspace install behavior
- [ ] Add root `.gitignore` (covers `node_modules`, `dist`, `.expo`, `.vercel`, `.tanstack`, `_generated`, `ios`, `android`, `.env*`)
- [ ] Add `README.md` (one-page setup + run instructions)
- [ ] Add root scripts: `dev`, `dev:mobile`, `dev:web`, `dev:convex`, `check`, `check:fix`, `typecheck`

### `packages/shared`

- [ ] Create package with `name: "@service-ops/shared"`, `type: "module"`, `main/types: "./src/index.ts"`
- [ ] Add `zod@^4` dependency
- [ ] Add `src/index.ts` barrel
- [ ] Add `src/roles.ts` with `Role` type, `isClient`, `isWorker`, `isManager`, `getHomeRouteForRole` helpers
- [ ] Add `src/schemas/serviceRequest.ts` (zod for create/update payloads, status enum)
- [ ] Add `src/schemas/chatMessage.ts` (zod for send-message payload)
- [ ] Add `src/schemas/voiceIntent.ts` (zod for AI intent envelope used by Phase 6; defined now for shared types)
- [ ] Add `src/styles/theme.css` — Tailwind 4 `@theme` with design tokens (colors, radii, spacing, glass color stops)
- [ ] Add `src/styles/glass.css` — Tailwind 4 `@utility .glass-card`, `.glass-input`, `.glass-surface` (works on web; mobile compiles via NativeWind)
- [ ] Add `src/index.test.ts` smoke test; add `vitest` devDep
- [ ] Add `package.json` scripts: `test`, `typecheck`

### `packages/convex`

- [ ] Create package with `name: "@service-ops/convex"`, `type: "module"`
- [ ] Add `convex@latest`, `@convex-dev/better-auth`, `@convex-dev/agent` dependencies
- [ ] Run `bunx convex dev --configure new` → creates `service-ops-copilot` project, generates `convex/_generated/`
- [ ] Add `convex/schema.ts` with empty placeholder export (real tables come in later phases)
- [ ] Add `convex/auth.config.ts` for Better Auth (handlers wired in Phase 1)
- [ ] Add package exports: `./api`, `./server`, `./dataModel` (matches seniory shape)
- [ ] Add `convex.json` with `functions: "./convex/"` and external packages list
- [ ] Add `convex-test` devDep, scaffold `convex/test-helpers.ts`
- [ ] Add `package.json` scripts: `dev` (= `convex dev`), `deploy` (= `convex deploy`), `test`

### `apps/mobile`

- [ ] Bootstrap with `bunx create-expo-app@latest --template blank-typescript`, set `name: "@service-ops/mobile"`
- [ ] Set `app.json`: `name: "Service Ops"`, `slug: "service-ops"`, `scheme: "serviceops"`, `ios.bundleIdentifier: "com.serviceops.app"`, `android.package: "com.serviceops.app"`
- [ ] Pin Expo to `~55.0.23`; run `bunx expo install` for SDK-aligned RN/react versions
- [ ] Install `expo-router@latest`; set `main: "expo-router/entry"` in package.json
- [ ] Install `nativewind@5.0.0-preview.3`, `react-native-css@^3.0.7`, `tailwindcss@^4.1.18`, `@tailwindcss/postcss@^4.1.18`
- [ ] Add `resolutions: { "lightningcss": "^1.30.1" }` to package.json
- [ ] Configure `metro.config.js` for NativeWind 5 + react-native-css
- [ ] Configure `babel.config.js` with NativeWind babel plugin
- [ ] Add `nativewind-env.d.ts`, `global.css` importing `@service-ops/shared/styles/theme.css` + `glass.css`
- [ ] Install `@service-ops/convex` and `@service-ops/shared` as workspace deps
- [ ] Install `convex@latest`, `@convex-dev/better-auth/react-native`, `react-hook-form@^7`, `@hookform/resolvers@^5`, `zod@^4`, `clsx`, `tailwind-merge`, `date-fns`
- [ ] Install Reanimated + Worklets pair (versions pinned by `expo install`); register Reanimated babel plugin
- [ ] Set `EXPO_ROUTER_APP_ROOT=src/app` in scripts (matches seniory pattern)
- [ ] Create `src/app/_layout.tsx` root layout with ConvexProvider + Better Auth provider stubs
- [ ] Create `src/app/index.tsx` placeholder welcome screen rendering a static glass card
- [ ] Add `eas.json` skeleton with `development`, `preview`, `production` profiles (config only; builds in Phase 7+)
- [ ] Add `package.json` scripts: `start`, `ios`, `android`, `lint`, `check`, `typecheck`

### `apps/web` (stub only)

- [ ] Bootstrap with `bunx create-tsrouter-app@latest` or copy seniory `apps/web/` structure
- [ ] Set `name: "@service-ops/web"`
- [ ] Pin TanStack Start + Vite + Tailwind 4 versions matching seniory
- [ ] Add `vite.config.ts` with `nitro()`, `tanstackStart()`, `viteReact()`, `tailwindcss()`, `viteTsConfigPaths()` (copy seniory)
- [ ] Add empty `src/routes/__root.tsx` and `src/routes/index.tsx`
- [ ] Add `src/styles.css` importing `@service-ops/shared/styles/theme.css` + `glass.css`
- [ ] Add `vercel.json` (`{ "bunVersion": "1.x" }`)
- [ ] Verify `bun run dev` starts without errors — feature work deferred to Phase 7

### Tooling validation

- [ ] `bun install` at repo root resolves cleanly with no peer warnings
- [ ] `bun run check` (biome) passes with zero issues
- [ ] `bun run typecheck` passes across all packages
- [ ] `bun run dev:mobile` opens Expo on iOS simulator and shows the welcome stub
- [ ] `bun run dev:web` starts the web dev server (just to confirm scaffold)
- [ ] A test commit confirms lefthook runs biome + typecheck before allowing the commit

---

## Phase 1 — Auth + Role-Based App Shell (Mobile)

**Demo at end of phase:** Sign in with Google, GitHub, or email/password on mobile. Role resolves from `ADMIN_EMAILS` / `WORKER_EMAILS` env vars in Convex. App lands in the correct route group: `(client)` / `(worker)` / `(manager)`. Empty role-specific home screens render. Sign-out works. Refreshing the app or app foregrounding revalidates the role.

### `packages/convex`

- [ ] Add `convex/users.ts` with `users` table per plan §6 (authUserId, email, name, role, createdAt, updatedAt; indices `by_auth_user_id`, `by_email`)
- [ ] Add `convex/auth.ts` configuring `@convex-dev/better-auth` with Google + GitHub + email/password providers
- [ ] Configure Better Auth `trustedOrigins` for `serviceops://` deep link
- [ ] Add Convex env vars: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ADMIN_EMAILS`, `WORKER_EMAILS`
- [ ] Add `convex/users.ts` mutation `ensureAppUser`: read Better Auth user, normalize email to lowercase, lookup by authUserId, resolve role from env vars (`ADMIN_EMAILS` → manager, `WORKER_EMAILS` → worker, else client), create-or-update app user, return app user
- [ ] Add `convex/users.ts` query `currentAppUser`: returns the app user for the calling Better Auth identity, or null
- [ ] Add `convex/users.ts` query `getById` (manager-only authorization)
- [ ] Write convex-test cases: ensureAppUser creates client by default, promotes to worker/manager when email matches env, idempotent on repeated calls, lowercase email normalization, role re-resolves on env change

### `apps/mobile`

- [ ] Configure deep link scheme `serviceops://` in `app.json` and verify in OAuth redirect URIs (Google + GitHub consoles)
- [ ] Wrap `_layout.tsx` with `ConvexBetterAuthProvider`
- [ ] Add `src/auth/useAuth.ts` hook exposing `user`, `isLoading`, `signIn`, `signOut`
- [ ] Add `src/lib/cn.ts` (clsx + tailwind-merge helper)
- [ ] Add `src/app/(auth)/_layout.tsx` redirecting away if already signed in
- [ ] Add `src/app/(auth)/welcome.tsx` (hero static glass card; "Continue with Google / GitHub / Email" buttons)
- [ ] Add `src/app/(auth)/login.tsx` (email + password form via react-hook-form)
- [ ] Add `src/app/(auth)/register.tsx` (email + password + name form)
- [ ] Add `src/app/(client)/_layout.tsx` Tab navigator: Home / Requests / Messages / Profile
- [ ] Add `src/app/(worker)/_layout.tsx` Tab navigator: Jobs / Messages / Profile
- [ ] Add `src/app/(manager)/_layout.tsx` Tab navigator: Overview / Requests / Workers / Messages / Profile
- [ ] Add empty placeholder screens for every tab in each role group
- [ ] Add `src/auth/RoleRedirect.tsx` component: on mount, calls `ensureAppUser` mutation, then `router.replace("/(client|worker|manager)")` based on returned role
- [ ] Wire `RoleRedirect` after successful sign-in and on app foreground/resume (per plan §7)
- [ ] Add sign-out action in profile screens
- [ ] Verify OAuth round-trip on iOS simulator with Google + GitHub
- [ ] Verify email/password registration + login round-trip
- [ ] Verify role redirect: same email moved between `WORKER_EMAILS` and `ADMIN_EMAILS` → role updates after app reload

---

## Phase 2 — Mobile Parallax Glass Component Library

**Demo at end of phase:** Welcome, login, register, and all three role homes render with parallax glass cards that respond to device tilt on iOS. Android uses lower-intensity defaults with faux-glass fallback. Reduce-motion accessibility setting disables motion. Inputs use the weaker shell variant and freeze on focus. See `docs/motion-parallax-glass.md` for the full spec.

### `apps/mobile`

- [ ] Install `expo-blur@latest`, `expo-sensors@latest` (for `DeviceMotion` if needed as fallback)
- [ ] Create `src/components/parallax/useParallaxMotion.ts` per spec (gyroscope-based, Reanimated worklet, accessibility-aware, freeze + disabled props)
- [ ] Create `src/components/parallax/GlassSurface.tsx` (BlurView when supported; faux-glass fallback)
- [ ] Create `src/components/parallax/ParallaxCard.tsx` (full motion: translate ±6, rotate ±2°)
- [ ] Create `src/components/parallax/ParallaxInputShell.tsx` (reduced motion + `freezeOnFocus: true` default)
- [ ] Create `src/components/parallax/SharedMotionProvider.tsx` (single sensor source, multiple animated derivations)
- [ ] Create `src/components/parallax/PARALLAX_DEFAULTS.ts` per spec
- [ ] Replace welcome/login/register screens to use `ParallaxCard` + `ParallaxInputShell`
- [ ] Replace each role home screen header with `ParallaxCard`
- [ ] Verify on physical iPhone: motion is subtle, smooth, no jitter at rest, returns to neutral when phone is flat
- [ ] Verify on physical Android (mid-range): lower intensity, faux-glass fallback if blur is poor, no frame drops
- [ ] Verify reduce motion (Settings → Accessibility → Reduce Motion) disables sensor-driven motion entirely
- [ ] Verify focused input freezes parallax and text stays readable while typing
- [ ] No more than 1–2 parallax surfaces per screen on dense lists (use static glass for list items)

---

## Phase 3 — Service Request Lifecycle (Mobile)

**Demo at end of phase:** Client creates a service request via form. Worker sees it in their open jobs list. Worker accepts → status becomes `ASSIGNED`. Worker starts → `IN_PROGRESS`. Worker completes → `COMPLETED`. Manager can override assignment or status from request detail. Realtime updates: client and manager see status changes within ~200ms. All authorization enforced in Convex (UI route hiding is not the security boundary).

### `packages/convex`

- [ ] Add `serviceRequests` table per plan §11 (clientId, assignedWorkerId, serviceType, date, time, notes, status, createdAt, updatedAt; indices `by_client`, `by_worker`, `by_status`)
- [ ] Status enum: `OPEN | ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED`
- [ ] Mutation `serviceRequests.create` (client only; validates with shared zod schema)
- [ ] Mutation `serviceRequests.accept` (worker only; transitions OPEN → ASSIGNED, sets assignedWorkerId to caller)
- [ ] Mutation `serviceRequests.start` (assigned worker only; ASSIGNED → IN_PROGRESS)
- [ ] Mutation `serviceRequests.complete` (assigned worker only; IN_PROGRESS → COMPLETED)
- [ ] Mutation `serviceRequests.cancel` (client owner or manager; any state → CANCELLED)
- [ ] Mutation `serviceRequests.assignWorker` (manager only; sets assignedWorkerId, status → ASSIGNED)
- [ ] Mutation `serviceRequests.setStatus` (manager only; arbitrary status override)
- [ ] Query `serviceRequests.listMyRequests` (client; uses `by_client` index)
- [ ] Query `serviceRequests.listOpen` (worker; status = OPEN, ordered by createdAt)
- [ ] Query `serviceRequests.listMyJobs` (worker; assignedWorkerId = caller, all non-cancelled)
- [ ] Query `serviceRequests.listAll` (manager only; paginated, filterable by status)
- [ ] Query `serviceRequests.getById` (client owner / assigned worker / any manager)
- [ ] Add `convex/seed.ts` internal mutation `seed.dev` creating 1 client / 2 workers / 1 manager / 3 sample requests for dev only
- [ ] convex-test: each authorization rule (client cannot read another client's request, worker cannot accept own client request, etc.)

### `apps/mobile`

- [ ] Client: `src/app/(client)/requests/new.tsx` — react-hook-form + zod resolver, fields per plan §10.2 (serviceType select, date/time pickers, notes textarea), submit calls `serviceRequests.create`, navigates to detail
- [ ] Client: `src/app/(client)/requests/index.tsx` — list of own requests (uses `useQuery(serviceRequests.listMyRequests)`), status badge, tap to detail
- [ ] Client: `src/app/(client)/requests/[requestId].tsx` — detail view, cancel button when status allows
- [ ] Client: `src/app/(client)/index.tsx` — home with "Create new request" CTA + recent requests
- [ ] Worker: `src/app/(worker)/jobs/index.tsx` — two sections: Open (acceptable) + My Jobs (assigned)
- [ ] Worker: `src/app/(worker)/jobs/[jobId].tsx` — detail with Accept / Start / Complete buttons depending on state
- [ ] Manager: `src/app/(manager)/requests/index.tsx` — all requests, filter by status
- [ ] Manager: `src/app/(manager)/requests/[requestId].tsx` — detail with assignWorker + setStatus controls
- [ ] Status badge component reused across roles
- [ ] Empty states for each list
- [ ] Realtime test: open client + manager on two devices/simulators, create a request as client, manager sees it appear; manager assigns, client sees status flip

---

## Phase 4 — Request-Scoped Chat (Mobile)

**Demo at end of phase:** When a worker accepts a request, a chat room is auto-created. Client and worker can message in real time. Manager can join/inspect any chat. Mobile chat list shows last message + timestamp per active chat. Chat detail shows messages with sender name + timestamp. New messages stream in without refresh.

### `packages/convex`

- [ ] Add `chatRooms` table per plan §11 (serviceRequestId, status, lastMessageText, lastMessageTime, createdAt, updatedAt; index `by_service_request`)
- [ ] Add `chatMessages` table (chatRoomId, senderId, text, createdAt; compound index `by_chat_room` on `[chatRoomId, createdAt]`)
- [ ] Mutation `chat.createRoomForRequest` (internal; called by `serviceRequests.accept`)
- [ ] Update `serviceRequests.accept` to invoke `chat.createRoomForRequest`
- [ ] Mutation `chat.sendMessage` (caller must be client owner / assigned worker / manager; updates `lastMessage*` on room)
- [ ] Query `chat.listForUser` (returns rooms where caller is participant or manager)
- [ ] Query `chat.getMessages` (paginated by `_creationTime`; authorization same as listForUser; cap 100 per page)
- [ ] Query `chat.getRoomForRequest`
- [ ] convex-test: client cannot read messages from a request they don't own; manager can read any room

### `apps/mobile`

- [ ] Client: `src/app/(client)/messages/index.tsx` — list of chats sorted by `lastMessageTime`
- [ ] Client: `src/app/(client)/messages/[chatRoomId].tsx` — message list (FlatList inverted) + composer
- [ ] Worker: `src/app/(worker)/messages/index.tsx` and `[chatRoomId].tsx` — same shape
- [ ] Manager: `src/app/(manager)/messages/index.tsx` — sees all rooms; `[chatRoomId].tsx` opens any
- [ ] Add link from request detail → chat room (if exists)
- [ ] Compose on Enter / Send button
- [ ] Optimistic message append on send
- [ ] Auto-scroll to bottom on new message; "scroll to bottom" pill when not at bottom
- [ ] Sender bubble styling: own messages right-aligned, others left-aligned
- [ ] Test realtime: two devices, send from one, message arrives on other within ~200ms

---

## Phase 5 — Manager Operations Inbox (Mobile)

**Demo at end of phase:** Manager mobile feels like a focused operations inbox, not a heavy dashboard. Overview tab shows urgent counts (active, blocked, unassigned). Requests tab is a filterable, sortable list. Workers tab shows worker roster + currently-assigned counts. Messages tab is from Phase 4. Profile is from Phase 1.

### `packages/convex`

- [ ] Query `manager.overview` returning counts: total active, in-progress, unassigned-open, completed-today
- [ ] Query `manager.listWorkers` returning workers with active assignment counts (`by_worker` aggregation)
- [ ] Query `manager.workerDetail` returning a worker's recent jobs
- [ ] convex-test: all manager queries reject non-manager callers

### `apps/mobile`

- [ ] Manager: `src/app/(manager)/index.tsx` — Overview screen with metric cards (parallax) + "needs attention" list
- [ ] Manager: `src/app/(manager)/requests/index.tsx` — already exists from Phase 3; add status/assignee filters and sort
- [ ] Manager: `src/app/(manager)/workers/index.tsx` — worker roster with avatar + active job count
- [ ] Manager: `src/app/(manager)/workers/[workerId].tsx` — worker detail with recent jobs list
- [ ] Pull-to-refresh on all list screens
- [ ] Empty states tuned for "nothing needs attention"

---

## Phase 6 — AI Features (Mobile)

**Demo at end of phase:** A mic button in the mobile UI. Tap and speak. Transcribed via Groq Whisper. A single Convex action classifies intent + extracts data in one LLM call (`generateObject`) and routes the result. Four supported intents:

1. **`create_service_request`** — opens the request form pre-filled (client reviews and submits).
2. **`draft_message`** — populates chat composer with the drafted message; if multiple chats could match, asks the user to pick.
3. **`summarize_request`** — opens summary view with a fast statusLine and a streamed markdown details body.
4. **`unknown`** — surfaces a fallback hint.

Plus a separate **reply suggestions** flow in the chat composer: 3 suggestions with a tone toggle (friendly/professional/supportive/funny).

AI never silently submits, sends, or assigns. User confirms every action.

### `packages/convex`

- [ ] Install `ai@latest` (Vercel AI SDK), and provider SDKs as needed (`@ai-sdk/openai`, `@ai-sdk/anthropic`)
- [ ] Add Convex env vars: `GROQ_API_KEY`, `AI_GATEWAY_API_KEY` (or direct provider keys: `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`)
- [ ] Configure `@convex-dev/agent` component (for streaming summary)
- [ ] Add `convex/ai/transcribe.ts` action: takes Convex storageId, fetches blob, POSTs to Groq Whisper, returns text
- [ ] Add `convex/ai/intents.ts` with shared zod schemas mirroring seniory's `mergedIntentSchema` adapted for service-ops:
  - intent: `create_service_request | draft_message | summarize_request | unknown`
  - service-request fields: serviceType, date, time, notes
  - draft-message fields: draftText, targetChatRoomId, ambiguous, candidateChatRoomIds
  - summarize fields: targetRequestId, ambiguous, candidateRequestIds
  - unknown fields: message
- [ ] Add `convex/ai/askAnything.ts` action: takes `(audioStorageId, clientContext)`, runs transcribe → `generateObject` with merged schema → returns intent envelope
  - `clientContext`: `{ screen, role, currentChatRoomId?, currentRequestId?, draftFormState? }`
  - Reuse seniory's prompt structure adapted for service-ops vocabulary
- [ ] Add `convex/ai/replySuggestions.ts` action: takes `(chatRoomId, composerText?, tone?)`, returns 3 suggestions (3-tone enum)
- [ ] Add `convex/ai/summary.ts`: two-step summary
  - Action `generateStatusLine` (non-streaming, fast)
  - Agent thread for `streamSummaryDetails` (markdown, streamed via `@convex-dev/agent`)
- [ ] convex-test: schema parsing of each intent envelope; auth rejection for non-participants

### `apps/mobile`

- [ ] Install `expo-av` (or `expo-audio` matching seniory's choice) for recording
- [ ] Create `src/components/voice/MicButton.tsx` — global floating mic; press-and-hold to record, release to send
- [ ] Recording UI: show waveform/timer while recording; show "transcribing…" then "thinking…" states
- [ ] On release: upload audio to Convex storage → call `ai.askAnything` with current `clientContext`
- [ ] Create `src/components/voice/IntentRouter.tsx` — switch on intent, dispatch:
  - `create_service_request` → navigate to `(client)/requests/new` with form pre-filled
  - `draft_message` (clear) → navigate to chat room, populate composer
  - `draft_message` (ambiguous) → bottom sheet with candidate chat list
  - `summarize_request` → bottom sheet with summary statusLine + streamed details
  - `unknown` → toast with hint message
- [ ] Mount mic + router in each role layout
- [ ] Chat composer: add "Suggest replies" button → calls `ai.replySuggestions`, shows 3 chips, tone selector toggle
- [ ] Tapping a suggestion fills composer (does not auto-send)
- [ ] Manager request detail: "Summarize" button → `ai.summary.generateStatusLine` then subscribe to streamed details via `@convex-dev/agent` thread
- [ ] Verify on device: voice → request draft round-trip works in <5s
- [ ] Verify multilingual: speak in Latvian, conversation language preserved correctly
- [ ] Verify no AI action takes any destructive step without explicit user confirmation

---

## Phase 7 — Web App (Port Mobile MVP to TanStack Start)

**Demo at end of phase:** All Phase 1–6 capabilities work on web at `https://<vercel-deployment-url>`. Same Convex backend, same Better Auth, same AI features. Manager web has a richer dashboard layout than mobile (sidebar nav + multi-pane request detail). Client web mirrors the mobile experience. Web uses static glass styling; no parallax motion. Voice features available on web via browser MediaRecorder API.

### `apps/web` (build out from Phase 0 stub)

- [ ] Configure TanStack Router file-based routes:
  - `/` (welcome / marketing)
  - `/login`, `/register`
  - `/client/*` (mirrors mobile client tabs)
  - `/dashboard/*` (worker + manager)
- [ ] Add ConvexProvider + Better Auth web client to `__root.tsx`
- [ ] Implement same auth screens with Better Auth web SDK (Google + GitHub + email/password)
- [ ] Implement role redirect: after `ensureAppUser`, route by role (client → `/client`, worker → `/dashboard/jobs`, manager → `/dashboard`)
- [ ] Build static `GlassCard`, `GlassSurface` components in `src/components/glass/` using Tailwind 4 + `backdrop-blur` (no motion)
- [ ] Port client request flow: `/client/requests`, `/client/requests/new`, `/client/requests/$requestId`
- [ ] Port worker job flow: `/dashboard/jobs`, `/dashboard/jobs/$jobId`
- [ ] Port chat: `/client/messages`, `/dashboard/messages`, `[chatRoomId]`
- [ ] Build manager dashboard layout: sidebar nav (Overview / Requests / Workers / Messages / Profile), multi-pane on `lg:` breakpoint
- [ ] Manager web routes: `/dashboard`, `/dashboard/requests`, `/dashboard/workers`, `/dashboard/workers/$workerId`
- [ ] Voice: browser MediaRecorder → upload to Convex storage → reuse `ai.askAnything` action
- [ ] Reply suggestions UI in web chat composer
- [ ] Streamed summary in web manager request detail
- [ ] Responsive: client/worker views work on tablet; manager views target desktop
- [ ] Validate Vercel deployment: `vercel deploy` from `apps/web`, env vars threaded through
- [ ] Verify Convex websocket works through Vercel CDN (no caching issues)

---

## Out of Scope of This PRD

The following are explicitly excluded from this PRD and will be addressed separately:

- Production deployment (EAS production builds, App Store / Play Store submission, Vercel production domain)
- Sentry / observability / error tracking
- Push notifications (Expo Notifications)
- Email verification, password reset flow
- Analytics dashboard, advanced scheduling, worker availability calendar
- Multi-role support (one role per user in MVP; helpers prepare for future migration)
- Organizations, invitations, payments
- AI automation that performs actions without explicit user confirmation

---

## Glossary

- **OPEN** — request created, no worker assigned
- **ASSIGNED** — worker accepted or manager assigned a worker
- **IN_PROGRESS** — worker has started the job
- **COMPLETED** — worker has finished the job
- **CANCELLED** — request was cancelled by client or manager
- **Operations Inbox** — manager mobile experience focused on urgent operational visibility, not analytics
- **Ask Anything** — voice-driven entry point that classifies intent in one LLM call and routes to the right outcome (pattern adapted from seniory)
