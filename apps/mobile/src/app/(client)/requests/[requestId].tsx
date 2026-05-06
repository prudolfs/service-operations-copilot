import { api } from '@service-ops/convex/api'
import type { Id } from '@service-ops/convex/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { GlassSurface } from '@/components/parallax'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

export default function ClientRequestDetail() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>()
  const id = requestId as Id<'serviceRequests'>
  const data = useQuery(api.serviceRequests.getById, { requestId: id })
  const cancel = useMutation(api.serviceRequests.cancel)
  const [busy, setBusy] = useState(false)

  if (data === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-0 pt-safe">
        <Text className="text-surface-text-muted">Loading…</Text>
      </View>
    )
  }
  if (data === null) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-0 pt-safe">
        <Text className="text-surface-text-muted">Request not found.</Text>
      </View>
    )
  }

  const { request, assignedWorker } = data
  const canCancel =
    request.status !== 'COMPLETED' && request.status !== 'CANCELLED'

  const onCancel = () => {
    Alert.alert('Cancel request?', 'This action cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel request',
        style: 'destructive',
        onPress: async () => {
          setBusy(true)
          try {
            await cancel({ requestId: id })
            router.back()
          } catch (err) {
            Alert.alert('Could not cancel', (err as Error).message)
          } finally {
            setBusy(false)
          }
        },
      },
    ])
  }

  return (
    <View className="flex-1 bg-surface-0 pt-safe">
      <Stack.Screen options={{ title: 'Request' }} />
      <ScrollView contentContainerClassName="px-6 pb-12">
        <View className="pt-6 pb-4">
          <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
            Client · Request
          </Text>
          <Text className="mt-2 font-black text-3xl text-surface-text">
            {formatServiceType(request.serviceType)}
          </Text>
        </View>

        <GlassSurface style={{ padding: 24 }}>
          <StatusBadge status={request.status} />
          <Text className="mt-4 text-base text-surface-text">
            {formatDateTime(request.date, request.time)}
          </Text>
          {request.notes ? (
            <Text className="mt-3 text-base text-surface-text-muted">
              {request.notes}
            </Text>
          ) : null}
          <View className="mt-4 border-surface-3 border-t pt-4">
            <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
              Assigned worker
            </Text>
            <Text className="mt-1 text-base text-surface-text">
              {assignedWorker?.name ??
                assignedWorker?.email ??
                'Awaiting acceptance'}
            </Text>
          </View>
        </GlassSurface>

        {canCancel && (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onCancel}
            className="mt-6 rounded-2xl border border-surface-3 px-5 py-4 active:bg-surface-1"
          >
            <Text className="text-center font-semibold text-base text-status-cancelled">
              {busy ? 'Cancelling…' : 'Cancel request'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  )
}
