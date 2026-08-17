/**
 * Curated non-color token bundles selected by ``Tenant.theme_preset``
 * (Django ``ThemePreset`` choices: default / minimal / bold / custom).
 *
 * Resolution order (rightmost wins) lives in
 * ``server/utils/themeTokens.ts``:
 *   preset defaults ⊕ dedicated Tenant fields ⊕ sanitized theme_metadata
 *
 * ``custom`` equals ``default`` — it exists so an operator signals
 * "my theme_metadata overrides are authoritative", not to change any
 * baseline value.
 */

export interface ThemePresetTokens {
  /** Base value of --ui-radius (must be in RADIUS_ALLOWLIST). */
  radius: string
  /** FONT_ALLOWLIST key for --font-sans. */
  fontSans: string
  /** CONTAINER_MAP key for --ui-container. */
  container: string
}

export const THEME_PRESETS: Record<string, ThemePresetTokens> = {
  // The platform look, unchanged: Nuxt UI's stock radius, the system
  // font stack, the wide (90rem) container from main.css.
  default: { radius: '0.25rem', fontSans: 'system', container: 'wide' },
  minimal: { radius: '0', fontSans: 'inter', container: 'default' },
  bold: { radius: '0.625rem', fontSans: 'poppins', container: 'wide' },
  custom: { radius: '0.25rem', fontSans: 'system', container: 'wide' },
}
