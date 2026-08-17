import { describe, expect, it } from 'vitest'
import { buildTenantThemeCss } from '../../../../server/utils/themeTokens'

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
