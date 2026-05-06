import { Redirect, Tabs } from 'expo-router'
import { useAuth } from '@/auth/useAuth'

export default function WorkerLayout() {
  const { user, isLoading } = useAuth()

  if (isLoading) return null
  if (!user) return <Redirect href="/(auth)/welcome" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#11151f', borderTopColor: '#232a3b' },
        tabBarActiveTintColor: '#87b6ff',
        tabBarInactiveTintColor: '#9aa3b6',
      }}
    >
      <Tabs.Screen name="jobs" options={{ title: 'Jobs' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
