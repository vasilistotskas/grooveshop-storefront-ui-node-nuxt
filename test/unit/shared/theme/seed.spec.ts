import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { buildTenantThemeCss } from '~~/server/utils/themeTokens'
import { CONTAINER_MAP, THEME_SHADES, fontStackValue } from '~~/shared/theme/constants'
import { resolveDesign } from '~~/shared/theme/design'
import { seedThemeSettings } from '~~/shared/theme/seed'
import type { TenantThemeFields } from '~~/shared/theme/seed'
import { zThemeSettings } from '~~/shared/theme/settings'
import type { ThemeSettings } from '~~/shared/theme/settings'
import { TAILWIND_PALETTES } from '~~/shared/theme/tailwindPalettes'
import type { TailwindPaletteName } from '~~/shared/theme/tailwindPalettes'

/**
 * The seed of a store's theme renders the store as its Tenant fields do
 * today. "Today" is resolved here from the real stylesheets, token by token
 * and in both schemes: Nuxt UI's defaults, `main.css` `:root` / `.dark`, the
 * Groove Volt block for a Volt store, and the tenant block
 * `buildTenantThemeCss` writes from the fields; then every
 * `var(--ui-color-…)` / `var(--color-…)` through the store's palettes. The
 * seed must give each of those tokens the same value. The cases cover every
 * rule the render applies; the three production stores' own fields run
 * through the same comparison (`pnpm theme:seed`, `scripts/theme-seed.mjs`).
 */
const MAIN_CSS = readFileSync(new URL('../../../../app/assets/css/main.css', import.meta.url), 'utf8')
const NUXT_UI_CSS = readFileSync(createRequire(import.meta.url).resolve('@nuxt/ui/runtime/index.css'), 'utf8')

type Declarations = Record<string, string>

/** The custom properties every rule of `css` whose selector is exactly `selector` declares, later ones winning. */
function declarations(css: string, selector: string): Declarations {
  const values: Declarations = {}
  for (const block of css.replace(/\/\*[\s\S]*?\*\//g, '').split('}')) {
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

/** The palettes Nuxt UI's semantic colours take: the store's primary and neutral, and Nuxt UI's defaults for the rest. */
const SEMANTIC = { secondary: 'blue', success: 'green', info: 'blue', warning: 'yellow', error: 'red' } as const

const TOKENS = ['--ui-primary', '--ui-secondary', '--ui-success', '--ui-warning', '--ui-error', '--ui-info', '--ui-liked', '--ui-radius', '--ui-container', '--font-sans', '--font-display', '--font-mono'] as const

/** Every themed token of `scheme` as the store renders today, resolved to a value. */
function renderedToday(fields: TenantThemeFields, scheme: 'light' | 'dark'): Record<string, string> {
  const dark = scheme === 'dark'
  const tenantBlocks = buildTenantThemeCss(fields).css
  const layers: Declarations[] = [
    NUXT_UI_ALIASES[scheme],
    declarations(NUXT_UI_CSS, ':root'),
    dark ? declarations(NUXT_UI_CSS, '.dark') : {},
    declarations(MAIN_CSS, ':root'),
    declarations(MAIN_CSS, '@theme'),
    dark ? declarations(MAIN_CSS, '.dark') : {},
    resolveDesign(fields.schemaName) === 'volt' ? declarations(MAIN_CSS, '[data-design="volt"]') : {},
    resolveDesign(fields.schemaName) === 'volt' && dark ? declarations(MAIN_CSS, '[data-design="volt"]:where(.dark)') : {},
    declarations(tenantBlocks, 'html:root'),
    dark ? declarations(tenantBlocks, 'html.dark') : {},
  ]
  const css: Declarations = Object.assign({}, ...layers)
  const palettes: Record<string, TailwindPaletteName> = {
    primary: (fields.primaryColor in TAILWIND_PALETTES ? fields.primaryColor : 'neutral') as TailwindPaletteName,
    neutral: (fields.neutralColor in TAILWIND_PALETTES ? fields.neutralColor : 'zinc') as TailwindPaletteName,
    ...SEMANTIC,
  }
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
  const out: Record<string, string> = Object.fromEntries(TOKENS.map(token => [token, resolve(css[token]!)]))
  for (const colour of ['primary', 'secondary', 'neutral']) {
    for (const shade of THEME_SHADES) out[`--ui-color-${colour}-${shade}`] = resolve(`var(--ui-color-${colour}-${shade})`)
  }
  return out
}

/** main.css's `@theme` sizes. */
const THEME_SIZES = declarations(MAIN_CSS, '@theme')

/** The same tokens as the seeded theme gives them. */
function renderedBySeed(settings: ThemeSettings, scheme: 'light' | 'dark'): Record<string, string> {
  const colours = settings.colors[scheme]
  const out: Record<string, string> = {
    '--ui-primary': colours.action,
    '--ui-secondary': colours.accent,
    '--ui-success': colours.success,
    '--ui-warning': colours.warning,
    '--ui-error': colours.error,
    '--ui-info': colours.info,
    '--ui-liked': colours.liked,
    '--ui-radius': settings.radius,
    // A width may name one of main.css's theme sizes (`wide` is var(--container-8xl)).
    '--ui-container': CONTAINER_MAP[settings.container]!.replace(/^var\((--[\w-]+)\)$/, (whole, name: string) => THEME_SIZES[name] ?? whole),
    '--font-sans': fontStackValue(settings.fonts.sans)!,
    '--font-display': fontStackValue(settings.fonts.display)!,
    '--font-mono': fontStackValue(settings.fonts.mono)!,
  }
  for (const colour of ['primary', 'secondary', 'neutral'] as const) {
    for (const shade of THEME_SHADES) out[`--ui-color-${colour}-${shade}`] = colours[colour].scale[shade]
  }
  return Object.fromEntries(Object.entries(out).map(([token, value]) => [token, value.toLowerCase()]))
}

/** A store's fields: the platform's values unless the case says otherwise, as Django's Tenant defaults are. */
const store = (overrides: Partial<TenantThemeFields>): TenantThemeFields => ({
  schemaName: 'demo',
  themePreset: 'default',
  primaryColor: 'neutral',
  neutralColor: 'zinc',
  accentHex: '#003DFF',
  successHex: '#16a34a',
  warningHex: '#ca8a04',
  errorHex: '#dc2626',
  infoHex: '#2563eb',
  themeMetadata: {},
  ...overrides,
})

const SCALE = { 50: '#f7f3ec', 100: '#ede3d2', 200: '#dcc7a6', 300: '#c9a878', 400: '#b98c55', 500: '#a8743d', 600: '#8f5e31', 700: '#744a29', 800: '#5d3c25', 900: '#4c3221', 950: '#2b1a10' }

const CASES: Array<[string, TenantThemeFields]> = [
  ['webside as it is, with its own design and no changes', store({ schemaName: 'webside' })],
  ['a Volt store with no changes', store({})],
  ['Tailwind names for primary and neutral', store({ primaryColor: 'emerald', neutralColor: 'stone' })],
  ['the same on webside, whose CTAs follow the primary scale', store({ schemaName: 'webside', primaryColor: 'emerald', neutralColor: 'stone' })],
  ['a changed accent and statuses', store({ accentHex: '#b3694b', successHex: '#2e7d32', warningHex: '#b26a00', errorHex: '#b00020', infoHex: '#1565c0' })],
  ['a custom secondary scale and no accent: its 500 and 400 are the accent', store({ themeMetadata: { colors: { secondaryScale: SCALE } } })],
  ['a dark accent only', store({ themeMetadata: { accentDarkHex: '#e0a96d' } })],
  ['custom scales in both schemes, liked, faces, radius and width (fyteia\'s kind of theme)', store({
    schemaName: 'ekfyseosfyteias',
    themePreset: 'custom',
    themeMetadata: {
      colors: { primaryScale: SCALE, secondaryScale: SCALE },
      darkColors: { primaryScale: { ...SCALE, 500: '#c9a878' }, neutralScale: { 900: '#1c1917', 950: '#0c0a09' } },
      accentDarkHex: '#e0a96d',
      likedHex: '#d94f70',
      radius: '0.5rem',
      container: 'default',
      fontSans: 'commissioner',
      fontDisplay: 'vollkorn',
    },
  })],
  ['the minimal preset on webside', store({ schemaName: 'webside', themePreset: 'minimal' })],
  ['a Volt store that picks the platform radius and width, which leave Volt\'s own', store({ themeMetadata: { radius: '0.25rem', container: 'wide' } })],
  ['a theme_metadata that does not validate, which the render reads as none', store({ themeMetadata: { radius: '9rem' } })],
]

describe('seedThemeSettings', () => {
  it.each(CASES)('renders %s as today, token by token, in both schemes', (_case, fields) => {
    const settings = seedThemeSettings(fields)

    expect(zThemeSettings.safeParse(settings).success).toBe(true)
    for (const scheme of ['light', 'dark'] as const) {
      expect(renderedBySeed(settings, scheme)).toEqual(renderedToday(fields, scheme))
    }
  })

  it('keeps Volt\'s CTA ink whatever the store\'s primary, and leaves it unlinked', () => {
    const settings = seedThemeSettings(store({ themeMetadata: { colors: { primaryScale: SCALE } } }))

    expect([settings.colors.light.action, settings.colors.dark.action]).toEqual(['#17171a', '#f7f7f5'])
    expect(settings.colors.light.actionLinked).toBe(false)
  })
})
