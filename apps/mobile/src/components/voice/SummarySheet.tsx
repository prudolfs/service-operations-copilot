import { api } from '@service-ops/convex/api'
import type { Id } from '@service-ops/convex/dataModel'
import { useQuery } from 'convex/react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { GlassSurface } from '@/components/parallax'

type Props = {
  streamId: Id<'summaryStreams'> | null
  onClose: () => void
}

/**
 * Bottom-sheet summary view. Subscribes to the `summaryStreams` row that the
 * `ai.summary.summarizeRequest` action drives — `useQuery` re-renders as the
 * action patches details into the row, giving the user the typewriter feel
 * over the Convex websocket.
 */
export function SummarySheet({ streamId, onClose }: Props) {
  const stream = useQuery(
    api.ai.summary.getSummaryStream,
    streamId ? { streamId } : 'skip',
  )

  const isPending = !stream || stream.status === 'pending'
  const isStreaming = stream?.status === 'streaming'
  const isDone = stream?.status === 'done'
  const isError = stream?.status === 'error'

  return (
    <Modal
      visible={streamId !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="rounded-t-3xl bg-surface-0 px-6 pt-6 pb-safe">
          <View className="mb-3 items-center">
            <View className="h-1 w-12 rounded-full bg-surface-3" />
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
              Summary
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="rounded-full bg-surface-2 px-3 py-1"
            >
              <Text className="font-semibold text-sm text-surface-text">
                Close
              </Text>
            </Pressable>
          </View>

          <View className="mt-3">
            <GlassSurface style={{ padding: 20 }}>
              {isPending ? (
                <View className="flex-row items-center gap-3">
                  <ActivityIndicator size="small" color="#87b6ff" />
                  <Text className="text-base text-surface-text-muted">
                    Reading the conversation…
                  </Text>
                </View>
              ) : (
                <Text className="font-semibold text-base text-surface-text">
                  {stream?.statusLine ?? '…'}
                </Text>
              )}
            </GlassSurface>
          </View>

          <ScrollView
            className="mt-4 max-h-[420px]"
            contentContainerClassName="pb-2"
          >
            {isError ? (
              <Text className="text-base text-status-progress">
                Couldn't generate a summary: {stream?.errorMessage}
              </Text>
            ) : (isStreaming || isDone) && stream.details.trim().length > 0 ? (
              <Text className="text-base text-surface-text leading-6">
                {stream.details}
              </Text>
            ) : isStreaming || (!isPending && !isError) ? (
              <View className="flex-row items-center gap-3 py-4">
                <ActivityIndicator size="small" color="#87b6ff" />
                <Text className="text-base text-surface-text-muted">
                  Drafting the details…
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
