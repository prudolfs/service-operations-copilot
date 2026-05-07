import type { CreateServiceRequestInput } from '@service-ops/shared'
import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Text, TextInput, View } from 'react-native'
import { GlassSurface } from '@/components/parallax'

export default function NotesStep() {
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateServiceRequestInput>()
  const [focused, setFocused] = useState(false)

  return (
    <View className="gap-2">
      <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
        Notes (optional)
      </Text>
      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <GlassSurface variant="input" focused={focused}>
            <TextInput
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={() => {
                field.onBlur()
                setFocused(false)
              }}
              onFocus={() => setFocused(true)}
              multiline
              numberOfLines={5}
              placeholder="Anything the worker should know"
              placeholderTextColor="#5b6477"
              className="px-4 py-3 text-base text-surface-text"
              style={{ minHeight: 140, textAlignVertical: 'top' }}
            />
          </GlassSurface>
        )}
      />
      {errors.notes ? (
        <Text className="text-status-progress text-xs">
          {errors.notes.message}
        </Text>
      ) : null}
    </View>
  )
}
