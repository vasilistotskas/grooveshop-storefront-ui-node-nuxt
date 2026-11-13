import { describe, expect, it } from 'vitest'
import { contrastSideColor, evaluateContrastRules } from '~~/shared/builder/contrastRules'
import { themeContrastRulesFor } from '~~/shared/builder/documentRoots'
import { ownDesignTextGrounds, themeCss } from '~~/shared/theme/compile'
import { CONTAINER_MAP, fontStackValue } from '~~/shared/theme/constants'
import { themeDefaultsFor } from '~~/shared/theme/defaults'
import { resolveDesign } from '~~/shared/theme/design'
import { zThemeSettings } from '~~/shared/theme/settings'
import published from '~~/test/fixtures/builder/theme-published.json'
import rendered from '~~/test/fixtures/builder/theme-rendered.json'
import { MAIN_CSS, declarations, renderedTokens } from '~~/test/helpers/themeRender'
import { contrastRatio } from '~~/shared/utils/contrast'

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

  // The deep shade is the light accent at 80% (what `color-mix(... 80%,
  // black)` draws), and its text is picked for THAT fill: a bright yellow
  // stays light at 80% (white would read 1.7:1 there), the platform blue
  // takes white.
  it.each([
    ['#ffff00', '#cccc00', '#171717'],
    ['#003dff', '#0031cc', '#ffffff'],
  ])('writes the deep shade of %s and the readable text on it, in both schemes', (accent, deep, text) => {
    const css = themeCss({ ...theme, colors: { ...theme.colors, light: { ...theme.colors.light, accent } } }, null)

    for (const selector of ['html:root', 'html.dark']) {
      expect(declarations(css, selector)).toMatchObject({ '--ui-secondary-deep': deep, '--ui-on-secondary-deep': text })
    }
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

/**
 * The accent as a heading (`--ds-accent-heading`, the bold newsletter's
 * accent heading), computed per scheme for a store with its own design: the
 * accent a fifth of the way from the grounds, and further until it reads at
 * 4.5:1 on every ground it sits on (`accentHeadingOn`). Groove Volt keeps its
 * own treatment in its stylesheet, so its theme writes none.
 */
describe('the accent heading', () => {
  const own = themeDefaultsFor(null)
  const withAccents = (light: string, dark: string) => ({
    ...own,
    colors: { light: { ...own.colors.light, accent: light }, dark: { ...own.colors.dark, accent: dark } },
  })
  const headings = (settings: typeof own) => ({
    light: declarations(themeCss(settings, null), 'html:root')['--ds-accent-heading']!,
    dark: declarations(themeCss(settings, null), 'html.dark')['--ds-accent-heading']!,
  })

  it('is webside’s deep shade on light, #0031cc, and its accent a fifth toward white on dark', () => {
    expect(headings(own)).toEqual({ light: '#0031cc', dark: '#5c83ff' })
  })

  it.each([
    ['webside’s blue', '#003dff', '#3364ff'],
    ['a bright yellow', '#ffff00', '#ffff00'],
    ['a dark navy', '#1a1a80', '#1a1a80'],
  ])('reads at 4.5:1 or more on every ground of each scheme, for %s', (_case, light, dark) => {
    const settings = withAccents(light, dark)
    const grounds = ownDesignTextGrounds(settings)
    const colour = headings(settings)

    for (const scheme of ['light', 'dark'] as const) {
      for (const ground of grounds[scheme]) expect(contrastRatio(colour[scheme], ground), `${scheme} on ${ground}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('is left to Groove Volt’s own stylesheet', () => {
    const volt = themeDefaultsFor('volt')
    for (const selector of ['html:root', 'html.dark']) expect(declarations(themeCss(volt, 'volt'), selector)).not.toHaveProperty('--ds-accent-heading')
  })

  // The stylesheet's value for a store with no theme is what the theme
  // would compute for the platform's own accent.
  it('falls back, without a theme, to what the theme computes for the platform accent', () => {
    expect(declarations(MAIN_CSS, ':root')['--ds-accent-heading']).toBe(headings(own).light)
    expect(declarations(MAIN_CSS, '.dark')['--ds-accent-heading']).toBe(headings(own).dark)
  })

  // The grounds it is computed for are the grounds the theme's contrast rules check.
  it('is computed on the grounds the contrast rules check', () => {
    const rules = themeContrastRulesFor(null)
    const background = (id: string) => contrastSideColor(own, rules.find(rule => rule.id === id)!.background)

    expect(ownDesignTextGrounds(own)).toEqual({
      light: [background('body-text-light'), background('accent-muted-light')],
      dark: [background('body-text-dark'), background('accent-muted-dark')],
    })
  })
})
