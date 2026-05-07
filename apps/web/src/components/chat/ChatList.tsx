import { api } from '@service-ops/convex/api'
import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { GlassCard } from '@/components/glass'
import { StatusBadge } from '@/components/StatusBadge'
import { formatRelativeTime, formatServiceType } from '@/lib/format'

export type ChatListProps = {
  eyebrow: string
  title: string
  basePath: '/client/messages' | '/dashboard/messages'
  emptyHint: string
}

export function ChatList({
  eyebrow,
  title,
  basePath,
  emptyHint,
}: ChatListProps) {
  const rooms = useQuery(api.chat.listForUser)

  return (
    <div className="px-6 py-10 lg:px-12">
      <header>
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-black text-4xl text-surface-text">{title}</h1>
      </header>

      <section className="mt-8">
        {rooms === undefined ? (
          <p className="text-surface-text-muted">Loading…</p>
        ) : rooms.length === 0 ? (
          <GlassCard>
            <p className="text-base text-surface-text-muted">{emptyHint}</p>
          </GlassCard>
        ) : (
          <ul className="grid gap-3">
            {rooms.map((item) => {
              const otherName =
                item.client?.name ??
                item.client?.email ??
                item.assignedWorker?.name ??
                item.assignedWorker?.email ??
                'Unknown'
              return (
                <li key={item._id}>
                  <Link
                    to={`${basePath}/$chatRoomId`}
                    params={{ chatRoomId: item._id }}
                    className="block rounded-2xl border border-surface-3 bg-surface-1 p-4 hover:bg-surface-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-base text-surface-text">
                        {formatServiceType(item.request.serviceType)}
                      </p>
                      <StatusBadge status={item.request.status} />
                    </div>
                    <p className="mt-1 text-sm text-surface-text-muted">
                      {otherName}
                    </p>
                    {item.lastMessageText ? (
                      <p className="mt-2 line-clamp-2 text-sm text-surface-text">
                        {item.lastMessageText}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-surface-text-muted italic">
                        No messages yet
                      </p>
                    )}
                    <p className="mt-2 text-surface-text-muted text-xs">
                      {formatRelativeTime(item.lastMessageTime)}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
