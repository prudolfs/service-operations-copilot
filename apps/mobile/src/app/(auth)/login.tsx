import { zodResolver } from '@hookform/resolvers/zod'
import { Link, router } from 'expo-router'
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

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
})
type LoginInput = z.infer<typeof LoginSchema>

type FocusKey = 'email' | 'password' | null

export default function LoginScreen() {
  const [submitting, setSubmitting] = useState(false)
  const [focused, setFocused] = useState<FocusKey>(null)
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginInput) => {
    setSubmitting(true)
    try {
      const { error } = await signIn.email({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      })
      if (error) {
        Alert.alert('Sign-in failed', error.message ?? 'Invalid credentials')
        return
      }
      router.replace('/')
    } catch (err) {
      Alert.alert('Sign-in failed', (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  // Freeze the hero card whenever any input has focus so the keyboard view
  // stays visually stable while typing.
  const anyFocused = focused !== null

  return (
    <View className="flex-1 bg-surface-0 pt-safe pb-safe">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow justify-center px-6">
          <GlassSurface style={{ padding: 32 }} disabled={anyFocused}>
            <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
              Sign in
            </Text>
            <Text className="mt-3 font-black text-3xl text-surface-text">
              Welcome back
            </Text>

            <View className="mt-8 gap-4">
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
              disabled={submitting}
              onPress={handleSubmit(onSubmit)}
              className="mt-8 rounded-2xl bg-brand-500 px-5 py-4 active:bg-brand-600"
            >
              <Text className="text-center font-semibold text-base text-white">
                {submitting ? 'Signing in…' : 'Sign in'}
              </Text>
            </Pressable>

            <View className="mt-6 flex-row justify-center">
              <Text className="text-sm text-surface-text-muted">
                No account?{' '}
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
