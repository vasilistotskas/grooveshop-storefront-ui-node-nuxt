import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { themeCss } from '~~/shared/theme/compile'
import { zThemeSettings } from '~~/shared/theme/settings'
import type { StorefrontDesign } from '~~/shared/theme/design'
import type { ThemeSettings } from '~~/shared/theme/settings'
import published from '~~/test/fixtures/builder/theme-published.json'
import rootTokens from '~~/test/fixtures/builder/theme-root-tokens.json'
import { REPO } from '~~/test/helpers/sourceText'
import { computedTokens, htmlElement, pageRules, schemeTokenNames } from '~~/test/helpers/themeCascade'
import type { CascadeElement, StoreSheets } from '~~/test/helpers/themeCascade'

/**
 * A part of a page can be drawn in the other colour scheme: Nuxt UI's own
 * `.light` / `.dark` class on an element switches every token inside it, and
 * the store's theme block (`themeCss`), the base stylesheet, the Groove Volt
 * blocks (`main.css`) and the accessibility preferences (`accessibility.css`)
 * are written for such a subtree as well as for `<html>`. Computed from the
 * real stylesheets by the cascade a browser runs, each custom property
 * resolved on the element that declares it (`test/helpers/themeCascade.ts`),
 * for the three production stores' published themes (`theme-published.json`)
 * in both designs.
 *
 * Compared: the tokens those stylesheets declare (`schemeTokenNames`).
 * Tailwind's palette and Nuxt UI's generated `@theme default inline` aliases
 * (`--color-primary-100`, `--text-color-muted`, …) are read to resolve them but
 * not compared: `inline` puts their value into every utility, so nothing reads
 * the alias itself (`main.css` reads the per-element `--ui-color-*` scales).
 */
const STORES = Object.entries(published).map(([schema, document]) => [schema, zThemeSettings.parse(document)] as const)
const DESIGNS = [['volt', 'volt'], ['a design of its own', null]] as const
const SCHEMES = ['light', 'dark'] as const

type Compile = (settings: ThemeSettings, design: StorefrontDesign | null) => string

const section = (scheme: 'light' | 'dark'): CascadeElement => ({ tag: 'section', classes: [scheme] })

/** Only `names`, so two computations compare on the tokens the schemes are about. */
const only = (tokens: Record<string, string>, names: ReadonlySet<string>) =>
  Object.fromEntries(Object.entries(tokens).filter(([name]) => names.has(name)).sort(([a], [b]) => a.localeCompare(b)))

/** What `<html>` computes for every store, design and scheme, from `compile` and `sheets`, on the tokens of `names`. */
function roots(compile: Compile, sheets: StoreSheets | undefined, names: (css: string) => ReadonlySet<string>) {
  return Object.fromEntries(STORES.flatMap(([schema, settings]) => DESIGNS.flatMap(([, design]) => SCHEMES.map((scheme) => {
    const css = compile(settings, design)
    return [`${schema} ${design ?? 'own'} ${scheme}`, only(computedTokens(pageRules(css, sheets), [htmlElement(scheme, design === 'volt')]), names(css))]
  }))))
}

/**
 * What `<html>` computes, pinned in `theme-root-tokens.json`: a page with no
 * forced part paints exactly what it painted before forced parts existed.
 *
 * The pin is reproducible. With `THEME_BASELINE_REF` set, the baseline test
 * computes the same roots from that revision's `main.css`, `accessibility.css`
 * and theme compiler, and compares them with the pin:
 *
 *   THEME_BASELINE_REF=origin/main pnpm vitest run --project=unit test/unit/shared/theme/schemes.spec.ts -t baseline
 *
 * Run against the revision before the forced parts (096086036), it passes:
 * the stylesheets of then and of now compute the same roots.
 */
describe('the root of a page', () => {
  it('computes every scheme token exactly as the pin', async () => {
    const now = roots(themeCss, undefined, css => schemeTokenNames(css))

    expect(Object.keys(now)).toHaveLength(STORES.length * DESIGNS.length * SCHEMES.length)
    await expect(`${JSON.stringify(now, null, 2)}\n`).toMatchFileSnapshot('../../../fixtures/builder/theme-root-tokens.json')
  })

  const ref = process.env.THEME_BASELINE_REF
  it.runIf(ref)('baseline: computes the pin from the stylesheets of THEME_BASELINE_REF', async () => {
    const at = join(REPO, 'node_modules/.cache/theme-baseline', ref!.replace(/\W/g, '_'))
    rmSync(at, { recursive: true, force: true })
    mkdirSync(at, { recursive: true })
    const show = (path: string) => execFileSync('git', ['show', `${ref}:${path}`], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 })
    // The theme compiler of that revision, and what it imports from `shared/`.
    const files = execFileSync('git', ['ls-tree', '-r', '--name-only', ref!, 'shared/theme', 'shared/utils', 'shared/constants', 'shared/types'], { cwd: REPO, encoding: 'utf8' })
    for (const path of files.split('\n').filter(Boolean)) {
      mkdirSync(dirname(join(at, path)), { recursive: true })
      writeFileSync(join(at, path), show(path))
    }
    const { themeCss: compileThen } = await import(pathToFileURL(join(at, 'shared/theme/compile.ts')).href) as { themeCss: Compile }
    const sheets: StoreSheets = { main: show('app/assets/css/main.css'), accessibility: show('app/assets/css/accessibility.css') }
    const pinned = rootTokens as Record<string, Record<string, string>>

    const then = roots(compileThen, sheets, () => new Set(Object.values(pinned).flatMap(Object.keys)))

    expect(then).toEqual(pinned)
  })
})

describe.each(STORES)('the published theme of %s', (_, settings) => {
  describe.each(DESIGNS)('in %s', (_, design) => {
    const volt = design === 'volt'
    const css = themeCss(settings, design)
    const rules = pageRules(css)
    const names = schemeTokenNames(css)
    const at = (...path: CascadeElement[]) => only(computedTokens(rules, path), names)
    const page = (scheme: 'light' | 'dark') => at(htmlElement(scheme, volt))

    it('draws a dark part of a light page as the dark page', () => {
      expect(at(htmlElement('light', volt), section('dark'))).toEqual(page('dark'))
    })

    it('draws a light part of a dark page as the light page', () => {
      expect(at(htmlElement('dark', volt), section('light'))).toEqual(page('light'))
    })

    it('draws a part nested twice in the scheme of the innermost', () => {
      expect(at(htmlElement('dark', volt), section('light'), section('dark'))).toEqual(page('dark'))
      expect(at(htmlElement('light', volt), section('dark'), section('light'))).toEqual(page('light'))
    })

    it('leaves a part with no scheme of its own in the page\'s scheme', () => {
      expect(at(htmlElement('light', volt), { tag: 'section' })).toEqual(page('light'))
      expect(at(htmlElement('dark', volt), { tag: 'section' })).toEqual(page('dark'))
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

/**
 * The accessibility toolbar's preferences that set tokens (high contrast, the
 * readable font) are the shopper's choice and must reach a part the store
 * forced light or dark too: the forced part redeclares those tokens on itself.
 */
describe('the accessibility preferences', () => {
  const [, settings] = STORES[0]!

  it.each(DESIGNS)('keep high contrast inside a part forced light or dark, %s', (_, design) => {
    const rules = pageRules(themeCss(settings, design))
    const volt = design === 'volt'
    const contrast = { '--ui-bg': '#000000', '--ui-text': '#ffffff', '--ui-secondary': '#ffff00', '--ui-on-secondary': '#000000' }

    expect(computedTokens(rules, [htmlElement('light', volt, 'a11y-contrast')])).toMatchObject(contrast)
    expect(computedTokens(rules, [htmlElement('light', volt, 'a11y-contrast'), section('dark')])).toMatchObject(contrast)
    expect(computedTokens(rules, [htmlElement('dark', volt, 'a11y-contrast'), section('light')])).toMatchObject(contrast)
  })

  it.each(DESIGNS)('keep the readable font inside a part forced light or dark, %s', (_, design) => {
    const rules = pageRules(themeCss(settings, design))
    const volt = design === 'volt'
    const root = computedTokens(rules, [htmlElement('light', volt, 'a11y-font')])
    const font = { '--font-sans': root['--font-sans'], '--font-display': root['--font-sans'] }

    expect(root['--font-sans']).toMatch(/^Verdana/)
    expect(computedTokens(rules, [htmlElement('light', volt, 'a11y-font'), section('dark')])).toMatchObject(font)
    expect(computedTokens(rules, [htmlElement('dark', volt, 'a11y-font'), section('light')])).toMatchObject(font)
  })
})
