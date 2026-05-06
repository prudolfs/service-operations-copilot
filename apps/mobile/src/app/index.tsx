import { Text, View } from 'react-native'

export default function WelcomeScreen() {
  return (
    <View className="flex-1 bg-surface-0 pt-safe pb-safe">
      <View className="flex-1 items-stretch justify-center px-6">
        <View className="glass-card p-8">
          <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
            Service Ops
          </Text>
          <Text className="mt-4 font-black text-4xl text-surface-text">
            Welcome
          </Text>
          <Text className="mt-3 text-base text-surface-text-muted">
            Phase 0 stub. Auth, role routing, and live features land in Phase 1.
          </Text>
        </View>
      </View>
    </View>
  )
}
