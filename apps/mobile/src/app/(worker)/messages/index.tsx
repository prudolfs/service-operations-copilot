import { ChatList } from '@/components/chat'

export default function WorkerMessagesIndex() {
  return (
    <ChatList
      eyebrow="Worker · Messages"
      title="Conversations"
      basePath="/(worker)/messages"
      emptyHint="Accept a job to start a chat with the client."
    />
  )
}
