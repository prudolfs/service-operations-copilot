<!-- cspell:words VAPID vapid bunx p256dh -->

# Push notifications

Web Push direct from Convex via VAPID — no third-party provider, no SSE. One Convex action (`pushSender.sendPushToUser`) fans out to every subscription a user has registered.

## Status

| Surface | Status |
|---|---|
| Web (PWA, installed) | Shipped (bracket 1) |
| Web (Safari < 16.4 / non-installed iOS) | Detected & gracefully unsupported |
| iOS / Android native (Expo) | **Not implemented** — see "Mobile next steps" |

Bracket 1 = three triggers only. Chat messages, manager "needs attention", and reminder pings are intentionally deferred.

| Trigger | Recipient | Title | Deep link |
|---|---|---|---|
| `serviceRequests.assignWorker` | Assigned worker | New job assigned to you | `/dashboard/jobs/{id}` |
| `serviceRequests.accept` | Client (requester) | Worker accepted your request | `/client/requests/{id}` |
| `serviceRequests.complete` | Client (requester) | Request completed | `/client/requests/{id}` |

All three are scheduled via `ctx.scheduler.runAfter(0, internal.pushSender.sendPushToUser, …)` from the public mutation layer so a delivery failure cannot roll back the business mutation. Per-subscription send errors are caught inside the action; 404/410 responses (subscription gone) trigger automatic row deletion via `pushSubscriptions.deleteByEndpoint`.

## Setup

### 1. Generate the VAPID keypair

```sh
bunx web-push generate-vapid-keys
```

Keep the output — there's no way to recover the private key later. If you rotate, every existing browser subscription is invalidated and clients must re-grant.

### 2. Set Convex env (server)

`packages/convex/.env.local` is **CLI-only** — server actions read from the deployment env. Set it via dashboard or CLI:

```sh
bunx convex env set VAPID_PUBLIC_KEY ...
bunx convex env set VAPID_PRIVATE_KEY ...
bunx convex env set VAPID_SUBJECT mailto:ops@service-ops.local
```

`VAPID_SUBJECT` is required by RFC 8292 — must be a `mailto:` or `https:` URL. Defaults to `mailto:ops@service-ops.local` if unset.

If keys are missing, `pushSender.configureVapid()` logs `[push] VAPID keys missing; skipping send` and short-circuits — business mutations still succeed.

### 3. Set web env (client)

`apps/web/.env.local`:

```
VITE_VAPID_PUBLIC_KEY=<same value as VAPID_PUBLIC_KEY>
```

Mismatch fails silently: the browser subscribes, the server send rejects with `BadJwtToken`. Always copy the same public key.

### 4. Verify

```sh
bun run dev:convex
bun run dev:web
# build + preview is required for the SW to activate (registerSW only runs in PROD)
bun --cwd apps/web run build && bun --cwd apps/web run preview
```

End-to-end check on the PWA build:

1. Sign in as a worker, open `/dashboard/jobs`, click "Enable notifications" in the banner — browser prompt → grant.
2. As a manager, assign that worker a request.
3. Worker should see the OS notification within ~1s. Click → focuses tab, navigates to `/dashboard/jobs/{id}`.

Convex logs print `[push] send failed <status>` on transport errors; row autoremoval logs nothing on success.

## Architecture

```
packages/convex/convex/
├── schema.ts                        # pushSubscriptions table (by_user, by_endpoint)
├── pushSubscriptions.ts             # subscribe / unsubscribe (public mutations),
│                                    # listForUser / deleteByEndpoint (internal)
├── pushSender.ts ('use node')       # sendPushToUser internalAction; webpush.sendNotification fan-out
└── serviceRequests.ts               # three trigger sites — assignWorker / accept / complete

apps/web/
├── sw-template.js                   # `push` + `notificationclick` handlers (compiled to public/sw.js)
├── src/lib/use-push-subscription.ts # permission state machine + pushManager.subscribe()
└── src/components/
    ├── push-permission-banner.tsx   # banner on /dashboard/jobs and /client (post-first-request)
    └── push-notifications-row.tsx   # toggle in /client/profile and /dashboard/profile
```

Key invariants:

- **Endpoint is the upsert key.** `subscribe` deletes any existing row with the same endpoint before insert, so re-granting on the same browser doesn't create duplicates and a shared device can move subscriptions between accounts.
- **One user → many subscriptions.** Different browsers/devices get distinct endpoints; `sendPushToUser` fans out to all of them.
- **Payload shape is fixed:** `{ title, body, url, tag }`. The SW reads `data.url` from `notificationclick` to focus an existing tab or open a new one.

## iOS Safari caveats

- Web Push works only on **iOS 16.4+** AND when the PWA is installed to the home screen. Vanilla iOS Safari has no `PushManager` / `Notification` at all.
- `usePushSubscription` exposes `isIOSPwaUnsupported` for tailored copy ("Notifications on iPhone require iOS 16.4+ and the installed app").
- The "Add to Home Screen" prompt is in `apps/web/src/components/install/IosInstallInstructions.tsx`.

## Failure paths

| Symptom | Cause | Where |
|---|---|---|
| `[push] VAPID keys missing; skipping send` | Server env not set on deployment | `pushSender.ts:17` |
| Browser subscribes, server gets `BadJwtToken` | `VITE_VAPID_PUBLIC_KEY` ≠ `VAPID_PUBLIC_KEY` | `pushSender.ts:56` |
| Subscriptions silently disappear | Browser revoked / OS uninstalled the SW; push service returned 404/410 | Auto-pruned via `deleteByEndpoint` |
| No notification on grant | SW not registered (only registers in `PROD`) | `register-sw.ts` — must `bun run build && bun run preview` |
| Click does nothing | Payload missing `url` | `sw-template.js:117` falls back to `/` |

## Mobile next steps (Expo)

Web Push (VAPID + `pushManager`) does not apply to native — iOS/Android use platform push services. Recommended approach for the Expo app:

### 1. Use Expo Notifications + APNs/FCM via Expo's push service

- Add `expo-notifications` + `expo-device` to `apps/mobile`.
- Capture the Expo push token on first launch (after auth):
  ```ts
  import * as Notifications from 'expo-notifications'
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  })
  ```
- Register an EAS project ID — required by Expo's push service for SDK 50+.

### 2. Extend the schema, not parallel tables

Add a `platform` discriminator to `pushSubscriptions` so one fan-out path serves all transports:

```ts
pushSubscriptions: defineTable({
  userId: v.id('users'),
  platform: v.union(v.literal('web'), v.literal('expo')),
  // web fields
  endpoint: v.optional(v.string()),
  keys: v.optional(v.object({ p256dh: v.string(), auth: v.string() })),
  // expo fields
  expoPushToken: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  createdAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_endpoint', ['endpoint'])
  .index('by_expo_token', ['expoPushToken'])
```

Or split into a sibling table `expoPushTokens` if you prefer strict typing — both are fine; the one-table approach keeps `sendPushToUser` simpler at the cost of optional fields.

### 3. New mutation: `pushSubscriptions.subscribeExpo`

Mirrors `subscribe` but takes an Expo push token and `platform: 'expo'`. Same upsert-by-token semantics.

### 4. Branch `pushSender.sendPushToUser`

Currently it always calls `webpush.sendNotification`. Switch on `sub.platform`:

- `'web'` → existing path (`web-push` + VAPID).
- `'expo'` → POST to `https://exp.host/--/api/v2/push/send` with `{ to, title, body, data: { url } }`. Expo's service handles APNs/FCM. Same payload shape, same 404/410-equivalent cleanup (Expo returns `DeviceNotRegistered` in the receipt).

```ts
// pseudocode for the Expo branch
const res = await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  },
  body: JSON.stringify({
    to: sub.expoPushToken,
    title, body,
    data: { url },
    // optional: sound, badge, channelId for Android
  }),
})
// inspect res.json().data[].status — 'error' + details.error === 'DeviceNotRegistered'
// → delete the row by token (mirror deleteByEndpoint)
```

For production volume, batch up to 100 tokens per request and consume the receipts endpoint asynchronously — the synchronous response only confirms the message was queued.

### 5. Mobile UI

- Add a permission row in `apps/mobile/src/app/(client|worker|manager)/profile.tsx` with the same "Enable notifications" copy as web.
- iOS requires explicit `requestPermissionsAsync()`. Android 13+ also requires runtime permission for `POST_NOTIFICATIONS` — `expo-notifications` handles both.
- Foreground vs. background handling differs from web: register a `Notifications.addNotificationResponseReceivedListener` to deep-link via `expo-router` when the user taps.

### 6. Out of scope until later

- **Direct APNs/FCM** (skipping Expo's relay): worth it only if you outgrow Expo's free tier or need topic-based broadcast. For bracket-1 volume the relay is fine.
- **Bracket-2 events** (chat messages, manager "attention needed", reminder pings): same fan-out path; only new schedulers in `chat.ts` / `serviceRequests.ts`.
- **Per-user notification preferences**: a `notificationPreferences` table keyed by user with per-event toggles. Not needed until bracket 2 multiplies the noise.
