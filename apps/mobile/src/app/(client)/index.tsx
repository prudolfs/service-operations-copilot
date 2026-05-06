import { api } from '@service-ops/convex/api'
import { useQuery } from 'convex/react'
import { Link, router } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { GlassSurface } from '@/components/parallax'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

export default function ClientHome() {
  const requests = useQuery(api.serviceRequests.listMyRequests)
  const recent = (requests ?? []).slice(0, 3)

  return (
    <View className="flex-1 bg-surface-0 pt-safe">
      <ScrollView contentContainerClassName="px-6 pb-12">
        <View className="pt-6 pb-4">
          <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
            Client · Home
          </Text>
          <Text className="mt-2 font-black text-3xl text-surface-text">
            Your dashboard
          </Text>
        </View>

        <GlassSurface style={{ padding: 24 }}>
          <Text className="font-semibold text-lg text-surface-text">
            Need a hand?
          </Text>
          <Text className="mt-2 text-base text-surface-text-muted">
            Create a service request and a worker will pick it up.
          </Text>
          <Link href="/(client)/requests/new" asChild>
            <Pressable
              accessibilityRole="button"
              className="mt-4 rounded-2xl bg-brand-500 px-5 py-4 active:bg-brand-600"
            >
              <Text className="text-center font-semibold text-base text-white">
                + New request
              </Text>
            </Pressable>
          </Link>
        </GlassSurface>

        <View className="mt-6">
          <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
            Recent requests
          </Text>
          {recent.length === 0 ? (
            <Text className="mt-3 text-base text-surface-text-muted">
              {requests === undefined ? 'Loading…' : 'No requests yet.'}
            </Text>
          ) : (
            <View className="mt-3 gap-3">
              {recent.map((item) => (
                <Pressable
                  key={item._id}
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
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
