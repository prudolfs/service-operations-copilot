import { api } from '@service-ops/convex/api'
import type { Doc } from '@service-ops/convex/dataModel'
import type { ServiceRequestStatus } from '@service-ops/shared'
import { useQuery } from 'convex/react'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { GlassSurface } from '@/components/parallax'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

type StatusFilter = 'ALL' | ServiceRequestStatus
type AssigneeFilter = 'any' | 'assigned' | 'unassigned'
type SortOrder = 'newest' | 'oldest'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Done' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const ASSIGNEE_FILTERS: { value: AssigneeFilter; label: string }[] = [
  { value: 'any', label: 'Any assignee' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'assigned', label: 'Has worker' },
]

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`rounded-full px-3 py-1.5 ${
        selected ? 'bg-brand-500' : 'border border-surface-3 bg-surface-1'
      }`}
    >
      <Text
        className={`text-xs ${
          selected ? 'font-semibold text-white' : 'text-surface-text-muted'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export default function ManagerRequestsList() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('any')
  const [sort, setSort] = useState<SortOrder>('newest')
  const [refreshing, setRefreshing] = useState(false)

  const requests = useQuery(
    api.serviceRequests.listAll,
    statusFilter === 'ALL' ? {} : { status: statusFilter },
  )

  const visible = useMemo(() => {
    if (!requests) return undefined
    const filtered = requests.filter((r) => {
      if (assigneeFilter === 'unassigned') return !r.assignedWorkerId
      if (assigneeFilter === 'assigned') return Boolean(r.assignedWorkerId)
      return true
    })
    const sorted = [...filtered].sort((a, b) =>
      sort === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
    )
    return sorted
  }, [requests, assigneeFilter, sort])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 600)
  }, [])

  const emptyHint = useMemo(() => {
    if (assigneeFilter === 'unassigned' && statusFilter === 'ALL') {
      return 'Every request has a worker.'
    }
    if (assigneeFilter === 'unassigned') {
      return 'Nothing in this status is unassigned.'
    }
    return 'Nothing matches the current filters.'
  }, [assigneeFilter, statusFilter])

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

      <View className="flex-row flex-wrap gap-2 px-6">
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            selected={statusFilter === f.value}
            onPress={() => setStatusFilter(f.value)}
          />
        ))}
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2 px-6">
        {ASSIGNEE_FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            selected={assigneeFilter === f.value}
            onPress={() => setAssigneeFilter(f.value)}
          />
        ))}
      </View>

      <View className="mt-3 flex-row items-center gap-2 px-6 pb-3">
        <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
          Sort
        </Text>
        <Chip
          label="Newest"
          selected={sort === 'newest'}
          onPress={() => setSort('newest')}
        />
        <Chip
          label="Oldest"
          selected={sort === 'oldest'}
          onPress={() => setSort('oldest')}
        />
      </View>

      <FlatList
        data={visible ?? []}
        keyExtractor={(r) => r._id}
        contentContainerClassName="px-6 pb-safe"
        ItemSeparatorComponent={() => <View className="h-3" />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#87b6ff"
          />
        }
        ListEmptyComponent={
          visible === undefined ? null : (
            <GlassSurface style={{ padding: 24 }}>
              <Text className="text-base text-surface-text-muted">
                {emptyHint}
              </Text>
            </GlassSurface>
          )
        }
        renderItem={({ item }: { item: Doc<'serviceRequests'> }) => (
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
            {!item.assignedWorkerId ? (
              <Text className="mt-1 text-status-open text-xs uppercase tracking-widest">
                Unassigned
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  )
}
