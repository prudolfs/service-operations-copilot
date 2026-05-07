import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import type { CreateServiceRequestInput } from '@service-ops/shared'
import { useEffect, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { GlassSurface } from '@/components/parallax'
import { SelectionCard } from '@/components/wizard'

const TIME_FROM_HOUR = 7
const TIME_TO_HOUR = 21
const TIME_STEP_MIN = 30
const ITEM_HEIGHT = 56

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

const totalSlots = ((TIME_TO_HOUR - TIME_FROM_HOUR) * 60) / TIME_STEP_MIN + 1

const timeSlots = Array.from({ length: totalSlots }, (_, i) => {
  const totalMinutes = TIME_FROM_HOUR * 60 + i * TIME_STEP_MIN
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
})

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

  const [showCalendar, setShowCalendar] = useState(false)
  const [pickerDate, setPickerDate] = useState(() => {
    if (dateValue) {
      const parsed = new Date(`${dateValue}T00:00:00`)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }
    return new Date()
  })

  const scrollRef = useRef<ScrollView>(null)
  const initialTimeRef = useRef(timeValue || '12:00')
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    if (!dateValue) {
      setValue('date', getToday(), { shouldValidate: true })
    }
    const idx = timeSlots.indexOf(initialTimeRef.current)
    if (idx >= 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false })
      }, 50)
    }
  }, [dateValue, setValue])

  const today = getToday()
  const tomorrow = getTomorrow()
  const isToday = dateValue === today
  const isTomorrow = dateValue === tomorrow
  const isCustomDate = !!dateValue && !isToday && !isTomorrow

  const selectedTime = timeValue || '12:00'

  return (
    <View className="gap-3">
      <Text className="text-sm text-surface-text-muted">
        Pick the date and time that works.
      </Text>

      <SelectionCard
        label="Today"
        selected={isToday}
        onPress={() => setValue('date', today, { shouldValidate: true })}
        icon={(sel) => (
          <Ionicons
            name="sunny-outline"
            size={22}
            color={sel ? '#87b6ff' : '#9aa3b6'}
          />
        )}
      />
      <SelectionCard
        label="Tomorrow"
        selected={isTomorrow}
        onPress={() => setValue('date', tomorrow, { shouldValidate: true })}
        icon={(sel) => (
          <Ionicons
            name="partly-sunny-outline"
            size={22}
            color={sel ? '#87b6ff' : '#9aa3b6'}
          />
        )}
      />
      <SelectionCard
        label={isCustomDate ? formatDisplayDate(dateValue) : 'Pick a date'}
        selected={isCustomDate}
        onPress={() => setShowCalendar(true)}
        icon={(sel) => (
          <Ionicons
            name="calendar-outline"
            size={22}
            color={sel ? '#87b6ff' : '#9aa3b6'}
          />
        )}
      />

      {errors.date ? (
        <Text className="text-status-progress text-xs">
          {errors.date.message}
        </Text>
      ) : null}

      <Text className="mt-2 text-surface-text-muted text-xs uppercase tracking-widest">
        Time
      </Text>

      <GlassSurface
        style={{
          height: ITEM_HEIGHT * 3,
          overflow: 'hidden',
        }}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
          nestedScrollEnabled
          onMomentumScrollEnd={(e) => {
            const index = Math.round(
              e.nativeEvent.contentOffset.y / ITEM_HEIGHT,
            )
            const slot = timeSlots[Math.min(index, timeSlots.length - 1)]
            if (slot) setValue('time', slot, { shouldValidate: true })
          }}
        >
          {timeSlots.map((slot) => {
            const isSelected = slot === selectedTime
            const [h, m] = slot.split(':')
            return (
              <Pressable
                key={slot}
                accessibilityRole="button"
                accessibilityLabel={`${h}:${m}`}
                onPress={() => {
                  setValue('time', slot, { shouldValidate: true })
                  const idx = timeSlots.indexOf(slot)
                  scrollRef.current?.scrollTo({
                    y: idx * ITEM_HEIGHT,
                    animated: true,
                  })
                }}
                style={{
                  height: ITEM_HEIGHT,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: isSelected ? 32 : 20,
                    fontWeight: '300',
                    color: isSelected ? '#e7ebf3' : 'rgba(231, 235, 243, 0.25)',
                    letterSpacing: 2,
                  }}
                >
                  {h}
                </Text>
                <Text
                  style={{
                    fontSize: isSelected ? 32 : 20,
                    fontWeight: '300',
                    color: isSelected
                      ? 'rgba(135, 182, 255, 0.8)'
                      : 'rgba(231, 235, 243, 0.15)',
                  }}
                >
                  :
                </Text>
                <Text
                  style={{
                    fontSize: isSelected ? 32 : 20,
                    fontWeight: '300',
                    color: isSelected ? '#e7ebf3' : 'rgba(231, 235, 243, 0.25)',
                    letterSpacing: 2,
                  }}
                >
                  {m}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </GlassSurface>

      {errors.time ? (
        <Text className="text-status-progress text-xs">
          {errors.time.message}
        </Text>
      ) : null}

      <Modal
        visible={showCalendar}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <Pressable
          onPress={() => setShowCalendar(false)}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#11151f',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 0.5,
              borderTopColor: 'rgba(255, 255, 255, 0.15)',
              paddingTop: 16,
              paddingBottom: Platform.OS === 'ios' ? 40 : 24,
              paddingHorizontal: 20,
            }}
          >
            <View className="mb-5 h-1 w-9 self-center rounded-full bg-surface-3" />
            <Text className="mb-5 text-center font-semibold text-base text-surface-text">
              Pick a date
            </Text>

            <DateTimePicker
              value={pickerDate}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant="dark"
              accentColor="#5790ff"
              onChange={(_, selected) => {
                if (Platform.OS !== 'ios') setShowCalendar(false)
                if (selected) {
                  setPickerDate(selected)
                  setValue('date', formatDate(selected), {
                    shouldValidate: true,
                  })
                }
              }}
            />

            {Platform.OS === 'ios' ? (
              <View className="mt-5 flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowCalendar(false)}
                  className="flex-1 items-center rounded-2xl border border-surface-3 bg-surface-2 py-3"
                >
                  <Text className="text-base text-surface-text-muted">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setValue('date', formatDate(pickerDate), {
                      shouldValidate: true,
                    })
                    setShowCalendar(false)
                  }}
                  className="flex-1 items-center rounded-2xl bg-brand-500 py-3 will-change-pressable active:bg-brand-600"
                >
                  <Text className="font-semibold text-base text-white">
                    Confirm
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
