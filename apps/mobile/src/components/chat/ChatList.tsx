import { api } from '@service-ops/convex/api'
import { useQuery } from 'convex/react'
import { router } from 'expo-router'
import { FlatList, Pressable, Text, View } from 'react-native'
import { GlassSurface } from '@/components/parallax'
import { StatusBadge } from '@/components/StatusBadge'
import { formatServiceType } from '@/lib/format'

export type ChatBasePath =
  | '/(client)/messages'
  | '/(worker)/messages'
  | '/(manager)/messages'

export type ChatListProps = {
  eyebrow: string
  title: string
  basePath: ChatBasePath
  emptyHint: string
}

const formatRelativeTime = (ts: number): string => {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export function ChatList({
  eyebrow,
  title,
  basePath,
  emptyHint,
}: ChatListProps) {
  const rooms = useQuery(api.chat.listForUser)

  return (
    <View className="flex-1 bg-surface-0 pt-safe">
      <View className="px-6 pt-6 pb-4">
        <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
          {eyebrow}
        </Text>
        <Text className="mt-2 font-black text-3xl text-surface-text">
          {title}
        </Text>
      </View>

      <FlatList
        data={rooms ?? []}
        keyExtractor={(r) => r._id}
        contentContainerClassName="px-6 pb-safe"
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          rooms === undefined ? null : (
            <GlassSurface style={{ padding: 24 }}>
              <Text className="text-base text-surface-text-muted">
                {emptyHint}
              </Text>
            </GlassSurface>
          )
        }
        renderItem={({ item }) => {
          const otherName =
            item.client?.name ??
            item.client?.email ??
            item.assignedWorker?.name ??
            item.assignedWorker?.email ??
            'Unknown'
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: `${basePath}/[chatRoomId]`,
                  params: { chatRoomId: item._id },
                })
              }
              className="rounded-2xl border border-surface-3 bg-surface-1 p-4 active:bg-surface-2"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-base text-surface-text">
                  {formatServiceType(item.request.serviceType)}
                </Text>
                <StatusBadge status={item.request.status} />
              </View>
              <Text className="mt-1 text-sm text-surface-text-muted">
                {otherName}
              </Text>
              {item.lastMessageText ? (
                <Text
                  numberOfLines={2}
                  className="mt-2 text-sm text-surface-text"
                >
                  {item.lastMessageText}
                </Text>
              ) : (
                <Text className="mt-2 text-sm text-surface-text-muted italic">
                  No messages yet
                </Text>
              )}
              <Text className="mt-2 text-surface-text-muted text-xs">
                {formatRelativeTime(item.lastMessageTime)}
              </Text>
            </Pressable>
          )
        }}
      />
    </View>
  )
}
