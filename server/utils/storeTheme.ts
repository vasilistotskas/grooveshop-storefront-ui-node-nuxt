import { defineCachedFunction } from 'nitropack/runtime'
import type { H3Event } from 'h3'
import * as z from 'zod'

// `themeDefaultsFor`, `resolveDesign`, `zThemeSettings` and `markDegradedRender`
// come from the `shared/` auto-imports: a relative runtime import into
// `shared/` breaks Nitro's server-bundle resolution in production builds.
import type { ThemeSettings } from '../../shared/theme/settings'

/**
 * The theme settings of the store's current release, or `null` when it has
 * none: no release yet, or a release without a theme document.
 *
 * Cached as the function named `builderTheme`, whose key carries the store,
 * the language and the store's tenant-config epoch (`dataCacheKey`). A
 * release is the only thing that changes the published theme, and Django's
 * `builder` surface moves that epoch when one is published or rolled back
 * (`invalidates_tenant_config`, `core/cache/surfaces.py`): every entry of the
 * store then sits under a key nobody reads again, so the new theme reaches the
 * next render with no purge of this name. `swr: false` is what gives those
 * entries a TTL (Nitro sets one only without `swr`, see `cachedRead`), or every
 * release would leave one behind for good. The page cache holding the render is
 * purged by the same surface.
 *
 * A theme that is not one (the publish validates it against the same
 * schema, so this is a broken contract, not a merchant's mistake) is an error
 * and never cached; so is every failure of the read. Both leave the render to
 * `requestStoreTheme`.
 */
export const readPublishedTheme = defineCachedFunction(
  async (tenantHost: string, locale: string): Promise<ThemeSettings | null> => {
    const { theme } = await readPublishedSummary(tenantHost, locale)
    if (!theme) return null
    const parsed = zThemeSettings.safeParse(theme.settings)
    if (!parsed.success) {
      throw new Error(`The published theme is not valid: ${z.prettifyError(parsed.error)}`)
    }
    return parsed.data
  },
  {
    name: 'builderTheme',
    maxAge: 60 * 5,
    swr: false,
    getKey: (tenantHost: string, locale: string) => dataCacheKey(tenantHost, locale, 'theme'),
  },
)

/**
 * The theme this request's pages are drawn with, read ONCE per request: the
 * first caller (the stylesheet, the font faces) starts the read and the
 * others await the same promise from `event.context`.
 *
 * A store with no published theme is drawn with its design's own
 * (`themeDefaultsFor`), which is exactly what the design renders for a store
 * that changed nothing. A theme that cannot be read is the same fallback and
 * the render is marked degraded (`markDegradedRender`): the visitor gets a
 * usable page in the design's look, and no cache keeps it (Nitro's page
 * cache, the edge and the browser all skip it), so the next request reads
 * again instead of the wrong colours outliving the outage.
 */
export function requestStoreTheme(event: H3Event): Promise<ThemeSettings> {
  event.context.storeTheme ??= loadStoreTheme(event)
  return event.context.storeTheme
}

async function loadStoreTheme(event: H3Event): Promise<ThemeSettings> {
  const tenant = (await requestTenantResult(event)).config
  const design = resolveDesign(tenant?.schemaName)
  const locale = requestLocale(event)
  try {
    return await readPublishedTheme(requestTenantHost(event), locale) ?? themeDefaultsFor(design)
  }
  catch (error) {
    // The request's wide event: one error line carrying the store.
    event.context.log?.error(error instanceof Error ? error : String(error), { action: 'store-theme:unavailable', store: tenant?.schemaName, locale })
    markDegradedRender(event)
    return themeDefaultsFor(design)
  }
}
