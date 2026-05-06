import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: WelcomeStub,
})

function WelcomeStub() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-20">
      <div className="glass-card mx-auto w-full max-w-xl p-10 text-surface-text">
        <p className="font-semibold text-brand-300 text-sm uppercase tracking-[0.32em]">
          Service Ops
        </p>
        <h1 className="mt-4 font-black text-4xl">Welcome</h1>
        <p className="mt-3 text-base text-surface-text-muted">
          Web stub. Feature work begins in Phase 7 — mobile carries Phases 1–6.
        </p>
      </div>
    </div>
  )
}
