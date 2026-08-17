import {
  CONTAINER_MAP,
  FONT_ALLOWLIST,
  HEX_COLOR_RE,
  RADIUS_ALLOWLIST,
} from '../../shared/theme/constants'
import { THEME_PRESETS } from '../../shared/theme/presets'
import { zThemeMetadata } from '../../shared/theme/metadataSchema'
import type { ThemeMetadata } from '../../shared/theme/metadataSchema'

/**
 * Pure per-request compiler for the tenant ``<style id="tenant-theme">``
 * block (consumed by ``server/plugins/tenant-theme.ts``).
 *
 * Resolution order, rightmost wins:
 *   THEME_PRESETS[themePreset]  ⊕  dedicated Tenant fields (hexes)
 *                               ⊕  sanitized theme_metadata overrides
 *
 * Sanitization contract: every emitted value is either enum-mapped
 * through a fixed table or matched by ``HEX_COLOR_RE`` — tenant strings
 * are never interpolated raw. Invalid metadata degrades to the preset
 * (warn-logged by the caller), never to broken CSS.
 *
 * No module-level state: string concat per event, nothing cached.
 */

interface ThemeTenant {
  themePreset?: string | null
  themeMetadata?: unknown
  accentHex?: string | null
  successHex?: string | null
  warningHex?: string | null
  errorHex?: string | null
  infoHex?: string | null
}

export interface CompiledTenantTheme {
  css: string
  /** Set when themeMetadata failed validation (caller logs it). */
  metadataError?: string
}

const SHADES = [
  '50', '100', '200', '300', '400',
  '500', '600', '700', '800', '900', '950',
] as const

export function buildTenantThemeCss(
  tenant: ThemeTenant,
): CompiledTenantTheme {
  const preset
    = THEME_PRESETS[tenant.themePreset || 'default'] ?? THEME_PRESETS.default!

  let metadata: ThemeMetadata = {}
  let metadataError: string | undefined
  if (
    tenant.themeMetadata
    && typeof tenant.themeMetadata === 'object'
    && Object.keys(tenant.themeMetadata).length > 0
  ) {
    const parsed = zThemeMetadata.safeParse(tenant.themeMetadata)
    if (parsed.success) {
      metadata = parsed.data
    }
    else {
      metadataError = parsed.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')
    }
  }

  const shared: string[] = []

  // --- Status/accent hexes (dedicated Tenant fields) ---------------
  const hex = (value: string | null | undefined): string | null =>
    value && HEX_COLOR_RE.test(value) ? value : null

  const accent = hex(tenant.accentHex)
  if (accent) {
    shared.push(`--ui-secondary: ${accent}`, `--ui-liked: ${accent}`)
  }
  for (const [field, token] of [
    ['successHex', '--ui-success'],
    ['warningHex', '--ui-warning'],
    ['errorHex', '--ui-error'],
    ['infoHex', '--ui-info'],
  ] as const) {
    const value = hex(tenant[field])
    if (value) shared.push(`${token}: ${value}`)
  }

  // --- Non-color tokens: preset ⊕ metadata -------------------------
  const radius = metadata.radius ?? preset.radius
  if (RADIUS_ALLOWLIST.has(radius) && radius !== '0.25rem') {
    // 0.25rem is Nuxt UI's stock value — omit it to keep the platform
    // payload byte-identical to the pre-token era.
    shared.push(`--ui-radius: ${radius}`)
  }

  const containerKey = metadata.container ?? preset.container
  const container = CONTAINER_MAP[containerKey]
  if (container && containerKey !== 'wide') {
    // ``wide`` is the main.css platform value — omit when unchanged.
    shared.push(`--ui-container: ${container}`)
  }

  const fontKey = metadata.fontSans ?? preset.fontSans
  const fontStack = FONT_ALLOWLIST[fontKey]
  if (fontStack && fontKey !== 'system') {
    shared.push(`--font-sans: ${fontStack}`)
  }

  // --- Custom scale escape hatch (metadata.colors) ------------------
  for (const [scaleKey, uiName] of [
    ['primaryScale', 'primary'],
    ['neutralScale', 'neutral'],
  ] as const) {
    const scale = metadata.colors?.[scaleKey]
    if (!scale) continue
    for (const shade of SHADES) {
      const value = scale[shade]
      if (value && HEX_COLOR_RE.test(value)) {
        shared.push(`--ui-color-${uiName}-${shade}: ${value}`)
      }
    }
  }

  if (shared.length === 0) {
    return { css: '', metadataError }
  }

  const block = shared.join('; ')
  return {
    // Identical values in :root and .dark — main.css keeps owning the
    // platform's dark-shade strategy, which now resolves against the
    // tenant's runtime scales automatically. Distinct dark accents can
    // extend the metadata schema later without structural changes here.
    css: `:root { ${block} } .dark { ${block} }`,
    metadataError,
  }
}
