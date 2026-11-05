import { CONTAINER_MAP, THEME_SHADES, fontStackValue } from './constants.ts'
import { themeDefaultsFor } from './defaults.ts'
import type { StorefrontDesign } from './design.ts'
import type { ThemeColorScheme, ThemeSettings } from './settings.ts'
import { readableTextOn } from '../utils/contrast.ts'

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
 * `html.dark`, written whole (the document is complete). The design's own
 * stylesheet keeps only how it uses them (which mix, which hover). Every value
 * is a validated hex, an allow-listed key's mapped value or a pre-bundled
 * font stack, so nothing a store wrote reaches the CSS raw.
 *
 * `html:root` / `html.dark` (0,1,1) beat `main.css`'s `:root` / `.dark` and
 * the design blocks whatever the stylesheet order, as the store's theme block
 * does (`server/plugins/tenant-theme.ts`).
 */
export function themeCss(settings: ThemeSettings, design: StorefrontDesign | null): string {
  const defaults = themeDefaultsFor(design)
  const shared = [
    `--ui-radius: ${settings.radius}`,
    `--ui-container: ${CONTAINER_MAP[settings.container]}`,
    `--font-sans: ${fontStackValue(settings.fonts.sans)}`,
    `--font-display: ${fontStackValue(settings.fonts.display)}`,
    `--font-mono: ${fontStackValue(settings.fonts.mono)}`,
  ]
  const light = [...shared, ...schemeTokens(settings.colors.light, defaults.colors.light.accent)]
  const dark = [...shared, ...schemeTokens(settings.colors.dark, defaults.colors.dark.accent)]
  return `html:root { ${light.join('; ')} } html.dark { ${dark.join('; ')} }`
}

/**
 * The colour a browser tints its own chrome with for the store (the page's
 * `theme-color` and the manifest's `theme_color`): the accent of the light
 * scheme.
 */
export function themeColorOf(settings: ThemeSettings): string {
  return settings.colors.light.accent
}
