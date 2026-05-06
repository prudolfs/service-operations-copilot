import { type BlurTint, BlurView } from 'expo-blur'
import type React from 'react'
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native'
import Animated from 'react-native-reanimated'
import {
  type GlassVariant,
  useParallaxMotion,
  VARIANT_INTENSITY,
} from './useParallaxMotion'

export type GlassSurfaceProps = {
  children?: React.ReactNode
  style?: ViewStyle | ViewStyle[]
  variant?: GlassVariant
  /** Disable the tilt animation entirely (e.g., for Reduce Motion screens). */
  disabled?: boolean
  /** True when the wrapped input is focused — combined with `freezeOnFocus`. */
  focused?: boolean
  /** Spring motion to neutral while focused. Default true for inputs. */
  freezeOnFocus?: boolean
  /** Override variant intensity if needed. */
  intensity?: number
  blurEnabled?: boolean
  blurIntensity?: number
  blurTint?: BlurTint
}

const VARIANT_BLUR_TINT: Record<GlassVariant, BlurTint> = {
  card: Platform.OS === 'ios' ? 'systemMaterialDark' : 'dark',
  input: Platform.OS === 'ios' ? 'systemUltraThinMaterialDark' : 'dark',
}

const VARIANT_BLUR_INTENSITY: Record<GlassVariant, number> = {
  card: 60,
  input: 40,
}

const VARIANT_STYLE: Record<GlassVariant, ViewStyle> = {
  card: {
    borderRadius: 24,
    borderTopWidth: 0.5,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  input: {
    borderRadius: 16,
    borderTopWidth: 0.5,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
}

/**
 * Liquid-glass surface with tilt-reactive edge lighting. One component for
 * both card and input variants — pick `variant` and pass any overrides.
 *
 * Caller provides padding via `style` (no implicit content wrapper).
 */
export function GlassSurface({
  children,
  style,
  variant = 'card',
  disabled = false,
  focused = false,
  freezeOnFocus = variant === 'input',
  intensity,
  blurEnabled = true,
  blurIntensity,
  blurTint,
}: GlassSurfaceProps) {
  const { animatedStyle } = useParallaxMotion({
    disabled,
    freeze: freezeOnFocus && focused,
    intensity: intensity ?? VARIANT_INTENSITY[variant],
  })

  return (
    <Animated.View style={[VARIANT_STYLE[variant], animatedStyle, style]}>
      {blurEnabled ? (
        <BlurView
          intensity={blurIntensity ?? VARIANT_BLUR_INTENSITY[variant]}
          tint={blurTint ?? VARIANT_BLUR_TINT[variant]}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(255,255,255,0.06)' },
          ]}
        />
      )}
      {children}
    </Animated.View>
  )
}
