import '../../global.css'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { ConvexReactClient } from 'convex/react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { StrictMode } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { authClient } from '@/lib/auth-client'

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  {
    expectAuth: true,
    unsavedChangesWarning: false,
  },
)

export default function RootLayout() {
  return (
    <StrictMode>
      <SafeAreaProvider>
        <ConvexBetterAuthProvider client={convex} authClient={authClient}>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="light" />
        </ConvexBetterAuthProvider>
      </SafeAreaProvider>
    </StrictMode>
  )
}
