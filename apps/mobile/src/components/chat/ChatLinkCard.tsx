import { api } from '@service-ops/convex/api'
import type { Id } from '@service-ops/convex/dataModel'
import { useQuery } from 'convex/react'
import { router } from 'expo-router'
import { Pressable, Text } from 'react-native'
import type { ChatBasePath } from './ChatList'

export type ChatLinkCardProps = {
  serviceRequestId: Id<'serviceRequests'>
  basePath: ChatBasePath
}

/**
 * Renders a "Open chat" tile when a chat room exists for the given request.
 * Hidden silently while the room hasn't been created yet (e.g. request still
 * OPEN). Tapping navigates into the role's chat detail screen.
 */
export function ChatLinkCard({
  serviceRequestId,
  basePath,
}: ChatLinkCardProps) {
  const room = useQuery(api.chat.getRoomForRequest, { serviceRequestId })
  if (!room) return null
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: `${basePath}/[chatRoomId]`,
          params: { chatRoomId: room._id },
        })
      }
      className="mt-6 rounded-2xl border border-surface-3 bg-surface-1 px-5 py-4 active:bg-surface-2"
    >
      <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
        Conversation
      </Text>
      <Text className="mt-1 font-semibold text-base text-surface-text">
        Open chat
      </Text>
      {room.lastMessageText ? (
        <Text
          numberOfLines={1}
          className="mt-1 text-sm text-surface-text-muted"
        >
          {room.lastMessageText}
        </Text>
      ) : (
        <Text className="mt-1 text-sm text-surface-text-muted italic">
          No messages yet
        </Text>
      )}
    </Pressable>
  )
}
