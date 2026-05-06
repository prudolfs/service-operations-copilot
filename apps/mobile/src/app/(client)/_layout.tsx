import { Redirect, Tabs } from 'expo-router'
import { useAuth } from '@/auth/useAuth'

export default function ClientLayout() {
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
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="requests" options={{ title: 'Requests' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
