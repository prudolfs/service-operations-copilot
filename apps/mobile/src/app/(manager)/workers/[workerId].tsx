import { api } from '@service-ops/convex/api'
import type { Doc, Id } from '@service-ops/convex/dataModel'
import { useQuery } from 'convex/react'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { GlassSurface } from '@/components/parallax'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

type Detail = {
  worker: Doc<'users'>
  recentJobs: Doc<'serviceRequests'>[]
  activeAssignments: number
  completedAllTime: number
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <GlassSurface style={{ flex: 1, padding: 18 }}>
      <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
        {label}
      </Text>
      <Text className="mt-2 font-black text-3xl text-surface-text">
        {value}
      </Text>
    </GlassSurface>
  )
}

export default function ManagerWorkerDetail() {
  const { workerId } = useLocalSearchParams<{ workerId: string }>()
  const id = workerId as Id<'users'>
  const detail = useQuery(api.manager.workerDetail, { workerId: id }) as
    | Detail
    | null
    | undefined
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 600)
  }, [])

  if (detail === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-0 pt-safe">
        <Text className="text-surface-text-muted">Loading…</Text>
      </View>
    )
  }
  if (detail === null) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-0 pt-safe">
        <Text className="text-surface-text-muted">Worker not found.</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-surface-0 pt-safe">
      <Stack.Screen options={{ title: 'Worker' }} />
      <ScrollView
        contentContainerClassName="px-6 pb-12"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#87b6ff"
          />
        }
      >
        <View className="pt-6 pb-4">
          <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
            Manager · Worker
          </Text>
          <Text className="mt-2 font-black text-3xl text-surface-text">
            {detail.worker.name ?? detail.worker.email}
          </Text>
          <Text className="mt-1 text-base text-surface-text-muted">
            {detail.worker.email}
          </Text>
        </View>

        <View className="flex-row gap-3">
          <StatTile label="Active" value={detail.activeAssignments} />
          <StatTile label="Completed" value={detail.completedAllTime} />
        </View>

        <View className="mt-8">
          <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
            Recent jobs
          </Text>
          {detail.recentJobs.length === 0 ? (
            <GlassSurface style={{ padding: 24, marginTop: 12 }}>
              <Text className="text-base text-surface-text-muted">
                This worker hasn't picked up any jobs yet.
              </Text>
            </GlassSurface>
          ) : (
            <View className="mt-3 gap-3">
              {detail.recentJobs.map((job) => (
                <Pressable
                  key={job._id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/(manager)/requests/${job._id}`)}
                  className="rounded-2xl border border-surface-3 bg-surface-1 p-4 active:bg-surface-2"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="font-semibold text-base text-surface-text">
                      {formatServiceType(job.serviceType)}
                    </Text>
                    <StatusBadge status={job.status} />
                  </View>
                  <Text className="mt-2 text-sm text-surface-text-muted">
                    {formatDateTime(job.date, job.time)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
