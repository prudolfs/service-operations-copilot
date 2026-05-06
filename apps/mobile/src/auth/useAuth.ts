import { authClient, signIn, signOut, signUp } from '@/lib/auth-client'

/**
 * Thin wrapper around Better Auth's `useSession` so call sites get a single
 * import for the auth-related primitives the rest of the app needs.
 */
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
