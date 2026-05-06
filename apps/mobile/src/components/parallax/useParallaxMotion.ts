import { useEffect, useState } from 'react'
import { AccessibilityInfo, Platform, type ViewStyle } from 'react-native'
import {
  type AnimatedStyle,
  SensorType,
  useAnimatedSensor,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated'

export type GlassVariant = 'card' | 'input'

export type UseParallaxMotionOptions = {
  intensity?: number
  disabled?: boolean
  freeze?: boolean
  platformMultiplier?: number
}

export type UseParallaxMotionResult = {
  animatedStyle: AnimatedStyle<ViewStyle>
}

const PLATFORM_MULTIPLIER = Platform.OS === 'ios' ? 1.0 : 0.65
const SPRING = { damping: 20, stiffness: 100 }

// Per-side opacity baseline + range. Tilting toward a side brightens it.
// Bottom carries a higher baseline so cards always read with shadow weight.
const BORDER = {
  top: { base: 0.1, range: 0.18 },
  bottom: { base: 0.28, range: 0.18 },
  left: { base: 0.18, range: 0.14 },
  right: { base: 0.18, range: 0.14 },
}

export const VARIANT_INTENSITY: Record<GlassVariant, number> = {
  card: Platform.OS === 'ios' ? 1.0 : 0.6,
  input: Platform.OS === 'ios' ? 0.4 : 0.25,
}

function clampWorklet(value: number, min: number, max: number) {
  'worklet'
  return Math.max(min, Math.min(max, value))
}

function borderColor(opacity: number) {
  'worklet'
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
  return `#ffffff${a.toString(16).padStart(2, '0')}`
}

export function useParallaxMotion({
  intensity = 1,
  disabled = false,
  freeze = false,
  platformMultiplier = PLATFORM_MULTIPLIER,
}: UseParallaxMotionOptions = {}): UseParallaxMotionResult {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion)
    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      setReduceMotion,
    )
    return () => sub?.remove?.()
  }, [])

  const motionOff = disabled || freeze || reduceMotion

  const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: 'auto' })

  const tiltX = useDerivedValue(() => {
    'worklet'
    if (motionOff) return withSpring(0, SPRING)
    // Pitch ≈ -π/2 upright, 0 flat. Re-center and map to [-1, 1].
    const raw = sensor.sensor.value.pitch ?? 0
    const recentered = raw + Math.PI / 2
    return withSpring(clampWorklet(recentered / 0.5, -1, 1), SPRING)
  }, [motionOff])

  const tiltY = useDerivedValue(() => {
    'worklet'
    if (motionOff) return withSpring(0, SPRING)
    const raw = sensor.sensor.value.roll ?? 0
    return withSpring(clampWorklet(raw / 0.5, -1, 1), SPRING)
  }, [motionOff])

  const animatedStyle = useAnimatedStyle<ViewStyle>(() => {
    'worklet'
    const i = intensity * platformMultiplier
    const top = BORDER.top.base + tiltX.value * BORDER.top.range * i
    const bottom = BORDER.bottom.base - tiltX.value * BORDER.bottom.range * i
    const left = BORDER.left.base - tiltY.value * BORDER.left.range * i
    const right = BORDER.right.base + tiltY.value * BORDER.right.range * i

    return {
      borderTopColor: borderColor(top),
      borderBottomColor: borderColor(bottom),
      borderLeftColor: borderColor(left),
      borderRightColor: borderColor(right),
    }
  })

  return { animatedStyle }
}
