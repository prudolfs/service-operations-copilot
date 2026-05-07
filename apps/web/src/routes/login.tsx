import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { GlassCard, GlassInput } from '@/components/glass'
import { GithubIcon, GoogleIcon } from '@/components/ProviderIcons'
import { signIn } from '@/lib/auth-client'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

type LoginForm = {
  email: string
  password: string
}

function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, formState } = useForm<LoginForm>()

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    setSubmitting(true)
    try {
      // Absolute callbackURL: crossDomain plugin's rewriteCallbackURL skips
      // anything that doesn't start with `/`, so this overrides any stale
      // `SITE_URL` env on the deployment that would otherwise redirect to prod.
      const result = await signIn.email({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        callbackURL: `${window.location.origin}/redirect`,
      })
      if (result.error) {
        setError(result.error.message ?? 'Could not sign in')
        return
      }
      await navigate({ to: '/redirect' })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  })

  const onProvider = async (provider: 'google' | 'github') => {
    setError(null)
    setSubmitting(true)
    try {
      await signIn.social({
        provider,
        callbackURL: `${window.location.origin}/redirect`,
      })
    } catch (err) {
      setError((err as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <GlassCard className="w-full max-w-md">
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          Sign in
        </p>
        <h1 className="mt-3 font-black text-3xl text-surface-text">
          Welcome back
        </h1>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => onProvider('google')}
            disabled={submitting}
            className="flex items-center justify-center gap-3 rounded-xl border border-surface-3 bg-surface-1 px-5 py-3 font-semibold text-base text-surface-text hover:bg-surface-2 disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => onProvider('github')}
            disabled={submitting}
            className="flex items-center justify-center gap-3 rounded-xl border border-surface-3 bg-surface-1 px-5 py-3 font-semibold text-base text-surface-text hover:bg-surface-2 disabled:opacity-60"
          >
            <GithubIcon />
            Continue with GitHub
          </button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-surface-3" />
          <span className="text-surface-text-muted text-xs uppercase tracking-widest">
            or
          </span>
          <span className="h-px flex-1 bg-surface-3" />
        </div>

        <form onSubmit={onSubmit} className="grid gap-3">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1 block text-surface-text-muted text-xs uppercase tracking-widest"
            >
              Email
            </label>
            <GlassInput
              id="login-email"
              type="email"
              autoComplete="email"
              required
              {...register('email', { required: true })}
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block text-surface-text-muted text-xs uppercase tracking-widest"
            >
              Password
            </label>
            <GlassInput
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              {...register('password', { required: true })}
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-status-progress/20 px-4 py-2 text-sm text-status-progress">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || formState.isSubmitting}
            className="mt-2 rounded-2xl bg-brand-500 px-5 py-3 text-center font-semibold text-base text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-text-muted">
          Need an account?{' '}
          <Link to="/register" className="font-semibold text-brand-300">
            Register
          </Link>
        </p>
      </GlassCard>
    </div>
  )
}
