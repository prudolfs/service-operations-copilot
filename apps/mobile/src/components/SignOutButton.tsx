import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, Text } from 'react-native'
import { signOut } from '@/lib/auth-client'

export function SignOutButton() {
  const [busy, setBusy] = useState(false)

  const onPress = async () => {
    setBusy(true)
    try {
      await signOut()
      router.replace('/')
    } catch (err) {
      Alert.alert('Sign-out failed', (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      className="rounded-2xl border border-surface-3 px-5 py-4 active:bg-surface-1"
    >
      <Text className="text-center font-semibold text-base text-surface-text">
        {busy ? 'Signing out…' : 'Sign out'}
      </Text>
    </Pressable>
  )
}
