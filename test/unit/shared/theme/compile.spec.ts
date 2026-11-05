import { describe, expect, it } from 'vitest'
import { evaluateContrastRules } from '~~/shared/builder/contrastRules'
import { themeContrastRulesFor } from '~~/shared/builder/documentRoots'
import { themeCss } from '~~/shared/theme/compile'
import { CONTAINER_MAP, fontStackValue } from '~~/shared/theme/constants'
import { themeDefaultsFor } from '~~/shared/theme/defaults'
import { resolveDesign } from '~~/shared/theme/design'
import { zThemeSettings } from '~~/shared/theme/settings'
import published from '~~/test/fixtures/builder/theme-published.json'
import rendered from '~~/test/fixtures/builder/theme-rendered.json'
import { declarations, renderedTokens } from '~~/test/helpers/themeRender'

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

/**
 * The three production stores (demo and fyteia on Groove Volt, webside on its
 * own design) as they were moved onto their theme documents. `theme-rendered.json`
 * pins what each painted before it had a theme, when its Tenant fields drew it:
 * every themed token and all 33 scale shades, in both schemes, resolved from the
 * real stylesheets (`test/helpers/themeRender.ts`). `theme-published.json` is the
 * theme each published (read from production, 2026-11-05). Now the theme block
 * alone draws them, over Nuxt UI's default palettes and the stylesheet's
 * surfaces, so a token `themeCss` stops writing, or a stylesheet that starts
 * to paint one again, shows here.
 */
describe.each(Object.entries(published))('the published theme of the production store %s', (schema, document) => {
  const settings = zThemeSettings.parse(document)
  const design = resolveDesign(schema)

  it.each(['light', 'dark'] as const)('renders every token in the %s scheme as it rendered from the Tenant fields', (scheme) => {
    expect(renderedTokens(schema, themeCss(settings, design), scheme)).toEqual(rendered[schema as keyof typeof rendered][scheme])
  })

  it('breaks no rule that stops a publish', () => {
    const blocking = evaluateContrastRules(settings, themeContrastRulesFor(design)).filter(({ rule, pass }) => rule.severity === 'error' && !pass)

    expect(blocking).toEqual([])
  })
})
