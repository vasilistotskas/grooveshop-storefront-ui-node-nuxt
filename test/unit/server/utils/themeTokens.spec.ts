import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  CONTAINER_MAP,
  FONT_ALLOWLIST,
  HEX_COLOR_RE,
  PLATFORM_COLORS,
  RADIUS_ALLOWLIST,
} from '../../../../shared/theme/constants'
import { THEME_PRESETS } from '../../../../shared/theme/presets'
import { zThemeMetadata } from '../../../../shared/theme/metadataSchema'

// The compiler consumes these via shared/ auto-imports (a relative
// runtime import into shared/ breaks Nitro's production server
// bundle); the unit project has no auto-imports, so wire the REAL
// implementations as globals — same pattern as csp.spec.ts.
let buildTenantThemeCss: typeof import('../../../../server/utils/themeTokens')['buildTenantThemeCss']

beforeAll(async () => {
  vi.stubGlobal('CONTAINER_MAP', CONTAINER_MAP)
  vi.stubGlobal('FONT_ALLOWLIST', FONT_ALLOWLIST)
  vi.stubGlobal('HEX_COLOR_RE', HEX_COLOR_RE)
  vi.stubGlobal('PLATFORM_COLORS', PLATFORM_COLORS)
  vi.stubGlobal('RADIUS_ALLOWLIST', RADIUS_ALLOWLIST)
  vi.stubGlobal('THEME_PRESETS', THEME_PRESETS)
  vi.stubGlobal('zThemeMetadata', zThemeMetadata)
  buildTenantThemeCss
    = (await import('../../../../server/utils/themeTokens')).buildTenantThemeCss
})

describe('buildTenantThemeCss', () => {
  it('emits nothing for an unthemed tenant (platform stays byte-identical)', () => {
    const { css, metadataError } = buildTenantThemeCss({})
    expect(css).toBe('')
    expect(metadataError).toBeUndefined()
  })

  it('emits customized accent + status hexes into :root and .dark', () => {
    const { css } = buildTenantThemeCss({
      accentHex: '#FF5500',
      successHex: '#00AA00',
    })
    expect(css).toContain(':root {')
    expect(css).toContain('.dark {')
    expect(css).toContain('--ui-secondary: #FF5500')
    expect(css).toContain('--ui-success: #00AA00')
    // --ui-liked is a distinct semantic colour owned by main.css
    // (#FF00BD) with no Tenant field. Mapping the accent onto it turned
    // every liked post and comment the accent colour.
    expect(css).not.toContain('--ui-liked')
  })

  it('emits nothing for a tenant carrying the platform defaults', () => {
    // Every colour field on the Tenant model has a NON-BLANK default
    // equal to the platform value, so this is the shape the serializer
    // produces for a store that customized nothing — including webside
    // itself. Emitting it overrode main.css at equal specificity and
    // flattened the deliberately different `.dark` values, costing
    // contrast in dark mode.
    const { css } = buildTenantThemeCss({
      accentHex: '#003DFF',
      successHex: '#16a34a',
      warningHex: '#ca8a04',
      errorHex: '#dc2626',
      infoHex: '#2563eb',
    })
    expect(css).toBe('')
  })

  it('compares platform defaults case-insensitively', () => {
    const { css } = buildTenantThemeCss({ accentHex: '#003dff' })
    expect(css).toBe('')
  })

  it('rejects malformed hexes silently', () => {
    const { css } = buildTenantThemeCss({
      accentHex: 'red; } body { display:none',
      errorHex: '#12345',
    })
    expect(css).toBe('')
  })

  it('resolves non-color tokens from the preset', () => {
    const { css } = buildTenantThemeCss({ themePreset: 'bold' })
    expect(css).toContain('--ui-radius: 0.625rem')
    expect(css).toContain('--font-sans: "Poppins"')
  })

  it('default preset emits no non-color tokens (stock values omitted)', () => {
    const { css } = buildTenantThemeCss({ themePreset: 'default' })
    expect(css).toBe('')
  })

  it('metadata overrides win over the preset', () => {
    const { css } = buildTenantThemeCss({
      themePreset: 'bold',
      themeMetadata: { radius: '0', fontSans: 'inter', container: 'narrow' },
    })
    expect(css).toContain('--ui-radius: 0')
    expect(css).toContain('--font-sans: "Inter"')
    expect(css).toContain('--ui-container: 64rem')
    expect(css).not.toContain('Poppins')
  })

  it('invalid metadata degrades to the preset and reports the error', () => {
    const { css, metadataError } = buildTenantThemeCss({
      themePreset: 'bold',
      themeMetadata: { fontSans: 'comic-sans', evil: true },
    })
    expect(metadataError).toBeTruthy()
    expect(css).toContain('--ui-radius: 0.625rem')
    expect(css).toContain('Poppins')
  })

  it('emits custom scale overrides shade by shade', () => {
    const { css } = buildTenantThemeCss({
      themePreset: 'custom',
      themeMetadata: {
        colors: { primaryScale: { 500: '#123456', 600: '#654321' } },
      },
    })
    expect(css).toContain('--ui-color-primary-500: #123456')
    expect(css).toContain('--ui-color-primary-600: #654321')
    expect(css).not.toContain('--ui-color-primary-50:')
  })

  it('never interpolates raw metadata strings', () => {
    const { css } = buildTenantThemeCss({
      themeMetadata: { radius: '0.25rem; } * { display:none' },
    })
    // strict schema rejects the value → preset default → empty output
    expect(css).toBe('')
  })

  // Splits the emitted css into its :root and .dark declaration blocks
  // so dark-only emission can be asserted precisely.
  const splitBlocks = (css: string) => {
    const root = css.match(/:root \{ ([^}]*) \}/)?.[1] ?? ''
    const dark = css.match(/\.dark \{ ([^}]*) \}/)?.[1] ?? ''
    return { root, dark }
  }

  it('emits a custom secondary scale and derives --ui-secondary from it', () => {
    const { css } = buildTenantThemeCss({
      themeMetadata: {
        colors: {
          secondaryScale: { 400: '#7eb8ac', 500: '#5d9d91' },
        },
      },
    })
    const { root, dark } = splitBlocks(css)
    expect(root).toContain('--ui-color-secondary-500: #5d9d91')
    expect(root).toContain('--ui-secondary: #5d9d91')
    // 400 becomes the dark accent, only in .dark.
    expect(root).not.toContain('--ui-secondary: #7eb8ac')
    expect(dark).toContain('--ui-secondary: #7eb8ac')
  })

  it('explicit accentHex beats the secondary-scale-derived accent', () => {
    const { css } = buildTenantThemeCss({
      accentHex: '#b3694b',
      themeMetadata: {
        colors: { secondaryScale: { 500: '#5d9d91' } },
      },
    })
    const { root, dark } = splitBlocks(css)
    expect(root).toContain('--ui-secondary: #b3694b')
    // No derived dark variant for an explicit accent without
    // accentDarkHex — the light value applies in both modes.
    expect(dark).toContain('--ui-secondary: #b3694b')
    expect(dark).not.toContain('--ui-secondary: #5d9d91')
  })

  it('accentDarkHex overrides --ui-secondary in dark mode only', () => {
    const { css } = buildTenantThemeCss({
      accentHex: '#b3694b',
      themeMetadata: { accentDarkHex: '#d09d75' },
    })
    const { root, dark } = splitBlocks(css)
    expect(root).toContain('--ui-secondary: #b3694b')
    expect(root).not.toContain('#d09d75')
    expect(dark).toContain('--ui-secondary: #d09d75')
  })

  it('emits darkColors scales into .dark only, after the shared block', () => {
    const { css } = buildTenantThemeCss({
      themeMetadata: {
        colors: { primaryScale: { 500: '#9aa882' } },
        darkColors: { primaryScale: { 500: '#b1bd99' } },
      },
    })
    const { root, dark } = splitBlocks(css)
    expect(root).toContain('--ui-color-primary-500: #9aa882')
    expect(root).not.toContain('#b1bd99')
    // Shared value first, dark override after it — the override wins.
    expect(dark.indexOf('--ui-color-primary-500: #9aa882'))
      .toBeLessThan(dark.indexOf('--ui-color-primary-500: #b1bd99'))
  })

  it('emits only a .dark block for dark-only overrides', () => {
    const { css } = buildTenantThemeCss({
      themeMetadata: { accentDarkHex: '#3364ff' },
    })
    expect(css).not.toContain(':root')
    expect(css).toContain('.dark { --ui-secondary: #3364ff }')
  })

  it('emits --font-display only when fontDisplay is set', () => {
    expect(buildTenantThemeCss({}).css).not.toContain('--font-display')
    const { css } = buildTenantThemeCss({
      themeMetadata: { fontSans: 'manrope', fontDisplay: 'source-serif-4' },
    })
    expect(css).toContain('--font-sans: "Manrope"')
    expect(css).toContain('--font-display: "Source Serif 4"')
  })

  it('emits --ui-liked from likedHex in both modes', () => {
    const { css } = buildTenantThemeCss({
      themeMetadata: { likedHex: '#b3694b' },
    })
    const { root, dark } = splitBlocks(css)
    expect(root).toContain('--ui-liked: #b3694b')
    expect(dark).toContain('--ui-liked: #b3694b')
  })
})
