import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/cn'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'

type DatePickerProps = {
  value?: string
  onChange: (date: string) => void
  min?: string
  /** Custom render for the trigger element. Receives the popover-open boolean. */
  children: React.ReactNode
  /** Forces the popover open state (controlled). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const toIso = (d: Date) => {
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fromIso = (iso: string | undefined): Date | undefined => {
  if (!iso) return undefined
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export function DatePicker({
  value,
  onChange,
  min,
  children,
  open,
  onOpenChange,
}: DatePickerProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

  const selected = fromIso(value)
  const minDate = fromIso(min)

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) {
              onChange(toIso(d))
              setOpen(false)
            }
          }}
          disabled={minDate ? { before: minDate } : undefined}
          weekStartsOn={1}
          showOutsideDays
          components={{
            Chevron: ({ orientation, className }) =>
              orientation === 'right' ? (
                <ChevronRight size={18} className={className} />
              ) : (
                <ChevronLeft size={18} className={className} />
              ),
          }}
          classNames={{
            root: 'text-surface-text',
            months: 'flex flex-col gap-3',
            month: 'flex flex-col gap-2',
            month_caption: 'flex h-9 items-center justify-center px-9 relative',
            caption_label: 'font-semibold text-sm text-surface-text',
            nav: 'absolute inset-x-0 top-0 flex h-9 items-center justify-between',
            button_previous: cn(
              'flex h-7 w-7 items-center justify-center rounded-lg text-surface-text-muted hover:bg-white/10 hover:text-surface-text',
              'disabled:opacity-40',
            ),
            button_next: cn(
              'flex h-7 w-7 items-center justify-center rounded-lg text-surface-text-muted hover:bg-white/10 hover:text-surface-text',
              'disabled:opacity-40',
            ),
            month_grid: 'border-collapse',
            weekdays: 'flex',
            weekday:
              'flex h-8 w-9 items-center justify-center font-medium text-[11px] text-surface-text-muted uppercase tracking-wide',
            week: 'flex',
            day: 'h-9 w-9 p-0 text-center',
            day_button: cn(
              'flex h-9 w-9 items-center justify-center rounded-lg text-sm text-surface-text transition-colors',
              'hover:bg-white/10',
              'disabled:cursor-not-allowed disabled:text-surface-text-muted/40 disabled:hover:bg-transparent',
            ),
            today: 'font-bold text-brand-300',
            selected:
              '[&>button]:bg-brand-500 [&>button]:text-white [&>button]:hover:bg-brand-600',
            outside: 'text-surface-text-muted/40',
            disabled: 'opacity-40',
            hidden: 'invisible',
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
