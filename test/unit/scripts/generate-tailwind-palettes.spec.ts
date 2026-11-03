import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TAILWIND_PALETTES_FILE, installedTailwindTheme, tailwindPaletteHexes, tailwindPalettesFile } from '~~/scripts/generate-tailwind-palettes.mjs'

describe('generate-tailwind-palettes', () => {
  it('gives every palette of the installed Tailwind its eleven shades in sRGB, greys and colours alike, names sorted', () => {
    const palettes = tailwindPaletteHexes(installedTailwindTheme())
    const names = Object.keys(palettes)

    expect(names).toEqual([...names].sort())
    expect(names).toEqual(expect.arrayContaining(['blue', 'zinc', 'neutral', 'red']))
    expect(Object.values(palettes).flatMap(palette => Object.values(palette)).every(hex => /^#[0-9a-f]{6}$/.test(hex))).toBe(true)
    expect(Object.values(palettes).every(palette => Object.keys(palette).length === 11)).toBe(true)
    // oklch(98.5% 0 none), the palest zinc, is #fafafa.
    expect(palettes.zinc!['50']).toBe('#fafafa')
  })

  it('has written the committed file from the installed Tailwind (run `pnpm generate:palettes` if not)', () => {
    expect(readFileSync(TAILWIND_PALETTES_FILE, 'utf8').replaceAll('\r\n', '\n')).toBe(tailwindPalettesFile())
  })
})
