/**
 * The design system a storefront is drawn in.
 *
 * `volt` is the platform default. Its tokens live under
 * `[data-design="volt"]` in `main.css`, its faces are `DESIGN_FONTS.volt`
 * (emitted per request by `server/utils/themeTokens.ts`), and its
 * component theme is merged into the request's app config by
 * `app/plugins/design.ts` — never written into `app.config.ts` or the
 * `:root` tokens, because those are what the webside tree renders
 * with.
 *
 * Shared rather than app-only because the server needs the design too:
 * the font faces a page declares depend on it.
 */
export type StorefrontDesign = 'volt'

/**
 * Tenants whose own design (`app/components/variants/<schema>/`) keeps the
 * stylesheet and app config as they were before the Volt design existed.
 */
const OWN_DESIGN_SCHEMAS = new Set(['webside'])

/**
 * The design for `tenantSchema`, or `null` to leave the base stylesheet
 * and app config untouched — a tenant with its own design, or a request that
 * resolved no tenant at all (the "store not found" page).
 */
export function resolveDesign(tenantSchema?: string | null): StorefrontDesign | null {
  if (!tenantSchema || OWN_DESIGN_SCHEMAS.has(tenantSchema)) return null
  return 'volt'
}

/**
 * The faces a design sets, as `FONT_ALLOWLIST` keys, before any tenant
 * override: Groove Volt's body (Manrope), headings (Geologica) and
 * numerics (JetBrains Mono). A tenant's `theme_metadata` font wins over
 * these (see `resolveTenantFonts`).
 */
export const DESIGN_FONTS: Record<StorefrontDesign, { sans: string, display: string, mono: string }> = {
  volt: { sans: 'manrope', display: 'geologica', mono: 'jetbrains-mono' },
}
