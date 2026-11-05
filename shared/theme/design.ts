/**
 * The design system a storefront is drawn in.
 *
 * `volt` is the platform default. Its surfaces live under
 * `[data-design="volt"]` in `main.css`; its colours, radius, width and faces
 * are the store's theme (`themeDefaultsFor('volt')` until the store changes
 * them), written into the page by `themeCss`. Its
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
