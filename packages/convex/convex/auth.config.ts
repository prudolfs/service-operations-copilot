/**
 * Convex's JWT verification config — points at our own deployment's HTTP URL,
 * which is where Better Auth signs tokens. The `convex` plugin in `auth.ts`
 * exposes the JWKS at `/.well-known/jwks.json` on `CONVEX_SITE_URL`.
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
}
