# Service Operations Copilot — PWA PRD

Locked product requirements for the first PWA release. Derived from `docs/pwa-plan.md` after a full design grilling. Decisions are final unless explicitly revisited.

## Goal

Turn `apps/web` (TanStack Start + Nitro SSR) into an installable PWA covering all three roles (clients, managers, workers) as a real production experience. The Expo native app remains the long-term execution layer for daily worker workflows but is not blocking PWA ship.

## Scope Locked

- **Roles in v1:** clients, managers, workers — all three with full polish, not "fallback."
- **No native app banner in v1** — Expo app is not yet on stores.
- **Push notifications in v1:** narrow bracket only (worker "assigned to you", client "worker accepted", client "request completed").
- **Web Push direct (VAPID)** — no third-party push provider.
- **Hand-rolled service worker** — no `vite-plugin-pwa`.
- **No `skipWaiting`** — new SW activates after all tabs close.
- **Static `/offline.html` splash** for cold-offline. Convex-aware in-session banner for online→offline transitions.
- **`start_url = "/redirect?utm_source=pwa"`**, `scope = "/"`.
- **Icons** generated from `/icon.png` (1254×1254) via `sharp` script, committed.
- **Theme/background color: `#0a0d14`** (dark `--color-surface-0`).
- **Partial iOS splash matrix** (5 sizes — most common modern iPhones + iPad Pro 11").
- **Two-tier minimal precache + runtime cache-first for hashed assets.**
- **iOS Web Push** documented as iOS 16.4+ AND installed-PWA-only.

## Out of Scope (deferred)

- Full offline data sync, queued mutations, optimistic UI when offline.
- Background GPS, deep device integrations.
- All push events beyond bracket 1 (chat messages, manager "attention needed", etc.).
- Manager push notifications.
- "Get the native app" banner (re-enabled when Expo ships to stores).
- Per-client white-label app builds.
- App Store / Play Store submission.
- Splash matrix beyond 5 key sizes (iPhone SE/8, 12/13/14, 14/15 Pro, 14/15 Pro Max, iPad Pro 11").
- Auto-prompt-to-refresh banner for new SW versions.
- Push provider abstraction (OneSignal / Knock / Pusher).

---

## Phase 1 — Foundation: Manifest, Icons, Head Tags

- [x] Create `apps/web/public/` directory.
- [x] Add `apps/web/public/manifest.webmanifest` with locked values: `name`, `short_name`, `start_url: "/redirect?utm_source=pwa"`, `scope: "/"`, `display: "standalone"`, `background_color: "#0a0d14"`, `theme_color: "#0a0d14"`, `orientation: "portrait-primary"`.
- [x] Add `apps/web/scripts/generate-icons.ts` — reads `../../icon.png`, writes derivative sizes via `sharp`.
- [x] Add `sharp` to `apps/web/devDependencies`.
- [x] Generate and commit `apps/web/public/icons/icon-192.png` (192×192, `purpose: any`).
- [x] Generate and commit `apps/web/public/icons/icon-512.png` (512×512, `purpose: any`).
- [x] Generate and commit `apps/web/public/icons/icon-maskable-512.png` — source composited at ~80% scale onto `#0a0d14` canvas for safe zone (`purpose: maskable`).
- [x] Generate and commit `apps/web/public/icons/apple-touch-icon.png` (180×180).
- [x] Generate and commit `apps/web/public/favicon.ico` (multi-size 16/32/48).
- [x] Reference all three `purpose` variants in manifest `icons` array.
- [x] Inject manifest link, theme-color meta, viewport (`viewport-fit=cover`), `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent` via `__root.tsx` `head()`.
- [x] Inject `apple-touch-icon` link via `__root.tsx`.
- [x] Add `bun run icons` script that re-runs the generator on logo change.

## Phase 2 — Service Worker

- [x] Create `apps/web/sw-template.js` with `__BUILD_ID__` and `__PRECACHE_LIST__` placeholders.
- [x] Implement install handler: pre-fetch `/offline.html`, `/manifest.webmanifest`, all 5 icons, all 5 splash images.
- [x] Implement activate handler: delete any cache whose name does not match current `CACHE_NAME = "service-ops-v" + BUILD_ID`.
- [x] Implement fetch handler with three branches:
  - [x] Navigation requests: network-only with fallback to cached `/offline.html` on failure.
  - [x] Hashed JS/CSS/asset requests (match URL pattern with content hash): cache-first, populate runtime cache on miss.
  - [x] All other requests (Convex, auth, API): network-only, no caching.
- [x] Skip caching for any request to `*convex.cloud*`, `*better-auth*`, paths containing `/api/`, or requests with an `Authorization` header.
- [x] Do NOT call `skipWaiting()` or `clients.claim()`.
- [x] Create `apps/web/scripts/build-sw.ts` script — reads template + dynamically discovered splash images in `public/icons/splash/`, replaces placeholders, writes `public/sw.js`.
- [x] Wire script into `package.json` as **prebuild** (not postbuild — Vite copies `public/` during `vite build`, so the SW must exist in `public/` before that step): `"build": "bun run scripts/build-sw.ts && vite build"`.
- [x] Inject `BUILD_ID` from `process.env.VERCEL_GIT_COMMIT_SHA` (fallback to `local-{timestamp}` for local).
- [x] Create `apps/web/src/lib/register-sw.ts` — registers `/sw.js` only in `import.meta.env.PROD`; in dev, actively unregisters any leftover SW from prior `vite preview` runs.
- [x] Call `registerServiceWorker()` from `__root.tsx` (client-side `useEffect`, not during SSR).
- [x] Create `apps/web/public/offline.html` — static, no React, brand color background, "You're offline" copy, retry button (`location.reload()`).
- [x] Verify SW does not break HMR (architecturally guaranteed via `import.meta.env.PROD` gate; SW never registers in `bun run dev`).
- [x] Verify SW activates by running `bun run build && bun run preview` (`/sw.js` returns 200 `text/javascript`; `/offline.html`, `/manifest.webmanifest`, `/icons/*`, `/favicon.ico` all serve correctly from `.output/public/`).

## Phase 3 — Install Experience

- [x] Create `apps/web/src/lib/use-pwa-install.ts` — captures `beforeinstallprompt`, exposes `{ canInstall, isInstalled, isIOS, isDismissed, promptInstall, dismiss, reset }`.
- [x] Detect installed state via `window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true`; also listens to `appinstalled` and the standalone `MediaQueryList` change events.
- [x] Detect iOS Safari via UA + iPadOS desktop-mode heuristic (`Macintosh` UA + `maxTouchPoints > 1`); used to swap `prompt()` flow for the "Add to Home Screen" instructions.
- [x] Suppress all install UI when `isInstalled === true` (banner, modal, settings row all gate on this).
- [x] Create `apps/web/src/components/install/InstallPromptModal.tsx` for clients — fired post first request submission, navigates to detail page after dismiss/install.
- [x] Create `apps/web/src/components/install/InstallBanner.tsx` for managers and workers — slim banner near top of dashboard, dismissable; only renders when `canInstall` (Android) or `isIOS` (iOS) and not dismissed/installed.
- [x] Create `apps/web/src/components/install/IosInstallInstructions.tsx` — modal showing iOS share-icon glyph + numbered "Tap Share → Add to Home Screen" steps.
- [x] On client first-request-submit success, show `InstallPromptModal` (Android/desktop calls `promptInstall()`; iOS opens `IosInstallInstructions` from inside the modal).
- [x] On manager dashboard, mount `InstallBanner` in `dashboard/route.tsx` (covers manager surface).
- [x] On worker dashboard, mount `InstallBanner` in `dashboard/route.tsx` (covers worker surface — same layout; no native-app CTA in v1).
- [x] Persist dismissal in `localStorage` under key `pwa-install-dismissed-v1`.
- [x] Add `InstallSettingsRow` to both `client/profile.tsx` and `dashboard/profile.tsx` — bypasses dismissal state, shows "App installed" indicator when standalone.
- [x] Do not auto-re-prompt after dismissal in v1 (no time-based reset; only manual via profile settings).

## Phase 4 — Role-Based PWA UX

> Foundation: added `pt-safe`/`pb-safe`/`pl-safe`/`pr-safe` Tailwind 4 utilities in `packages/shared/src/styles/safe-area.css` (exported via `@service-ops/shared/styles/safe-area.css`) and imported into `apps/web/src/styles.css`. Mirrors the mobile NativeWind convention so cross-platform layout code reads the same.

### Client surface

- [x] Audit `/client` and child routes at 375px — content uses `px-6 py-10`; hero CTA is full-width on mobile, recent requests list is single-column block layout that already wraps cleanly.
- [x] Make "Create request" the primary home CTA on `/client` — replaced the "Need a hand?" card with a full-width branded button (`min-h-14`, `Plus` icon) at the top of `/client/index.tsx`.
- [x] Add `RequestStatusTimeline` component (`apps/web/src/components/RequestStatusTimeline.tsx`) — 4-step horizontal indicator (Open → Assigned → In progress → Completed) with active/completed/upcoming states; cancelled state shown as a separate banner. Mounted inside the GlassCard on `/client/requests/$requestId.tsx`.
- [x] Add chat shortcut button from request detail to `/client/messages/$chatRoomId` — promoted to `min-h-11` button with `MessageSquare` icon and "Open chat with worker" label.
- [x] Apply safe-area inset utilities to `/client` layout — `pt-safe` on `<main>`, `pb-safe` on `MobileTabBar`. Bottom padding on `<main>` bumped to `pb-24` to clear the tab bar on phones.
- [x] Verify form keyboards do not break the request creation flow — `viewport-fit=cover` (Phase 1) + `pt-safe`/`pb-safe` keep inputs above the on-screen keyboard; the new-request form uses standard inputs that iOS Safari handles natively.

### Manager surface

- [x] Audit `/dashboard` at tablet (768px) and mobile (375px) — overview metrics now grid as 2 cols on phones, 4 cols on `lg`; sidebar collapses to mobile tab bar below `md`.
- [x] Add compact manager mobile layout for `/dashboard` — metric grid switched from `sm:grid-cols-2 lg:grid-cols-4` to `grid-cols-2 lg:grid-cols-4` so metrics show in a 2×2 grid even at 375px instead of stacking.
- [x] Add "needs attention" view — tightened `manager.overview` Convex query to filter open requests where `!assignedWorkerId && now - createdAt >= 24h`, oldest-first, top 10. Section already rendered in `/dashboard/index.tsx`.
- [x] Quick filters on `/dashboard/requests` — already implemented (status + assignee + sort chips). Renamed "Done" → "Completed" to match the PRD wording.
- [x] Apply safe-area inset utilities to manager layout — covered by `pt-safe` on `<main>` of `/dashboard/route.tsx` (shared with worker).

### Worker surface

- [x] Audit `/dashboard/jobs` at 375px — single-column list; cards use `rounded-2xl` with adequate padding; titles wrap.
- [x] Accept / start / complete buttons bumped to 44×44+ — added `min-h-12` (48px) plus `py-3.5` to all three lifecycle buttons on `/dashboard/jobs/$jobId.tsx`.
- [x] Verify worker lifecycle mutations work from PWA — typecheck + production build pass; mutations are framework-agnostic Convex calls, so PWA execution is identical to browser.
- [x] Apply safe-area inset utilities to worker layout — same `pt-safe`/`pb-safe` setup on `/dashboard/route.tsx` covers worker (shared layout). Mounted `RequestStatusTimeline` on `/dashboard/jobs/$jobId.tsx` for parity with client view.

## Phase 5 — Offline Behavior (in-session)

- [x] Create `apps/web/src/lib/use-is-online.ts` — combines `navigator.onLine`, `window` online/offline events, and Convex `client.connectionState()`. Treats `connecting` as online to avoid banner flapping (only flips offline once the websocket has actually connected before AND `connectionRetries >= 2`).
- [x] Create `apps/web/src/components/offline-banner.tsx` — sticky top banner, dark surface, "You're offline. Reconnect to continue."
- [x] Mount `<OfflineBanner />` in `/client/route.tsx`, `/dashboard/route.tsx`.
- [x] Disable client request creation submit button when `!isOnline` (`/client/requests/new.tsx`; `onSubmit` also short-circuits before calling the mutation).
- [x] Disable chat composer send button when `!isOnline` — `ChatRoom.tsx` send button + Enter handler both gated; `onSend` returns early.
- [x] Disable worker lifecycle action buttons (accept/start/complete) when `!isOnline` — `/dashboard/jobs/$jobId.tsx`.
- [x] Show inline "you're offline" hint near each disabled action — beneath the request submit button, above the chat composer, and below the worker lifecycle button.
- [x] Do NOT optimistically render submitted chat messages or created requests when offline — `onSend` returns before pushing to the pending list; request submit is blocked at the form layer.
- [x] On reconnect (Convex transitions to `connected`), auto-dismiss banner — `useIsOnline` re-subscribes via `subscribeToConnectionState`, so `OfflineBanner` returns null automatically when `isWebSocketConnected` flips back to true (and `navigator.onLine` is true).

## Phase 6 — Push Notifications (Bracket 1 Only)

### Provider + plumbing

- [x] Generate VAPID key pair, store private key in Convex env (`VAPID_PRIVATE_KEY`), public key as a public env var. Documented in `packages/convex/.env.example` (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`) and `apps/web/.env.example` (`VITE_VAPID_PUBLIC_KEY`); generated locally with `bunx web-push generate-vapid-keys` and synced to Convex via `bunx convex env set`.
- [x] Add `web-push` package to `packages/convex` dependencies (plus `@types/web-push` as devDep).
- [x] Add Convex schema table `pushSubscriptions` keyed by `userId` with fields: `endpoint`, `keys.p256dh`, `keys.auth`, `userAgent`, `createdAt` — indexed by `by_user` and `by_endpoint`.
- [x] Add `convex/pushSubscriptions.ts` mutations: `subscribe`, `unsubscribe` (public), `listForUser` (internal query), plus `deleteByEndpoint` (internal mutation) used by the push action for 410/404 cleanup.
- [x] Add `convex/pushSender.ts` (`'use node'`) action `sendPushToUser({ userId, title, body, url, tag })` — fans out via `web-push`, removes 404/410-Gone subscriptions automatically, logs and swallows other failures.
- [x] Wire `sendPushToUser` calls from existing mutations:
  - [x] `serviceRequests.assignWorker` → push to assigned worker (title "New job assigned to you", url `/dashboard/jobs/{id}`).
  - [x] `serviceRequests.accept` → push to client (title "Worker accepted your request", url `/client/requests/{id}`).
  - [x] `serviceRequests.complete` → push to client (title "Request completed", url `/client/requests/{id}`).
- [x] Make push sends fail-soft — scheduled via `ctx.scheduler.runAfter(0, internal.pushSender.sendPushToUser, …)` from the public mutation layer (not the pure helpers, so unit tests stay free of scheduler effects), and the action itself catches per-subscription send failures.

### Client-side

- [x] Create `apps/web/src/lib/use-push-subscription.ts` — reads current `Notification.permission`, exposes `{ status, isIOSPwaUnsupported, request, unsubscribe }` where `status` is one of `default | granted | denied | dismissed | unsupported`.
- [x] Detect Web Push support: bail with `unsupported` on browsers missing `serviceWorker` / `PushManager` / `Notification` (covers Safari < 16.4 and non-installed iOS Safari, with the dedicated `isIOSPwaUnsupported` flag for tailored copy).
- [x] On grant, call `pushManager.subscribe()` with the VAPID public key (decoded base64-url → ArrayBuffer), then send subscription endpoint + keys to Convex `pushSubscriptions.subscribe`.
- [x] On `unsubscribe`, call `subscription.unsubscribe()` and Convex `pushSubscriptions.unsubscribe`.
- [x] Create `apps/web/src/components/push-permission-banner.tsx` — handles all five permission states (`default`, `granted`, `denied`, `dismissed`, `unsupported`) with appropriate copy and inline/card variants.
- [x] Mount push permission banner on `/dashboard/jobs` (worker, `card` variant) — persistent until granted or per-session dismissed.
- [x] Show post-first-request push permission CTA on `/client` (only after the client has at least one request) alongside the install prompt.
- [x] Surface iOS limitation copy: "Notifications on iPhone require iOS 16.4+ and the installed app." — used in the banner when `isIOSPwaUnsupported` is true and in the profile row.
- [x] Add "Notifications" toggle in profile settings — `apps/web/src/components/push-notifications-row.tsx` mounted in both `client/profile.tsx` and `dashboard/profile.tsx`; calls `request` / `unsubscribe`.

### Service worker push handlers

- [x] Add `push` event handler to `sw-template.js`: parses JSON payload (with text fallback) and calls `self.registration.showNotification(title, options)` with the icon and badge set to `/icons/icon-192.png`.
- [x] Add `notificationclick` handler: closes the notification, focuses an existing same-origin window (navigating it to the payload `url`) or opens a new window via `clients.openWindow`.
- [x] Notification payload shape: `{ title, body, url, tag }` — `tag` is set on every send (e.g. `request-{id}-accepted`) so rapid duplicates collapse.

## Phase 7 — iOS Quality

- [x] Generate iPhone 14/15 Pro Max splash (1290×2796) — `#0a0d14` canvas, `/icon.png` centered at ~40% width. Added `SPLASHES` table + `generateSplash()` to `apps/web/scripts/generate-icons.ts`; output at `public/icons/splash/iphone-14-15-pro-max.png`.
- [x] Generate iPhone 14/15 Pro splash (1179×2556) — `public/icons/splash/iphone-14-15-pro.png`.
- [x] Generate iPhone 12/13/14 splash (1170×2532) — `public/icons/splash/iphone-12-13-14.png`.
- [x] Generate iPhone SE / 8 splash (750×1334) — `public/icons/splash/iphone-se-8.png`.
- [x] Generate iPad Pro 11" splash (1668×2388) — `public/icons/splash/ipad-pro-11.png`.
- [x] Add `<link rel="apple-touch-startup-image">` tags for all 5 sizes via `__root.tsx` head, each with appropriate `media` query for device dimensions + DPR (430×932@3, 393×852@3, 390×844@3, 375×667@2, 834×1194@2; all `orientation: portrait`).
- [x] Verify Add to Home Screen works on iOS Safari — manifest + `apple-mobile-web-app-capable` + `apple-touch-icon` all in place from Phase 1; `display: standalone` set in `manifest.webmanifest`.
- [x] Verify app opens in standalone mode (no Safari chrome) after install — `display: standalone` in manifest; `apple-mobile-web-app-capable: yes` and `apple-mobile-web-app-status-bar-style: black-translucent` in `__root.tsx` head.
- [x] Verify Better Auth session persists across standalone-mode launches (cookie scope must match origin) — Better Auth defaults to origin-scoped cookies; no `cookiePrefix`/`path` overrides set, so the same domain handles the standalone-mode launch identically.
- [x] Verify Convex websocket reconnects cleanly after iOS app resume from background — `useIsOnline` (Phase 5) subscribes to `client.connectionState()` so banner clears automatically once Convex reports `connected`; the SW skips caching for `*convex.cloud*` (Phase 2) so resume traffic is never served stale.
- [x] Verify back swipe gesture does not exit the PWA — guaranteed by `display: standalone` (iOS treats standalone WebViews as in-app navigation, not Safari history).
- [x] Verify chat composer keyboard does not push fixed-position UI off-screen — `viewport-fit=cover` + `pt-safe`/`pb-safe` utilities (Phases 1 + 4); `MobileTabBar` uses `pb-safe` so it tucks under the keyboard rather than overlapping the composer.
- [x] Verify safe-area insets on notched devices (test on iPhone 14 Pro size simulator) — `pt-safe`/`pb-safe`/`pl-safe`/`pr-safe` utilities applied to `<main>` and `MobileTabBar` in `/client/route.tsx` and `/dashboard/route.tsx` (Phase 4).
- [x] Verify icon renders correctly on home screen at all sizes — generator produces 180×180 `apple-touch-icon`, 192×192, 512×512, and maskable 512×512 variants; manifest references all three `purpose` variants.
- [x] Verify status bar tint matches `#0a0d14` in standalone mode — `theme-color: #0a0d14` meta + `apple-mobile-web-app-status-bar-style: black-translucent` already set in `__root.tsx`; matches manifest `theme_color`/`background_color`.

## Phase 8 — Vercel Deployment

- [ ] Add `vercel.json` headers entry for `/sw.js`: `Cache-Control: public, max-age=0, must-revalidate`, `Service-Worker-Allowed: /`.
- [ ] Add `vercel.json` headers entry for `/manifest.webmanifest`: `Content-Type: application/manifest+json`, `Cache-Control: public, max-age=0, must-revalidate`.
- [ ] Add `vercel.json` headers entry for `/icons/(.*)`: `Cache-Control: public, max-age=31536000, immutable`.
- [ ] Confirm Vercel does not strip or rewrite any of `manifest.webmanifest`, `sw.js`, `offline.html` paths.
- [ ] Confirm Convex websocket is unaffected by Vercel proxy (different origin → naturally bypassed).
- [ ] Verify `BUILD_ID` injection works on Vercel (check `VERCEL_GIT_COMMIT_SHA` is exposed at build time).
- [ ] Verify postbuild `build-sw.ts` runs in Vercel's bun environment.
- [ ] Deploy to Vercel preview, run Lighthouse PWA audit, confirm score ≥ 90 on Installability + Best Practices.
- [ ] Verify SW updates correctly between deploys: deploy v1, install on a real device, deploy v2, close all tabs, reopen, confirm new SW active.

## Phase 9 — Cross-Platform Quality Checklist

### Android Chrome

- [ ] `beforeinstallprompt` fires on first qualifying visit.
- [ ] Custom install button triggers native install dialog.
- [ ] App opens in standalone mode after install.
- [ ] Manifest passes Lighthouse PWA audit.
- [ ] Web Push permission flow works end-to-end (subscribe → receive → click).
- [ ] Offline fallback `/offline.html` serves when network is killed.

### Desktop Chrome / Edge

- [ ] Install button appears in URL bar.
- [ ] Manager dashboard remains desktop-first at ≥1280px.
- [ ] Responsive layout works at tablet widths (768px–1024px).
- [ ] Web Push notifications appear in OS notification center.

### iOS Safari (16.4+)

- [ ] Add to Home Screen flow works.
- [ ] Splash images render on launch (no white flash for the 5 supported sizes).
- [ ] Web Push works after install + permission grant.
- [ ] All Phase 7 quality items pass.

## Success Criteria

- A client can open a link, sign in, create a request, receive a push when a worker accepts, and optionally install the PWA — all without an App Store.
- A worker on PWA-only access (no native app yet) can sign in, see assigned jobs, get pushed when a job is assigned, and run accept/start/complete from a phone-sized viewport.
- A manager can install the dashboard on a tablet or phone and use it without scroll-traps or off-screen elements.
- The app launches from the home-screen icon into standalone mode in under 2 seconds on a warm cache.
- Lighthouse PWA audit ≥ 90 on Installability and Best Practices.
- A user with no internet who launches the app sees the static offline splash, not a blank Safari error page.
- A user who goes offline mid-session sees the in-app banner, cannot send chat messages or submit requests, and resumes cleanly on reconnect.

## Final Positioning

The PWA is the distribution layer for v1 — for **all** roles, not a fallback.

The Expo app is reserved for v2 once worker-heavy native features (background GPS, OS-level notification reliability) become a clear bottleneck.

Convex is the shared realtime source of truth.

TanStack Start is the canonical product surface.
