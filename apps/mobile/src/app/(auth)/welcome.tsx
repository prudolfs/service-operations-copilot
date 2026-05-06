import { Ionicons } from '@expo/vector-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { z } from 'zod'
import { GlassSurface } from '@/components/parallax'
import { signIn } from '@/lib/auth-client'

type Provider = 'github' | 'google'

const EmailSignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
})
type EmailSignInInput = z.infer<typeof EmailSignInSchema>

type FocusKey = 'email' | 'password' | null

export default function WelcomeScreen() {
  const [oauthBusy, setOauthBusy] = useState<Provider | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [focused, setFocused] = useState<FocusKey>(null)
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailSignInInput>({
    resolver: zodResolver(EmailSignInSchema),
    defaultValues: { email: '', password: '' },
  })

  const continueWith = async (provider: Provider) => {
    setOauthBusy(provider)
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
      setOauthBusy(null)
    }
  }

  const onEmailSubmit = async (values: EmailSignInInput) => {
    setSubmitting(true)
    try {
      const { error } = await signIn.email({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      })
      if (error) {
        Alert.alert('Sign-in failed', error.message ?? 'Invalid credentials')
      }
    } catch (err) {
      Alert.alert('Sign-in failed', (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const anyFocused = focused !== null
  const busy = oauthBusy !== null || submitting

  return (
    <View className="flex-1 bg-surface-0 pt-safe pb-safe">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow justify-center px-6">
          <GlassSurface style={{ padding: 32 }} disabled={anyFocused}>
            <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
              Service Ops
            </Text>
            <Text className="mt-4 font-black text-4xl text-surface-text">
              Welcome
            </Text>
            <Text className="mt-3 text-base text-surface-text-muted">
              Sign in to request a service and message your team.
            </Text>

            <View className="mt-8 gap-3">
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => continueWith('google')}
                className="flex-row items-center justify-center gap-3 rounded-2xl bg-brand-500 px-5 py-4 active:bg-brand-600"
              >
                <Ionicons name="logo-google" size={20} color="#fff" />
                <Text className="font-semibold text-base text-white">
                  {oauthBusy === 'google'
                    ? 'Connecting…'
                    : 'Continue with Google'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => continueWith('github')}
                className="flex-row items-center justify-center gap-3 rounded-2xl bg-surface-2 px-5 py-4 active:bg-surface-3"
              >
                <Ionicons name="logo-github" size={20} color="#e5e9f2" />
                <Text className="font-semibold text-base text-surface-text">
                  {oauthBusy === 'github'
                    ? 'Connecting…'
                    : 'Continue with GitHub'}
                </Text>
              </Pressable>
            </View>

            <View className="mt-6 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-surface-3" />
              <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
                or email
              </Text>
              <View className="h-px flex-1 bg-surface-3" />
            </View>

            <View className="mt-6 gap-4">
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <View>
                    <Text className="mb-2 text-surface-text-muted text-xs uppercase tracking-widest">
                      Email
                    </Text>
                    <GlassSurface variant="input" focused={focused === 'email'}>
                      <TextInput
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={() => {
                          field.onBlur()
                          setFocused(null)
                        }}
                        onFocus={() => setFocused('email')}
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        placeholder="you@example.com"
                        placeholderTextColor="#5b6477"
                        className="px-4 py-3 text-base text-surface-text"
                      />
                    </GlassSurface>
                    {errors.email && (
                      <Text className="mt-1 text-status-progress text-xs">
                        {errors.email.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <View>
                    <Text className="mb-2 text-surface-text-muted text-xs uppercase tracking-widest">
                      Password
                    </Text>
                    <GlassSurface
                      variant="input"
                      focused={focused === 'password'}
                    >
                      <TextInput
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={() => {
                          field.onBlur()
                          setFocused(null)
                        }}
                        onFocus={() => setFocused('password')}
                        autoCapitalize="none"
                        autoComplete="current-password"
                        secureTextEntry
                        placeholder="••••••••"
                        placeholderTextColor="#5b6477"
                        className="px-4 py-3 text-base text-surface-text"
                      />
                    </GlassSurface>
                    {errors.password && (
                      <Text className="mt-1 text-status-progress text-xs">
                        {errors.password.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={handleSubmit(onEmailSubmit)}
              className="mt-6 rounded-2xl border border-surface-3 px-5 py-4 active:bg-surface-1"
            >
              <Text className="text-center font-semibold text-base text-surface-text">
                {submitting ? 'Signing in…' : 'Sign in with email'}
              </Text>
            </Pressable>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
