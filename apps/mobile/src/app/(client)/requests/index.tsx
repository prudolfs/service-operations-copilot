import { api } from '@service-ops/convex/api'
import { useQuery } from 'convex/react'
import { Link, router } from 'expo-router'
import { FlatList, Pressable, Text, View } from 'react-native'
import { GlassSurface } from '@/components/parallax'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

export default function ClientRequestsList() {
  const requests = useQuery(api.serviceRequests.listMyRequests)

  return (
    <View className="flex-1 bg-surface-0 pt-safe">
      <View className="px-6 pt-6 pb-4">
        <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
          Client · Requests
        </Text>
        <Text className="mt-2 font-black text-3xl text-surface-text">
          Your requests
        </Text>
      </View>

      <FlatList
        data={requests ?? []}
        keyExtractor={(r) => r._id}
        contentContainerClassName="px-6 pb-safe"
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={
          <View className="mb-4">
            <Link href="/(client)/requests/new" asChild>
              <Pressable
                accessibilityRole="button"
                className="rounded-2xl bg-brand-500 px-5 py-4 active:bg-brand-600"
              >
                <Text className="text-center font-semibold text-base text-white">
                  + New request
                </Text>
              </Pressable>
            </Link>
          </View>
        }
        ListEmptyComponent={
          requests === undefined ? null : (
            <GlassSurface style={{ padding: 24 }}>
              <Text className="text-base text-surface-text-muted">
                No requests yet. Tap "New request" to create your first one.
              </Text>
            </GlassSurface>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/(client)/requests/${item._id}`)}
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
            {item.notes ? (
              <Text
                numberOfLines={2}
                className="mt-2 text-sm text-surface-text-muted"
              >
                {item.notes}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  )
}
