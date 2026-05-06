import { ActivityIndicator, Text, View } from 'react-native'

/**
 * Full-screen loading state shared by the role home screens. Visually matches
 * the root `BootSplash` so the transition from auth → role home doesn't show
 * a partially-rendered skeleton (header + "Loading…" labels) flashing in
 * before queries return. Use it as the entire return value when a critical
 * Convex query is still `undefined`.
 */
export function PageLoader({ label }: { label?: string } = {}) {
  return (
    <View className="flex-1 items-center justify-center bg-surface-0 pt-safe">
      <Text className="mb-4 text-brand-300 text-sm uppercase tracking-[0.32em]">
        Service Ops
      </Text>
      <ActivityIndicator size="small" color="#87b6ff" />
      {label ? (
        <Text className="mt-3 text-sm text-surface-text-muted">{label}</Text>
      ) : null}
    </View>
  )
}
