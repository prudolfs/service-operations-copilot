import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@/auth/useAuth'

export default function AuthLayout() {
  const { user, isLoading } = useAuth()

  // Only redirect on a *stable* authenticated session. Returning null on
  // `isLoading` (or redirecting on stale `user`) unmounts the Stack mid-
  // transition and produces a welcome → flash → welcome remount on sign-out.
  if (user && !isLoading) return <Redirect href="/" />

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0d14' },
        animation: 'fade',
      }}
    />
  )
}
