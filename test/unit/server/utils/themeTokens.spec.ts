import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  CONTAINER_MAP,
  FONT_ALLOWLIST,
  HEX_COLOR_RE,
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

  it('emits accent + status hexes into :root and .dark', () => {
    const { css } = buildTenantThemeCss({
      accentHex: '#FF5500',
      successHex: '#00AA00',
    })
    expect(css).toContain(':root {')
    expect(css).toContain('.dark {')
    expect(css).toContain('--ui-secondary: #FF5500')
    expect(css).toContain('--ui-liked: #FF5500')
    expect(css).toContain('--ui-success: #00AA00')
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
})
