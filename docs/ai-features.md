<!-- cspell:words GROQ Groq bunx tappable -->

# AI features

## Setup

Env vars in `packages/convex/.env.local` (must also `bunx convex env set` or paste into Convex dashboard — `.env.local` is CLI-only):

- `GROQ_API_KEY` — Whisper transcription
- `AI_GATEWAY_API_KEY` — Vercel AI Gateway, used for everything else (gpt-4o-mini)
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — optional fallback if not using gateway

Models hardcoded in `packages/convex/convex/ai/*.ts` as `MODEL_ID = 'openai/gpt-4o-mini'`. Swap by editing the constant — gateway routes at runtime, no rebuild.

## Features

### 1. Voice mic — web + mobile

Floating press-and-hold button, fixed bottom-right. Mounted on non-chat screens.

- Component: `apps/{web,mobile}/src/components/voice/MicButton.tsx`
- Max 30s recording. Press in to record, release to send.
- Flow: record → upload to Convex storage → `api.ai.askAnything.askAnything` → routes by intent.

Per-screen context set via `useVoiceContextStore` (screen, role, currentRequestId, currentChatRoomId, draft slots, visible request/chat lists). Lets the model disambiguate "summarize this", "send a message to John", etc.

Intents:

- `create_service_request` → navigate to new-request form, prefill extracted slots
- `draft_message` (clear target) → open chat, prefill composer
- `draft_message` (ambiguous) → open picker sheet/modal
- `summarize_request` (clear) → open summary panel
- `summarize_request` (ambiguous) → open picker
- `unknown` → alert with model's suggestion

### 2. Request summary — manager only, web + mobile

Button "Summarize this request" on manager request detail. Streams two-pass: status line first (one sentence), then markdown details body.

- Backend action: `api.ai.summary.summarizeRequest`
- Storage: `summaryStreams` table — status pending → streaming → done/error
- Client: subscribes via `useQuery(api.ai.summary.getSummaryStream)` for realtime updates over websocket (no SSE)
- Web UI: `apps/web/src/components/SummaryPanel.tsx` (centered modal)
- Mobile UI: `apps/mobile/src/components/voice/SummarySheet.tsx` (bottom sheet)
- Voice trigger: "summarize this" while on a request screen → same panel

Auth: only requester or any manager can read the stream (enforced in `getSummaryStream`).

### 3. Reply suggestions — chat composer, web + mobile

Sparkles button in chat composer → tone row (friendly / professional / supportive / funny) → 3 tappable suggestions fill composer.

- Backend: `api.ai.replySuggestions.suggestReplies` — gpt-4o-mini, last 30 messages + composer draft + tone
- UI: `apps/{web,mobile}/src/components/chat/ChatRoom.tsx`
- Re-runs on tone change.

### 4. Voice-to-text in composer — web + mobile

Chat composer has an inline mic for press-and-hold dictation. Goes through `askAnything` with `screen='chat'` + `currentChatRoomId`, so the response is always treated as a draft for *this* room — transcript drops into the composer, not auto-sent. While recording, the textarea is replaced with a "Recording Ns…" indicator; while transcribing, "Transcribing…". The global floating mic is suppressed on chat screens to avoid two mic buttons.

## Backend layout

```
packages/convex/convex/ai/
├── transcribe.ts        # Groq Whisper, generateUploadUrl + transcribeFromStorage
├── askAnything.ts       # voice → intent classification + slot extraction
├── summary.ts           # streaming request summary
├── replySuggestions.ts  # tone-aware chat suggestions
└── intents.ts           # zod schemas for LLM output validation
```

All LLM calls go through Vercel AI SDK (`generateObject` / `streamText`) via `createGateway()`.

## Test cases

From `packages/convex/`:

```
bun seed:wipe       # drop content tables (keeps users + Better Auth)
bun seed:populate   # load fixture requests + chats from scripts/test-users.json
```

Fixture (relative to now):

| Key | Status | Client | Worker | Service | When | Chat |
|---|---|---|---|---|---|---|
| openA | OPEN | c0 | – | cleaning | today+2 09:00 | none |
| openB | OPEN | c1 | – | gardening | today+5 11:00 | none |
| assigned | ASSIGNED | c0 | w0 | repair (faucet) | today+1 14:30 | confirmation exchange |
| inProgress | IN_PROGRESS | c1 | w0 | delivery | today now | active updates + manager joined |
| completed | COMPLETED | c0 | w1 | cleaning | yesterday 10:00 | wrap-up |
| cancelled | CANCELLED | c1 | – | moving | today+3 13:00 | none |

### Voice mic (web + mobile)

- **create_service_request** — as c0 on overview, "schedule a cleaning next Friday at 10am, two bedroom apartment" → routes to new-request form, slots prefilled
- **draft_message clear** — as c0 on overview, "tell the worker on the repair I need to reschedule" → opens `assigned` chat, composer prefilled
- **draft_message ambiguous** — as c0 on overview, "send a message saying I'll be 10 minutes late" → picker with `assigned` + `completed` chats; pick one → chat opens with text
- **summarize_request clear** — as c1 on `inProgress` detail, "summarize this" → summary modal opens for delivery
- **summarize_request ambiguous** — as c0 on overview, "summarize the cleaning" → picker with `openA` + `completed`; pick one → summary opens
- **unknown** — "what's the weather" → alert with suggestion text
- **30s cap** — hold mic > 30s → recording auto-stops, processes what was captured

### Summary (manager-only button + voice on detail screens)

- **streaming + reconnect** — manager opens `inProgress`, clicks "Summarize this request" → status line within ~2s, details stream in, finishes `done`. Hard-refresh mid-stream → details keep appearing (row in `summaryStreams` survives)
- **no chat yet** — manager opens `openA` (OPEN cleaning), summarize → succeeds; details note "no conversation yet"; uses request notes only
- **cancelled, no chat** — manager opens `cancelled` (moving), summarize → succeeds, notes-only summary
- **auth: requester** — c0 summarizes `assigned` (their own request) → works
- **auth: foreign client** — c1 tries to summarize `assigned` via direct URL → action throws "Not authorized to summarize this request"
- **auth: manager always** — mgr can summarize any request

### Reply suggestions (chat composer, web + mobile)

- **tone switch** — w0 in `inProgress` chat, sparkles → friendly → 3 casual suggestions; switch professional → 3 formal; switch funny → 3 lighthearted; switch supportive → 3 reassuring
- **draft completion** — type "should I leave it with" in composer, sparkles → suggestions complete the thought (model receives composerText)
- **fill on tap** — tap a suggestion → composer text replaced (not appended); panel collapses
- **cold chat (no history)** — open `assigned` chat as c0 just after seed, request suggestions → still returns 3 generic openers

### Voice-to-text in chat composer (web + mobile)

- as c0 in `assigned` repair chat, hold inline mic, "can you arrive 30 minutes earlier", release → transcript drops into composer; not auto-sent
- 30s cap — hold past 30s → recording auto-stops, transcript still appears
- global floating mic does not render on chat screens (suppressed when `screen='chat'`)

### Failure paths to verify

- missing `AI_GATEWAY_API_KEY` on Convex → summary row goes `error` with provider error message; UI shows "Couldn't generate a summary: …"
- missing `GROQ_API_KEY` → mic upload completes but `askAnything` errors; UI shows alert
- network drop mid-summary → row stays in last `streaming` state; refresh reattaches via `useQuery` and continues if action still running
