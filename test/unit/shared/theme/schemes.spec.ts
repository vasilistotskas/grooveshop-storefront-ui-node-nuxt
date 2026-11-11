import { describe, expect, it } from 'vitest'
import { themeCss } from '~~/shared/theme/compile'
import { zThemeSettings } from '~~/shared/theme/settings'
import published from '~~/test/fixtures/builder/theme-published.json'
import { computedTokens, htmlElement, pageRules } from '~~/test/helpers/themeCascade'
import type { CascadeElement } from '~~/test/helpers/themeCascade'

/**
 * A part of a page can be drawn in the other colour scheme: Nuxt UI's own
 * `.light` / `.dark` class on an element switches every token inside it, and
 * the store's theme block (`themeCss`), the base stylesheet and the Groove
 * Volt blocks (`main.css`) are written for such a subtree as well as for
 * `<html>`. Computed from the real stylesheets by the cascade a browser runs
 * (`test/helpers/themeCascade.ts`), for the three production stores' published
 * themes (`theme-published.json`) in both designs.
 */
const STORES = Object.entries(published).map(([schema, document]) => [schema, zThemeSettings.parse(document)] as const)
const DESIGNS = [['volt', 'volt'], ['a design of its own', null]] as const

const section = (scheme: 'light' | 'dark'): CascadeElement => ({ tag: 'section', classes: [scheme] })

/**
 * What `<html>` computes, per store, design and scheme: pinned in
 * `theme-root-tokens.json`, written before a nested scheme existed, so a page
 * with no nested class paints exactly what it painted then.
 */
describe('the root of a page', () => {
  it('computes every token exactly as before nested schemes existed', async () => {
    const roots = Object.fromEntries(STORES.flatMap(([schema, settings]) => DESIGNS.flatMap(([, design]) =>
      (['light', 'dark'] as const).map(scheme => [
        `${schema} ${design ?? 'own'} ${scheme}`,
        computedTokens(pageRules(themeCss(settings, design)), [htmlElement(scheme, design === 'volt')]),
      ]),
    )))

    expect(Object.keys(roots)).toHaveLength(STORES.length * DESIGNS.length * 2)
    await expect(`${JSON.stringify(roots, null, 2)}\n`).toMatchFileSnapshot('../../../fixtures/builder/theme-root-tokens.json')
  })
})

describe.each(STORES)('the published theme of %s', (_, settings) => {
  describe.each(DESIGNS)('in %s', (_, design) => {
    const volt = design === 'volt'
    const rules = pageRules(themeCss(settings, design))
    const page = (scheme: 'light' | 'dark') => computedTokens(rules, [htmlElement(scheme, volt)])

    it('draws a dark part of a light page as the dark page', () => {
      expect(computedTokens(rules, [htmlElement('light', volt), section('dark')])).toEqual(page('dark'))
    })

    it('draws a light part of a dark page as the light page', () => {
      expect(computedTokens(rules, [htmlElement('dark', volt), section('light')])).toEqual(page('light'))
    })

    it('draws a part nested twice in the scheme of the innermost', () => {
      expect(computedTokens(rules, [htmlElement('dark', volt), section('light'), section('dark')])).toEqual(page('dark'))
      expect(computedTokens(rules, [htmlElement('light', volt), section('dark'), section('light')])).toEqual(page('light'))
    })

    it('leaves a part with no scheme of its own in the page\'s scheme', () => {
      expect(computedTokens(rules, [htmlElement('light', volt), { tag: 'section' }])).toEqual(page('light'))
      expect(computedTokens(rules, [htmlElement('dark', volt), { tag: 'section' }])).toEqual(page('dark'))
    })
  })
})

describe('a store with an accent of its own', () => {
  const [, base] = STORES[0]!
  const settings = {
    ...base,
    colors: {
      light: { ...base.colors.light, accent: '#b3694b', action: '#123456' },
      dark: { ...base.colors.dark, accent: '#e0a96d', action: '#abcdef' },
    },
  }

  it.each(DESIGNS)('gets its own accent and action colour in a forced part, %s', (_, design) => {
    const rules = pageRules(themeCss(settings, design))
    const volt = design === 'volt'

    const dark = computedTokens(rules, [htmlElement('light', volt), section('dark')])
    const light = computedTokens(rules, [htmlElement('dark', volt), section('light')])

    expect(dark).toMatchObject({ '--ui-secondary': '#e0a96d', '--ui-primary': '#abcdef' })
    expect(light).toMatchObject({ '--ui-secondary': '#b3694b', '--ui-primary': '#123456' })
  })

  it('gets Volt\'s dark surfaces in a dark part of a Volt store, and its light ones back in a light part', () => {
    const rules = pageRules(themeCss(settings, 'volt'))

    expect(computedTokens(rules, [htmlElement('light', true), section('dark')])).toMatchObject({ '--ui-bg': '#17171a', '--ui-bg-muted': '#0e0e10', '--ui-text-highlighted': '#ffffff' })
    expect(computedTokens(rules, [htmlElement('dark', true), section('light')])).toMatchObject({ '--ui-bg': '#ffffff', '--ui-bg-muted': '#f7f7f5', '--ui-text-highlighted': '#17171a' })
  })
})

// The accessibility toolbar's high contrast is the shopper's choice and must
// reach a part the store forced light or dark too.
describe('high contrast', () => {
  it.each(DESIGNS)('holds inside a part forced light or dark, %s', (_, design) => {
    const [, settings] = STORES[0]!
    const rules = pageRules(themeCss(settings, design))
    const volt = design === 'volt'
    const contrast = { '--ui-bg': '#000000', '--ui-text': '#ffffff', '--ui-secondary': '#ffff00', '--ui-on-secondary': '#000000' }

    expect(computedTokens(rules, [htmlElement('light', volt, 'a11y-contrast')])).toMatchObject(contrast)
    expect(computedTokens(rules, [htmlElement('light', volt, 'a11y-contrast'), section('dark')])).toMatchObject(contrast)
    expect(computedTokens(rules, [htmlElement('dark', volt, 'a11y-contrast'), section('light')])).toMatchObject(contrast)
  })
})
