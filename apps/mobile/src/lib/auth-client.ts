import { expoClient } from '@better-auth/expo/client'
import { convexClient } from '@convex-dev/better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'

const scheme =
  (Constants.expoConfig?.scheme as string | undefined) ?? 'serviceops'

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
  plugins: [
    expoClient({
      scheme,
      storagePrefix: scheme,
      storage: SecureStore,
    }),
    convexClient(),
  ],
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
