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

- [ ] Create `apps/web/public/` directory.
- [ ] Add `apps/web/public/manifest.webmanifest` with locked values: `name`, `short_name`, `start_url: "/redirect?utm_source=pwa"`, `scope: "/"`, `display: "standalone"`, `background_color: "#0a0d14"`, `theme_color: "#0a0d14"`, `orientation: "portrait-primary"`.
- [ ] Add `apps/web/scripts/generate-icons.ts` — reads `../../icon.png`, writes derivative sizes via `sharp`.
- [ ] Add `sharp` to `apps/web/devDependencies`.
- [ ] Generate and commit `apps/web/public/icons/icon-192.png` (192×192, `purpose: any`).
- [ ] Generate and commit `apps/web/public/icons/icon-512.png` (512×512, `purpose: any`).
- [ ] Generate and commit `apps/web/public/icons/icon-maskable-512.png` — source composited at ~80% scale onto `#0a0d14` canvas for safe zone (`purpose: maskable`).
- [ ] Generate and commit `apps/web/public/icons/apple-touch-icon.png` (180×180).
- [ ] Generate and commit `apps/web/public/favicon.ico` (multi-size 16/32/48).
- [ ] Reference all three `purpose` variants in manifest `icons` array.
- [ ] Inject manifest link, theme-color meta, viewport (`viewport-fit=cover`), `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent` via `__root.tsx` `head()`.
- [ ] Inject `apple-touch-icon` link via `__root.tsx`.
- [ ] Add `bun run icons` script that re-runs the generator on logo change.

## Phase 2 — Service Worker

- [ ] Create `apps/web/sw-template.js` with `__BUILD_ID__` and `__PRECACHE_LIST__` placeholders.
- [ ] Implement install handler: pre-fetch `/offline.html`, `/manifest.webmanifest`, all 5 icons, all 5 splash images.
- [ ] Implement activate handler: delete any cache whose name does not match current `CACHE_NAME = "service-ops-v" + BUILD_ID`.
- [ ] Implement fetch handler with three branches:
  - [ ] Navigation requests: network-only with fallback to cached `/offline.html` on failure.
  - [ ] Hashed JS/CSS/asset requests (match URL pattern with content hash): cache-first, populate runtime cache on miss.
  - [ ] All other requests (Convex, auth, API): network-only, no caching.
- [ ] Skip caching for any request to `*convex.cloud*`, `*better-auth*`, paths containing `/api/`, or requests with an `Authorization` header.
- [ ] Do NOT call `skipWaiting()` or `clients.claim()`.
- [ ] Create `apps/web/scripts/build-sw.ts` postbuild script — reads Nitro client manifest, replaces placeholders, writes `dist/sw.js` (or whatever Nitro serves from app root).
- [ ] Wire postbuild script into `package.json`: `"build": "vite build && bun run scripts/build-sw.ts"`.
- [ ] Inject `BUILD_ID` from `process.env.VERCEL_GIT_COMMIT_SHA` (fallback to timestamp for local).
- [ ] Create `apps/web/src/lib/register-sw.ts` — registers `/sw.js` only in `import.meta.env.PROD`; in dev, actively unregisters any leftover SW from prior `vite preview` runs.
- [ ] Call `registerServiceWorker()` from `__root.tsx` (client-side `useEffect`, not during SSR).
- [ ] Create `apps/web/public/offline.html` — static, no React, brand color background, "You're offline" copy, retry button (`location.reload()`).
- [ ] Verify SW does not break HMR by running `bun run dev` after wiring.
- [ ] Verify SW activates by running `bun run build && bun run preview`.

## Phase 3 — Install Experience

- [ ] Create `apps/web/src/lib/use-pwa-install.ts` — captures `beforeinstallprompt`, exposes `{ canInstall, promptInstall, isInstalled }`.
- [ ] Detect installed state via `window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true`.
- [ ] Detect iOS Safari via UA + `'standalone' in navigator` to decide between `prompt()` flow and "Add to Home Screen" instructions.
- [ ] Suppress all install UI when `isInstalled === true`.
- [ ] Create `apps/web/src/components/install-prompt-modal.tsx` for clients — fired post first request submission.
- [ ] Create `apps/web/src/components/install-banner.tsx` for managers and workers — small inline banner near top of dashboard, dismissable.
- [ ] Create `apps/web/src/components/ios-install-instructions.tsx` — modal showing iOS share-icon glyph + "Tap Share → Add to Home Screen" copy.
- [ ] On client first-request-submit success, show `install-prompt-modal` (Android/desktop) or `ios-install-instructions` (iOS).
- [ ] On manager dashboard, mount `install-banner` until dismissed or installed.
- [ ] On worker dashboard, mount `install-banner` until dismissed or installed (no native-app CTA in v1).
- [ ] Persist dismissal in `localStorage` under key `pwa-install-dismissed-v1`.
- [ ] Add "Install app" entry in profile settings page that re-opens the install flow regardless of dismissal.
- [ ] Do not auto-re-prompt after dismissal in v1.

## Phase 4 — Role-Based PWA UX

### Client surface

- [ ] Audit `/client` and child routes for mobile viewport rendering at 375px width.
- [ ] Make "Create request" the primary home CTA on `/client`.
- [ ] Add request status timeline component on `/client/requests/$id`.
- [ ] Add chat shortcut button from request detail to `/client/messages/$threadId`.
- [ ] Apply safe-area inset utilities (`pt-safe`, `pb-safe`) to top-level role layout containers.
- [ ] Verify form keyboards do not break the request creation flow on iOS Safari standalone.

### Manager surface

- [ ] Audit `/dashboard` and child routes for tablet (768px) and mobile (375px) layouts.
- [ ] Add compact manager mobile layout for `/dashboard`.
- [ ] Add "needs attention" view (definition: requests open >24h with no assignment).
- [ ] Add quick filters on `/dashboard/requests`: Open, Assigned, In Progress, Completed.
- [ ] Apply safe-area inset utilities to manager layout containers.

### Worker surface

- [ ] Audit `/dashboard/jobs` for mobile (375px) layout.
- [ ] Ensure accept / start / complete buttons meet 44×44px minimum touch target.
- [ ] Verify worker lifecycle mutations (accept/start/complete) work cleanly when triggered from PWA.
- [ ] Apply safe-area inset utilities to worker layout containers.

## Phase 5 — Offline Behavior (in-session)

- [ ] Create `apps/web/src/lib/use-is-online.ts` — combines `navigator.onLine`, `window` online/offline events, and Convex `client.connectionState()`. Treats `connecting` as online to avoid banner flapping.
- [ ] Create `apps/web/src/components/offline-banner.tsx` — sticky top banner, dark surface, "You're offline. Reconnect to continue."
- [ ] Mount `<OfflineBanner />` in `/client/route.tsx`, `/dashboard/route.tsx`.
- [ ] Disable client request creation submit button when `!isOnline`.
- [ ] Disable chat composer send button when `!isOnline`.
- [ ] Disable worker lifecycle action buttons (accept/start/complete) when `!isOnline`.
- [ ] Show inline "you're offline" hint near each disabled action.
- [ ] Do NOT optimistically render submitted chat messages or created requests when offline.
- [ ] On reconnect (Convex transitions to `connected`), auto-dismiss banner.

## Phase 6 — Push Notifications (Bracket 1 Only)

### Provider + plumbing

- [ ] Generate VAPID key pair, store private key in Convex env (`VAPID_PRIVATE_KEY`), public key as a public env var.
- [ ] Add `web-push` package to `packages/convex` dependencies.
- [ ] Add Convex schema table `pushSubscriptions` keyed by `userId` with fields: `endpoint`, `keys.p256dh`, `keys.auth`, `userAgent`, `createdAt`.
- [ ] Add `convex/pushSubscriptions.ts` mutations: `subscribe`, `unsubscribe`, `listForUser`.
- [ ] Add `convex/pushSubscriptions.ts` action `sendPushToUser(userId, payload)` — fans out to all subscriptions for the user, removes 410-Gone subscriptions automatically.
- [ ] Wire `sendPushToUser` calls from existing mutations:
  - [ ] `requests.assignWorker` → push to assigned worker.
  - [ ] `requests.acceptByWorker` → push to client.
  - [ ] `requests.markCompleted` → push to client.
- [ ] Make push sends fail-soft — do not fail the parent mutation if push delivery fails.

### Client-side

- [ ] Create `apps/web/src/lib/use-push-subscription.ts` — reads current `Notification.permission`, exposes `{ status, request, unsubscribe }` where `status` is one of `default | granted | denied | dismissed | unsupported`.
- [ ] Detect Web Push support: bail with `unsupported` on Safari < 16.4 or non-installed iOS Safari.
- [ ] On grant, call `pushManager.subscribe()` with the VAPID public key, send subscription to Convex `subscribe` mutation.
- [ ] On `unsubscribe`, call `subscription.unsubscribe()` and Convex `unsubscribe` mutation.
- [ ] Create `apps/web/src/components/push-permission-banner.tsx` — handles all five permission states with appropriate copy.
- [ ] Mount push permission banner on `/dashboard/jobs` (worker), persistent until granted/dismissed.
- [ ] Show post-first-request push permission CTA on `/client` alongside the install prompt.
- [ ] Surface iOS limitation copy: "Notifications on iPhone require iOS 16.4+ and the installed app."
- [ ] Add "Notifications" toggle in profile settings — calls `request` or `unsubscribe`.

### Service worker push handlers

- [ ] Add `push` event handler to `sw-template.js`: parse JSON payload, call `self.registration.showNotification(title, options)`.
- [ ] Add `notificationclick` handler: open or focus the relevant route (`/client/requests/$id` or `/dashboard/jobs/$id`).
- [ ] Notification payload shape: `{ title, body, url, tag }` where `tag` deduplicates rapid duplicates.

## Phase 7 — iOS Quality

- [ ] Generate iPhone 14/15 Pro Max splash (1290×2796) — `#0a0d14` canvas, `/icon.png` centered at ~40% width.
- [ ] Generate iPhone 14/15 Pro splash (1179×2556).
- [ ] Generate iPhone 12/13/14 splash (1170×2532).
- [ ] Generate iPhone SE / 8 splash (750×1334).
- [ ] Generate iPad Pro 11" splash (1668×2388).
- [ ] Add `<link rel="apple-touch-startup-image">` tags for all 5 sizes via `__root.tsx` head, each with appropriate `media` query for device dimensions + DPR.
- [ ] Verify Add to Home Screen works on iOS Safari.
- [ ] Verify app opens in standalone mode (no Safari chrome) after install.
- [ ] Verify Better Auth session persists across standalone-mode launches (cookie scope must match origin).
- [ ] Verify Convex websocket reconnects cleanly after iOS app resume from background.
- [ ] Verify back swipe gesture does not exit the PWA.
- [ ] Verify chat composer keyboard does not push fixed-position UI off-screen.
- [ ] Verify safe-area insets on notched devices (test on iPhone 14 Pro size simulator).
- [ ] Verify icon renders correctly on home screen at all sizes.
- [ ] Verify status bar tint matches `#0a0d14` in standalone mode.

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
