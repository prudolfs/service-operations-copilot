import '../../global.css'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { ConvexReactClient } from 'convex/react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { authClient } from '@/lib/auth-client'

// No StrictMode wrapper: Reanimated 4's createAnimatedComponent calls
// findHostInstance_DEPRECATED, and React 19 StrictMode escalates that to a
// red-box error on every Animated.View render. LogBox.ignoreLogs doesn't
// suppress it under the new architecture. Seniory ships without StrictMode
// for the same reason.

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  {
    expectAuth: true,
    unsavedChangesWarning: false,
  },
)

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0a0d14' },
            // `fade` makes the welcome → splash → role-home hop look like a
            // single dissolve instead of three slide animations stacked.
            animation: 'fade',
          }}
        />
        <StatusBar style="light" />
      </ConvexBetterAuthProvider>
    </SafeAreaProvider>
  )
}
