# Liquid Glass UI Spec

iOS-style Liquid Glass surface with tilt-reactive edge lighting for the Service Ops mobile app. Adapted from seniory's `MOTION-PARALLAX-GLASS` document; refined down to a single component during Phase 2.

## What it is

- **Liquid Glass** — Apple's iOS 26 design-language term for the frosted, depth-aware material used on cards, panels, and controls.
- **Tilt parallax** — the tilt-reactive behavior where edges of the glass appear to catch light from different angles as the device moves.

In our implementation, "Liquid Glass" = the visual material (`BlurView` + asymmetric translucent borders), and the "tilt parallax" effect is **edge-light**: per-side border colors brighten as the device tilts toward each side. The card itself does not move or rotate.

## Why edge-light, not 3D transform

We tried `transform: [perspective, translateX, translateY, rotateX, rotateY]` first. iOS rasterizes any layer with `rotateX`/`rotateY` to a flat texture sized to its **initial 2D bounds**, then projects that texture in 3D — anything that lays out past those bounds (full text height, descenders, content rendered after first measure) gets clipped to the texture and shows up as a horizontal cut through glyphs. Translate-only motion sidestepped the bug but lost the depth feel. Seniory's existing implementation already shipped with edge-light animation (border colors only) and produces the desired feel reliably; we adopted that model.

## Platform scope

| Platform | Tilt motion | Glass body |
|---|---|---|
| iOS | Sensor-driven per-side border-color animation | Real `BlurView` (`tint="systemMaterialDark"` for cards, `"systemUltraThinMaterialDark"` for inputs) |
| Android | Reduced intensity (≈65%) | Real `BlurView` when fast enough; pass `blurEnabled={false}` for faux-glass fallback |
| Web | None (Phase 7) | Tailwind `backdrop-blur-md` static glass |

## Module shape

`apps/mobile/src/components/parallax/` — three files only:

```
useParallaxMotion.ts   # sensor → animated border-color style
GlassSurface.tsx       # one component, variant: 'card' | 'input'
index.ts               # barrel
```

We deliberately match seniory's file count. Cards and inputs are the same component with different variant defaults — there is no `ParallaxCard` / `ParallaxInputShell` split.

## Public API

```ts
type GlassVariant = 'card' | 'input'

type GlassSurfaceProps = {
  children?: React.ReactNode
  style?: ViewStyle | ViewStyle[]
  variant?: GlassVariant      // default 'card'
  disabled?: boolean          // hard-disable motion
  focused?: boolean           // input focus state
  freezeOnFocus?: boolean     // default true for inputs, false for cards
  intensity?: number          // override variant default
  blurEnabled?: boolean       // default true; pass false for faux-glass
  blurIntensity?: number      // 60 (card) / 40 (input) by default
  blurTint?: BlurTint
}

type UseParallaxMotionOptions = {
  intensity?: number
  disabled?: boolean
  freeze?: boolean
  platformMultiplier?: number
}

type UseParallaxMotionResult = {
  animatedStyle: AnimatedStyle<ViewStyle> // per-side border colors
}
```

Caller provides padding via `style`. The component is layout-neutral (no implicit content wrapper).

## Usage

Card:

```tsx
<GlassSurface style={{ padding: 32 }}>
  <Text>...</Text>
</GlassSurface>
```

Input:

```tsx
<GlassSurface variant="input" focused={isFocused}>
  <TextInput onFocus={...} onBlur={...} className="px-4 py-3" />
</GlassSurface>
```

Disabled (e.g., when keyboard up and any input focused):

```tsx
<GlassSurface style={{ padding: 32 }} disabled={anyFocused}>
  ...
</GlassSurface>
```

## Variant defaults

| | card | input |
|---|---|---|
| `borderRadius` | 24 | 16 |
| Border widths (T/L/R/B) | 0.5 / 1 / 1 / 1.5 | 0.5 / 1 / 1 / 1 |
| Base fill | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.03)` |
| Blur tint (iOS) | `systemMaterialDark` | `systemUltraThinMaterialDark` |
| Blur intensity | 60 | 40 |
| Motion intensity (iOS / Android) | 1.0 / 0.6 | 0.4 / 0.25 |
| `freezeOnFocus` | false | true |

Bottom border weight is heavier for cards so they read with shadow.

## Motion model (border-color)

Sensor: `useAnimatedSensor(SensorType.ROTATION)` from Reanimated 4 — pitch (re-centered from `-π/2` upright) and roll, both clamped to `[-1, 1]` and spring-smoothed (`damping: 20, stiffness: 100`).

Per-side opacity:

```ts
const BORDER = {
  top:    { base: 0.10, range: 0.18 },
  bottom: { base: 0.28, range: 0.18 },
  left:   { base: 0.18, range: 0.14 },
  right:  { base: 0.18, range: 0.14 },
}

topOpacity    = base.top    + tiltX * range.top    * intensity * platformMultiplier
bottomOpacity = base.bottom - tiltX * range.bottom * intensity * platformMultiplier
leftOpacity   = base.left   - tiltY * range.left   * intensity * platformMultiplier
rightOpacity  = base.right  + tiltY * range.right  * intensity * platformMultiplier
```

Convert opacity to `#ffffffXX` hex inside the worklet — avoids `rgba(...)` parsing quirks.

We animate **colors only**, not widths. Color is paint-only (UI thread); width animation would re-trigger Yoga layout per frame.

## State priority

In order, from highest to lowest:
1. `disabled` prop
2. Reduced Motion accessibility setting
3. `freeze` (e.g., `freezeOnFocus && focused`)
4. Live sensor

When any disabling condition is active, all four border colors spring to baseline opacities and hold.

## Layering inside `GlassSurface`

One `Animated.View` is the surface. Inside, in render order:
1. `BlurView` (or faux-glass `View`) at `StyleSheet.absoluteFill` → renders behind content
2. children → in normal flow, drives the surface's height

Static border widths and `overflow: 'hidden'` go on the `Animated.View`. The animated style only sets the four border colors.

## Accessibility

- `AccessibilityInfo.isReduceMotionEnabled()` is checked in `useParallaxMotion`. When true, motion is treated as off (springs to neutral).
- Glass styling (blur, baseline borders) stays — only the live tilt response is silenced.
- Dynamic Type and contrast settings affect `<Text>` inside, not the surface itself.

## Density rule

Keep at most 1–2 tilt-reactive surfaces visible per screen. List rows render on static glass (e.g., a `<View>` with the same border + a non-animated background fill). Sensor reads aren't free, but the bigger cost is visual noise from many surfaces all reacting at once.

## Performance fallback (Android low-end)

In order:
1. `blurEnabled={false}` — biggest win; `BlurView` is the most expensive layer.
2. Lower `intensity` — lessens the spring activity.
3. `disabled={true}` — drops the sensor subscription entirely.

## Web equivalent (Phase 7)

```tsx
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

No motion on web. Reduced-motion accessibility is satisfied automatically.

## Acceptance criteria

1. Tilting an iPhone subtly changes the brightness of each card edge in real time.
2. The effect feels like edges catching light, not a moving card.
3. Inputs use the lighter `'input'` variant (smaller radius, weaker blur, weaker motion).
4. Focused inputs hold at neutral while typing (`freezeOnFocus`).
5. Reduced Motion holds borders at their baseline opacities.
6. Android defaults are weaker than iOS.
7. Static appearance (motion off) still reads as Liquid Glass — the asymmetric borders alone give cards weight.
8. Faux-glass fallback (`blurEnabled={false}`) looks acceptable.
9. No visible jitter when device is held still (spring damping handles this).
10. No layout passes triggered per frame (animation is color-only — verifiable in the Reanimated profiler).

## Non-goals

- Transform-based motion (`translateX/Y`, `rotateX/Y`, `perspective`) — explicitly rejected, see "Why edge-light" above.
- Animated `borderTopWidth` etc. — re-triggers Yoga layout per frame.
- Per-row tilt on long lists.
- Reflective shader effects, dynamic scene lighting, scroll + tilt combined motion.
- A `SharedMotionProvider` for batched sensor reads — reintroduce if a future screen has 5+ simultaneous Liquid Glass surfaces.

## Final guidance

Prioritize smoothness, subtlety, readability, accessibility, and graceful Android behavior. If forced to choose between "cooler" and "more stable," choose more stable. The effect should feel expensive and restrained, not flashy.
