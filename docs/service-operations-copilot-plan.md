# Service Operations Copilot — MVP & Future Plan

## 1. Product Direction

Service Operations Copilot is a mobile-first and web-enabled coordination platform for service companies.

The core idea:

> Clients create service requests, workers execute them, and managers oversee the process with AI-assisted coordination.

The product should demonstrate how companies can modernize service delivery by replacing fragmented communication, manual coordination, and unclear task ownership with one structured workflow.

This is not just a chatbot. It is a role-based operations system where AI helps users create requests, draft communication, summarize status, and reduce coordination overhead while keeping humans in control.

---

## 2. Core Roles

### Client

Clients request services and communicate about their requests.

MVP responsibilities:

- Register/login with Better Auth
- Create service request
- View own requests
- Chat per request
- Confirm/request updates

Example client use case:

> “I need someone tomorrow at 10 to clean my apartment.”

---

### Worker

Workers execute assigned or available service requests.

MVP responsibilities:

- Login with Better Auth
- Receive worker role if email is listed in Convex environment variables
- View available/assigned jobs
- Accept/start/complete jobs
- Chat with client and/or manager

---

### Manager/Admin

Managers oversee execution and can intervene when needed.

MVP responsibilities:

- Login with Better Auth
- Receive manager role if email is listed in Convex environment variables
- View all active requests
- View workers
- Open request details
- Join or inspect request chats
- Use summaries/status views later

Mobile manager experience should be an **Operations Inbox**, not a full dashboard.

Web manager experience can later become a richer dashboard.

---

## 3. Platform Strategy

### Mobile App

Technology:

- Expo
- React Native
- Expo Router
- Convex
- Better Auth via `@convex-dev/better-auth`

Mobile is the first implementation target.

Mobile should support:

- Client app experience
- Worker app experience
- Lightweight manager/admin operations view

Mobile should use role-based route groups, not hidden routes.

---

### Web App

Technology:

- Next.js
- Convex
- Better Auth via `@convex-dev/better-auth`

Web comes after the Expo app.

Client web should closely match the mobile client experience.

Manager/admin web should introduce stronger dashboard functionality.

Recommended web structure:

```txt
/client
/dashboard
```

Inside `/dashboard`, UI branches by role:

- Worker sees jobs/execution tools
- Manager sees operations overview, requests, workers, issues, analytics later

---

## 4. Auth Strategy

Use **Better Auth** with the Convex integration package:

```txt
@convex-dev/better-auth
```

Better Auth owns authentication.
Convex owns application roles and permissions.

### Better Auth responsibilities

- Google OAuth
- GitHub OAuth
- Email/password registration
- Session handling
- Auth user identity

### Convex responsibilities

- App user profile
- Role assignment
- Future permissions
- Future organization/company model

Important rule:

> Auth identifies who the user is. Convex decides what the user can do.

---

## 5. MVP Auth Requirements

### Client auth

Clients can self-register/login using:

- Google OAuth
- GitHub OAuth
- Email/password

For MVP:

- No email verification
- No email double-check
- No password reset flow required initially

---

### Worker/admin auth

Workers and managers also authenticate through Better Auth.

Their role is granted only if their email is present in Convex environment variables.

Example:

```env
ADMIN_EMAILS=admin@example.com,manager@example.com
WORKER_EMAILS=worker1@example.com,worker2@example.com
```

Role resolution:

```txt
If email is in ADMIN_EMAILS  -> manager
Else if email is in WORKER_EMAILS -> worker
Else -> client
```

Everyone not explicitly listed becomes a client.

---

## 6. App User Model

Better Auth stores auth-level users/sessions.

Create a separate app-level user table for product roles.

Suggested Convex `users` table:

```ts
users: defineTable({
  authUserId: v.string(),
  email: v.string(),
  name: v.optional(v.string()),
  role: v.union(
    v.literal("client"),
    v.literal("worker"),
    v.literal("manager")
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_auth_user_id", ["authUserId"])
  .index("by_email", ["email"])
```

For MVP, use a single role per user.

Future multi-role support should be planned but not implemented yet.

---

## 7. Role Sync Strategy

Create an app-level Convex mutation:

```txt
ensureAppUser()
```

This should:

1. Read the current Better Auth user
2. Normalize the email to lowercase
3. Check whether app user already exists
4. Resolve role from env vars
5. Create or update the app user
6. Return the app user

Recommended behavior for MVP:

- On login: call `ensureAppUser()`
- On app launch/session restore: call `ensureAppUser()`
- Optionally on app foreground/resume: call `ensureAppUser()`

This means if `ADMIN_EMAILS` or `WORKER_EMAILS` changes, the user usually only needs to reload/reopen the app, not fully logout/login.

Important caveat:

> Convex env changes only affect role after the app calls a Convex function again.

---

## 8. Expo Router Structure

Use role-based route groups.

Recommended structure:

```txt
src/app/
  _layout.tsx

  (auth)/
    welcome.tsx
    login.tsx
    register.tsx

  (client)/
    _layout.tsx
    index.tsx
    requests/
      index.tsx
      new.tsx
      [requestId].tsx
    messages/
      index.tsx
      [chatRoomId].tsx
    profile.tsx

  (worker)/
    _layout.tsx
    index.tsx
    jobs/
      index.tsx
      [jobId].tsx
    messages/
      index.tsx
      [chatRoomId].tsx
    profile.tsx

  (manager)/
    _layout.tsx
    index.tsx
    requests/
      index.tsx
      [requestId].tsx
    workers/
      index.tsx
      [workerId].tsx
    messages/
      index.tsx
      [chatRoomId].tsx
    profile.tsx
```

After auth and `ensureAppUser()`:

```ts
if (user.role === "client") router.replace("/(client)");
if (user.role === "worker") router.replace("/(worker)");
if (user.role === "manager") router.replace("/(manager)");
```

Do not use a generic `(protected)/(tabs)` shell as the main structure. The app has distinct role experiences.

---

## 9. Mobile Navigation by Role

### Client mobile tabs

```txt
Home
Requests
Messages
Profile
```

Client mobile should be simple and request-focused.

---

### Worker mobile tabs

```txt
Jobs
Messages
Profile
```

Optional later:

```txt
Schedule
```

Worker mobile should focus on execution.

---

### Manager mobile tabs

```txt
Overview
Requests
Workers
Messages
Profile
```

Manager mobile should focus on urgent operational visibility:

- What is active?
- What is blocked?
- Who is assigned?
- Which requests need attention?

Do not overbuild analytics on mobile for MVP.

---

## 10. Core MVP Features

### 10.1 Welcome/Auth flow

Screens:

- Welcome
- Login
- Register

Auth options:

- Continue with Google
- Continue with GitHub
- Continue with Email

After auth:

```txt
Better Auth login/register
        ↓
ensureAppUser()
        ↓
role-based redirect
```

---

### 10.2 Client request creation

Clients can create service requests.

MVP request fields:

```ts
{
  serviceType: string,
  date: string,
  time: string,
  notes?: string,
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
}
```

Start simple. Do not over-model service categories yet.

Suggested service types:

- Cleaning
- Repair
- Delivery
- Transport
- Other

---

### 10.3 Request lifecycle

Basic lifecycle:

```txt
OPEN
  ↓
ASSIGNED
  ↓
IN_PROGRESS
  ↓
COMPLETED
```

Optional states:

```txt
CANCELLED
ISSUE_REPORTED
```

---

### 10.4 Worker job execution

Workers can:

- View available or assigned jobs
- Accept job
- Start job
- Complete job
- Message client/manager

For MVP, assignment can be simple:

- Worker accepts open request
- Or manager assigns worker

Pick one first. Recommended MVP path:

> Worker can accept open requests.

Then add manager assignment later.

---

### 10.5 Manager oversight

Managers can:

- See all requests
- See request status
- See assigned worker
- Open request detail
- View messages
- Intervene manually

For MVP, “intervene” can simply mean opening the request chat or changing assignment/status.

---

### 10.6 Request-scoped chat

Each active request should have a chat room.

Chat is scoped to the service request.

Participants:

- Client
- Assigned worker
- Manager/admin if needed

MVP chat features:

- Send messages
- Realtime updates via Convex
- Request detail links to chat
- Messages list

Later chat features:

- Edit/delete
- Reactions
- Presence
- AI drafts
- AI summaries

---

## 11. Suggested Convex Data Model

### users

App-level users with role.

```ts
users: defineTable({
  authUserId: v.string(),
  email: v.string(),
  name: v.optional(v.string()),
  role: v.union(
    v.literal("client"),
    v.literal("worker"),
    v.literal("manager")
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

---

### serviceRequests

```ts
serviceRequests: defineTable({
  clientId: v.id("users"),
  assignedWorkerId: v.optional(v.id("users")),
  serviceType: v.string(),
  date: v.string(),
  time: v.string(),
  notes: v.optional(v.string()),
  status: v.union(
    v.literal("OPEN"),
    v.literal("ASSIGNED"),
    v.literal("IN_PROGRESS"),
    v.literal("COMPLETED"),
    v.literal("CANCELLED")
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_client", ["clientId"])
  .index("by_worker", ["assignedWorkerId"])
  .index("by_status", ["status"])
```

---

### chatRooms

```ts
chatRooms: defineTable({
  serviceRequestId: v.id("serviceRequests"),
  status: v.union(v.literal("ACTIVE"), v.literal("ARCHIVED")),
  lastMessageText: v.optional(v.string()),
  lastMessageTime: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_service_request", ["serviceRequestId"])
```

---

### chatMessages

```ts
chatMessages: defineTable({
  chatRoomId: v.id("chatRooms"),
  senderId: v.id("users"),
  text: v.string(),
  createdAt: v.number(),
})
  .index("by_chat_room", ["chatRoomId", "createdAt"])
```

---

## 12. Authorization Rules

Do not rely on frontend route hiding for security.

Convex functions must enforce access.

### Client can:

- Create own requests
- View own requests
- View chats for own requests

### Worker can:

- View open jobs
- View assigned jobs
- Accept/start/complete allowed jobs
- View chats for assigned jobs

### Manager can:

- View all requests
- View all workers
- View/request-level chats
- Change assignments/statuses

---

## 13. AI Features

AI is important to the demo but does not need to be first implementation step.

### MVP AI candidate

Add after basic request/chat flow works:

#### AI request drafting

Client says:

> “I need cleaning tomorrow at 10.”

AI creates a structured request draft.

User reviews before submitting.

---

### Strong demo AI feature

#### AI request/chat summary

Manager opens a request and taps:

> Summarize

AI returns:

- Current status
- Agreed time
- Assigned worker
- Open issues
- Who is waiting on whom

This is very useful for manager oversight.

---

### AI principle

AI should assist, draft, and summarize.

AI should not silently submit, assign, or send messages without user confirmation.

---

## 14. Web App Plan

Build web after the Expo app.

Use Next.js with the same Convex backend and Better Auth setup.

### Client web

Client web should mirror mobile client experience:

- Login/register
- Create request
- View requests
- Open chat
- Profile

---

### Worker web

Worker web can use dashboard route:

```txt
/dashboard/jobs
/dashboard/messages
/dashboard/profile
```

---

### Manager/admin web

Manager web should be richer than mobile.

Suggested routes:

```txt
/dashboard
/dashboard/requests
/dashboard/workers
/dashboard/messages
/dashboard/analytics
/dashboard/settings
```

For MVP web, analytics/settings can wait.

---

## 15. Future Multi-Role Support

Multi-role is not part of MVP.

But the code should avoid making it painful later.

### MVP model

```ts
role: "client" | "worker" | "manager"
```

### Future model

```ts
roles: Array<"client" | "worker" | "manager">
activeRole: "client" | "worker" | "manager"
```

### Future changes required

1. Update schema from `role` to `roles` + `activeRole`
2. Add role switcher UI
3. Update route resolver to use `activeRole`
4. Update authorization checks from equality checks to role membership

Example future checks:

```ts
user.roles.includes("manager")
```

Instead of:

```ts
user.role === "manager"
```

### Prepare now

Use helper functions instead of scattering role logic everywhere.

```ts
isClient(user)
isWorker(user)
isManager(user)
getHomeRouteForRole(role)
```

This keeps migration easier later.

Estimated effort later if planned now:

```txt
1–2 days
```

---

## 16. Implementation Order

### Phase 1 — Auth and app shell

1. Install/configure Better Auth with `@convex-dev/better-auth`
2. Add Google OAuth
3. Add GitHub OAuth
4. Add email/password registration/login
5. Add Convex `users` table
6. Add `ensureAppUser()`
7. Add role resolution from env vars
8. Add Expo Router auth screens
9. Add role-based route groups
10. Add role-based redirect after login/session restore

---

### Phase 2 — Core service request flow

1. Add `serviceRequests` table
2. Client creates request
3. Client views own requests
4. Worker views open requests
5. Worker accepts request
6. Request moves to assigned state
7. Worker starts/completes request
8. Client sees status updates

---

### Phase 3 — Chat

1. Add `chatRooms` table
2. Add `chatMessages` table
3. Create chat room when request is accepted
4. Add client messages list/detail
5. Add worker messages list/detail
6. Add manager messages access
7. Add request detail → chat navigation

---

### Phase 4 — Manager mobile operations

1. Manager overview screen
2. All requests list
3. Request detail
4. Worker list
5. Manager can inspect/intervene

---

### Phase 5 — AI-assisted demo features

1. AI request draft from natural language/voice
2. AI chat/request summary
3. AI message drafting
4. Optional AI reply suggestions

---

### Phase 6 — Next.js web app

1. Reuse Convex backend
2. Reuse Better Auth setup
3. Build client web flow
4. Build `/dashboard` shell
5. Add worker dashboard
6. Add manager dashboard
7. Add richer dashboard widgets later

---

## 17. MVP Scope Boundaries

### Include in MVP

- Better Auth
- Google OAuth
- GitHub OAuth
- Email/password auth
- Convex app users
- Single role per user
- Env-based worker/admin role grants
- Expo role-based navigation
- Client request creation
- Worker request execution
- Manager request oversight
- Request-scoped chat

---

### Exclude from MVP

- Multi-role switching
- Organizations/companies
- Invitations
- Payments
- Notifications
- Email verification
- Password reset
- Analytics dashboard
- Advanced scheduling
- Worker availability calendar
- AI automation that performs actions without confirmation

---

## 18. Key Product Principle

The product should feel like:

> A simple operations app where AI removes coordination friction.

Not:

> A chatbot with some forms attached.

The strongest demo narrative is:

1. Client creates request
2. Worker accepts and executes
3. Manager monitors progress
4. Chat keeps everyone aligned
5. AI summarizes and drafts when needed

---

## 19. Naming

Working product name:

```txt
Service Operations Copilot
```

Possible demo names:

- Smart Service Desk
- AI Service Flow
- Operations Copilot
- ServiceFlow AI

---

## 20. Final Decision Summary

Decisions agreed:

- Build Expo mobile first
- Build Next.js web later
- Use Convex as backend/source of truth
- Use Better Auth with `@convex-dev/better-auth`
- Support Google OAuth and GitHub OAuth
- Support basic email/password auth for MVP
- No email verification for MVP
- Use env vars for worker/admin role grants
- Everyone else defaults to client
- Use single-role model for MVP
- Add multi-role support later as a planned future feature
- Use role-based Expo route groups
- Mobile manager/admin gets Operations Inbox, not heavy dashboard
- Web manager/admin gets `/dashboard` later
