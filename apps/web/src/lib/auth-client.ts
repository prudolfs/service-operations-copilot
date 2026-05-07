import {
  convexClient,
  crossDomainClient,
} from '@convex-dev/better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

const baseURL =
  (typeof window !== 'undefined'
    ? (window as unknown as { __CONVEX_SITE_URL?: string }).__CONVEX_SITE_URL
    : undefined) ?? import.meta.env.VITE_CONVEX_SITE_URL

// `crossDomainClient` is required because the web app and the Convex deployment
// live on different origins. It keeps the session token in `localStorage` and
// exchanges it via the `Better-Auth-Cookie` header on every request, so the
// usual cookie handshake (which browsers refuse cross-origin) is bypassed. The
// matching server-side `crossDomain` plugin lives in `packages/convex/convex/auth.ts`.
export const authClient = createAuthClient({
  baseURL: baseURL as string,
  plugins: [convexClient(), crossDomainClient()],
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
