import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/useAuth'

export const Route = createFileRoute('/')({
  component: Welcome,
})

function Welcome() {
  const { user, isLoading } = useAuth()

  if (!isLoading && user) {
    return <Navigate to="/redirect" />
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-20">
      <div className="glass-card mx-auto w-full max-w-2xl p-10 text-surface-text">
        <p className="font-semibold text-brand-300 text-sm uppercase tracking-[0.32em]">
          Service Ops
        </p>
        <h1 className="mt-4 font-black text-5xl">Welcome</h1>
        <p className="mt-3 text-lg text-surface-text-muted">
          The web companion for the Service Operations Copilot. Sign in to
          create requests, dispatch jobs, and run an operations inbox in real
          time.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            to="/login"
            className="rounded-2xl bg-brand-500 px-5 py-4 text-center font-semibold text-base text-white transition hover:bg-brand-600"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-2xl border border-surface-3 bg-surface-1 px-5 py-4 text-center font-semibold text-base text-surface-text transition hover:bg-surface-2"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  )
}
