import { Pressable, Text, View } from 'react-native'
import { GlassSurface } from '@/components/parallax'

type ReviewFieldProps = {
  label: string
  value: string
  onEdit: () => void
}

export function ReviewField({ label, value, onEdit }: ReviewFieldProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onEdit}>
      <GlassSurface style={{ borderRadius: 16, padding: 16 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
              {label}
            </Text>
            <Text
              numberOfLines={2}
              className="mt-1 font-medium text-base text-surface-text"
            >
              {value || '—'}
            </Text>
          </View>
          <Text className="font-semibold text-brand-300 text-xs uppercase tracking-widest">
            Edit
          </Text>
        </View>
      </GlassSurface>
    </Pressable>
  )
}
