import { httpRouter } from 'convex/server'
import { authComponent, createAuth } from './auth'

const http = httpRouter()

// `cors: true` registers OPTIONS preflight handlers on every Better Auth route
// and seeds the CORS allowlist from `createAuth(...).trustedOrigins` (which
// already includes `http://localhost:3000` and the production web URL).
// Without it, browsers calling `/api/auth/sign-in/email` from a non-Convex
// origin get a CORS preflight 404 from Convex's HTTP router.
authComponent.registerRoutes(http, createAuth, { cors: true })

export default http
