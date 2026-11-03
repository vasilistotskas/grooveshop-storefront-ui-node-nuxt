import { describe, expect, it } from 'vitest'
import contrast from '~~/test/fixtures/builder/contrast-cases.json'
import { contrastRulePath, contrastSideColor, evaluateContrastRules } from '~~/shared/builder/contrastRules'
import { zThemeSettings } from '~~/shared/theme/settings'
import { contrastRatio } from '~~/shared/utils/contrast'
import type { ContrastRule } from '~~/shared/types/builder'

/**
 * The contrast of a theme, as the editor shows it and Django enforces it.
 * The vectors are `test/fixtures/builder/contrast-cases.json`, which Django
 * vendors and holds its own WCAG function and rule evaluation to: a change on
 * either side that the other does not make fails one of the two suites.
 */
const rules = contrast.rules as ContrastRule[]

describe('contrastRatio', () => {
  it.each(contrast.cases.map(entry => [entry.why, entry] as const))('gives the shared ratio for %s', (_why, { foreground, background, ratio }) => {
    expect(contrastRatio(foreground, background).toFixed(2)).toBe(ratio)
  })
})

describe('evaluateContrastRules', () => {
  it.each(contrast.themes.map(entry => [entry.why, entry] as const))('agrees with the shared outcome for %s', (_why, { settings, outcomes }) => {
    const evaluated = evaluateContrastRules(settings, rules).map(({ rule, ratio, pass }) => ({ id: rule.id, ratio: ratio.toFixed(2), pass, path: contrastRulePath(rule) }))

    expect(evaluated).toEqual(outcomes)
  })

  it.each(contrast.boundaries.map(entry => [entry.why, entry] as const))('compares the unrounded ratio: %s', (_why, { foreground, background, min, pass }) => {
    const rule: ContrastRule = { id: 'boundary', foreground: foreground as ContrastRule['foreground'], background: background as ContrastRule['background'], min, severity: 'error' }

    expect(evaluateContrastRules({}, [rule])[0]!.pass).toBe(pass)
  })

  it('reads an escaped pointer token as RFC 6901 does', () => {
    expect(contrastSideColor({ 'a/b': { '~c': '#123456' } }, '/a~1b/~0c')).toBe('#123456')
  })

  it.each([
    ['a missing value', {}],
    ['a value that is no colour', { colors: { neutral: { scale: { 700: 'zinc' } } } }],
  ])('refuses a pointer to %s: the catalogue contradicts itself', (_case, settings) => {
    expect(() => contrastSideColor(settings, '/colors/neutral/scale/700')).toThrow('is not a #RRGGBB colour')
  })
})

describe('the theme schema', () => {
  it.each(contrast.themes.map(entry => [entry.why, entry.settings] as const))('takes the shared theme of %s as its root settings', (_why, settings) => {
    expect(zThemeSettings.safeParse(settings).success).toBe(true)
  })

  it('requires every key, so a partial theme is not one', () => {
    const { container: _, ...partial } = contrast.themes[0]!.settings

    expect(zThemeSettings.safeParse(partial).success).toBe(false)
  })
})
