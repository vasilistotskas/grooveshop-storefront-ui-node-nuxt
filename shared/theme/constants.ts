/**
 * Per-tenant design-token vocabulary — single source of truth shared by
 * the theme compiler (``shared/theme/compile.ts``), the fonts setup in
 * ``nuxt.config.ts`` and the theme schema (``shared/theme/settings.ts``).
 *
 * Every value a store can influence is either enum-mapped through the
 * tables below or matched against ``HEX_COLOR_RE`` — raw strings are
 * NEVER interpolated into CSS.
 */

export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

/** The shades of a Nuxt UI colour scale (`--ui-color-<name>-<shade>`), lightest first. */
export const THEME_SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const

/**
 * Curated font stacks. ``system`` is the platform default (identical to
 * today's look — no explicit family was ever configured); the named
 * families are pre-bundled and self-hosted at build time via
 * ``@nuxt/fonts`` (see ``fonts.families`` in ``nuxt.config.ts``), so a
 * tenant switching families costs one lazy @font-face download — no
 * third-party requests, no CSP widening.
 *
 * A page never carries these strings directly: each named stack is
 * compiled into the stylesheet as ``--font-stack-<key>``
 * (``modules/font-stacks.ts``), where ``@nuxt/fonts`` adds the family's
 * metric-matched fallback faces to it, and the tenant's tokens point at
 * that variable (``fontStackValue``).
 */
export const FONT_ALLOWLIST: Record<string, string> = {
  'system': 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  // The platform's own monospace face: Tailwind's stack, which main.css
  // gives --font-mono. A store that never picked a mono face renders it.
  'system-mono': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  'inter': '"Inter", ui-sans-serif, system-ui, sans-serif',
  'roboto': '"Roboto", ui-sans-serif, system-ui, sans-serif',
  'open-sans': '"Open Sans", ui-sans-serif, system-ui, sans-serif',
  'lato': '"Lato", ui-sans-serif, system-ui, sans-serif',
  'poppins': '"Poppins", ui-sans-serif, system-ui, sans-serif',
  'montserrat': '"Montserrat", ui-sans-serif, system-ui, sans-serif',
  'noto-sans': '"Noto Sans", ui-sans-serif, system-ui, sans-serif',
  'raleway': '"Raleway", ui-sans-serif, system-ui, sans-serif',
  'nunito-sans': '"Nunito Sans", ui-sans-serif, system-ui, sans-serif',
  'manrope': '"Manrope", ui-sans-serif, system-ui, sans-serif',
  'playfair-display': '"Playfair Display", ui-serif, Georgia, serif',
  'source-serif-4': '"Source Serif 4", ui-serif, Georgia, serif',
  // Engineered/technical pairing. Both ship a Greek subset — most
  // technical faces do not (IBM Plex Mono and Plex Condensed have
  // none), which is why the mono half is JetBrains Mono rather than
  // Plex's own. Mirrored in Django's tenant/validators.py.
  'ibm-plex-sans': '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  'jetbrains-mono': '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  // The Groove Volt display face. Chosen over Bricolage Grotesque,
  // which the design was first drawn in, because Bricolage ships no
  // Greek subset — every heading on a Greek page would have fallen back
  // glyph by glyph to the body face.
  'geologica': '"Geologica", ui-sans-serif, system-ui, sans-serif',
  // «Εκ φύσεως Φυτειάς»: Vollkorn headings with Commissioner body. Both
  // ship a Greek subset (verified on Google Fonts).
  'vollkorn': '"Vollkorn", ui-serif, Georgia, serif',
  'commissioner': '"Commissioner", ui-sans-serif, system-ui, sans-serif',
}

/** The faces that are the system's own, with no web font to ship. */
export const SYSTEM_FONTS = new Set(['system', 'system-mono'])

/**
 * The custom property holding the compiled stack of a pre-bundled family
 * (see ``FONT_ALLOWLIST``).
 */
export function fontStackProperty(key: string): string {
  return `--font-stack-${key}`
}

/**
 * The value a tenant token takes for the ``FONT_ALLOWLIST`` key ``key``.
 *
 * A pre-bundled family resolves to its compiled stack, whose fallback
 * faces (``"Vollkorn Fallback: Times New Roman"``, sized to Vollkorn's
 * metrics) hold the text in place until the web font arrives; written
 * raw, the stack fell straight back to Georgia and the heading reflowed
 * when Vollkorn loaded. ``system`` has no web font and stays literal.
 */
export function fontStackValue(key: string): string | undefined {
  if (FONT_FAMILY_NAMES[key]) return `var(${fontStackProperty(key)})`
  return FONT_ALLOWLIST[key]
}

/** Google Fonts family names for the pre-bundled entries above. */
export const FONT_FAMILY_NAMES: Record<string, string> = {
  'inter': 'Inter',
  'roboto': 'Roboto',
  'open-sans': 'Open Sans',
  'lato': 'Lato',
  'poppins': 'Poppins',
  'montserrat': 'Montserrat',
  'noto-sans': 'Noto Sans',
  'raleway': 'Raleway',
  'nunito-sans': 'Nunito Sans',
  'manrope': 'Manrope',
  'playfair-display': 'Playfair Display',
  'source-serif-4': 'Source Serif 4',
  'ibm-plex-sans': 'IBM Plex Sans',
  'jetbrains-mono': 'JetBrains Mono',
  'geologica': 'Geologica',
  'vollkorn': 'Vollkorn',
  'commissioner': 'Commissioner',
}

/**
 * Per-family weight overrides for the ``@nuxt/fonts`` declarations in
 * ``nuxt.config.ts``. Families absent here take the global default
 * ([400, 500, 600, 700]).
 *
 * Every declared face costs bytes in the render-blocking entry.css
 * (the unconstrained cross product once reached 472 @font-face rules /
 * 169KB — see the fonts comment in nuxt.config.ts), so a face used only
 * for numerics and code declares just the weights the design uses.
 *
 * The Groove Volt weights are the ones its boards actually set: headings
 * in Geologica 700 only, Manrope up to 800 (menu headings, totals), and
 * prices in JetBrains Mono 600-800. 400/500 stay on the mono face for
 * the tenants that already use it as their `fontMono`.
 */
export const FONT_WEIGHTS: Record<string, number[]> = {
  'jetbrains-mono': [400, 500, 600, 700, 800],
  'manrope': [400, 500, 600, 700, 800],
  'geologica': [700],
  'vollkorn': [500, 600, 700, 800, 900],
}

/**
 * Per-family style overrides for the ``@nuxt/fonts`` declarations;
 * families absent here take the global default (upright only).
 *
 * Vollkorn is the one face with a real italic: its design sets ribbon
 * items, quotes and captions in 500/600 italic, and a synthesized slant
 * of a serif is visibly wrong. ``@nuxt/fonts`` takes ``styles`` per
 * family but not per weight, so the italic is declared at every Vollkorn
 * weight (+15 @font-face rules: 5 weights x 3 subsets).
 */
export const FONT_STYLES: Record<string, ('normal' | 'italic')[]> = {
  vollkorn: ['normal', 'italic'],
}

/**
 * Radius steps a tenant may pick (value of ``--ui-radius``, which every
 * Nuxt UI ``rounded-*`` utility multiplies). Enum of literals — never a
 * free string.
 */
export const RADIUS_ALLOWLIST = new Set([
  '0',
  '0.125rem',
  '0.25rem',
  '0.375rem',
  '0.5rem',
  '0.625rem',
  // The Groove Volt design's corners.
  '0.75rem',
])

/**
 * Container width presets → the value of ``--ui-container``.
 * ``wide`` is today's platform value (``--container-8xl`` = 90rem,
 * defined in ``main.css``).
 */
export const CONTAINER_MAP: Record<string, string> = {
  narrow: '64rem',
  default: '80rem',
  // The Groove Volt design's page width.
  comfortable: '82rem',
  wide: 'var(--container-8xl)',
}

/**
 * The `theme-color` of a page that is not drawn with a store's theme (the page
 * editor, a page with no store) and of a manifest with none: the platform's
 * neutral ink.
 */
export const PLATFORM_THEME_COLOR = '#1a202c'
