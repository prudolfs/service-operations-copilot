import { useAuth } from '@/auth/useAuth'
import { PlaceholderScreen } from '@/components/PlaceholderScreen'
import { SignOutButton } from '@/components/SignOutButton'

export default function ManagerProfile() {
  const { user } = useAuth()
  return (
    <PlaceholderScreen
      eyebrow="Manager · Profile"
      title={user?.name ?? user?.email ?? 'Your profile'}
      description={user?.email ?? undefined}
    >
      <SignOutButton />
    </PlaceholderScreen>
  )
}
