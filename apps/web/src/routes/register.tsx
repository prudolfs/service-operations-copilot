import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { GlassCard, GlassInput } from '@/components/glass'
import { signUp } from '@/lib/auth-client'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

type RegisterForm = {
  name: string
  email: string
  password: string
}

function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit } = useForm<RegisterForm>()

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    setSubmitting(true)
    try {
      // Absolute callbackURL bypasses crossDomain's `siteUrl` rewrite.
      const result = await signUp.email({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        callbackURL: `${window.location.origin}/redirect`,
      })
      if (result.error) {
        setError(result.error.message ?? 'Could not register')
        return
      }
      await navigate({ to: '/redirect' })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <GlassCard className="w-full max-w-md">
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          Create account
        </p>
        <h1 className="mt-3 font-black text-3xl text-surface-text">
          Get started
        </h1>

        <form onSubmit={onSubmit} className="mt-6 grid gap-3">
          <div>
            <label
              htmlFor="register-name"
              className="mb-1 block text-surface-text-muted text-xs uppercase tracking-widest"
            >
              Name
            </label>
            <GlassInput
              id="register-name"
              type="text"
              autoComplete="name"
              required
              {...register('name', { required: true })}
            />
          </div>
          <div>
            <label
              htmlFor="register-email"
              className="mb-1 block text-surface-text-muted text-xs uppercase tracking-widest"
            >
              Email
            </label>
            <GlassInput
              id="register-email"
              type="email"
              autoComplete="email"
              required
              {...register('email', { required: true })}
            />
          </div>
          <div>
            <label
              htmlFor="register-password"
              className="mb-1 block text-surface-text-muted text-xs uppercase tracking-widest"
            >
              Password
            </label>
            <GlassInput
              id="register-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              {...register('password', { required: true, minLength: 8 })}
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-status-progress/20 px-4 py-2 text-sm text-status-progress">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-2xl bg-brand-500 px-5 py-3 text-center font-semibold text-base text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-text-muted">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand-300">
            Sign in
          </Link>
        </p>
      </GlassCard>
    </div>
  )
}
