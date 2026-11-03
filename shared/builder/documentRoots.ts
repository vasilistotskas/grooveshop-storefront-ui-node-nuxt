import * as z from 'zod'

import { CONTAINER_MAP, FONT_ALLOWLIST, HEX_COLOR_RE, RADIUS_ALLOWLIST, THEME_SHADES } from '../theme/constants'
import type { BuilderDocumentKind, ContrastRule, DocumentRoot } from '../types/builder'

/**
 * A page's search-engine copy, written per language: the length limits are
 * the model's (`SeoTranslationModel`), so a save the editor accepts is one
 * the database does. Every field is optional; an empty page has none.
 */
const SEO_ROOT: DocumentRoot = {
  schema: z.object({
    seoTitle: z.string().max(70).optional(),
    seoDescription: z.string().max(300).optional(),
    seoKeywords: z.string().max(255).optional(),
  }),
  translatable: ['/seoTitle', '/seoDescription', '/seoKeywords'],
}

const zHex = z.string().regex(HEX_COLOR_RE)

/**
 * A colour the store picks, with the scale the editor makes of it: the
 * eleven Nuxt UI shades, computed in OKLCH from `source` and stored, so
 * the server render only writes what is there and Django checks contrast
 * on the colours themselves.
 */
const zColorScale = z.object({
  source: zHex,
  scale: z.object(Object.fromEntries(THEME_SHADES.map(shade => [shade, zHex])) as Record<(typeof THEME_SHADES)[number], typeof zHex>),
})

const zFont = z.enum(Object.keys(FONT_ALLOWLIST) as [string, ...string[]])

/**
 * The contrast the theme's colours must keep, by Nuxt UI's own pairings
 * (`--ui-text` is neutral 700 on white, neutral 200 on neutral 900 in the
 * dark; muted text is 500 and 400; `--ui-primary` is 500, 400 in the
 * dark). Body text below 4.5:1 stops a publish; the rest warn in the
 * editor: muted text against 4.5:1 (SC 1.4.3), the brand colours, which
 * draw outlines, links and focus rings, against 3:1 (SC 1.4.11).
 */
export const THEME_CONTRAST_RULES: readonly ContrastRule[] = [
  { id: 'body-text-light', foreground: '/colors/neutral/scale/700', background: '#ffffff', min: 4.5, severity: 'error' },
  { id: 'body-text-dark', foreground: '/colors/neutral/scale/200', background: '/colors/neutral/scale/900', min: 4.5, severity: 'error' },
  { id: 'muted-text-light', foreground: '/colors/neutral/scale/500', background: '#ffffff', min: 4.5, severity: 'warning' },
  { id: 'muted-text-dark', foreground: '/colors/neutral/scale/400', background: '/colors/neutral/scale/900', min: 4.5, severity: 'warning' },
  { id: 'primary-light', foreground: '/colors/primary/scale/500', background: '#ffffff', min: 3, severity: 'warning' },
  { id: 'primary-dark', foreground: '/colors/primary/scale/400', background: '/colors/neutral/scale/900', min: 3, severity: 'warning' },
  { id: 'secondary-light', foreground: '/colors/secondary/scale/500', background: '#ffffff', min: 3, severity: 'warning' },
  { id: 'secondary-dark', foreground: '/colors/secondary/scale/400', background: '/colors/neutral/scale/900', min: 3, severity: 'warning' },
]

/**
 * The store's theme: its colours (three with a scale, the semantic ones
 * and the "liked" heart as one colour each), the one radius every corner
 * takes, its three faces (every one with Greek) and the page width. Every
 * key is required: each store's theme is seeded from what it has today,
 * so nothing is read as "absent means the default".
 */
const THEME_ROOT: DocumentRoot = {
  schema: z.object({
    colors: z.object({
      primary: zColorScale,
      secondary: zColorScale,
      neutral: zColorScale,
      success: zHex,
      warning: zHex,
      error: zHex,
      info: zHex,
      liked: zHex,
    }),
    radius: z.enum([...RADIUS_ALLOWLIST] as [string, ...string[]]),
    fonts: z.object({ sans: zFont, display: zFont, mono: zFont }),
    container: z.enum(Object.keys(CONTAINER_MAP) as [string, ...string[]]),
  }),
  translatable: [],
  contrast: THEME_CONTRAST_RULES,
}

/**
 * What each kind of document carries at its root. A kind not listed has no
 * root settings, and Django refuses a `settings` key on it.
 */
export const BUILDER_DOCUMENT_ROOTS: Partial<Record<BuilderDocumentKind, DocumentRoot>> = {
  page: SEO_ROOT,
  template: SEO_ROOT,
  theme: THEME_ROOT,
}
