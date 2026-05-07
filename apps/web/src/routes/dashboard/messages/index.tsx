import { createFileRoute } from '@tanstack/react-router'
import { ChatList } from '@/components/chat/ChatList'

export const Route = createFileRoute('/dashboard/messages/')({
  component: () => (
    <ChatList
      eyebrow="Messages"
      title="Conversations"
      basePath="/dashboard/messages"
      emptyHint="No chats yet."
    />
  ),
})
