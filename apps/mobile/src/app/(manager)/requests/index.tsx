import { api } from '@service-ops/convex/api'
import type { ServiceRequestStatus } from '@service-ops/shared'
import { useQuery } from 'convex/react'
import { router } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { GlassSurface } from '@/components/parallax'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

type Filter = 'ALL' | ServiceRequestStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Done' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function ManagerRequestsList() {
  const [filter, setFilter] = useState<Filter>('ALL')
  const requests = useQuery(
    api.serviceRequests.listAll,
    filter === 'ALL' ? {} : { status: filter },
  )

  return (
    <View className="flex-1 bg-surface-0 pt-safe">
      <View className="px-6 pt-6 pb-4">
        <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
          Manager · Requests
        </Text>
        <Text className="mt-2 font-black text-3xl text-surface-text">
          All requests
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2 px-6 pb-3">
        {FILTERS.map((f) => {
          const selected = filter === f.value
          return (
            <Pressable
              key={f.value}
              accessibilityRole="button"
              onPress={() => setFilter(f.value)}
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
                {f.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <FlatList
        data={requests ?? []}
        keyExtractor={(r) => r._id}
        contentContainerClassName="px-6 pb-safe"
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          requests === undefined ? null : (
            <GlassSurface style={{ padding: 24 }}>
              <Text className="text-base text-surface-text-muted">
                Nothing matches the current filter.
              </Text>
            </GlassSurface>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/(manager)/requests/${item._id}`)}
            className="rounded-2xl border border-surface-3 bg-surface-1 p-4 active:bg-surface-2"
          >
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-base text-surface-text">
                {formatServiceType(item.serviceType)}
              </Text>
              <StatusBadge status={item.status} />
            </View>
            <Text className="mt-2 text-sm text-surface-text-muted">
              {formatDateTime(item.date, item.time)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  )
}
