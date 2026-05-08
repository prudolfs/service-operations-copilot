import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'
import { cn } from '@/lib/cn'

type SelectionCardProps = {
  label: string
  selected: boolean
  onSelect?: () => void
  hint?: string
  icon?: ReactNode | ((selected: boolean) => ReactNode)
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'>

export const SelectionCard = forwardRef<HTMLButtonElement, SelectionCardProps>(
  function SelectionCard(
    { label, selected, onSelect, hint, disabled, icon, className, ...rest },
    ref,
  ) {
    const iconNode = typeof icon === 'function' ? icon(selected) : icon
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={onSelect}
        className={cn(
          'glass-surface w-full rounded-2xl px-[18px] py-[14px] text-left transition-colors',
          selected
            ? 'border-brand-400/55 bg-brand-500/[0.18]'
            : 'border-white/15 bg-white/[0.03] hover:bg-white/[0.06]',
          disabled && 'opacity-50',
          className,
        )}
        {...rest}
      >
        <div className="flex items-center">
          {iconNode ? (
            <div className="mr-3 flex h-8 w-8 items-center justify-center">
              {iconNode}
            </div>
          ) : null}
          <div className="flex-1">
            <div
              className={cn(
                'text-base',
                selected
                  ? 'font-semibold text-brand-100'
                  : 'font-medium text-surface-text',
              )}
            >
              {label}
            </div>
            {hint ? (
              <div className="mt-1 text-surface-text-muted text-xs">{hint}</div>
            ) : null}
          </div>
          {selected ? (
            <span className="ml-2 h-2 w-2 rounded-full bg-brand-300" />
          ) : null}
        </div>
      </button>
    )
  },
)
