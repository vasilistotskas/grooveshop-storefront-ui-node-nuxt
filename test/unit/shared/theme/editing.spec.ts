import { describe, expect, it } from 'vitest'
import { contrastSideColor, evaluateContrastRules } from '~~/shared/builder/contrastRules'
import { themeContrastRulesFor } from '~~/shared/builder/documentRoots'
import { themeDefaultsFor } from '~~/shared/theme/defaults'
import { fixContrast, withLightAsDark, withScaleColour } from '~~/shared/theme/editing'
import { themeScaleFrom } from '~~/shared/theme/scale'
import { zThemeSettings } from '~~/shared/theme/settings'
import type { ContrastRule } from '~~/shared/types/builder'
import { contrastRatio, relativeLuminance } from '~~/shared/utils/contrast'
import { srgbFromHex, srgbToOklch } from '~~/shared/utils/oklch'

describe('withScaleColour', () => {
  const webside = themeDefaultsFor(null)
  const volt = themeDefaultsFor('volt')

  it('picks the colour and makes its eleven shades', () => {
    const next = withScaleColour(webside.colors.light, 'secondary', '#7C3AED', null, 'light')

    expect(next.secondary).toEqual({ source: '#7c3aed', scale: themeScaleFrom('#7C3AED') })
    expect(next.primary).toBe(webside.colors.light.primary)
  })

  it('sets the action colour from a new primary while it follows the primary, at the shade the design paints CTAs with', () => {
    const scale = themeScaleFrom('#16a34a')

    expect(withScaleColour(webside.colors.light, 'primary', '#16a34a', null, 'light').action).toBe(scale['500'])
    expect(withScaleColour(webside.colors.dark, 'primary', '#16a34a', null, 'dark').action).toBe(scale['100'])
    expect(withScaleColour({ ...volt.colors.light, actionLinked: true }, 'primary', '#16a34a', 'volt', 'light').action).toBe(scale['900'])
  })

  it('leaves an action colour that does not follow the primary alone', () => {
    expect(withScaleColour(volt.colors.light, 'primary', '#16a34a', 'volt', 'light').action).toBe('#17171a')
  })
})

describe('withLightAsDark', () => {
  it('copies the light scheme into the dark one, as a copy', () => {
    const theme = themeDefaultsFor('volt')
    const next = withLightAsDark(theme)

    expect(next.colors.dark).toEqual(theme.colors.light)
    expect(next.colors.dark).not.toBe(next.colors.light)
    expect(zThemeSettings.safeParse(next).success).toBe(true)
  })
})

describe('fixContrast', () => {
  const rules = Object.fromEntries(themeContrastRulesFor(null).map(rule => [rule.id, rule]))

  it.each([
    ['body text too pale on the light background', 'body-text-light', 'light', '700', '#b9a8e6'],
    ['body text too dark on the dark background', 'body-text-dark', 'dark', '200', '#4a3d7a'],
  ] as const)('fixes %s, just enough, keeping its hue', (_case, id, scheme, shade, colour) => {
    const theme = themeDefaultsFor(null)
    theme.colors[scheme].neutral.scale[shade] = colour
    const rule = rules[id]!

    const fixed = fixContrast(theme, rule)
    const [outcome] = evaluateContrastRules(fixed, [rule])
    const moved = fixed.colors[scheme].neutral.scale[shade]

    expect(outcome!.pass).toBe(true)
    // Just enough: within a hair of the rule, not pushed to black or white.
    expect(outcome!.ratio).toBeLessThan(rule.min + 0.3)
    expect(Math.abs(srgbToOklch(srgbFromHex(moved)).h - srgbToOklch(srgbFromHex(colour)).h)).toBeLessThan(5)
    // Only that colour moved.
    expect({ ...fixed, colors: { ...fixed.colors, [scheme]: { ...fixed.colors[scheme], neutral: theme.colors[scheme].neutral } } }).toEqual({ ...theme })
  })

  it('moves the foreground away from the background: darker on light, lighter on dark', () => {
    const theme = themeDefaultsFor(null)
    theme.colors.light.accent = '#9fb4ff'
    theme.colors.dark.accent = '#1a2a6c'

    const light = fixContrast(theme, rules['accent-light']!).colors.light.accent
    const dark = fixContrast(theme, rules['accent-dark']!).colors.dark.accent

    expect(relativeLuminance(light)).toBeLessThan(relativeLuminance('#9fb4ff'))
    expect(relativeLuminance(dark)).toBeGreaterThan(relativeLuminance('#1a2a6c'))
  })

  it('leaves a theme whose rule passes, or a rule of two literals, as it is', () => {
    const theme = themeDefaultsFor(null)
    const literal: ContrastRule = { id: 'literal', foreground: '#777777', background: '#ffffff', min: 4.5, severity: 'error' }

    expect(fixContrast(theme, rules['body-text-light']!)).toBe(theme)
    expect(fixContrast(theme, literal)).toBe(theme)
  })

  it('goes as far as black when nothing lighter passes', () => {
    const theme = themeDefaultsFor(null)
    const impossible: ContrastRule = { id: 'impossible', foreground: '/colors/light/accent', background: '#000000', min: 21, severity: 'warning' }

    const fixed = fixContrast(theme, impossible)

    expect(contrastRatio(contrastSideColor(fixed, '/colors/light/accent'), '#000000')).toBeGreaterThan(19)
  })
})
