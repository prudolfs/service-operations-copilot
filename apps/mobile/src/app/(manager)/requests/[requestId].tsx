import { api } from '@service-ops/convex/api'
import type { Doc, Id } from '@service-ops/convex/dataModel'
import type { ServiceRequestStatus } from '@service-ops/shared'
import { useMutation, useQuery } from 'convex/react'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { GlassSurface } from '@/components/parallax'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

const ALL_STATUSES: ServiceRequestStatus[] = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]

export default function ManagerRequestDetail() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>()
  const id = requestId as Id<'serviceRequests'>
  const data = useQuery(api.serviceRequests.getById, { requestId: id })
  const workers = useQuery(api.users.listWorkers)
  const assignWorker = useMutation(api.serviceRequests.assignWorker)
  const setStatus = useMutation(api.serviceRequests.setStatus)
  const cancel = useMutation(api.serviceRequests.cancel)
  const [busyKey, setBusyKey] = useState<string | null>(null)

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

  const { request, client, assignedWorker } = data

  const wrap = (key: string, fn: () => Promise<unknown>) => async () => {
    setBusyKey(key)
    try {
      await fn()
    } catch (err) {
      Alert.alert('Action failed', (err as Error).message)
    } finally {
      setBusyKey(null)
    }
  }

  const onAssign = (worker: Doc<'users'>) =>
    wrap(`assign-${worker._id}`, () =>
      assignWorker({ requestId: id, workerId: worker._id }),
    )

  const onSetStatus = (status: ServiceRequestStatus) =>
    wrap(`status-${status}`, () => setStatus({ requestId: id, status }))

  const onCancel = () =>
    Alert.alert('Cancel request?', 'This action cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: () => {
          void wrap('cancel', () => cancel({ requestId: id }))().then(() =>
            router.back(),
          )
        },
      },
    ])

  return (
    <View className="flex-1 bg-surface-0 pt-safe">
      <Stack.Screen options={{ title: 'Request' }} />
      <ScrollView contentContainerClassName="px-6 pb-12">
        <View className="pt-6 pb-4">
          <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
            Manager · Request
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
              Client
            </Text>
            <Text className="mt-1 text-base text-surface-text">
              {client?.name ?? client?.email ?? 'Unknown'}
            </Text>
            <Text className="mt-3 text-surface-text-muted text-xs uppercase tracking-widest">
              Assigned worker
            </Text>
            <Text className="mt-1 text-base text-surface-text">
              {assignedWorker?.name ?? assignedWorker?.email ?? 'Unassigned'}
            </Text>
          </View>
        </GlassSurface>

        <View className="mt-6">
          <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
            Assign worker
          </Text>
          <View className="mt-3 gap-2">
            {workers === undefined ? (
              <Text className="text-base text-surface-text-muted">
                Loading workers…
              </Text>
            ) : workers.length === 0 ? (
              <Text className="text-base text-surface-text-muted">
                No workers in the roster yet.
              </Text>
            ) : (
              workers.map((w) => {
                const isAssigned = assignedWorker?._id === w._id
                const k = `assign-${w._id}`
                return (
                  <Pressable
                    key={w._id}
                    accessibilityRole="button"
                    disabled={busyKey !== null || isAssigned}
                    onPress={onAssign(w)}
                    className={`rounded-2xl border px-4 py-3 ${
                      isAssigned
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-surface-3 bg-surface-1 active:bg-surface-2'
                    }`}
                  >
                    <Text className="text-base text-surface-text">
                      {w.name ?? w.email}
                    </Text>
                    <Text className="text-sm text-surface-text-muted">
                      {busyKey === k
                        ? 'Assigning…'
                        : isAssigned
                          ? 'Currently assigned'
                          : w.email}
                    </Text>
                  </Pressable>
                )
              })
            )}
          </View>
        </View>

        <View className="mt-6">
          <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
            Force status
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {ALL_STATUSES.map((s) => {
              const k = `status-${s}`
              const selected = request.status === s
              return (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  disabled={busyKey !== null || selected}
                  onPress={onSetStatus(s)}
                  className={`rounded-full px-3 py-1.5 ${
                    selected
                      ? 'bg-brand-500'
                      : 'border border-surface-3 bg-surface-1'
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      selected
                        ? 'font-semibold text-white'
                        : 'text-surface-text-muted'
                    }`}
                  >
                    {busyKey === k ? '…' : s}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {request.status !== 'COMPLETED' && request.status !== 'CANCELLED' ? (
          <Pressable
            accessibilityRole="button"
            disabled={busyKey !== null}
            onPress={onCancel}
            className="mt-6 rounded-2xl border border-surface-3 px-5 py-4 active:bg-surface-1"
          >
            <Text className="text-center font-semibold text-base text-status-cancelled">
              Cancel request
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  )
}
