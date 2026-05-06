import { Link, router } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { GlassSurface } from '@/components/parallax'
import { signIn } from '@/lib/auth-client'

type Provider = 'github' | 'google'

export default function WelcomeScreen() {
  const [busy, setBusy] = useState<Provider | null>(null)

  const continueWith = async (provider: Provider) => {
    setBusy(provider)
    try {
      const { error } = await signIn.social({
        provider,
        callbackURL: '/',
      })
      if (error) {
        Alert.alert('Sign-in failed', error.message ?? 'Unknown error')
      }
    } catch (err) {
      Alert.alert('Sign-in failed', (err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <View className="flex-1 bg-surface-0 pt-safe pb-safe">
      <View className="flex-1 items-stretch justify-center px-6">
        <GlassSurface style={{ padding: 32 }}>
          <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
            Service Ops
          </Text>
          <Text className="mt-4 font-black text-4xl text-surface-text">
            Welcome
          </Text>
          <Text className="mt-3 text-base text-surface-text-muted">
            Sign in to manage requests, jobs, and chat with your crew.
          </Text>

          <View className="mt-8 gap-3">
            <Pressable
              accessibilityRole="button"
              disabled={busy !== null}
              onPress={() => continueWith('google')}
              className="rounded-2xl bg-brand-500 px-5 py-4 active:bg-brand-600"
            >
              <Text className="text-center font-semibold text-base text-white">
                {busy === 'google' ? 'Connecting…' : 'Continue with Google'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={busy !== null}
              onPress={() => continueWith('github')}
              className="rounded-2xl bg-surface-2 px-5 py-4 active:bg-surface-3"
            >
              <Text className="text-center font-semibold text-base text-surface-text">
                {busy === 'github' ? 'Connecting…' : 'Continue with GitHub'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={busy !== null}
              onPress={() => router.push('/login')}
              className="rounded-2xl border border-surface-3 px-5 py-4 active:bg-surface-1"
            >
              <Text className="text-center font-semibold text-base text-surface-text">
                Continue with email
              </Text>
            </Pressable>
          </View>

          <View className="mt-6 flex-row justify-center">
            <Text className="text-sm text-surface-text-muted">
              No account yet?{' '}
            </Text>
            <Link
              href="/register"
              className="font-semibold text-brand-300 text-sm"
            >
              Create one
            </Link>
          </View>
        </GlassSurface>
      </View>
    </View>
  )
}
