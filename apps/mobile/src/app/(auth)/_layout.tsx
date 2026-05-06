import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@/auth/useAuth'

export default function AuthLayout() {
  const { user, isLoading } = useAuth()

  if (isLoading) return null
  if (user) return <Redirect href="/" />

  return <Stack screenOptions={{ headerShown: false }} />
}
