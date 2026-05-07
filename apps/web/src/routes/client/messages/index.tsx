import { createFileRoute } from '@tanstack/react-router'
import { ChatList } from '@/components/chat/ChatList'

export const Route = createFileRoute('/client/messages/')({
  component: () => (
    <ChatList
      eyebrow="Client · Messages"
      title="Conversations"
      basePath="/client/messages"
      emptyHint="No chats yet. They appear when a worker accepts your request."
    />
  ),
})
