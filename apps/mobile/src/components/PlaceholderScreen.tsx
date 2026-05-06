import { Text, View } from 'react-native'
import { GlassSurface } from './parallax'

type Props = {
  eyebrow: string
  title: string
  description?: string
  children?: React.ReactNode
}

export function PlaceholderScreen({
  eyebrow,
  title,
  description,
  children,
}: Props) {
  return (
    <View className="flex-1 bg-surface-0 pt-safe pb-safe">
      <View className="flex-1 items-stretch justify-center px-6">
        <GlassSurface style={{ padding: 32 }}>
          <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
            {eyebrow}
          </Text>
          <Text className="mt-3 font-black text-3xl text-surface-text">
            {title}
          </Text>
          {description ? (
            <Text className="mt-3 text-base text-surface-text-muted">
              {description}
            </Text>
          ) : null}
          {children ? <View className="mt-6">{children}</View> : null}
        </GlassSurface>
      </View>
    </View>
  )
}
