import { ChatList } from '@/components/chat'

export default function ManagerMessagesIndex() {
  return (
    <ChatList
      eyebrow="Manager · Messages"
      title="All conversations"
      basePath="/(manager)/messages"
      emptyHint="No active chats yet — they appear here once workers accept jobs."
    />
  )
}
