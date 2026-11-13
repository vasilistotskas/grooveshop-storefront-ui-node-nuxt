import { CONTAINER_MAP, THEME_SHADES, fontStackValue } from './constants.ts'
import { themeDefaultsFor } from './defaults.ts'
import type { StorefrontDesign } from './design.ts'
import type { ThemeColorScheme, ThemeSettings } from './settings.ts'
import { readableTextOn } from '../utils/contrast.ts'

/**
 * The accent's deep shade: each sRGB channel at 80%, which is what
 * `color-mix(in srgb, <accent> 80%, black)` draws (`main.css` writes the
 * platform accent's that way), as a hex so the text on it can be picked.
 */
function deepShadeOf(accent: string): string {
  const channel = (index: number) => Math.round(Number.parseInt(accent.slice(1 + index * 2, 3 + index * 2), 16) * 0.8)
  return `#${[0, 1, 2].map(index => channel(index).toString(16).padStart(2, '0')).join('')}`
}

/** The custom properties a colour scheme sets. */
function schemeTokens(colours: ThemeColorScheme, designAccent: string): string[] {
  const tokens = [
    `--ui-primary: ${colours.action}`,
    `--ui-secondary: ${colours.accent}`,
    `--ui-success: ${colours.success}`,
    `--ui-warning: ${colours.warning}`,
    `--ui-error: ${colours.error}`,
    `--ui-info: ${colours.info}`,
    `--ui-liked: ${colours.liked}`,
  ]
  // The text on a solid accent: the design pairs its own accent with its own
  // ink; an accent the store picked gets the readable one (`readableTextOn`).
  if (colours.accent.toLowerCase() !== designAccent.toLowerCase()) {
    tokens.push(`--ui-on-secondary: ${readableTextOn(colours.accent)}`)
  }
  for (const colour of ['primary', 'secondary', 'neutral'] as const) {
    for (const shade of THEME_SHADES) tokens.push(`--ui-color-${colour}-${shade}: ${colours[colour].scale[shade]}`)
  }
  return tokens
}

/**
 * The stylesheet a store's theme document draws its pages with: every token
 * the theme holds, for the light scheme on `html:root` and the dark one on
 * `html.dark`, written whole (the document is complete). Each scheme is also
 * written for a part of the page forced into it with Nuxt UI's `.light` /
 * `.dark` class (`html .light`, `html .dark`: a band whose `colorScheme` is light or
 * dark), so the part takes the store's own colours, not the stylesheet's; the
 * innermost class wins, since each one declares the scheme on its element.
 * The design's own stylesheet keeps only how it uses them (which mix, which
 * hover). Every value
 * is a validated hex, an allow-listed key's mapped value or a pre-bundled
 * font stack, so nothing a store wrote reaches the CSS raw.
 *
 * `html:root` / `html.dark` (0,1,1) beat `main.css`'s `:root` / `.dark` and
 * the design blocks whatever the stylesheet order, as the store's theme block
 * does (`server/plugins/tenant-theme.ts`).
 */
export function themeCss(settings: ThemeSettings, design: StorefrontDesign | null): string {
  const defaults = themeDefaultsFor(design)
  const deep = deepShadeOf(settings.colors.light.accent)
  const shared = [
    `--ui-radius: ${settings.radius}`,
    `--ui-container: ${CONTAINER_MAP[settings.container]}`,
    `--font-sans: ${fontStackValue(settings.fonts.sans)}`,
    `--font-display: ${fontStackValue(settings.fonts.display)}`,
    `--font-mono: ${fontStackValue(settings.fonts.mono)}`,
    // The light accent's deep shade in BOTH schemes: a fill that keeps the
    // store's hue on a part forced dark (`main.css`), and the readable text
    // on it, which is not the accent's own: a bright accent stays light at
    // 80% and takes ink, where the accent itself may have taken white.
    `--ui-secondary-deep: ${deep}`,
    `--ui-on-secondary-deep: ${readableTextOn(deep)}`,
  ]
  const light = [...shared, ...schemeTokens(settings.colors.light, defaults.colors.light.accent)]
  const dark = [...shared, ...schemeTokens(settings.colors.dark, defaults.colors.dark.accent)]
  return `html:root, html .light { ${light.join('; ')} } html.dark, html .dark { ${dark.join('; ')} }`
}

/**
 * The colour a browser tints its own chrome with for the store (the page's
 * `theme-color` and the manifest's `theme_color`): the accent of the light
 * scheme.
 */
export function themeColorOf(settings: ThemeSettings): string {
  return settings.colors.light.accent
}
