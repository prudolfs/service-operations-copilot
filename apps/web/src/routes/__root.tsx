import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { authClient } from '@/lib/auth-client'
import { getConvexClient } from '@/lib/convex'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Service Operations Copilot' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  // Mount the Convex provider on both server and client. ConvexReactClient
  // works in Node — `useQuery` just returns `undefined` (loading state) during
  // SSR, which every consumer already handles. Skipping the provider during
  // SSR breaks any route that calls `useQuery` at top level (e.g. /redirect,
  // the role layouts) because the hook then errors with "no Convex client".
  const convex = getConvexClient()
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <Outlet />
    </ConvexBetterAuthProvider>
  )
}
