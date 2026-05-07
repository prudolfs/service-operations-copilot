# Service Operations Copilot — Web/PWA Plan

## Goal

Turn the existing TanStack React web app into an installable PWA for clients, managers, and lightweight worker access.

The PWA is not a replacement for the Expo native app. It is the low-friction distribution layer for SMB users, especially one-time clients and managers who do not need a full native install.

## Product Strategy

### Primary role of the PWA

The PWA should serve as:

- the default client experience
- the default manager web/mobile shortcut experience
- the fallback worker experience
- the easiest onboarding path for new businesses

### Platform split

| Role | Primary surface | Notes |
|---|---|---|
| Client | Web/PWA | Especially good for one-time or occasional users |
| Manager | Web/PWA | Dashboard-first, installable shortcut on mobile |
| Worker | Expo native | Native remains preferred for daily execution |
| Worker fallback | PWA | Useful when native install is not possible |

## Core Principle

The PWA should feel like an app, but should not pretend to be fully native.

Use it for:

- requests
- chat
- status updates
- manager overview
- installable access
- lightweight notifications later

Do not overpromise:

- full offline job execution
- background GPS
- deep device integrations
- native-level push reliability

## Phase 1 — PWA Foundation

### Web manifest

Add:

```txt
apps/web/public/manifest.webmanifest
````

Required fields:

```json
{
  "name": "Service Operations Copilot",
  "short_name": "Service Ops",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "orientation": "portrait-primary",
  "icons": []
}
```

Tasks:

* [ ] Add app icons: 192x192, 512x512
* [ ] Add maskable icon
* [ ] Add Apple touch icon
* [ ] Add manifest link in document head
* [ ] Add theme color meta tag
* [ ] Add mobile viewport meta tag

## Phase 2 — Service Worker

Add a service worker focused on app-shell caching.

### Cache strategy

Cache:

* app shell
* static assets
* icons
* CSS/JS build assets

Do not cache blindly:

* Convex realtime data
* auth/session requests
* chat messages
* request mutations

Recommended approach:

```txt
Offline shell: yes
Offline data sync: no, not for MVP
```

Tasks:

* [ ] Add service worker registration
* [ ] Cache static assets
* [ ] Show offline fallback page
* [ ] Avoid caching authenticated API/session responses
* [ ] Test production build on Vercel
* [ ] Verify service worker updates after deploy

## Phase 3 — Install Experience

### Client onboarding

Clients should not need to think about “PWA.”

Use language like:

```txt
Add Service Ops to your Home Screen for faster access.
```

Tasks:

* [ ] Add install prompt component
* [ ] Show install prompt after successful login or request creation
* [ ] Add iOS-specific “Add to Home Screen” instructions
* [ ] Add Android install prompt using `beforeinstallprompt`
* [ ] Do not block usage if user dismisses install
* [ ] Store dismissed state locally

## Phase 4 — Role-Based PWA UX

### Client PWA

Optimize for:

* create request
* view request status
* open request chat
* receive install suggestion after first request

Tasks:

* [ ] Make `/client` fully mobile-friendly
* [ ] Add “Create request” as primary home action
* [ ] Add request status timeline
* [ ] Add chat shortcut from request detail
* [ ] Add install prompt after successful first request

### Manager PWA

Optimize for:

* overview
* unassigned requests
* in-progress requests
* worker status
* chat inspection

Tasks:

* [ ] Ensure `/dashboard` works well on tablet/mobile
* [ ] Add compact manager mobile layout
* [ ] Add “needs attention” view
* [ ] Add quick filters: Open, Assigned, In Progress, Completed
* [ ] Add install prompt on manager dashboard

### Worker PWA fallback

Optimize for:

* open jobs
* assigned jobs
* accept/start/complete
* chat

Tasks:

* [ ] Ensure `/dashboard/jobs` is usable on mobile
* [ ] Keep worker actions large and touch-friendly
* [ ] Add native app recommendation banner
* [ ] Do not position PWA as the best worker experience

## Phase 5 — Offline Behavior

MVP offline support should be conservative.

### Offline MVP behavior

When offline:

* app shell opens
* user sees last loaded screen only if browser cache allows
* mutations are disabled
* clear offline banner appears
* no fake “sent” chat messages
* no fake request creation

Tasks:

* [ ] Add global network status detection
* [ ] Show offline banner
* [ ] Disable request creation submit when offline
* [ ] Disable chat send when offline
* [ ] Disable worker lifecycle actions when offline
* [ ] Add clear reconnect messaging

Future offline support can include queued actions, but not in the first PWA pass.

## Phase 6 — Notifications

Push should be treated as a separate phase.

### Notification strategy

Start with in-app realtime updates via Convex.

Later add push for:

* request assigned
* worker accepted
* new chat message
* manager attention needed
* request completed

Tasks:

* [ ] Define notification events
* [ ] Decide provider: Web Push, Expo Notifications, or unified notification service
* [ ] Add user notification preferences
* [ ] Add permission request only after meaningful user action
* [ ] Support email fallback for clients if needed

## Phase 7 — PWA Quality Checklist

### iOS Safari / Home Screen

* [ ] Add to Home Screen works
* [ ] App opens standalone
* [ ] Login session persists
* [ ] Convex realtime works after resume
* [ ] Back navigation feels correct
* [ ] Keyboard does not break chat composer
* [ ] Safe-area insets are handled
* [ ] Icons look correct

### Android Chrome

* [ ] Install prompt works
* [ ] App opens standalone
* [ ] Manifest passes Lighthouse
* [ ] Service worker updates correctly
* [ ] Offline fallback works

### Desktop

* [ ] Installable from Chrome/Edge
* [ ] Manager dashboard remains desktop-first
* [ ] Responsive layout works on tablet widths

## Phase 8 — Vercel Deployment Validation

Tasks:

* [ ] Verify manifest is served with correct content type
* [ ] Verify service worker file is served from app root
* [ ] Verify cache headers do not break service worker updates
* [ ] Verify Convex websocket is not cached/proxied incorrectly
* [ ] Run Lighthouse PWA audit
* [ ] Test production deployment, not only local dev

## Recommended Scope for First PWA Release

Include:

* installable web app
* manifest
* icons
* service worker
* app-shell caching
* offline banner
* role-based mobile web polish
* iOS Add to Home Screen instructions

Exclude:

* full offline sync
* queued mutations
* background location
* native-like push guarantees
* per-client app builds
* App Store dependency

## Success Criteria

The PWA is successful when:

* a client can open a link, create a request, chat, and optionally install the app
* a manager can open the dashboard on mobile and add it to Home Screen
* the app feels stable when launched from the Home Screen
* users are not forced through App Store installation
* Expo native remains available for worker-heavy workflows

## Final Positioning

The PWA is the distribution layer.

The Expo app is the native execution layer.

Convex is the shared realtime source of truth.

TanStack web is the canonical cross-platform product surface.

```