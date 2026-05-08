import { getAuthConfigProvider } from '@convex-dev/better-auth/auth-config'

/**
 * Convex JWT verification config. As of `@convex-dev/better-auth` 0.10 the
 * Convex plugin signs tokens with RS256 and exposes a JWKS at
 * `${CONVEX_SITE_URL}/api/auth/convex/jwks`. `getAuthConfigProvider()` builds
 * the matching `customJwt` provider entry; the same value is passed back into
 * `convex({ authConfig })` in `auth.ts` so the issuer / JWKS pair stays
 * consistent on both sides.
 */
export default {
  providers: [getAuthConfigProvider()],
}
