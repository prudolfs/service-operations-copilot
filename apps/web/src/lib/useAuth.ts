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
