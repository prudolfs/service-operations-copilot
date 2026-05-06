import { useAuth } from '@/auth/useAuth'
import { PlaceholderScreen } from '@/components/PlaceholderScreen'
import { SignOutButton } from '@/components/SignOutButton'

export default function WorkerProfile() {
  const { user } = useAuth()
  return (
    <PlaceholderScreen
      eyebrow="Worker · Profile"
      title={user?.name ?? user?.email ?? 'Your profile'}
      description={user?.email ?? undefined}
    >
      <SignOutButton />
    </PlaceholderScreen>
  )
}
