/**
 * Platform-tenant identity — the ONE comparison behind every "is this
 * the platform's own storefront?" gate (server util, app plugin, RSS
 * feed, AI-ready gate).
 *
 * The platform tenant is the store that owns the brand assets bundled
 * in this repo (``public/img/logo*.png``, ``public/platform-favicon/**``)
 * and the platform's own SEO attribution (author, site-verification
 * tokens). It is designated by the PRIVATE runtime config
 * ``platformTenant.host`` (env ``NUXT_PLATFORM_TENANT_HOST``, a bare
 * hostname such as ``webside.gr``). Private on purpose: every
 * ``runtimeConfig.public`` key is serialized into ``window.__NUXT__``
 * on EVERY tenant's pages, which is how the first store's hostname,
 * title, logo URL and API host ended up in another tenant's DOM. The
 * client only ever receives a boolean (see ``useTenantStore().isPlatform``).
 *
 * An unset ``primaryDomain`` (probes, prerender, single-tenant dev)
 * counts as platform so the bundled assets still serve there. An unset
 * platform host makes NO resolved tenant the platform: brand bleed is
 * the failure mode this guards, so it fails closed.
 */
export function isPlatformTenantHost(
  primaryDomain: string | null | undefined,
  platformHost: string | null | undefined,
): boolean {
  if (!primaryDomain) return true
  const host = (platformHost ?? '').trim().replace(/:\d+$/, '')
  return !!host && host === primaryDomain
}
