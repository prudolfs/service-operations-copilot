# Motion Parallax Glass UI Spec

Adapted from seniory's MOTION-PARALLAX-GLASS for the Service Operations Copilot stack.

## Purpose

Implement an iOS-style motion parallax effect for glass cards and glass input containers in the Service Ops mobile app. The effect should make surfaces feel like floating layered objects that subtly react to device tilt.

This spec is for direct implementation by an agent during Phase 2 of `docs/service-operations-copilot-prd.md`.

---

## Summary

The effect is not a border animation. The visible result comes from moving and slightly rotating the whole surface, optionally with layered highlight and shadow shifts, so the edge appears alive.

Apply this effect to:
- cards
- floating panels
- hero surfaces (welcome, login)
- input containers

Do **not** apply directly to:
- text glyphs
- text cursor
- placeholder text
- caret
- focused input content

The implementation must:
- work on iOS and Android
- be subtle
- be smooth
- respect reduced motion settings
- reduce or freeze input motion during focus
- degrade gracefully on Android if blur is weak or expensive

---

## Platform Scope

| Platform | Motion | Glass styling |
|---|---|---|
| iOS | Full sensor-driven parallax | Real BlurView |
| Android | Reduced parallax (≈65% intensity) | Real BlurView when supported, faux-glass fallback otherwise |
| Web | **No motion** (static glass only) | CSS `backdrop-blur` via Tailwind 4 utility |

Web reuses the same design tokens (`@service-ops/shared/styles/theme.css` + `glass.css`) but renders static glass. Only mobile gets the motion layer.

---

## Naming

Use these internal names:
- motion parallax
- tilt parallax
- sensor-driven depth
- glass tilt

Do **not** call it:
- border effect

---

## Product Requirements

### Cards

Cards get the full version of the effect:
- small translation on tilt
- very small 3D rotation
- optional moving highlight
- optional moving shadow
- optional glass blur surface

### Inputs

Inputs use a reduced version:
- motion applies to the input shell/container only
- motion is weaker than cards
- motion freezes (or nearly freezes) on focus
- text remains stable and readable

### Accessibility

When reduce motion is enabled:
- disable live sensor-driven motion entirely
- keep static styling

### Density rule

On dense screens (lists with many cards):
- prioritize hero / top-level surfaces
- keep list rows on static glass — do not parallax every row

A page should usually have at most 1–2 parallax surfaces visible.

---

## Technical Stack

- React Native + Expo SDK 55
- `react-native-reanimated` (worklets, animated styles)
- `expo-blur` for `BlurView`
- `expo-sensors` (or Reanimated's built-in `useAnimatedSensor` for gyroscope)

Animation **must** run on the UI thread via Reanimated worklets. Do **not** route sensor readings through React state on every update.

---

## Sensor Strategy

Preferred sensor priority:
1. gyroscope or orientation-like sensor (`SensorType.GYROSCOPE` via `useAnimatedSensor`)
2. device motion / rotation
3. accelerometer only as last resort

Reason:
- raw accelerometer is noisier than tilt/orientation for this use case
- gyroscope + smoothing matches native iOS parallax feel

If multiple parallax surfaces exist on one screen, prefer **one shared sensor source** (see `SharedMotionProvider` below).

---

## Architecture

Three layers:

### 1. Sensor Layer

- read device motion
- choose best available sensor
- normalize and clamp values to `[-1, 1]`
- smooth noisy data
- expose stable motion values

### 2. Motion Mapping Layer

Convert normalized sensor values into:
- translateX / translateY
- optional rotateX / rotateY
- optional highlight offset
- optional shadow offset

### 3. UI Component Layer

- render cards / input shells
- apply glass styling
- apply animated transforms
- disable or reduce motion based on focus / accessibility / platform

---

## Components to Implement

All under `apps/mobile/src/components/parallax/`.

### `useParallaxMotion`

Reusable hook returning animated styles for tilt-based motion.

### `GlassSurface`

Reusable visual surface for glass styling:
- BlurView when supported
- translucent fill fallback when blur is unavailable or too expensive
- border
- optional highlight overlay

### `ParallaxCard`

Card container using full-strength motion.

### `ParallaxInputShell`

Input wrapper using reduced-strength motion with focus-freeze support.

### `SharedMotionProvider` (optional but preferred)

Provider exposing one shared normalized tilt source for derived animated styles.

---

## Public API

### `useParallaxMotion`

```ts
type UseParallaxMotionOptions = {
  intensity?: number
  maxTranslate?: number
  maxRotateDeg?: number
  disabled?: boolean
  freeze?: boolean
  platformMultiplier?: number
}

type UseParallaxMotionResult = {
  animatedStyle: any
  shadowStyle?: any
  highlightStyle?: any
}
```

### `GlassSurface`

```ts
type GlassSurfaceProps = {
  children?: React.ReactNode
  style?: any
  blurEnabled?: boolean
  blurIntensity?: number
  borderOpacity?: number
  tint?: 'light' | 'dark' | 'default'
  fallbackOpacity?: number
}
```

### `ParallaxCard`

```ts
type ParallaxCardProps = {
  children: React.ReactNode
  style?: any
  contentStyle?: any
  disabled?: boolean
  glass?: boolean
  intensity?: number
  maxTranslate?: number
  maxRotateDeg?: number
}
```

### `ParallaxInputShell`

```ts
type ParallaxInputShellProps = {
  children: React.ReactNode
  style?: any
  disabled?: boolean
  glass?: boolean
  focused?: boolean
  freezeOnFocus?: boolean
  intensity?: number
  maxTranslate?: number
  maxRotateDeg?: number
}
```

---

## Default Motion Values

```ts
export const PARALLAX_DEFAULTS = {
  ios: {
    card: { intensity: 1.0, maxTranslate: 6, maxRotateDeg: 2.0 },
    input: { intensity: 0.35, maxTranslate: 3, maxRotateDeg: 0.8 },
  },
  android: {
    card: { intensity: 0.65, maxTranslate: 4, maxRotateDeg: 1.2 },
    input: { intensity: 0.22, maxTranslate: 2, maxRotateDeg: 0.4 },
  },
}
```

---

## Motion Model

### Normalized tilt

Work from values clamped to `[-1, 1]`.

### Base mapping

```ts
translateX = tiltY * maxTranslate * intensity * platformMultiplier
translateY = tiltX * maxTranslate * intensity * platformMultiplier
rotateX = -tiltX * maxRotateDeg * intensity * platformMultiplier
rotateY = tiltY * maxRotateDeg * intensity * platformMultiplier
```

Sign of each axis may need inversion after on-device testing.

### Perspective

Apply when using 3D rotation:

```ts
perspective: 700–1000  // default 800
```

---

## Smoothing Rules

Raw sensor values must not drive the transform directly.

Required:
- clamp values
- spring or damp values toward target
- remove visible jitter at rest

Recommended spring tuning (start here, tune in QA):
- damping: `16`–`22`
- stiffness: `90`–`140`

---

## Layering Model

Each premium card uses up to 4 layers.

### Layer 1 — outer surface
Animated container; rounded corners; transform applied here; `overflow: 'hidden'` if needed.

### Layer 2 — glass background
Blur or faux-glass fill; low-opacity translucent fill; subtle border.

### Layer 3 — highlight (optional)
Faint top/diagonal glow that shifts slightly opposite the shadow; subtle.

### Layer 4 — content
Readable, mostly stable. May move slightly less than the outer shell for added depth, but not enough to hurt legibility.

---

## Visual Styling Baseline

Hooked into shared design tokens via Tailwind 4 `@theme`. Defaults:

```ts
borderRadius: 20–28
borderWidth: 1
borderColor: rgba(255, 255, 255, 0.14–0.22)
backgroundColor (fallback): rgba(255, 255, 255, 0.08–0.14)
```

Soft shadow, not dramatic. Optional white-translucent highlight gradient, low opacity, soft blend.

---

## Blur Strategy

### iOS
Use real `BlurView` from `expo-blur`.

### Android
Real blur when device performs well; **faux-glass fallback** otherwise:

```ts
backgroundColor: 'rgba(255,255,255,0.10)'
borderColor: 'rgba(255,255,255,0.16)'
```

No real blur required in fallback mode — visual parity is achieved through layered translucency.

### Web (out of scope for motion, in scope for glass)
Use Tailwind 4's `backdrop-blur-md` + `bg-white/10` + `border border-white/16`. Implement in `apps/web/src/components/glass/`.

---

## Accessibility Rules

### Reduced motion

When `AccessibilityInfo.isReduceMotionEnabled()` returns true:
- do not subscribe to live sensor transforms (or return neutral)
- preserve card visuals without movement

### Screen comfort

Do not create a seasick or slippery feeling. If user movement while walking causes uncomfortable motion:
- reduce sensitivity
- increase damping
- lower rotation before lowering translation

---

## Input-Specific Rules

### Focus handling

When the input receives focus:
- freeze motion immediately, OR
- animate to neutral within a short duration and hold there

**Default choice:** animate to neutral, then hold while focused.

### Keyboard handling

When the keyboard is open, keep inputs near-static. Avoid noticeable rotation.

### Validation states

Error / success / loading states must not increase motion intensity. Motion is independent from validation state.

---

## State Priority

Final motion state depends on, in priority order:
1. `disabled` prop
2. reduced motion accessibility setting
3. input focused freeze
4. normal platform behavior

If any high-priority disabling condition is active, return neutral transform.

---

## Fallback Rules

### No sensor available
- render neutral card / input shell
- keep glass styling
- no crash, no production warnings

### Performance fallback
Degrade in this order:
1. reduce rotation first
2. reduce blur second
3. disable highlight movement third
4. keep subtle translate-only effect if possible

---

## Implementation Plan (Phase 2 of PRD)

### Step 1 — `useParallaxMotion`
- subscribe to gyroscope via `useAnimatedSensor(SensorType.GYROSCOPE)`
- normalize, clamp, smooth via `withSpring` in `useDerivedValue`
- expose `animatedStyle`
- support `disabled`, `freeze`, platform multipliers, reduced motion

### Step 2 — `GlassSurface`
- BlurView mode (iOS / capable Android)
- faux-glass fallback
- border + optional highlight overlay

### Step 3 — `ParallaxCard`
- use full-card defaults from `PARALLAX_DEFAULTS`
- apply motion style
- wrap content in `GlassSurface` if `glass` prop is true

### Step 4 — `ParallaxInputShell`
- use weaker defaults
- support `focused` and `freezeOnFocus`
- neutralize motion while typing

### Step 5 — `SharedMotionProvider` (optional)
- single sensor subscription
- expose shared normalized tilt values to children

---

## Reference Implementation

### `useParallaxMotion`

```tsx
import { Platform, AccessibilityInfo } from 'react-native'
import { useEffect, useState } from 'react'
import {
  SensorType,
  useAnimatedSensor,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated'

export function useParallaxMotion({
  intensity = 1,
  maxTranslate = 6,
  maxRotateDeg = 2,
  disabled = false,
  freeze = false,
  platformMultiplier,
}: UseParallaxMotionOptions): UseParallaxMotionResult {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion)
    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      setReduceMotion,
    )
    return () => sub?.remove?.()
  }, [])

  const multiplier =
    platformMultiplier ?? (Platform.OS === 'ios' ? 1.0 : 0.65)

  const motionOff = disabled || freeze || reduceMotion

  const sensor = useAnimatedSensor(SensorType.GYROSCOPE)

  const tiltX = useDerivedValue(() => {
    if (motionOff) return withSpring(0, { damping: 18, stiffness: 120 })
    const raw = sensor.sensor.value.x ?? 0
    const clamped = Math.max(-1, Math.min(1, raw))
    return withSpring(clamped, { damping: 18, stiffness: 120 })
  }, [motionOff])

  const tiltY = useDerivedValue(() => {
    if (motionOff) return withSpring(0, { damping: 18, stiffness: 120 })
    const raw = sensor.sensor.value.y ?? 0
    const clamped = Math.max(-1, Math.min(1, raw))
    return withSpring(clamped, { damping: 18, stiffness: 120 })
  }, [motionOff])

  const animatedStyle = useAnimatedStyle(() => {
    const tx = tiltY.value * maxTranslate * intensity * multiplier
    const ty = tiltX.value * maxTranslate * intensity * multiplier
    const rx = -tiltX.value * maxRotateDeg * intensity * multiplier
    const ry = tiltY.value * maxRotateDeg * intensity * multiplier

    return {
      transform: [
        { perspective: 800 },
        { translateX: tx },
        { translateY: ty },
        { rotateX: `${rx}deg` },
        { rotateY: `${ry}deg` },
      ],
    }
  })

  return { animatedStyle }
}
```

### `ParallaxCard`

```tsx
function ParallaxCard({
  children,
  style,
  contentStyle,
  disabled = false,
  glass = true,
  intensity,
  maxTranslate,
  maxRotateDeg,
}: ParallaxCardProps) {
  const defaults =
    Platform.OS === 'ios'
      ? PARALLAX_DEFAULTS.ios.card
      : PARALLAX_DEFAULTS.android.card

  const { animatedStyle } = useParallaxMotion({
    disabled,
    intensity: intensity ?? defaults.intensity,
    maxTranslate: maxTranslate ?? defaults.maxTranslate,
    maxRotateDeg: maxRotateDeg ?? defaults.maxRotateDeg,
  })

  return (
    <Animated.View style={[styles.cardOuter, animatedStyle, style]}>
      {glass ? (
        <GlassSurface style={styles.cardGlass}>
          <View style={[styles.cardContent, contentStyle]}>{children}</View>
        </GlassSurface>
      ) : (
        <View style={[styles.cardContent, contentStyle]}>{children}</View>
      )}
    </Animated.View>
  )
}
```

### `ParallaxInputShell`

```tsx
function ParallaxInputShell({
  children,
  style,
  disabled = false,
  glass = true,
  focused = false,
  freezeOnFocus = true,
  intensity,
  maxTranslate,
  maxRotateDeg,
}: ParallaxInputShellProps) {
  const defaults =
    Platform.OS === 'ios'
      ? PARALLAX_DEFAULTS.ios.input
      : PARALLAX_DEFAULTS.android.input

  const { animatedStyle } = useParallaxMotion({
    disabled,
    freeze: freezeOnFocus && focused,
    intensity: intensity ?? defaults.intensity,
    maxTranslate: maxTranslate ?? defaults.maxTranslate,
    maxRotateDeg: maxRotateDeg ?? defaults.maxRotateDeg,
  })

  return (
    <Animated.View style={[styles.inputOuter, animatedStyle, style]}>
      {glass ? (
        <GlassSurface style={styles.inputGlass}>{children}</GlassSurface>
      ) : (
        children
      )}
    </Animated.View>
  )
}
```

### Style baseline

```ts
const styles = StyleSheet.create({
  cardOuter: { borderRadius: 24 },
  cardGlass: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  cardContent: { padding: 16 },
  inputOuter: { borderRadius: 18 },
  inputGlass: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
})
```

---

## Web Equivalent (Phase 7)

For `apps/web`, implement static glass with the same design tokens but no motion:

```tsx
// apps/web/src/components/glass/GlassCard.tsx
export function GlassCard({ children, className }: Props) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/16 bg-white/10 backdrop-blur-md',
        'p-4 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}
```

Same visual language, no sensors, no motion. Reduced-motion accessibility is satisfied automatically since there is no motion to disable.

---

## Acceptance Criteria

Implementation passes when:

1. Tilting an iPhone subtly moves cards in a smooth, believable way.
2. The effect feels like floating depth, not a shaking border.
3. Inputs use a weaker version than cards.
4. Focused inputs return to (and hold) neutral while typing.
5. Reduced motion disables live motion.
6. Android defaults are weaker than iOS.
7. UI looks good if motion is fully disabled.
8. App remains usable when blur is downgraded to faux-glass.
9. No visible jitter when device is held still.
10. No heavy JS-thread updates from sensor data (verified via Reanimated profiler).

---

## Test Checklist

### Devices

- one recent iPhone
- one recent flagship Android
- one mid-range Android

### Cases

- one hero card on screen
- multiple cards on screen (verify shared sensor)
- one unfocused input
- focused input
- keyboard open
- reduced motion enabled
- sensor unavailable fallback
- Android blur fallback

### Pass conditions

- motion feels premium and subtle
- text remains readable
- typing feels stable
- no obvious jitter at rest
- no major frame drops on target devices

---

## Non-Goals

Do **not** implement in v1:

- dynamic scene lighting
- advanced physics
- per-row tilt on long lists
- dramatic 3D rotations
- scroll + tilt combined motion systems
- reflective shader effects

---

## Deliverables

The implementing agent produces (under `apps/mobile/src/components/parallax/`):

1. `useParallaxMotion.ts`
2. `GlassSurface.tsx`
3. `ParallaxCard.tsx`
4. `ParallaxInputShell.tsx`
5. `PARALLAX_DEFAULTS.ts`
6. `SharedMotionProvider.tsx` (optional)

Plus, in Phase 7 under `apps/web/src/components/glass/`:

1. `GlassSurface.tsx` (static)
2. `GlassCard.tsx` (static)

---

## Final Guidance

Prioritize:
- smoothness
- subtlety
- readability
- accessibility
- graceful Android behavior

If forced to choose between "cooler" and "more stable," choose "more stable." The effect should feel expensive and restrained, not flashy.
