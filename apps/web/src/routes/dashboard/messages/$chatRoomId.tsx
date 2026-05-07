import type { Id } from '@service-ops/convex/dataModel'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ChatRoom } from '@/components/chat/ChatRoom'

const SearchSchema = z.object({
  draft: z.string().optional(),
})

export const Route = createFileRoute('/dashboard/messages/$chatRoomId')({
  component: DashboardChatRoomPage,
  validateSearch: (search) => SearchSchema.parse(search),
})

function DashboardChatRoomPage() {
  const { chatRoomId } = Route.useParams()
  const { draft } = Route.useSearch()
  return (
    <ChatRoom chatRoomId={chatRoomId as Id<'chatRooms'>} initialDraft={draft} />
  )
}
