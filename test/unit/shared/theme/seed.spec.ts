import { describe, expect, it } from 'vitest'
import { evaluateContrastRules } from '~~/shared/builder/contrastRules'
import { themeContrastRulesFor } from '~~/shared/builder/documentRoots'
import { themeCss } from '~~/shared/theme/compile'
import { resolveDesign } from '~~/shared/theme/design'
import { seedThemeSettings } from '~~/shared/theme/seed'
import type { TenantThemeFields } from '~~/shared/theme/seed'
import { zThemeSettings } from '~~/shared/theme/settings'
import production from '~~/test/fixtures/builder/theme-export.json'
import rendered from '~~/test/fixtures/builder/theme-export-rendered.json'
import { renderedTokens } from '~~/test/helpers/themeRender'

/**
 * A store moved onto its seeded theme document renders as its Tenant fields
 * rendered it. The three production stores' fields (`theme-export.json`) were
 * rendered once by the Tenant path that drew pages before they had a theme
 * (`buildTenantThemeCss` and the plugin that handed Nuxt UI the store's primary
 * and neutral), resolved from the real stylesheets token by token and in both
 * schemes (`test/helpers/themeRender.ts`), and that is pinned in
 * `theme-export-rendered.json`: the CTA and accent colours and the text on the
 * accent, the statuses, the heart, radius, width, the three faces and all 33
 * scale shades. Now the theme block alone draws them, over Nuxt UI's default
 * palettes, and every token must resolve to the pinned value: demo and fyteia
 * on Groove Volt, webside on its own design.
 */
const afterTheMove = (fields: TenantThemeFields, scheme: 'light' | 'dark') => renderedTokens(fields.schemaName!, themeCss(seedThemeSettings(fields), resolveDesign(fields.schemaName)), scheme)

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

describe('seedThemeSettings', () => {
  it('keeps Volt\'s CTA ink whatever the store\'s primary, and leaves it unlinked', () => {
    const settings = seedThemeSettings(store({ themeMetadata: { colors: { primaryScale: SCALE } } }))

    expect([settings.colors.light.action, settings.colors.dark.action]).toEqual(['#17171a', '#f7f7f5'])
    expect(settings.colors.light.actionLinked).toBe(false)
  })

  // The three production stores, as Django's export_theme_fields read them
  // (2026-11-03, read-only): the move onto the theme document changes nothing
  // any of them paints, fyteia's partial dark scales and Volt's CTAs included.
  it.each(production.stores.map(({ schema, fields }) => [schema, fields as TenantThemeFields] as const))('moves the production store %s onto its theme with every token as it rendered from its Tenant fields', (schema, fields) => {
    expect(zThemeSettings.safeParse(seedThemeSettings(fields)).success).toBe(true)
    const pinned = rendered[schema as keyof typeof rendered]
    for (const scheme of ['light', 'dark'] as const) {
      expect(afterTheMove(fields, scheme)).toEqual(pinned[scheme])
    }
    // Its theme publishes: no rule that stops a publish fails on what it renders today.
    const blocking = evaluateContrastRules(seedThemeSettings(fields), themeContrastRulesFor(resolveDesign(fields.schemaName)))
      .filter(({ rule, pass }) => rule.severity === 'error' && !pass)
    expect(blocking).toEqual([])
  })
})
