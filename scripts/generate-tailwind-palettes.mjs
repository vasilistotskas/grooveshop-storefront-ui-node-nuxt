#!/usr/bin/env node
/**
 * Writes `test/fixtures/builder/tailwind-palettes.json`: every palette of the
 * installed Tailwind (`tailwindcss/theme.css`), each shade mapped into sRGB as
 * CSS Color 4 maps it (`shared/utils/oklch.ts`), as `#rrggbb`. A store whose
 * theme names a Tailwind colour today (`Tenant.primaryColor`, `neutralColor`)
 * is seeded with that palette's scale; Django vendors the file, so its seeding
 * needs no colour maths.
 *
 *   pnpm generate:palettes
 *
 * `test/unit/scripts/generate-tailwind-palettes.spec.ts` fails when the
 * committed file is not what this writes (after a Tailwind upgrade): run it
 * again and commit the result.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { gamutMapToSrgb, hexFromSrgb } from '../shared/utils/oklch.ts'

export const TAILWIND_PALETTES_FILE = fileURLToPath(new URL('../test/fixtures/builder/tailwind-palettes.json', import.meta.url))

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const DECLARATION = /--color-([a-z]+)-(\d+): oklch\(([\d.]+)% ([\d.]+) ([\d.]+|none)\)/g

/** The palettes `css` declares, by name then shade, as `#rrggbb`, names sorted. */
export function tailwindPaletteHexes(css) {
  const palettes = {}
  for (const [, name, shade, lightness, chroma, hue] of css.matchAll(DECLARATION)) {
    palettes[name] = { ...palettes[name], [shade]: { l: Number(lightness) / 100, c: Number(chroma), h: hue === 'none' ? Number.NaN : Number(hue) } }
  }
  return Object.fromEntries(Object.keys(palettes).sort().map(name => [
    name,
    Object.fromEntries(SHADES.map(shade => [shade, hexFromSrgb(gamutMapToSrgb(palettes[name][shade]))])),
  ]))
}

/** The installed Tailwind's `theme.css`. */
export function installedTailwindTheme() {
  return readFileSync(createRequire(import.meta.url).resolve('tailwindcss/theme.css'), 'utf8')
}

/** The file's contents for the installed Tailwind. */
export function tailwindPalettesFile() {
  return `${JSON.stringify(tailwindPaletteHexes(installedTailwindTheme()), null, 2)}\n`
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(TAILWIND_PALETTES_FILE, tailwindPalettesFile())
  process.stdout.write(`wrote ${TAILWIND_PALETTES_FILE}\n`)
}
