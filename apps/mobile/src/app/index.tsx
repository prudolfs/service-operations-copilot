import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'
import { RoleRedirect } from '@/auth/RoleRedirect'
import { useAuth } from '@/auth/useAuth'

export default function Index() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <BootSplash />
  if (!user) return <Redirect href="/(auth)/welcome" />
  return <RoleRedirect />
}

function BootSplash() {
  return (
    <View className="flex-1 items-center justify-center bg-surface-0">
      <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
        Service Ops
      </Text>
    </View>
  )
}
