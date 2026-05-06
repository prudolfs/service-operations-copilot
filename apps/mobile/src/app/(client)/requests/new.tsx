import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '@service-ops/convex/api'
import {
  type CreateServiceRequestInput,
  CreateServiceRequestSchema,
  type ServiceType,
} from '@service-ops/shared'
import { useMutation } from 'convex/react'
import { router, Stack } from 'expo-router'
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
import { GlassSurface } from '@/components/parallax'
import { SERVICE_TYPE_OPTIONS } from '@/lib/format'

type FocusKey = 'date' | 'time' | 'notes' | null

export default function NewClientRequest() {
  const [submitting, setSubmitting] = useState(false)
  const [focused, setFocused] = useState<FocusKey>(null)
  const createRequest = useMutation(api.serviceRequests.create)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateServiceRequestInput>({
    resolver: zodResolver(CreateServiceRequestSchema),
    defaultValues: {
      serviceType: 'cleaning',
      date: '',
      time: '',
      notes: '',
    },
  })

  const onSubmit = async (values: CreateServiceRequestInput) => {
    setSubmitting(true)
    try {
      const id = await createRequest({
        serviceType: values.serviceType,
        date: values.date,
        time: values.time,
        notes: values.notes || undefined,
      })
      router.replace(`/(client)/requests/${id}`)
    } catch (err) {
      Alert.alert('Could not create request', (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const anyFocused = focused !== null

  return (
    <View className="flex-1 bg-surface-0 pt-safe">
      <Stack.Screen options={{ title: 'New request' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-6 pb-12">
          <View className="pt-6 pb-4">
            <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
              Client · New request
            </Text>
            <Text className="mt-2 font-black text-3xl text-surface-text">
              What do you need?
            </Text>
          </View>

          <GlassSurface style={{ padding: 24 }} disabled={anyFocused}>
            <Controller
              control={control}
              name="serviceType"
              render={({ field }) => (
                <View>
                  <Text className="mb-2 text-surface-text-muted text-xs uppercase tracking-widest">
                    Service type
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {SERVICE_TYPE_OPTIONS.map((opt) => {
                      const selected = field.value === opt.value
                      return (
                        <Pressable
                          key={opt.value}
                          accessibilityRole="button"
                          onPress={() =>
                            field.onChange(opt.value as ServiceType)
                          }
                          className={`rounded-full px-4 py-2 ${
                            selected
                              ? 'bg-brand-500'
                              : 'border border-surface-3 bg-surface-2'
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              selected
                                ? 'font-semibold text-white'
                                : 'text-surface-text'
                            }`}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              )}
            />

            <View className="mt-6">
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <View>
                    <Text className="mb-2 text-surface-text-muted text-xs uppercase tracking-widest">
                      Date (YYYY-MM-DD)
                    </Text>
                    <GlassSurface variant="input" focused={focused === 'date'}>
                      <TextInput
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={() => {
                          field.onBlur()
                          setFocused(null)
                        }}
                        onFocus={() => setFocused('date')}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="2026-05-12"
                        placeholderTextColor="#5b6477"
                        className="px-4 py-3 text-base text-surface-text"
                      />
                    </GlassSurface>
                    {errors.date && (
                      <Text className="mt-1 text-status-progress text-xs">
                        {errors.date.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>

            <View className="mt-4">
              <Controller
                control={control}
                name="time"
                render={({ field }) => (
                  <View>
                    <Text className="mb-2 text-surface-text-muted text-xs uppercase tracking-widest">
                      Time (24h HH:mm)
                    </Text>
                    <GlassSurface variant="input" focused={focused === 'time'}>
                      <TextInput
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={() => {
                          field.onBlur()
                          setFocused(null)
                        }}
                        onFocus={() => setFocused('time')}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="14:30"
                        placeholderTextColor="#5b6477"
                        className="px-4 py-3 text-base text-surface-text"
                      />
                    </GlassSurface>
                    {errors.time && (
                      <Text className="mt-1 text-status-progress text-xs">
                        {errors.time.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>

            <View className="mt-4">
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <View>
                    <Text className="mb-2 text-surface-text-muted text-xs uppercase tracking-widest">
                      Notes
                    </Text>
                    <GlassSurface variant="input" focused={focused === 'notes'}>
                      <TextInput
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={() => {
                          field.onBlur()
                          setFocused(null)
                        }}
                        onFocus={() => setFocused('notes')}
                        multiline
                        numberOfLines={4}
                        placeholder="Anything the worker should know"
                        placeholderTextColor="#5b6477"
                        className="px-4 py-3 text-base text-surface-text"
                        style={{ minHeight: 100, textAlignVertical: 'top' }}
                      />
                    </GlassSurface>
                    {errors.notes && (
                      <Text className="mt-1 text-status-progress text-xs">
                        {errors.notes.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>
          </GlassSurface>

          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={handleSubmit(onSubmit)}
            className="mt-6 rounded-2xl bg-brand-500 px-5 py-4 active:bg-brand-600"
          >
            <Text className="text-center font-semibold text-base text-white">
              {submitting ? 'Submitting…' : 'Submit request'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
