import type { CreateServiceRequestInput } from '@service-ops/shared'
import { Calendar, Clock, CloudSun, Sun } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { DatePicker } from '@/components/ui/DatePicker'
import { TimePicker } from '@/components/ui/TimePicker'
import { SelectionCard } from '@/components/wizard'

const formatDate = (d: Date) => d.toISOString().split('T')[0]

const getToday = () => formatDate(new Date())

const getTomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return formatDate(d)
}

const formatDisplayDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}

export default function ScheduleStep() {
  const {
    setValue,
    formState: { errors },
  } = useFormContext<CreateServiceRequestInput>()
  const dateValue = useWatch<CreateServiceRequestInput, 'date'>({
    name: 'date',
  })
  const timeValue = useWatch<CreateServiceRequestInput, 'time'>({
    name: 'time',
  })

  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    if (!dateValue) {
      setValue('date', getToday(), { shouldValidate: true })
    }
    if (!timeValue) {
      setValue('time', '12:00', { shouldValidate: true })
    }
  }, [dateValue, timeValue, setValue])

  const today = getToday()
  const tomorrow = getTomorrow()
  const isToday = dateValue === today
  const isTomorrow = dateValue === tomorrow
  const isCustomDate = !!dateValue && !isToday && !isTomorrow

  return (
    <div className="grid gap-3">
      <p className="text-sm text-surface-text-muted">
        Pick the date and time that works.
      </p>

      <SelectionCard
        label="Today"
        selected={isToday}
        onSelect={() => setValue('date', today, { shouldValidate: true })}
        icon={(sel) => (
          <Sun
            size={22}
            className={sel ? 'text-brand-300' : 'text-surface-text-muted'}
          />
        )}
      />
      <SelectionCard
        label="Tomorrow"
        selected={isTomorrow}
        onSelect={() => setValue('date', tomorrow, { shouldValidate: true })}
        icon={(sel) => (
          <CloudSun
            size={22}
            className={sel ? 'text-brand-300' : 'text-surface-text-muted'}
          />
        )}
      />
      <DatePicker
        value={isCustomDate ? dateValue : undefined}
        onChange={(iso) => setValue('date', iso, { shouldValidate: true })}
        min={today}
      >
        <SelectionCard
          label={isCustomDate ? formatDisplayDate(dateValue) : 'Pick a date'}
          selected={isCustomDate}
          icon={(sel) => (
            <Calendar
              size={22}
              className={sel ? 'text-brand-300' : 'text-surface-text-muted'}
            />
          )}
        />
      </DatePicker>

      {errors.date ? (
        <p className="text-status-progress text-xs">{errors.date.message}</p>
      ) : null}

      <p className="mt-2 text-surface-text-muted text-xs uppercase tracking-widest">
        Time
      </p>
      <TimePicker
        value={timeValue || '12:00'}
        onChange={(v) => setValue('time', v, { shouldValidate: true })}
      >
        <SelectionCard
          label={timeValue || '12:00'}
          selected={!!timeValue}
          icon={(sel) => (
            <Clock
              size={22}
              className={sel ? 'text-brand-300' : 'text-surface-text-muted'}
            />
          )}
        />
      </TimePicker>
      {errors.time ? (
        <p className="text-status-progress text-xs">{errors.time.message}</p>
      ) : null}
    </div>
  )
}
