// Values (CONTAINER_MAP, FONT_ALLOWLIST, HEX_COLOR_RE, RADIUS_ALLOWLIST,
// THEME_PRESETS, zThemeMetadata) come from shared/ auto-imports — a
// relative runtime import into shared/ breaks Nitro's server-bundle
// resolution in production builds. The type-only import below is fully
// erased before bundling, so its path never reaches rollup.
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
  // Tokens that differ in dark mode, appended after the shared block
  // inside ``.dark`` only.
  const darkOnly: string[] = []

  // --- Status/accent hexes (dedicated Tenant fields) ---------------
  //
  // Emit a colour ONLY when the tenant actually changed it, the same
  // rule already applied to radius/container below.
  //
  // Every one of these Tenant fields carries a non-blank DEFAULT equal
  // to the platform's own value, so "non-blank" is not a signal that
  // anything was customized — webside received the full block and it
  // overrode main.css at equal specificity. Two things broke: the
  // stylesheet deliberately uses DIFFERENT values in `.dark`
  // (--ui-secondary #3364FF, statuses lightened to --color-*-400), all
  // of which this block flattened back to the light values, costing
  // contrast in dark mode; and --ui-liked (#FF00BD) is a distinct
  // semantic colour with no Tenant field at all, so mapping the accent
  // onto it turned every liked post and comment blue. Dark variants and
  // --ui-liked are now expressible — but only through explicit metadata
  // (``darkColors`` / ``accentDarkHex`` / ``likedHex``), never derived.
  const hex = (value: string | null | undefined): string | null =>
    value && HEX_COLOR_RE.test(value) ? value : null

  // accentHex maps to --ui-secondary only. When the tenant instead
  // supplies a full custom secondary scale, its 500/400 shades become
  // the light/dark --ui-secondary so the alias never dangles on the
  // platform blue next to a custom palette. Explicit accentHex /
  // accentDarkHex always win.
  const accent = hex(tenant.accentHex)
  const accentCustomized
    = accent !== null && accent.toLowerCase() !== PLATFORM_COLORS.secondary
  const secondaryScale = metadata.colors?.secondaryScale
  const sharedAccent = accentCustomized
    ? accent
    : (secondaryScale?.['500'] ?? null)
  if (sharedAccent) {
    shared.push(`--ui-secondary: ${sharedAccent}`)
    const darkAccent
      = hex(metadata.accentDarkHex)
        ?? (accentCustomized
          ? null
          : (metadata.darkColors?.secondaryScale?.['400']
            ?? secondaryScale?.['400']
            ?? null))
    if (darkAccent && darkAccent !== sharedAccent) {
      darkOnly.push(`--ui-secondary: ${darkAccent}`)
    }
  }
  else {
    // Dark-only accent override with the light value left on the
    // platform default.
    const darkAccent = hex(metadata.accentDarkHex)
    if (darkAccent) {
      darkOnly.push(`--ui-secondary: ${darkAccent}`)
    }
  }

  const liked = hex(metadata.likedHex)
  if (liked) {
    shared.push(`--ui-liked: ${liked}`)
  }
  for (const [field, token, baseline] of [
    ['successHex', '--ui-success', PLATFORM_COLORS.success],
    ['warningHex', '--ui-warning', PLATFORM_COLORS.warning],
    ['errorHex', '--ui-error', PLATFORM_COLORS.error],
    ['infoHex', '--ui-info', PLATFORM_COLORS.info],
  ] as const) {
    const value = hex(tenant[field])
    if (value && value.toLowerCase() !== baseline) {
      shared.push(`${token}: ${value}`)
    }
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

  // Heading face — metadata-only (no preset carries one). main.css
  // defaults --font-display to var(--font-sans), so absence emits
  // nothing and headings follow the body face.
  if (metadata.fontDisplay) {
    const displayStack = FONT_ALLOWLIST[metadata.fontDisplay]
    if (displayStack) {
      shared.push(`--font-display: ${displayStack}`)
    }
  }

  // --- Custom scale escape hatch (metadata.colors/darkColors) -------
  const SCALE_TOKENS = [
    ['primaryScale', 'primary'],
    ['neutralScale', 'neutral'],
    ['secondaryScale', 'secondary'],
  ] as const
  for (const [scaleKey, uiName] of SCALE_TOKENS) {
    const scale = metadata.colors?.[scaleKey]
    if (!scale) continue
    for (const shade of SHADES) {
      const value = scale[shade]
      if (value && HEX_COLOR_RE.test(value)) {
        shared.push(`--ui-color-${uiName}-${shade}: ${value}`)
      }
    }
  }
  for (const [scaleKey, uiName] of SCALE_TOKENS) {
    const scale = metadata.darkColors?.[scaleKey]
    if (!scale) continue
    for (const shade of SHADES) {
      const value = scale[shade]
      if (value && HEX_COLOR_RE.test(value)) {
        darkOnly.push(`--ui-color-${uiName}-${shade}: ${value}`)
      }
    }
  }

  if (shared.length === 0 && darkOnly.length === 0) {
    return { css: '', metadataError }
  }

  // The shared block repeats inside .dark (matching main.css's own
  // token strategy of restating dark values at .dark specificity), and
  // dark-only overrides (darkColors / accentDarkHex) are appended after
  // it so they win within the block. A tenant that supplies no dark
  // variant keeps the light values in both modes — the pre-darkColors
  // behaviour, unchanged.
  //
  // ``html:root`` / ``html.dark`` (0,1,1) instead of bare ``:root`` /
  // ``.dark`` (0,1,0): tenant tokens must beat main.css regardless of
  // stylesheet ORDER. In production the injected block is pushed last
  // and order suffices, but the Vite dev server re-injects main.css as
  // runtime <style> tags AFTER it, silently flattening every tenant
  // colour back to the platform values in local previews.
  const parts: string[] = []
  if (shared.length > 0) {
    parts.push(`html:root { ${shared.join('; ')} }`)
  }
  const dark = [...shared, ...darkOnly]
  if (dark.length > 0) {
    parts.push(`html.dark { ${dark.join('; ')} }`)
  }
  return {
    css: parts.join(' '),
    metadataError,
  }
}
