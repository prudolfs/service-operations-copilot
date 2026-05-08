import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'

type TimePickerProps = {
  value: string
  onChange: (value: string) => void
  /** Inclusive hour range. Defaults to 7..21. */
  fromHour?: number
  toHour?: number
  /** Step in minutes. Defaults to 30. */
  stepMinutes?: number
  children: React.ReactNode
}

const buildSlots = (fromHour: number, toHour: number, stepMinutes: number) => {
  const slots: string[] = []
  for (let h = fromHour; h <= toHour; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      if (h === toHour && m > 0) break
      slots.push(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
      )
    }
  }
  return slots
}

export function TimePicker({
  value,
  onChange,
  fromHour = 7,
  toHour = 21,
  stepMinutes = 30,
  children,
}: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const slots = buildSlots(fromHour, toHour, stepMinutes)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return
    const idx = slots.indexOf(value)
    if (idx < 0) return
    requestAnimationFrame(() => {
      const el = listRef.current?.children[idx] as HTMLElement | undefined
      el?.scrollIntoView({ block: 'center' })
    })
  }, [open, slots, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-32 p-1" align="start">
        <ul ref={listRef} className="max-h-64 overflow-y-auto">
          {slots.map((slot) => {
            const isSelected = slot === value
            return (
              <li key={slot}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(slot)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left font-medium text-sm transition-colors',
                    isSelected
                      ? 'bg-brand-500 text-white'
                      : 'text-surface-text hover:bg-white/10',
                  )}
                >
                  {slot}
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
