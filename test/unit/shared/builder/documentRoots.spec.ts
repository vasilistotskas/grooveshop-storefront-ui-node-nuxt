import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { evaluateContrastRules } from '~~/shared/builder/contrastRules'
import { VOLT_BACKGROUND, builderDocumentRootsFor, themeContrastRulesFor, themeRootFor } from '~~/shared/builder/documentRoots'
import { CONTAINER_MAP, FONT_ALLOWLIST } from '~~/shared/theme/constants'
import { themeDefaultsFor } from '~~/shared/theme/defaults'
import { DESIGN_FONTS } from '~~/shared/theme/design'
import { zThemeSettings } from '~~/shared/theme/settings'
import { TAILWIND_PALETTES } from '~~/shared/theme/tailwindPalettes'

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

  describe('Groove Volt: the faces and the heart of its defaults', () => {
    const defaults = themeDefaultsFor('volt')

    it('are the Volt faces and the heart the base stylesheet paints', () => {
      expect(defaults.fonts).toEqual(DESIGN_FONTS.volt)
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
