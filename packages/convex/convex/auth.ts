import { expo } from '@better-auth/expo'
import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex, crossDomain } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth'
import { components } from './_generated/api'
import type { DataModel } from './_generated/dataModel'

export const authComponent = createClient<DataModel>(components.betterAuth)

// SITE_URL is the web app's origin (different from CONVEX_SITE_URL, which is
// the Convex deployment). The crossDomain plugin uses it to rewrite relative
// callback URLs and to redirect OAuth callbacks back to the web app with a
// one-time token. Set this to `http://localhost:3000` for dev or the Vercel
// URL for prod via `convex env set SITE_URL=...`.
const WEB_SITE_URL = process.env.SITE_URL ?? 'http://localhost:3000'

// Origins allowed to call Better Auth's HTTP routes. Always include
// `http://localhost:3000` so a dev web build works even when SITE_URL is set
// to a production URL — the cors helper in `registerRoutes` reads this list
// to decide which `Access-Control-Allow-Origin` to emit on preflight.
const trustedOriginsList = Array.from(
  new Set(['serviceops://', 'http://localhost:3000', WEB_SITE_URL]),
)

/**
 * Better Auth instance bound to a Convex request context.
 *
 * Two clients connect: mobile (Expo, `serviceops://` deep link, uses cookies
 * via the `expo()` plugin) and web (different origin from Convex, uses the
 * `crossDomain()` plugin to swap the cookie for a `Better-Auth-Cookie` header
 * since browsers won't send cross-origin cookies). The crossDomain plugin
 * skips itself on requests with the `expo-origin` header so both flows
 * coexist on one auth instance.
 */
export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    // `CONVEX_SITE_URL` is injected by Convex into the function runtime; the
    // `convex` plugin warns when this is missing, so set it explicitly.
    baseURL: process.env.CONVEX_SITE_URL,
    trustedOrigins: trustedOriginsList,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    },
    plugins: [expo(), convex(), crossDomain({ siteUrl: WEB_SITE_URL })],
  })
