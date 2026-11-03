import { describe, expect, it } from 'vitest'
import { buildTenantThemeCss } from '~~/server/utils/themeTokens'
import { themeCss } from '~~/shared/theme/compile'
import { resolveDesign } from '~~/shared/theme/design'
import { seedThemeSettings } from '~~/shared/theme/seed'
import type { TenantThemeFields } from '~~/shared/theme/seed'
import { zThemeSettings } from '~~/shared/theme/settings'
import { renderedTokens } from '~~/test/helpers/themeRender'

/**
 * A store moved onto its seeded theme document renders exactly as its Tenant
 * fields render it today. Both sides are resolved from the real stylesheets,
 * token by token and in both schemes (`test/helpers/themeRender.ts`): today
 * with the tenant block `buildTenantThemeCss` writes from the fields, after the
 * move with the block `themeCss` writes from `seedThemeSettings(fields)`. Every
 * themed token must resolve the same: the CTA and accent colours and the text on
 * the accent, the statuses, the heart, radius, width, the three faces and all
 * 33 scale shades. The cases cover every rule the render applies; the three
 * production stores' own fields run through the same comparison.
 */
const today = (fields: TenantThemeFields, scheme: 'light' | 'dark') => renderedTokens(fields, buildTenantThemeCss(fields).css, scheme)
const afterTheMove = (fields: TenantThemeFields, scheme: 'light' | 'dark') => renderedTokens(fields, themeCss(seedThemeSettings(fields), resolveDesign(fields.schemaName)), scheme)

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
    expect(zThemeSettings.safeParse(seedThemeSettings(fields)).success).toBe(true)
    for (const scheme of ['light', 'dark'] as const) {
      expect(afterTheMove(fields, scheme)).toEqual(today(fields, scheme))
    }
  })

  it('keeps Volt\'s CTA ink whatever the store\'s primary, and leaves it unlinked', () => {
    const settings = seedThemeSettings(store({ themeMetadata: { colors: { primaryScale: SCALE } } }))

    expect([settings.colors.light.action, settings.colors.dark.action]).toEqual(['#17171a', '#f7f7f5'])
    expect(settings.colors.light.actionLinked).toBe(false)
  })
})
