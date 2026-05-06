import { api } from '@service-ops/convex/api'
import type { Doc } from '@service-ops/convex/dataModel'
import { useQuery } from 'convex/react'
import { router } from 'expo-router'
import { useCallback, useState } from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { GlassSurface } from '@/components/parallax'

type RosterItem = {
  worker: Doc<'users'>
  activeAssignments: number
  inProgress: number
}

function WorkerRow({ item }: { item: RosterItem }) {
  const initials = (item.worker.name ?? item.worker.email)
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/(manager)/workers/${item.worker._id}`)}
      className="flex-row items-center gap-4 rounded-2xl border border-surface-3 bg-surface-1 p-4 active:bg-surface-2"
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-500/20">
        <Text className="font-semibold text-base text-brand-300">
          {initials || '·'}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-base text-surface-text">
          {item.worker.name ?? item.worker.email}
        </Text>
        <Text className="text-sm text-surface-text-muted">
          {item.worker.email}
        </Text>
      </View>
      <View className="items-end">
        <Text
          className={`font-black text-xl ${
            item.activeAssignments > 0
              ? 'text-surface-text'
              : 'text-surface-text-muted'
          }`}
        >
          {item.activeAssignments}
        </Text>
        <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
          {item.inProgress > 0 ? `${item.inProgress} live` : 'active'}
        </Text>
      </View>
    </Pressable>
  )
}

export default function ManagerWorkersList() {
  const roster = useQuery(api.manager.listWorkers) as RosterItem[] | undefined
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 600)
  }, [])

  return (
    <View className="flex-1 bg-surface-0 pt-safe">
      <View className="px-6 pt-6 pb-4">
        <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
          Manager · Workers
        </Text>
        <Text className="mt-2 font-black text-3xl text-surface-text">
          Workers
        </Text>
      </View>

      <FlatList
        data={roster ?? []}
        keyExtractor={(r) => r.worker._id}
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
          roster === undefined ? null : (
            <GlassSurface style={{ padding: 24 }}>
              <Text className="font-semibold text-base text-surface-text">
                No workers yet
              </Text>
              <Text className="mt-2 text-base text-surface-text-muted">
                Add an email to WORKER_EMAILS in Convex, then ask them to sign
                in.
              </Text>
            </GlassSurface>
          )
        }
        renderItem={({ item }) => <WorkerRow item={item} />}
      />
    </View>
  )
}
