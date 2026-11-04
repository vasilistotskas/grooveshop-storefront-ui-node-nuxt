import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { THEME_SHADES } from '~~/shared/theme/constants'
import { THEME_SCALE_PROFILE, nearestThemeShade, themeScaleFrom } from '~~/shared/theme/scale'
import type { ThemeShade } from '~~/shared/theme/scale'
import { srgbFromHex, srgbToOklch } from '~~/shared/utils/oklch'

/** Tailwind v4's palettes as the installed `tailwindcss/theme.css` declares them: `{ name: { shade: { l, c } } }`. */
function tailwindPalettes(): Record<string, Record<string, { l: number, c: number, h: number }>> {
  const css = readFileSync(createRequire(import.meta.url).resolve('tailwindcss/theme.css'), 'utf8')
  const palettes: Record<string, Record<string, { l: number, c: number, h: number }>> = {}
  for (const [, name, shade, lightness, chroma, hue] of css.matchAll(/--color-([a-z]+)-(\d+): oklch\(([\d.]+)% ([\d.]+) ([\d.]+|none)\)/g)) {
    palettes[name!] = { ...palettes[name!], [shade!]: { l: Number(lightness) / 100, c: Number(chroma), h: hue === 'none' ? Number.NaN : Number(hue) } }
  }
  return palettes
}

/** Tailwind's greys: no chroma to take a profile from. */
const GREYS = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone', 'mauve', 'olive', 'mist', 'taupe'])

const SOURCES = ['#003dff', '#ff00bd', '#16a34a', '#eab308', '#b3694b', '#6c88ea', '#0a0a0a', '#f5f5f4', '#7c3aed', '#0891b2']

describe('THEME_SCALE_PROFILE', () => {
  it('is the mean of the chromatic palettes of the installed Tailwind, to three places', () => {
    const chromatic = Object.entries(tailwindPalettes()).filter(([name]) => !GREYS.has(name)).map(([, palette]) => palette)
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

    expect(chromatic.length).toBeGreaterThan(10)
    for (const shade of THEME_SHADES) {
      const lightness = mean(chromatic.map(palette => palette[shade]!.l))
      const chroma = mean(chromatic.map(palette => palette[shade]!.c / Math.max(...THEME_SHADES.map(each => palette[each]!.c))))
      expect(THEME_SCALE_PROFILE[shade].l).toBeCloseTo(lightness, 3)
      expect(THEME_SCALE_PROFILE[shade].c).toBeCloseTo(chroma, 3)
    }
  })
})

describe('themeScaleFrom', () => {
  it.each(SOURCES)('keeps %s itself, as the shade nearest its lightness', (source) => {
    const scale = themeScaleFrom(source)

    expect(scale[nearestThemeShade(srgbToOklch(srgbFromHex(source)).l)]).toBe(source)
  })

  it.each(SOURCES)('makes eleven colours of %s, darker at every step', (source) => {
    const lightness = THEME_SHADES.map(shade => srgbToOklch(srgbFromHex(themeScaleFrom(source)[shade])).l)

    expect(Object.values(themeScaleFrom(source)).every(hex => /^#[0-9a-f]{6}$/.test(hex))).toBe(true)
    expect(lightness.every((value, index) => index === 0 || value < lightness[index - 1]!)).toBe(true)
  })

  it('keeps the hue of the colour across the shades sRGB can show it in', () => {
    const hue = srgbToOklch(srgbFromHex('#7c3aed')).h
    // Not the palest shades: rounding to 8 bits a channel swings a faint colour's hue.
    const strong: ThemeShade[] = ['400', '500', '600', '700', '800']
    const hues = strong.map(shade => srgbToOklch(srgbFromHex(themeScaleFrom('#7c3aed')[shade])).h)

    expect(hues.filter(each => Math.abs(each - hue) > 3)).toEqual([])
  })

  it('makes greys of a grey', () => {
    const channels = Object.values(themeScaleFrom('#777777')).map(srgbFromHex)

    expect(channels.filter(([red, green, blue]) => red !== green || green !== blue)).toEqual([])
  })

  it('gives the same scale for the same colour, in either case', () => {
    expect(themeScaleFrom('#B3694B')).toEqual(themeScaleFrom('#b3694b'))
  })
})
