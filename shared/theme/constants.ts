/**
 * Per-tenant design-token vocabulary — single source of truth shared by
 * the SSR token compiler (``server/utils/themeTokens.ts``), the
 * universal theme plugin (``app/plugins/tenant-theme.ts``), the fonts
 * setup in ``nuxt.config.ts`` and the metadata schema.
 *
 * Every value a tenant can influence is either enum-mapped through the
 * tables below or matched against ``HEX_COLOR_RE`` — raw tenant strings
 * are NEVER interpolated into CSS.
 */

export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

/**
 * Mirror of Django's ``tenant.models.TailwindColor`` choices — the only
 * values accepted for ``primaryColor`` / ``neutralColor``. Nuxt UI
 * resolves these to full 50–950 scales at head-render time.
 */
export const TAILWIND_COLOR_ALLOWLIST = new Set([
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose',
])

/**
 * Curated font stacks. ``system`` is the platform default (identical to
 * today's look — no explicit family was ever configured); the named
 * families are pre-bundled and self-hosted at build time via
 * ``@nuxt/fonts`` (see ``fonts.families`` in ``nuxt.config.ts``), so a
 * tenant switching families costs one lazy @font-face download — no
 * third-party requests, no CSP widening.
 */
export const FONT_ALLOWLIST: Record<string, string> = {
  'system': 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
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
 */
export const FONT_WEIGHTS: Record<string, number[]> = {
  'jetbrains-mono': [400, 500],
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
])

/**
 * Container width presets → the value of ``--ui-container``.
 * ``wide`` is today's platform value (``--container-8xl`` = 90rem,
 * defined in ``main.css``).
 */
export const CONTAINER_MAP: Record<string, string> = {
  narrow: '64rem',
  default: '80rem',
  wide: 'var(--container-8xl)',
}

/**
 * The platform's own colour values, as written in
 * `app/assets/css/main.css` and mirrored by the Django `Tenant` field
 * defaults.
 *
 * Used to decide whether a tenant has actually CUSTOMIZED a colour.
 * Every colour field on the Tenant model ships with a non-blank default
 * equal to the platform value, so "the field has a value" says nothing —
 * treating it as customization made the token compiler emit the full
 * block for the platform tenant itself, overriding main.css at equal
 * specificity and flattening the deliberately different `.dark` values.
 *
 * Lower-case: comparisons normalise before matching.
 */
export const PLATFORM_COLORS = {
  secondary: '#003dff',
  success: '#16a34a',
  warning: '#ca8a04',
  error: '#dc2626',
  info: '#2563eb',
} as const
