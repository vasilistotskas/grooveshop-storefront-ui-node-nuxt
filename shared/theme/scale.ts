import { THEME_SHADES } from './constants'
import { gamutMapToSrgb, hexFromSrgb, srgbFromHex, srgbToOklch } from '../utils/oklch'

export type ThemeShade = (typeof THEME_SHADES)[number]
export type ThemeScale = Record<ThemeShade, string>

/**
 * How light each shade of a scale is, in OKLCH, and how much of the scale's
 * chroma it carries: the mean over Tailwind v4's chromatic palettes
 * (`tailwindcss/theme.css`, red to rose; chroma as a share of each palette's
 * own peak), so a scale made from a store's colour steps like the palettes
 * Nuxt UI ships with. `test/unit/shared/theme/scale.spec.ts` recomputes both
 * from the installed Tailwind, so a Tailwind that changes its palettes fails
 * there instead of drifting from them.
 */
export const THEME_SCALE_PROFILE: Readonly<Record<ThemeShade, { l: number, c: number }>> = {
  50: { l: 0.977, c: 0.082 },
  100: { l: 0.950, c: 0.198 },
  200: { l: 0.905, c: 0.380 },
  300: { l: 0.840, c: 0.628 },
  400: { l: 0.754, c: 0.860 },
  500: { l: 0.683, c: 0.950 },
  600: { l: 0.598, c: 0.931 },
  700: { l: 0.515, c: 0.814 },
  800: { l: 0.446, c: 0.670 },
  900: { l: 0.395, c: 0.538 },
  950: { l: 0.278, c: 0.380 },
}

/** The shade whose lightness is nearest a colour's: where that colour sits in its own scale. */
export function nearestThemeShade(lightness: number): ThemeShade {
  return THEME_SHADES.reduce((nearest, shade) =>
    Math.abs(THEME_SCALE_PROFILE[shade].l - lightness) < Math.abs(THEME_SCALE_PROFILE[nearest].l - lightness) ? shade : nearest,
  )
}

/**
 * The eleven shades the editor makes of a colour the store picks. The colour
 * itself is the shade nearest its lightness, exactly; every other shade takes
 * the profile's lightness and the colour's hue, with chroma in the profile's
 * proportion to it, mapped into sRGB (CSS Color 4 gamut mapping). A grey gives
 * greys. Pure: the same colour always gives the same scale.
 */
export function themeScaleFrom(source: string): ThemeScale {
  const color = srgbToOklch(srgbFromHex(source))
  const anchor = nearestThemeShade(color.l)
  const chroma = color.c / THEME_SCALE_PROFILE[anchor].c
  return Object.fromEntries(THEME_SHADES.map(shade => [
    shade,
    shade === anchor
      ? source.toLowerCase()
      : hexFromSrgb(gamutMapToSrgb({ l: THEME_SCALE_PROFILE[shade].l, c: chroma * THEME_SCALE_PROFILE[shade].c, h: color.h })),
  ])) as ThemeScale
}
