import { ChatList } from '@/components/chat'

export default function ClientMessagesIndex() {
  return (
    <ChatList
      eyebrow="Client · Messages"
      title="Conversations"
      basePath="/(client)/messages"
      emptyHint="A chat opens here once a worker accepts one of your requests."
    />
  )
}
