import { api } from '@service-ops/convex/api'
import type { Id } from '@service-ops/convex/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { ChatLinkCard } from '@/components/chat'
import { GlassSurface } from '@/components/parallax'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

type Action = 'accept' | 'start' | 'complete' | null

export default function WorkerJobDetail() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>()
  const id = jobId as Id<'serviceRequests'>
  const data = useQuery(api.serviceRequests.getById, { requestId: id })
  const accept = useMutation(api.serviceRequests.accept)
  const start = useMutation(api.serviceRequests.start)
  const complete = useMutation(api.serviceRequests.complete)
  const [busy, setBusy] = useState<Action>(null)

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
        <Text className="text-surface-text-muted">Job not found.</Text>
      </View>
    )
  }

  const { request, client, assignedWorker } = data
  const status = request.status

  const run = (action: Action, fn: () => Promise<unknown>) => async () => {
    setBusy(action)
    try {
      await fn()
      if (action === 'complete') router.back()
    } catch (err) {
      Alert.alert('Action failed', (err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <View className="flex-1 bg-surface-0 pt-safe">
      <Stack.Screen options={{ title: 'Job' }} />
      <ScrollView contentContainerClassName="px-6 pb-12">
        <View className="pt-6 pb-4">
          <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
            Worker · Job
          </Text>
          <Text className="mt-2 font-black text-3xl text-surface-text">
            {formatServiceType(request.serviceType)}
          </Text>
        </View>

        <GlassSurface style={{ padding: 24 }}>
          <StatusBadge status={status} />
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
            {assignedWorker ? (
              <>
                <Text className="mt-3 text-surface-text-muted text-xs uppercase tracking-widest">
                  Assigned worker
                </Text>
                <Text className="mt-1 text-base text-surface-text">
                  {assignedWorker.name ?? assignedWorker.email}
                </Text>
              </>
            ) : null}
          </View>
        </GlassSurface>

        <ChatLinkCard serviceRequestId={id} basePath="/(worker)/messages" />

        <View className="mt-6 gap-3">
          {status === 'OPEN' && (
            <Pressable
              accessibilityRole="button"
              disabled={busy !== null}
              onPress={run('accept', () => accept({ requestId: id }))}
              className="rounded-2xl bg-brand-500 px-5 py-4 active:bg-brand-600"
            >
              <Text className="text-center font-semibold text-base text-white">
                {busy === 'accept' ? 'Accepting…' : 'Accept job'}
              </Text>
            </Pressable>
          )}
          {status === 'ASSIGNED' && (
            <Pressable
              accessibilityRole="button"
              disabled={busy !== null}
              onPress={run('start', () => start({ requestId: id }))}
              className="rounded-2xl bg-brand-500 px-5 py-4 active:bg-brand-600"
            >
              <Text className="text-center font-semibold text-base text-white">
                {busy === 'start' ? 'Starting…' : 'Start job'}
              </Text>
            </Pressable>
          )}
          {status === 'IN_PROGRESS' && (
            <Pressable
              accessibilityRole="button"
              disabled={busy !== null}
              onPress={run('complete', () => complete({ requestId: id }))}
              className="rounded-2xl bg-status-completed px-5 py-4 active:opacity-80"
            >
              <Text className="text-center font-semibold text-base text-white">
                {busy === 'complete' ? 'Completing…' : 'Mark complete'}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
