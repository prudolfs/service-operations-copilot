import { Modal, Pressable, Text, View } from 'react-native'

type Candidate = { requestId: string; label: string }

type Props = {
  visible: boolean
  candidates: Candidate[]
  onPick: (requestId: string) => void
  onClose: () => void
}

export function AmbiguousRequestSheet({
  visible,
  candidates,
  onPick,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="rounded-t-3xl bg-surface-0 px-6 pt-6 pb-safe">
          <View className="mb-3 items-center">
            <View className="h-1 w-12 rounded-full bg-surface-3" />
          </View>
          <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
            Which request?
          </Text>
          <View className="mt-3 gap-2">
            {candidates.map((c) => (
              <Pressable
                key={c.requestId}
                accessibilityRole="button"
                onPress={() => onPick(c.requestId)}
                className="rounded-2xl bg-surface-2 px-4 py-3 active:bg-surface-3"
              >
                <Text className="text-base text-surface-text">{c.label}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="mt-2 rounded-2xl border border-surface-3 px-4 py-3"
            >
              <Text className="text-center text-base text-surface-text-muted">
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}
