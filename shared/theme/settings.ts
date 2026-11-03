import * as z from 'zod'

import { CONTAINER_MAP, FONT_ALLOWLIST, HEX_COLOR_RE, RADIUS_ALLOWLIST, THEME_SHADES } from './constants'

const zHex = z.string().regex(HEX_COLOR_RE)

/**
 * A colour the store picks, with the scale the editor makes of it: the
 * eleven Nuxt UI shades, computed in OKLCH from `source` and stored, so the
 * server render only writes what is there and Django checks contrast on the
 * colours themselves.
 */
const zColorScale = z.object({
  source: zHex,
  scale: z.object(Object.fromEntries(THEME_SHADES.map(shade => [shade, zHex])) as Record<(typeof THEME_SHADES)[number], typeof zHex>),
})

const zFont = z.enum(Object.keys(FONT_ALLOWLIST) as [string, ...string[]])

/**
 * One colour scheme of the theme, light or dark: three colours with their
 * scale, the main action colour (`--ui-primary`) and the accent
 * (`--ui-secondary`), the status colours and the "liked" heart.
 * `actionLinked` says whether choosing a primary colour in the editor also
 * sets `action`; it is stored, never inferred from the colours.
 */
const zColorScheme = z.object({
  primary: zColorScale,
  secondary: zColorScale,
  neutral: zColorScale,
  action: zHex,
  actionLinked: z.boolean(),
  accent: zHex,
  success: zHex,
  warning: zHex,
  error: zHex,
  info: zHex,
  liked: zHex,
})

/**
 * The theme document's root settings: both colour schemes, the one radius
 * every corner takes, its three faces (every one with Greek) and the page
 * width. Every key is required, the dark scheme too: a store starts from its
 * design's defaults (`themeDefaultsFor`), an existing one from what it renders
 * today, so nothing is read as "absent means the default" or "derive the
 * dark".
 */
export const zThemeSettings = z.object({
  colors: z.object({ light: zColorScheme, dark: zColorScheme }),
  radius: z.enum([...RADIUS_ALLOWLIST] as [string, ...string[]]),
  fonts: z.object({ sans: zFont, display: zFont, mono: zFont }),
  container: z.enum(Object.keys(CONTAINER_MAP) as [string, ...string[]]),
})

export type ThemeSettings = z.infer<typeof zThemeSettings>
export type ThemeColorScheme = ThemeSettings['colors']['light']
export type ThemeColorScale = ThemeColorScheme['primary']
