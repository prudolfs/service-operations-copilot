import { api } from '@service-ops/convex/api'
import type { Id } from '@service-ops/convex/dataModel'
import { useQuery } from 'convex/react'
import { GlassSurface } from '@/components/glass'

export function SummaryPanel({
  streamId,
  onClose,
}: {
  streamId: Id<'summaryStreams'> | null
  onClose: () => void
}) {
  const stream = useQuery(
    api.ai.summary.getSummaryStream,
    streamId ? { streamId } : 'skip',
  )

  if (!streamId) return null

  const isPending = !stream || stream.status === 'pending'
  const isStreaming = stream?.status === 'streaming'
  const isDone = stream?.status === 'done'
  const isError = stream?.status === 'error'

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-2xl rounded-t-3xl bg-surface-0 p-6 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
            Summary
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-surface-2 px-3 py-1 font-semibold text-sm text-surface-text hover:bg-surface-3"
          >
            Close
          </button>
        </div>

        <GlassSurface className="mt-4">
          {isPending ? (
            <p className="text-base text-surface-text-muted">
              Reading the conversation…
            </p>
          ) : (
            <p className="font-semibold text-base text-surface-text">
              {stream?.statusLine ?? '…'}
            </p>
          )}
        </GlassSurface>

        <div className="mt-4 max-h-96 overflow-y-auto">
          {isError ? (
            <p className="text-base text-status-progress">
              Couldn't generate a summary: {stream?.errorMessage}
            </p>
          ) : (isStreaming || isDone) && stream.details.trim().length > 0 ? (
            <pre className="whitespace-pre-wrap font-sans text-base text-surface-text leading-6">
              {stream.details}
            </pre>
          ) : isStreaming || (!isPending && !isError) ? (
            <p className="text-base text-surface-text-muted">
              Drafting the details…
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
