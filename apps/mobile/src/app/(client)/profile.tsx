import { useAuth } from '@/auth/useAuth'
import { PlaceholderScreen } from '@/components/PlaceholderScreen'
import { SignOutButton } from '@/components/SignOutButton'

export default function ClientProfile() {
  const { user } = useAuth()
  return (
    <PlaceholderScreen
      eyebrow="Client · Profile"
      title={user?.name ?? user?.email ?? 'Your profile'}
      description={user?.email ?? undefined}
    >
      <SignOutButton />
    </PlaceholderScreen>
  )
}
