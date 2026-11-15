import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { evaluateContrastRules } from '~~/shared/builder/contrastRules'
import { ACCENT_TEXT_DARK, MUTED_BACKGROUND, VOLT_BACKGROUND, VOLT_MUTED_BACKGROUND, builderDocumentRootsFor, themeContrastRulesFor, themeRootFor } from '~~/shared/builder/documentRoots'
import { CONTAINER_MAP, FONT_ALLOWLIST } from '~~/shared/theme/constants'
import { themeDefaultsFor } from '~~/shared/theme/defaults'
import { zThemeSettings } from '~~/shared/theme/settings'
import { themeScaleFrom } from '~~/shared/theme/scale'
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
  })

  // An accent fine for buttons and large text (3:1 on both grounds) and too
  // faint for body-size text: only the small-text rules warn.
  it.each([[null], ['volt' as const]])('warns, for design %s, on a light accent too faint only as small text', (design) => {
    const defaults = themeDefaultsFor(design)
    const theme = { ...defaults, colors: { ...defaults.colors, light: { ...defaults.colors.light, accent: '#808080' } } }

    const failed = evaluateContrastRules(theme, themeContrastRulesFor(design)).filter(({ pass }) => !pass)

    expect(failed.map(({ rule }) => [rule.id, rule.severity])).toEqual([['accent-text-light', 'warning'], ['accent-text-muted-light', 'warning']])
  })

  // The dark scheme draws the accent's text mixed toward white in OKLab
  // (`--ui-secondary-text`), and the small-text rules judge that mix.
  it.each([
    [null, base.dark, '/colors/dark/neutral/scale/950', MUTED_BACKGROUND.dark],
    ['volt' as const, volt.dark, VOLT_BACKGROUND.dark, VOLT_MUTED_BACKGROUND.dark],
  ])('holds the dark accent as small text as design %s draws it', (design, css, page, muted) => {
    const rules = Object.fromEntries(themeContrastRulesFor(design).map(rule => [rule.id, rule]))

    expect(css['--ui-secondary-text']).toBe(`color-mix(in oklab, var(--ui-secondary) ${100 - ACCENT_TEXT_DARK.percent}%, white)`)
    expect(ACCENT_TEXT_DARK).toEqual({ mix: '/colors/dark/accent', toward: '#ffffff', percent: 20 })
    expect(rules['accent-text-dark']).toMatchObject({ foreground: ACCENT_TEXT_DARK, background: page, min: 4.5, severity: 'warning' })
    expect(rules['accent-text-muted-dark']).toMatchObject({ foreground: ACCENT_TEXT_DARK, background: muted, min: 4.5, severity: 'warning' })
  })

  /** Webside's theme with a dark neutral picked in the panel (`themeScaleFrom`) and a dark accent. */
  const withDarkNeutral = (source: string, accent: string) => {
    const defaults = themeDefaultsFor(null)
    return { ...defaults, colors: { ...defaults.colors, dark: { ...defaults.colors.dark, neutral: { source, scale: themeScaleFrom(source) }, accent } } }
  }

  // A picked neutral moves webside's dark grounds (neutral 950 and 900): an
  // accent that clears 3:1 there can draw text below 4.5:1, which only the
  // small-text rules see. Below: neutral 900 and 950 picked themselves.
  it.each([
    ['#464646', '#ff3cc3', 'accent-text-muted-dark', 'accent-muted-dark'],
    ['#282828', '#d200a5', 'accent-text-dark', 'accent-dark'],
  ])('warns on webside, with the neutral %s picked, on accent %s as small text', (neutral, accent, failing, sameGround) => {
    const outcomes = Object.fromEntries(evaluateContrastRules(withDarkNeutral(neutral, accent), themeContrastRulesFor(null)).map(outcome => [outcome.rule.id, outcome]))

    expect(outcomes[sameGround]!.pass).toBe(true)
    expect(outcomes[failing]!.pass).toBe(false)
    expect(outcomes['body-text-dark']!.pass).toBe(true)
  })

  // Every accent on a grid of 12 steps a channel, on the dark grounds neutrals
  // picked across the board make: the small-text rules warn exactly where the
  // text as the stylesheet draws it (mixed here on its own, mapped into
  // sRGB) reads below 4.5:1.
  it('warns on webside wherever the dark accent\'s drawn text reads below 4.5:1, whatever neutral is picked', () => {
    const white = srgbToOklch([1, 1, 1])
    const toLab = ({ l, c, h }: { l: number, c: number, h: number }) => [l, Number.isNaN(h) ? 0 : c * Math.cos(h * Math.PI / 180), Number.isNaN(h) ? 0 : c * Math.sin(h * Math.PI / 180)] as const
    const textOf = (accent: string) => {
      const [l, a, b] = toLab(srgbToOklch(srgbFromHex(accent)))
      const [wl, wa, wb] = toLab(white)
      const [ml, ma, mb] = [l * 0.8 + wl * 0.2, a * 0.8 + wa * 0.2, b * 0.8 + wb * 0.2]
      return hexFromSrgb(gamutMapToSrgb({ l: ml, c: Math.hypot(ma, mb), h: (Math.atan2(mb, ma) * 180 / Math.PI + 360) % 360 }))
    }
    const rules = themeContrastRulesFor(null).filter(rule => rule.id === 'accent-text-dark' || rule.id === 'accent-text-muted-dark')
    const steps = Array.from({ length: 12 }, (_, step) => Math.min(255, step * 23).toString(16).padStart(2, '0'))
    const missed: string[] = []
    for (const neutral of ['#71717a', '#78716c', '#64748b', '#464646', '#282828', '#7c3aed', '#3f6212']) {
      const scale = themeScaleFrom(neutral)
      const grounds = [scale['950'], scale['900']]
      for (const red of steps) for (const green of steps) for (const blue of steps) {
        const accent = `#${red}${green}${blue}`
        const warned = evaluateContrastRules(withDarkNeutral(neutral, accent), rules).map(({ pass }) => !pass)
        const faint = grounds.map(ground => contrastRatio(textOf(accent), ground) < 4.5)
        if (warned.some((warns, index) => warns !== faint[index])) missed.push(`${accent} with ${neutral}`)
      }
    }

    expect(missed).toEqual([])
  })

  // An accent that clears 3:1 on the page and not on the muted ground: of the
  // 3:1 rules, the muted ground's is the one that catches it (and the
  // small-text rules where the text drawn misses 4.5:1 too). Webside's dark muted
  // ground (neutral 900) is lighter than its page (950); Volt's light one
  // (#f7f7f5) is darker than its page (white).
  it.each([
    [null, 'dark', '#606060', ['accent-muted-dark', 'accent-text-muted-dark']],
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
