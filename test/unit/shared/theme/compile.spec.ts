import { describe, expect, it } from 'vitest'
import { themeCss } from '~~/shared/theme/compile'
import { CONTAINER_MAP, fontStackValue } from '~~/shared/theme/constants'
import { themeDefaultsFor } from '~~/shared/theme/defaults'
import { declarations } from '~~/test/helpers/themeRender'

/**
 * What `themeCss` writes for a theme. That a seeded theme renders a store as
 * today, token by token, is `seed.spec.ts`; here: every key of the theme
 * reaches its token, in the scheme it belongs to.
 */
describe('themeCss', () => {
  const theme = themeDefaultsFor(null)
  const changed = {
    ...theme,
    radius: '0.5rem',
    container: 'narrow',
    fonts: { sans: 'inter', display: 'vollkorn', mono: 'jetbrains-mono' },
    colors: {
      light: { ...theme.colors.light, action: '#123456', accent: '#b3694b', liked: '#d94f70' },
      dark: { ...theme.colors.dark, action: '#abcdef', accent: '#e0a96d' },
    },
  }
  const css = themeCss(changed, null)
  const light = declarations(css, 'html:root')
  const dark = declarations(css, 'html.dark')

  it('writes each scheme\'s colours on its own selector', () => {
    expect(light).toMatchObject({ '--ui-primary': '#123456', '--ui-secondary': '#b3694b', '--ui-liked': '#d94f70', '--ui-success': theme.colors.light.success })
    expect(dark).toMatchObject({ '--ui-primary': '#abcdef', '--ui-secondary': '#e0a96d', '--ui-success': theme.colors.dark.success })
    expect(light['--ui-color-neutral-700']).toBe(theme.colors.light.neutral.scale['700'])
    expect(dark['--ui-color-primary-100']).toBe(theme.colors.dark.primary.scale['100'])
  })

  it('writes the radius, the width and the three faces in both schemes', () => {
    for (const scheme of [light, dark]) {
      expect(scheme).toMatchObject({
        '--ui-radius': '0.5rem',
        '--ui-container': CONTAINER_MAP.narrow,
        '--font-sans': fontStackValue('inter'),
        '--font-display': fontStackValue('vollkorn'),
        '--font-mono': fontStackValue('jetbrains-mono'),
      })
    }
  })

  it('pairs an accent the store picked with readable text, and leaves the design\'s own pairing alone', () => {
    expect(light['--ui-on-secondary']).toBe('#000000')
    expect(declarations(themeCss(theme, null), 'html:root')).not.toHaveProperty('--ui-on-secondary')
  })
})
