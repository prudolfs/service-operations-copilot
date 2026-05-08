import { authClient, signIn, signOut, signUp } from '@/lib/auth-client'

export const useAuth = () => {
  const { data, isPending, error } = authClient.useSession()
  return {
    user: data?.user ?? null,
    session: data?.session ?? null,
    isLoading: isPending,
    error,
    signIn,
    signUp,
    signOut,
  }
}

/**
 * Synchronously check whether the cross-domain auth client has a *live*
 * session cookie in localStorage. Used by `/` to decide whether to show
 * Welcome immediately (no live cookie → definitely signed out) or hold a
 * blank screen while `useSession` resolves (live cookie → likely signed in,
 * redirect imminent).
 *
 * The cross-domain client doesn't actually delete entries on sign-out: it
 * stores the server's `set-better-auth-cookie` response, which sets the
 * session_token to `value: ""` with `max-age=0` (i.e. an immediately-expired
 * tombstone). A naive `Object.keys.length > 0` check would treat that
 * tombstone as a live cookie, so we mirror the lib's own `getCookie` logic:
 * skip empty values and skip entries whose `expires` is in the past. Without
 * this filter we render a blank frame during the /sign-out → /get-session
 * refetch and the user sees Welcome → blank → Welcome (the "double flash").
 */
export const hasStoredAuthCookie = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem('better-auth_cookie')
    if (!raw) return false
    const parsed = JSON.parse(raw) as Record<
      string,
      { value?: string; expires?: string | null } | null | undefined
    >
    if (!parsed) return false
    const now = Date.now()
    for (const entry of Object.values(parsed)) {
      if (!entry?.value) continue
      if (entry.expires && new Date(entry.expires).getTime() < now) continue
      return true
    }
    return false
  } catch {
    return false
  }
}
