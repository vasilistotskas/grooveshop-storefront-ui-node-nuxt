import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { contrastSideColor, evaluateContrastRules } from '~~/shared/builder/contrastRules'
import { MUTED_BACKGROUND, VOLT_BACKGROUND, VOLT_MUTED_BACKGROUND, builderDocumentRootsFor, themeContrastRulesFor, themeRootFor } from '~~/shared/builder/documentRoots'
import { CONTAINER_MAP, FONT_ALLOWLIST } from '~~/shared/theme/constants'
import { themeDefaultsFor } from '~~/shared/theme/defaults'
import { zThemeSettings } from '~~/shared/theme/settings'
import { TAILWIND_PALETTES } from '~~/shared/theme/tailwindPalettes'
import { contrastRatio } from '~~/shared/utils/contrast'
import { gamutMapToSrgb, hexFromSrgb, srgbFromHex, srgbToOklch } from '~~/shared/utils/oklch'

/**
 * The theme's root, per design, held to the stylesheets that draw each
 * design: `app/assets/css/main.css` and Nuxt UI's own defaults. A design
 * that changes a colour, a surface or a face fails here until its defaults
 * and its contrast rules follow.
 */
const MAIN_CSS = readFileSync(new URL('../../../../app/assets/css/main.css', import.meta.url), 'utf8')
const NUXT_UI_CSS = readFileSync(createRequire(import.meta.url).resolve('@nuxt/ui/runtime/index.css'), 'utf8')

/** The custom properties every rule of `css` whose selector is exactly `selector` declares, later ones winning. */
function declarations(css: string, selector: string): Record<string, string> {
  const blocks = css.replace(/\/\*[\s\S]*?\*\//g, '').split('}')
  const values: Record<string, string> = {}
  for (const block of blocks) {
    // The innermost rule of the block: an @layer or @media around it is skipped.
    const open = block.lastIndexOf('{')
    if (open < 0) continue
    const head = block.slice(0, open)
    const selectors = head.slice(Math.max(head.lastIndexOf('{'), head.lastIndexOf(';')) + 1).trim().split(/\s*,\s*/)
    if (!selectors.includes(selector)) continue
    for (const [, name, value] of block.slice(open + 1).matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) values[name!] = value!.trim()
  }
  return values
}

const base = { light: declarations(MAIN_CSS, ':root'), dark: declarations(MAIN_CSS, '.dark') }
const volt = { light: declarations(MAIN_CSS, '[data-design="volt"]'), dark: declarations(MAIN_CSS, '[data-design="volt"]:where(.dark)') }
const nuxtUi = { light: declarations(NUXT_UI_CSS, ':root'), dark: declarations(NUXT_UI_CSS, '.dark') }

/**
 * Nuxt UI's semantic colours by palette (Nuxt UI, "Design System", semantic
 * colors), with `app.config.ts`'s primary and neutral: what a
 * `var(--color-<colour>-<shade>)` paints.
 */
const SEMANTIC_PALETTES = { primary: 'neutral', secondary: 'blue', success: 'green', info: 'blue', warning: 'yellow', error: 'red', neutral: 'zinc' } as const

/** The colour a stylesheet value paints: a literal, or a `var(--color-<colour>-<shade>)` / `var(--ui-color-<colour>-<shade>)` of the palettes above. */
function colourOf(value: string): string {
  const reference = /^var\(--(?:ui-)?color-(\w+)-(\d+)\)$/.exec(value)
  if (!reference) return value.toLowerCase()
  const name = SEMANTIC_PALETTES[reference[1] as keyof typeof SEMANTIC_PALETTES]
  return TAILWIND_PALETTES[name][reference[2] as '500']
}

describe('themeDefaultsFor', () => {
  it.each([[null], ['volt' as const]])('is a theme the schema takes, for design %s', (design) => {
    expect(zThemeSettings.safeParse(themeDefaultsFor(design)).success).toBe(true)
  })

  describe('a store with its own templates (webside): main.css :root / .dark and Nuxt UI', () => {
    const defaults = themeDefaultsFor(null)

    it.each(['light', 'dark'] as const)('paints the %s scheme main.css paints', (scheme) => {
      const colours = defaults.colors[scheme]
      const css = { ...nuxtUi[scheme], ...base[scheme] }

      expect(colours.accent).toBe(colourOf(css['--ui-secondary']!))
      expect(colours.success).toBe(colourOf(css['--ui-success']!))
      expect(colours.warning).toBe(colourOf(css['--ui-warning']!))
      expect(colours.error).toBe(colourOf(css['--ui-error']!))
      expect(colours.info).toBe(colourOf(css['--ui-info']!))
      expect(colours.liked).toBe(colourOf(base.light['--ui-liked']!))
      // Nuxt UI points --ui-primary at primary 500; main.css's .dark at primary 100.
      expect(colours.action).toBe(colourOf(css['--ui-primary'] ?? 'var(--color-primary-500)'))
      expect(colours.primary.scale).toEqual(TAILWIND_PALETTES.neutral)
      expect(colours.neutral.scale).toEqual(TAILWIND_PALETTES.zinc)
      expect(colours.secondary.scale).toEqual(TAILWIND_PALETTES.blue)
    })

    it('has the radius, width and faces main.css and Nuxt UI give it', () => {
      expect(defaults.radius).toBe(nuxtUi.light['--ui-radius'])
      expect(CONTAINER_MAP[defaults.container]).toBe(base.light['--ui-container'])
      expect(FONT_ALLOWLIST[defaults.fonts.sans]).toBe(base.light['--font-sans'])
      expect(FONT_ALLOWLIST[defaults.fonts.mono]).toBe(base.light['--font-mono'])
      // main.css sets --font-display to var(--font-sans).
      expect(defaults.fonts.display).toBe(defaults.fonts.sans)
    })
  })

  describe('Groove Volt: the heart of its defaults', () => {
    const defaults = themeDefaultsFor('volt')

    it('are the heart the base stylesheet paints', () => {
      expect(defaults.colors.light.liked).toBe(colourOf(base.light['--ui-liked']!))
      expect(defaults.colors.dark.liked).toBe(colourOf(base.light['--ui-liked']!))
    })
  })
})

describe('themeContrastRulesFor', () => {
  it.each([[null], ['volt' as const]])('resolves every rule of design %s on its defaults, and they pass', (design) => {
    const outcomes = evaluateContrastRules(themeDefaultsFor(design), themeContrastRulesFor(design))

    expect(outcomes.filter(({ pass }) => !pass).map(({ rule }) => rule.id)).toEqual([])
  })

  it('stops a publish on webside only on body text, and never on Volt, whose text the store cannot change', () => {
    const errors = (design: 'volt' | null) => themeContrastRulesFor(design).filter(rule => rule.severity === 'error').map(rule => rule.id)

    expect(errors(null)).toEqual(['body-text-light', 'body-text-dark'])
    expect(errors('volt')).toEqual([])
  })

  // Every token a rule names is one its design paints with: a stylesheet that
  // changes its surfaces fails here before a rule checks what is no longer drawn.
  it('names, on webside, the text and background tokens Nuxt UI and main.css paint', () => {
    expect(nuxtUi.light['--ui-text']).toBe('var(--ui-color-neutral-700)')
    expect(nuxtUi.light['--ui-text-muted']).toBe('var(--ui-color-neutral-500)')
    expect(base.light['--ui-bg']).toBe('var(--ui-color-neutral-50)')
    expect(nuxtUi.dark['--ui-text']).toBe('var(--ui-color-neutral-200)')
    expect(nuxtUi.dark['--ui-text-muted']).toBe('var(--ui-color-neutral-400)')
    expect(base.dark['--ui-bg']).toBe('var(--ui-color-neutral-950)')
    for (const token of ['--ui-text', '--ui-text-muted']) {
      expect(base.light[token]).toBeUndefined()
      expect(base.dark[token]).toBeUndefined()
    }

    const rules = Object.fromEntries(themeContrastRulesFor(null).map(rule => [rule.id, rule]))
    expect(rules['body-text-light']).toMatchObject({ foreground: '/colors/light/neutral/scale/700', background: '/colors/light/neutral/scale/50' })
    expect(rules['body-text-dark']).toMatchObject({ foreground: '/colors/dark/neutral/scale/200', background: '/colors/dark/neutral/scale/950' })
    expect(rules['muted-text-light']).toMatchObject({ foreground: '/colors/light/neutral/scale/500', background: '/colors/light/neutral/scale/50' })
    expect(rules['muted-text-dark']).toMatchObject({ foreground: '/colors/dark/neutral/scale/400', background: '/colors/dark/neutral/scale/950' })
  })

  it('compares Volt\'s colours against the background the Volt block paints', () => {
    expect(VOLT_BACKGROUND.light).toBe(volt.light['--ui-bg'])
    expect(VOLT_BACKGROUND.dark).toBe(volt.dark['--ui-bg'])
  })

  // The accent drawn as large text on the muted ground (the newsletter band's
  // accent heading, the showcase hero's accent line): held against the muted
  // ground each design really paints.
  it('compares the accent against the muted ground each design paints', () => {
    expect(MUTED_BACKGROUND.light).toBe(base.light['--ui-bg-muted'])
    expect(base.dark['--ui-bg-muted']).toBe('var(--ui-color-neutral-900)')
    expect(MUTED_BACKGROUND.dark).toBe('/colors/dark/neutral/scale/900')
    expect(VOLT_MUTED_BACKGROUND.light).toBe(volt.light['--ui-bg-muted'])
    expect(VOLT_MUTED_BACKGROUND.dark).toBe(volt.dark['--ui-bg-muted'])

    for (const [design, muted] of [[null, MUTED_BACKGROUND], ['volt', VOLT_MUTED_BACKGROUND]] as const) {
      const rules = Object.fromEntries(themeContrastRulesFor(design).map(rule => [rule.id, rule]))
      expect(rules['accent-muted-light']).toMatchObject({ foreground: '/colors/light/accent', background: muted.light, min: 3, severity: 'warning' })
      expect(rules['accent-muted-dark']).toMatchObject({ foreground: '/colors/dark/accent', background: muted.dark, min: 3, severity: 'warning' })
    }
  })

  // The accent drawn as body-size text in the light scheme (the showcase
  // hero's eyebrow, rich-text links, the blog rail's category): 4.5:1 on the
  // page and on the muted ground, beside the 3:1 rules, and only ever a
  // warning. The text there is the accent itself (webside) or darker (Volt).
  it.each([
    [null, '/colors/light/neutral/scale/50', MUTED_BACKGROUND.light, 'var(--ui-secondary)'],
    ['volt', VOLT_BACKGROUND.light, VOLT_MUTED_BACKGROUND.light, 'color-mix(in srgb, var(--ui-secondary) 85%, black)'],
  ] as const)('holds the light accent as small text to 4.5:1 on both grounds of design %s, as a warning', (design, page, muted, text) => {
    const rules = Object.fromEntries(themeContrastRulesFor(design).map(rule => [rule.id, rule]))

    expect((design === 'volt' ? volt : base).light['--ui-secondary-text']).toBe(text)
    expect(rules['accent-text-light']).toMatchObject({ foreground: '/colors/light/accent', background: page, min: 4.5, severity: 'warning' })
    expect(rules['accent-text-muted-light']).toMatchObject({ foreground: '/colors/light/accent', background: muted, min: 4.5, severity: 'warning' })
    expect(rules['accent-light']).toMatchObject({ min: 3 })
    expect(rules['accent-muted-light']).toMatchObject({ min: 3 })
    expect(Object.keys(rules).filter(id => id.startsWith('accent-text-') && id.endsWith('-dark'))).toEqual([])
  })

  // An accent fine for buttons and large text (3:1 on both grounds) and too
  // faint for body-size text: only the small-text rules warn.
  it.each([[null], ['volt' as const]])('warns, for design %s, on a light accent too faint only as small text', (design) => {
    const defaults = themeDefaultsFor(design)
    const theme = { ...defaults, colors: { ...defaults.colors, light: { ...defaults.colors.light, accent: '#808080' } } }

    const failed = evaluateContrastRules(theme, themeContrastRulesFor(design)).filter(({ pass }) => !pass)

    expect(failed.map(({ rule }) => [rule.id, rule.severity])).toEqual([['accent-text-light', 'warning'], ['accent-text-muted-light', 'warning']])
  })

  // The dark scheme paints the accent's text 20% toward white, in OKLab:
  // every accent that clears the 3:1 rules on a design's dark grounds then
  // reads at 4.5:1 or more as small text, so a small-text rule on the raw
  // accent there could only warn wrongly (both designs' own dark accents
  // would). Every sRGB colour on a grid of 18 steps a channel is tried.
  it.each([
    [null, base.dark, MUTED_BACKGROUND.dark],
    ['volt' as const, volt.dark, VOLT_MUTED_BACKGROUND.dark],
  ])('lets the 3:1 rules hold the dark accent as small text, for design %s', (design, css, muted) => {
    expect(css['--ui-secondary-text']).toBe('color-mix(in oklab, var(--ui-secondary) 80%, white)')
    const defaults = themeDefaultsFor(design)
    const page = themeContrastRulesFor(design).find(rule => rule.id === 'accent-dark')!.background
    const grounds = [page, muted].map(side => contrastSideColor(defaults, side))
    const white = srgbToOklch([1, 1, 1])
    const toLab = ({ l, c, h }: { l: number, c: number, h: number }) => [l, Number.isNaN(h) ? 0 : c * Math.cos(h * Math.PI / 180), Number.isNaN(h) ? 0 : c * Math.sin(h * Math.PI / 180)] as const
    const textOf = (accent: string) => {
      const [l, a, b] = toLab(srgbToOklch(srgbFromHex(accent)))
      const [wl, wa, wb] = toLab(white)
      const [ml, ma, mb] = [l * 0.8 + wl * 0.2, a * 0.8 + wa * 0.2, b * 0.8 + wb * 0.2]
      return hexFromSrgb(gamutMapToSrgb({ l: ml, c: Math.hypot(ma, mb), h: (Math.atan2(mb, ma) * 180 / Math.PI + 360) % 360 }))
    }
    const steps = Array.from({ length: 18 }, (_, step) => Math.min(255, step * 15).toString(16).padStart(2, '0'))
    const faint: string[] = []
    for (const red of steps) for (const green of steps) for (const blue of steps) {
      const accent = `#${red}${green}${blue}`
      for (const ground of grounds) {
        if (contrastRatio(accent, ground) >= 3 && contrastRatio(textOf(accent), ground) < 4.5) faint.push(`${accent} on ${ground}`)
      }
    }

    expect(faint).toEqual([])
    expect(evaluateContrastRules(defaults, themeContrastRulesFor(design)).every(({ pass }) => pass)).toBe(true)
  })

  // An accent that clears 3:1 on the page and not on the muted ground: of the
  // 3:1 rules, the muted ground's is the one that catches it (and, in the
  // light scheme, both small-text rules warn too). Webside's dark muted
  // ground (neutral 900) is lighter than its page (950); Volt's light one
  // (#f7f7f5) is darker than its page (white).
  it.each([
    [null, 'dark', '#606060', ['accent-muted-dark']],
    ['volt', 'light', '#949494', ['accent-muted-light', 'accent-text-light', 'accent-text-muted-light']],
  ] as const)('warns, for design %s, on a %s accent the muted ground cannot carry', (design, scheme, accent, failing) => {
    const defaults = themeDefaultsFor(design)
    const theme = { ...defaults, colors: { ...defaults.colors, [scheme]: { ...defaults.colors[scheme], accent } } }

    const failed = evaluateContrastRules(theme, themeContrastRulesFor(design)).filter(({ pass }) => !pass)

    expect(failed.map(({ rule }) => [rule.id, rule.severity])).toEqual(failing.map(id => [id, 'warning']))
  })
})

describe('builderDocumentRootsFor', () => {
  it('gives every store the one theme schema, and its design the rules and defaults', () => {
    const volt = builderDocumentRootsFor('demo').theme!
    const own = builderDocumentRootsFor('webside').theme!

    expect(volt.schema).toBe(own.schema)
    expect(volt).toEqual(themeRootFor('volt'))
    expect(own).toEqual(themeRootFor(null))
  })
})
