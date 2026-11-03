import { contrastSideColor } from '../builder/contrastRules'
import type { ContrastRule } from '../types/builder'
import { contrastRatio, relativeLuminance } from '../utils/contrast'
import { gamutMapToSrgb, hexFromSrgb, srgbFromHex, srgbToOklch } from '../utils/oklch'
import { themeActionShadesFor } from './defaults'
import type { StorefrontDesign } from './design'
import { themeScaleFrom } from './scale'
import type { ThemeColorScheme, ThemeSettings } from './settings'

/** A colour of a scheme the store edits with its whole scale. */
export type ThemeScaleColour = 'primary' | 'secondary' | 'neutral'

/**
 * A scheme with one of its three colours picked anew: the colour and the
 * eleven shades made of it (`themeScaleFrom`). Choosing the primary colour of a
 * scheme whose action follows it (`actionLinked`) sets the action colour too,
 * to the shade the design paints its CTAs with.
 */
export function withScaleColour(scheme: ThemeColorScheme, colour: ThemeScaleColour, source: string, design: StorefrontDesign | null, name: 'light' | 'dark'): ThemeColorScheme {
  const next = { ...scheme, [colour]: { source: source.toLowerCase(), scale: themeScaleFrom(source) } }
  if (colour === 'primary' && scheme.actionLinked) next.action = next.primary.scale[themeActionShadesFor(design)[name]]
  return next
}

/** The light scheme copied into the dark one: "apply light to dark". */
export function withLightAsDark(settings: ThemeSettings): ThemeSettings {
  return { ...settings, colors: { ...settings.colors, dark: structuredClone(settings.colors.light) } }
}

/** `settings` with `value` at the RFC 6901 `pointer`, every object on the way copied. */
function setAt<T>(settings: T, pointer: string, value: string): T {
  const [head, ...rest] = pointer.slice(1).split('/').map(token => token.replaceAll('~1', '/').replaceAll('~0', '~'))
  const node = settings as Record<string, unknown>
  return { ...node, [head!]: rest.length === 0 ? value : setAt(node[head!], `/${rest.join('/')}`, value) } as T
}

/** The ratio a fix aims a little above, so the colour still passes once it is rounded to 8 bits. */
const FIX_MARGIN = 0.05

/**
 * `settings` with the colour a failing contrast rule names moved just far
 * enough to pass: the side that is a pointer (the foreground when both are),
 * in OKLCH lightness only, so its hue and chroma stay the store's, away from
 * the other side (darker on a light background, lighter on a dark one). It
 * moves as little as it can: a binary search for the lightness nearest the
 * colour's own that reaches the rule's `min`. A rule that passes, or that
 * names two literals, comes back unchanged.
 */
export function fixContrast(settings: ThemeSettings, rule: ContrastRule): ThemeSettings {
  const pointer = !rule.foreground.startsWith('#') ? rule.foreground : !rule.background.startsWith('#') ? rule.background : undefined
  const other = pointer === rule.foreground ? rule.background : rule.foreground
  if (pointer === undefined) return settings
  const current = contrastSideColor(settings, pointer)
  const against = contrastSideColor(settings, other)
  if (contrastRatio(current, against) >= rule.min) return settings

  const colour = srgbToOklch(srgbFromHex(current))
  const at = (l: number) => hexFromSrgb(gamutMapToSrgb({ ...colour, l }))
  const passes = (hex: string) => contrastRatio(hex, against) >= rule.min + FIX_MARGIN
  const darker = relativeLuminance(against) > 0.18
  let near = colour.l
  let far = darker ? 0 : 1
  if (!passes(at(far))) return setAt(settings, pointer, at(far))
  for (let step = 0; step < 32; step++) {
    const middle = (near + far) / 2
    if (passes(at(middle))) far = middle
    else near = middle
  }
  return setAt(settings, pointer, at(far))
}
