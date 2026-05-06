import { api } from '@service-ops/convex/api'
import type { Doc } from '@service-ops/convex/dataModel'
import { useQuery } from 'convex/react'
import { router } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { PageLoader } from '@/components/PageLoader'
import { GlassSurface } from '@/components/parallax'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

type Overview = {
  totalActive: number
  inProgress: number
  unassignedOpen: number
  completedToday: number
  needsAttention: Doc<'serviceRequests'>[]
}

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: number | string
  hint?: string
  tone?: 'default' | 'warn'
}) {
  const valueColor = tone === 'warn' ? 'text-status-open' : 'text-surface-text'
  return (
    <GlassSurface style={{ flex: 1, minWidth: 140, padding: 18 }}>
      <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
        {label}
      </Text>
      <Text className={`mt-2 font-black text-4xl ${valueColor}`}>{value}</Text>
      {hint ? (
        <Text className="mt-1 text-sm text-surface-text-muted">{hint}</Text>
      ) : null}
    </GlassSurface>
  )
}

export default function ManagerOverview() {
  const data = useQuery(api.manager.overview) as Overview | undefined
  const [refreshing, setRefreshing] = useState(false)

  // Convex queries are reactive — pull-to-refresh is a UX affordance, not a
  // data fetch. Snap the spinner closed after a short delay.
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 600)
  }, [])

  if (data === undefined) return <PageLoader />

  return (
    <View className="flex-1 bg-surface-0 pt-safe">
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
            Manager · Overview
          </Text>
          <Text className="mt-2 font-black text-3xl text-surface-text">
            Operations
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <MetricCard
            label="Active"
            value={data.totalActive}
            hint="Open + assigned + in progress"
          />
          <MetricCard
            label="In progress"
            value={data.inProgress}
            hint="Workers on the clock"
          />
          <MetricCard
            label="Unassigned"
            value={data.unassignedOpen}
            hint="Need a worker"
            tone={data.unassignedOpen > 0 ? 'warn' : 'default'}
          />
          <MetricCard
            label="Done today"
            value={data.completedToday}
            hint="Completed since midnight"
          />
        </View>

        <View className="mt-8">
          <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
            Needs attention
          </Text>

          {data.needsAttention.length === 0 ? (
            <GlassSurface style={{ padding: 24, marginTop: 12 }}>
              <Text className="font-semibold text-base text-surface-text">
                Inbox zero
              </Text>
              <Text className="mt-2 text-base text-surface-text-muted">
                Every open request has a worker. Nothing needs your attention
                right now.
              </Text>
            </GlassSurface>
          ) : (
            <View className="mt-3 gap-3">
              {data.needsAttention.map((req) => (
                <Pressable
                  key={req._id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/(manager)/requests/${req._id}`)}
                  className="rounded-2xl border border-surface-3 bg-surface-1 p-4 active:bg-surface-2"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="font-semibold text-base text-surface-text">
                      {formatServiceType(req.serviceType)}
                    </Text>
                    <StatusBadge status={req.status} />
                  </View>
                  <Text className="mt-2 text-sm text-surface-text-muted">
                    {formatDateTime(req.date, req.time)}
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
