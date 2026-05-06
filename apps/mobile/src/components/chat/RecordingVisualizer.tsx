import { useEffect } from 'react'
import { Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

type Props = {
  durationMs: number
  color?: string
}

function formatTimer(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function Bar({ color, delay }: { color: string; delay: number }) {
  const height = useSharedValue(6)

  useEffect(() => {
    height.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(18, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(6, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    )
  }, [delay, height])

  const style = useAnimatedStyle(() => ({
    width: 3,
    height: height.value,
    borderRadius: 1.5,
    backgroundColor: color,
  }))

  return <Animated.View style={style} />
}

/**
 * Three pulsing bars + an mm:ss timer. Adapted from seniory; lives inside
 * the chat composer while a voice message is being recorded.
 */
export function RecordingVisualizer({ durationMs, color = '#e5e9f2' }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 22,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
          height: 20,
        }}
      >
        <Bar color={color} delay={0} />
        <Bar color={color} delay={150} />
        <Bar color={color} delay={300} />
      </View>
      <Text style={{ fontSize: 14, fontWeight: '600', color }}>
        {formatTimer(durationMs)}
      </Text>
    </View>
  )
}
