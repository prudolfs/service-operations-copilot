import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type GlassCardProps = {
  children: ReactNode
  className?: string
} & HTMLAttributes<HTMLDivElement>

export function GlassCard({ children, className, ...rest }: GlassCardProps) {
  return (
    <div
      className={cn('glass-card p-6 text-surface-text', className)}
      {...rest}
    >
      {children}
    </div>
  )
}

export function GlassSurface({ children, className, ...rest }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass-surface rounded-2xl p-5 text-surface-text',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function GlassInput({
  className,
  ...rest
}: Omit<HTMLAttributes<HTMLInputElement>, 'children'> &
  React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'glass-input w-full px-4 py-3 text-base text-surface-text outline-none placeholder:text-surface-text-muted focus:border-brand-400',
        className,
      )}
      {...rest}
    />
  )
}
