import type { Id } from '@service-ops/convex/dataModel'
import { useLocalSearchParams } from 'expo-router'
import { ChatRoom } from '@/components/chat'

export default function ClientChatRoomScreen() {
  const { chatRoomId } = useLocalSearchParams<{ chatRoomId: string }>()
  return (
    <ChatRoom
      chatRoomId={chatRoomId as Id<'chatRooms'>}
      eyebrow="Client · Chat"
    />
  )
}
