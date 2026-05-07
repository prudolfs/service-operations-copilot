import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { GlassSurface } from '@/components/parallax'

type SelectionCardProps = {
  label: string
  selected: boolean
  onPress: () => void
  hint?: string
  disabled?: boolean
  /** Left-aligned icon node (or render-prop given the selected state). */
  icon?: ReactNode | ((selected: boolean) => ReactNode)
}

export function SelectionCard({
  label,
  selected,
  onPress,
  hint,
  disabled = false,
  icon,
}: SelectionCardProps) {
  const iconNode = typeof icon === 'function' ? icon(selected) : icon
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
    >
      <GlassSurface
        disabled={selected}
        style={{
          borderRadius: 16,
          paddingHorizontal: 18,
          paddingVertical: 14,
          backgroundColor: selected
            ? 'rgba(47, 108, 255, 0.18)'
            : 'rgba(255, 255, 255, 0.03)',
          borderColor: selected
            ? 'rgba(135, 182, 255, 0.55)'
            : 'rgba(255, 255, 255, 0.18)',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <View className="flex-row items-center">
          {iconNode ? (
            <View className="mr-3 h-8 w-8 items-center justify-center">
              {iconNode}
            </View>
          ) : null}
          <View className="flex-1">
            <Text
              className={`text-base ${
                selected
                  ? 'font-semibold text-brand-100'
                  : 'font-medium text-surface-text'
              }`}
            >
              {label}
            </Text>
            {hint ? (
              <Text className="mt-1 text-surface-text-muted text-xs">
                {hint}
              </Text>
            ) : null}
          </View>
          {selected ? (
            <View className="ml-2 h-2 w-2 rounded-full bg-brand-300" />
          ) : null}
        </View>
      </GlassSurface>
    </Pressable>
  )
}
