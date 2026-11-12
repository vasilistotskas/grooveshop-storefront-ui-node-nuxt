import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { THEME_SHADES } from '~~/shared/theme/constants'
import { resolveDesign } from '~~/shared/theme/design'
import { TAILWIND_PALETTES } from '~~/shared/theme/tailwindPalettes'
import type { TailwindPaletteName } from '~~/shared/theme/tailwindPalettes'

/**
 * What a store's page paints its themed tokens with, resolved from the real
 * stylesheets: Nuxt UI's aliases and `runtime/index.css`, `main.css`
 * (`:root`, `@theme`, `.dark`), the Groove Volt blocks for a Volt store, and
 * the store's own theme block on top (`html:root` / `html.dark`); then every
 * `var(--ui-color-…)` / `var(--color-…)` / `var(--…)` down to a value, through
 * the store's Tailwind palettes. The specs of the theme seed and the theme
 * compiler compare stores with it, token by token.
 */
export const MAIN_CSS = readFileSync(new URL('../../app/assets/css/main.css', import.meta.url), 'utf8')
const NUXT_UI_CSS = readFileSync(createRequire(import.meta.url).resolve('@nuxt/ui/runtime/index.css'), 'utf8')

export type Declarations = Record<string, string>

/** The custom properties every rule of `css` whose selector is exactly `selector` declares, later ones winning. */
export function declarations(css: string, selector: string): Declarations {
  const values: Declarations = {}
  for (const block of css.replace(/\/\*[\s\S]*?\*\//g, '').split('}')) {
    // The innermost rule of the block: an @layer or @media around it is skipped.
    const open = block.lastIndexOf('{')
    if (open < 0) continue
    const head = block.slice(0, open)
    const selectors = head.slice(Math.max(head.lastIndexOf('{'), head.lastIndexOf(';')) + 1).trim().split(/\s*,\s*/)
    if (!selectors.includes(selector)) continue
    for (const [, name, value] of block.slice(open + 1).matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) values[name!] = value!.trim()
  }
  return values
}

/** Nuxt UI's own aliases for the colours, which it writes per app config (Nuxt UI, "CSS Variables"). */
const NUXT_UI_ALIASES = {
  light: { '--ui-primary': 'var(--ui-color-primary-500)', '--ui-secondary': 'var(--ui-color-secondary-500)', '--ui-success': 'var(--ui-color-success-500)', '--ui-info': 'var(--ui-color-info-500)', '--ui-warning': 'var(--ui-color-warning-500)', '--ui-error': 'var(--ui-color-error-500)' },
  dark: { '--ui-primary': 'var(--ui-color-primary-400)', '--ui-secondary': 'var(--ui-color-secondary-400)', '--ui-success': 'var(--ui-color-success-400)', '--ui-info': 'var(--ui-color-info-400)', '--ui-warning': 'var(--ui-color-warning-400)', '--ui-error': 'var(--ui-color-error-400)' },
}

/** The palette each of Nuxt UI's colours names in the app config (`app.config.ts` sets primary and neutral, Nuxt UI's defaults the rest). */
export const NUXT_UI_PALETTES: Record<string, TailwindPaletteName> = { primary: 'neutral', neutral: 'zinc', secondary: 'blue', success: 'green', info: 'blue', warning: 'yellow', error: 'red' }

/** The themed tokens compared, besides every shade of the three scales. */
export const THEMED_TOKENS = ['--ui-primary', '--ui-on-secondary', '--ui-secondary', '--ui-success', '--ui-warning', '--ui-error', '--ui-info', '--ui-liked', '--ui-radius', '--ui-container', '--font-sans', '--font-display', '--font-mono'] as const

/** Every themed token of `scheme` on a page of the store `schemaName` (which picks its design) whose theme block is `themeCss`, resolved to a value. */
export function renderedTokens(schemaName: string, themeCss: string, scheme: 'light' | 'dark'): Record<string, string> {
  const dark = scheme === 'dark'
  const volt = resolveDesign(schemaName) === 'volt'
  const css: Declarations = Object.assign(
    {},
    NUXT_UI_ALIASES[scheme],
    declarations(NUXT_UI_CSS, ':root'),
    dark ? declarations(NUXT_UI_CSS, '.dark') : {},
    declarations(MAIN_CSS, ':root'),
    declarations(MAIN_CSS, '@theme'),
    dark ? declarations(MAIN_CSS, '.dark') : {},
    volt ? declarations(MAIN_CSS, '[data-design="volt"]') : {},
    volt && dark ? declarations(MAIN_CSS, '[data-design="volt"]:where(.dark)') : {},
    declarations(themeCss, 'html:root'),
    dark ? declarations(themeCss, 'html.dark') : {},
  )
  const palettes = NUXT_UI_PALETTES
  const resolve = (value: string): string => {
    const shade = /^var\(--(?:ui-)?color-(\w+)-(\d+)\)$/.exec(value)
    if (shade) {
      const [, colour, number] = shade
      const written = css[`--ui-color-${colour}-${number}`]
      return written ? resolve(written) : TAILWIND_PALETTES[palettes[colour!]!][number as '500']
    }
    const reference = /^var\((--[\w-]+)\)$/.exec(value)
    if (reference && css[reference[1]!] !== undefined) return resolve(css[reference[1]!]!)
    return value.toLowerCase()
  }
  const out: Record<string, string> = Object.fromEntries(THEMED_TOKENS.map(token => [token, resolve(css[token] ?? '')]))
  for (const colour of ['primary', 'secondary', 'neutral']) {
    for (const shade of THEME_SHADES) out[`--ui-color-${colour}-${shade}`] = resolve(`var(--ui-color-${colour}-${shade})`)
  }
  return out
}
